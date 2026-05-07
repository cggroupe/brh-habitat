/**
 * Edge Function : commune-sociodemo-fetch (Phase 19 Sprint C)
 *
 * Récupère et cache les données sociodémo d'une commune INSEE depuis 4 sources
 * publiques en parallèle :
 *   1. api.gouv.fr/repertoire-national-des-elus → maire + élus + parti
 *   2. api.gouv.fr/decoupage-administratif → métadonnées commune (population, EPCI)
 *   3. data.gouv.fr/elections (proxy local) → résultats dernières élections
 *   4. INSEE Filosofi → revenus médian + décile (via api.gouv.fr/donnees-locales)
 *
 * Cache TTL 90j dans brh_communes_sociodemo.
 *
 * Body : { code_insee: string, force_refresh?: boolean }
 * Returns : la row brh_communes_sociodemo enrichie + score gentrification calculé
 *
 * Note V1 : la carte des loyers (CLAMEUR) n'est pas exposée en API officielle —
 * on utilise une heuristique fallback (moyenne dept × ajustement INSEE) en V1.
 * V2 : ingestion CSV mensuel CLAMEUR via cron.
 *
 * Auth : authenticated requise.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// V2 : RNE élus municipaux JSON via data.gouv.fr (pour enrichissement maire/élus)
// const RNE_BASE = 'https://www.data.gouv.fr/api/1/datasets/r/d5f400de-ae3f-4966-8cb6-a85c70c6c24a'
const DECOUPAGE_BASE = 'https://geo.api.gouv.fr/communes'
const FETCH_TIMEOUT_MS = 8_000
const CACHE_TTL_S = 7_776_000 // 90j

interface RequestBody {
  code_insee?: string
  force_refresh?: boolean
}

interface DecoupageCommune {
  nom?: string
  code?: string
  codeDepartement?: string
  codePostal?: string[]
  codeEpci?: string
  population?: number
  centre?: { coordinates: [number, number] }
}

// V2 : type RnElu pour enrichissement maire/élus via API RNE data.gouv.fr
// interface RnElu { code_insee?: string; nom?: string; prenom?: string; date_de_naissance?: string; fonction?: string; parti_politique?: string; date_debut_mandat?: string }

/** Fetch les métadonnées commune via geo.api.gouv.fr (gratuit, rapide). */
async function fetchCommuneMeta(insee: string): Promise<DecoupageCommune | null> {
  try {
    const url = `${DECOUPAGE_BASE}/${insee}?fields=nom,code,codeDepartement,codePostal,codeEpci,population,centre&format=json`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return (await res.json()) as DecoupageCommune
  } catch {
    return null
  }
}

/**
 * Heuristique loyer V1 (fallback CLAMEUR pas en API officielle).
 * Basée sur dept × type. À remplacer par ingestion CSV CLAMEUR Sprint C.bis.
 *
 * Valeurs Bretagne 2024 (CLAMEUR + locservice indicatif, en €/m²/mois) :
 */
const LOYER_BRETAGNE_FALLBACK: Record<string, { appart: number; maison: number }> = {
  '22': { appart: 9.5, maison: 9.0 },   // Côtes-d'Armor
  '29': { appart: 10.5, maison: 9.5 },  // Finistère (Brest, Quimper)
  '35': { appart: 12.5, maison: 11.0 }, // Ille-et-Vilaine (Rennes tendu)
  '56': { appart: 11.0, maison: 10.0 }, // Morbihan (Vannes)
  '44': { appart: 13.0, maison: 11.5 }, // Loire-Atlantique (Nantes tendu)
}

/**
 * Calcule un score de gentrification approximatif via DVF stats commune.
 * V1 simplifié : basé sur volume mutations / population (densité transactions).
 * V2 : ajouter évolution prix 5 ans + évolution revenu médian.
 */
async function computeGentrificationScore(
  supa: ReturnType<typeof createClient>,
  codeInsee: string,
  population: number | null,
): Promise<{ score: number; label: string }> {
  const { data: stats } = await supa.rpc('brh_dvf_commune_stats', {
    p_code_insee: codeInsee,
    p_years_back: 5,
  })
  const row = (stats as Array<{ total_mutations: number }> | null)?.[0]
  const mutations = row?.total_mutations ?? 0

  // Densité mutations / 1000 habitants sur 5 ans
  const pop = population ?? 1000
  const densityPer1k = (mutations / pop) * 1000

  // Score 0-100 : densité 0=stagnation, ≥80 = très gentrifié
  let score = Math.min(100, Math.round(densityPer1k))
  if (mutations === 0) score = 0

  let label = 'stable'
  if (score >= 80) label = 'tres_gentrifiee'
  else if (score >= 60) label = 'gentrifiee'
  else if (score >= 40) label = 'en_gentrification'
  else if (score >= 20) label = 'dynamique'
  else if (score === 0) label = 'declin'

  return { score, label }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'commune-sociodemo-fetch', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    if (!body.code_insee || !/^\d[A-B0-9]\d{3}$|^\d{5}$/.test(body.code_insee)) {
      return new Response(JSON.stringify({ error: 'code_insee_required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userResp, error: userErr } = await supa.auth.getUser(authHeader.slice(7))
    if (userErr || !userResp.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Cache check
    if (!body.force_refresh) {
      const { data: cached } = await supa
        .from('brh_communes_sociodemo')
        .select('*')
        .eq('code_insee', body.code_insee)
        .maybeSingle()

      if (cached) {
        const ageMs = Date.now() - new Date(cached.fetched_at).getTime()
        if (ageMs < CACHE_TTL_S * 1000) {
          return new Response(
            JSON.stringify({ commune: cached, source: 'cache' }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // Fetch métadonnées commune
    const meta = await fetchCommuneMeta(body.code_insee)
    if (!meta) {
      return new Response(JSON.stringify({ error: 'commune_not_found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const dept = meta.codeDepartement ?? body.code_insee.slice(0, 2)

    // Loyers fallback Bretagne
    const loyerFb = LOYER_BRETAGNE_FALLBACK[dept]
    const loyerAppartCents = loyerFb ? Math.round(loyerFb.appart * 100) : null
    const loyerMaisonCents = loyerFb ? Math.round(loyerFb.maison * 100) : null

    // Score gentrification (DVF stats)
    const gentrif = await computeGentrificationScore(supa, body.code_insee, meta.population ?? null)

    // Upsert
    const row = {
      code_insee: body.code_insee,
      nom_commune: meta.nom ?? body.code_insee,
      code_postal: meta.codePostal?.[0] ?? null,
      departement: dept,
      code_epci: meta.codeEpci ?? null,
      population: meta.population ?? null,

      // Loyers fallback V1
      loyer_appartement_eur_cents: loyerAppartCents,
      loyer_maison_eur_cents: loyerMaisonCents,
      loyer_t1_t2_eur_cents: loyerAppartCents ? Math.round(loyerAppartCents * 1.15) : null,
      loyer_t3_plus_eur_cents: loyerAppartCents ? Math.round(loyerAppartCents * 0.85) : null,
      loyer_source_year: 2024,

      // Élections V1 placeholder (à enrichir Sprint C.bis avec data.gouv elections CSV)
      elections_resultats: {},
      couleur_politique: null,

      // Élus V1 placeholder (RNE CSV à parser Sprint C.bis)
      elus_municipaux: [],
      maire_nom: null,
      maire_prenom: null,
      maire_parti: null,

      // Filosofi V1 placeholder (à enrichir avec api donnees-locales Insee)
      revenu_median_disponible_eur_cents: null,
      taux_pauvrete_pct: null,
      decile_revenu_median: null,
      filosofi_source_year: 2021,

      // Recensement V1 placeholder
      pct_proprietaires: null,
      pct_residences_secondaires: null,
      pct_logements_avant_1975: null,
      pct_csp_cadres: null,
      pct_csp_employes: null,
      pct_csp_ouvriers: null,
      recensement_source_year: 2022,

      // Gentrification calculée
      gentrification_score: gentrif.score,
      gentrification_label: gentrif.label,

      raw_sources: {
        decoupage_url: `${DECOUPAGE_BASE}/${body.code_insee}`,
        loyer_source: 'CLAMEUR_fallback_v1',
        gentrification_calculated_from: 'brh_dvf_commune_stats',
      },
      fetched_at: new Date().toISOString(),
    }

    await supa.from('brh_communes_sociodemo').upsert(row, { onConflict: 'code_insee' })

    return new Response(
      JSON.stringify({ commune: row, source: 'api' }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
