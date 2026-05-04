/**
 * Edge Function : enrich-prospect
 *
 * Enrichit 1 prospect (lookup IRIS + commune + Géorisques + DVF + Enedis adresse)
 * et calcule le score composite v2.
 *
 * Phase 11.1 — Tier 1 socle scoring.
 * Référence : docs/wiki/external-data-sources.md § Edge Functions.
 *
 * Body : { prospectId: string }
 * Returns : { score_v2, segment, breakdown, enriched_fields[] }
 *
 * Rate limit : 20/min/IP
 *
 * Algorithme :
 *   1. Charger prospect + IRIS + commune
 *   2. Lookup parallèle Géorisques (cache) + DVF stub + Enedis adresse stub
 *   3. Calcul score-v2
 *   4. Persister score_v2, segment, breakdown JSONB sur brh_dpe_prospects
 *   5. Retourner breakdown au caller
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  prospectId: string
}

interface ProspectRow {
  id: string
  etiquette_dpe: string | null
  has_pv_36kw: boolean | null
  iris_code: string | null
  code_insee: string | null
  latitude: number | null
  longitude: number | null
  adresse_ban: string | null
}

interface IrisRow {
  iris_code: string
  commune_insee: string
  med21: number | null
  decile_estime: number | null
  couleur_mpr: 'bleu' | 'jaune' | 'violet' | 'rose' | null
  tx_proprio: number | null
  tx_avant_1975: number | null
  thermosens_kwh_dj: number | null
}

interface CommuneRow {
  insee: string
  radon_categorie: number | null
  rga_alea: 'faible' | 'moyen' | 'fort' | null
  nb_rge_isolation: number | null
  opah_active: boolean
}

interface ScoreRule {
  rule: string
  points: number
  trigger: string
}

interface ScoreBreakdown {
  total: number
  rules: ScoreRule[]
  segment: string
}

/**
 * Score composite v2 (réimplémenté Deno-side car on ne peut pas importer le module front).
 * Logique strictement identique à src/lib/dpe-engine/external/score-v2.ts.
 */
function computeScoreV2(input: {
  prospect: ProspectRow
  iris: IrisRow | null
  commune: CommuneRow | null
  risques: { rga_local: 'faible' | 'moyen' | 'fort' | null } | null
  dvf: { mutation_24m: boolean; prix_m2_growth_3y: number | null } | null
  enedisAddr: { kwh_par_logt: number | null } | null
}): ScoreBreakdown {
  const rules: ScoreRule[] = []
  let total = 0
  const fg = input.prospect.etiquette_dpe === 'F' || input.prospect.etiquette_dpe === 'G'

  if (input.dvf?.mutation_24m && fg) {
    total += 35
    rules.push({ rule: 'mutation_24m_FG', points: 35, trigger: 'DVF mutation < 24m + DPE F/G' })
  }
  if (input.iris?.couleur_mpr === 'bleu') {
    total += 20
    rules.push({ rule: 'mpr_bleu', points: 20, trigger: `IRIS ${input.iris.iris_code} couleur Bleu` })
  } else if (input.iris?.couleur_mpr === 'jaune') {
    total += 15
    rules.push({ rule: 'mpr_jaune', points: 15, trigger: `IRIS ${input.iris.iris_code} couleur Jaune` })
  }
  if (input.enedisAddr?.kwh_par_logt && input.enedisAddr.kwh_par_logt > 250) {
    total += 15
    rules.push({
      rule: 'enedis_overuse',
      points: 15,
      trigger: `Enedis ${input.enedisAddr.kwh_par_logt} kWh/logt > 250`,
    })
  }
  if ((input.iris?.tx_proprio ?? 0) > 0.7 && (input.iris?.tx_avant_1975 ?? 0) > 0.6) {
    total += 10
    rules.push({ rule: 'iris_proprio_ancien', points: 10, trigger: 'IRIS prop>70% & ancien>60%' })
  }
  if (input.risques?.rga_local === 'fort') {
    total += 10
    rules.push({ rule: 'rga_fort', points: 10, trigger: 'RGA fort' })
  }
  if (input.commune?.radon_categorie === 3) {
    total += 10
    rules.push({ rule: 'radon_z3', points: 10, trigger: 'Radon catégorie 3' })
  }
  const nbRge = input.commune?.nb_rge_isolation
  if (nbRge != null && nbRge < 5) {
    total += 5
    rules.push({ rule: 'low_concurrence', points: 5, trigger: `${nbRge} RGE isolation < 5` })
  }
  if ((input.dvf?.prix_m2_growth_3y ?? 0) > 0.15) {
    total += 7
    rules.push({ rule: 'gentrif', points: 7, trigger: 'Prix m² +15% sur 3 ans' })
  }
  if (input.prospect.has_pv_36kw) {
    total -= 10
    rules.push({ rule: 'pv_existing', points: -10, trigger: 'PV ≥36kW déjà installé' })
  }
  if (
    input.iris?.decile_estime === 1 &&
    (input.iris?.thermosens_kwh_dj ?? 0) > 8000
  ) {
    total += 15
    rules.push({ rule: 'precarite_max', points: 15, trigger: 'D1 + thermosens élevée' })
  }

  total = Math.max(0, Math.min(100, total))
  const couleur = input.iris?.couleur_mpr ?? null
  const segment =
    total >= 80 ? 'ultra_chaud' :
    couleur === 'bleu' && total >= 50 ? 'mpr_bleu_prio' :
    couleur === 'rose' && total >= 60 ? 'premium' :
    total >= 40 ? 'standard' : 'cold'

  return { total, rules, segment }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'enrich-prospect', { maxRequests: 20, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json()
    if (!body.prospectId) {
      return new Response(JSON.stringify({ error: 'prospectId requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Charger prospect
    const { data: prospect, error: pErr } = await supa
      .from('brh_dpe_prospects')
      .select('id, etiquette_dpe, has_pv_36kw, iris_code, code_insee, latitude, longitude, adresse_ban')
      .eq('id', body.prospectId)
      .single<ProspectRow>()

    if (pErr || !prospect) {
      return new Response(JSON.stringify({ error: 'Prospect introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 2. Charger IRIS + commune (en parallèle)
    const [irisRes, communeRes] = await Promise.all([
      prospect.iris_code
        ? supa.from('brh_ext_iris').select('*').eq('iris_code', prospect.iris_code).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      prospect.code_insee
        ? supa.from('brh_ext_commune').select('*').eq('insee', prospect.code_insee).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    const iris = irisRes.data as IrisRow | null
    const commune = communeRes.data as CommuneRow | null

    // 3. Géorisques (cache via brh_ext_cache)
    let risques: { rga_local: 'faible' | 'moyen' | 'fort' | null } | null = null
    if (commune?.rga_alea) {
      // Fallback : utiliser commune.rga_alea déjà cached
      risques = { rga_local: commune.rga_alea }
    }

    // 4. DVF / Enedis adresse — stubs Phase 11.1 (modules complets Phase 11.2)
    const dvf = null
    const enedisAddr = null

    // 5. Compute score
    const breakdown = computeScoreV2({ prospect, iris, commune, risques, dvf, enedisAddr })

    // 6. Persister
    const { error: uErr } = await supa
      .from('brh_dpe_prospects')
      .update({
        score_v2: breakdown.total,
        score_v2_segment: breakdown.segment,
        score_v2_detail: breakdown,
        score_v2_calculated_at: new Date().toISOString(),
      })
      .eq('id', prospect.id)

    if (uErr) {
      console.error('update prospect error:', uErr.message)
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const enriched_fields: string[] = []
    if (iris) enriched_fields.push('iris')
    if (commune) enriched_fields.push('commune')
    if (risques) enriched_fields.push('risques')

    return new Response(
      JSON.stringify({
        score_v2: breakdown.total,
        segment: breakdown.segment,
        breakdown,
        enriched_fields,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('enrich-prospect error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
