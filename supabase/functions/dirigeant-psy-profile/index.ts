/**
 * Edge Function : dirigeant-psy-profile
 *
 * Sprint 1.7 (27/05) — Génération d'un profil psycho-commercial structuré
 * pour un dirigeant SCI/société, depuis :
 *   - identité (nom, prénom, ville)
 *   - patrimoine SCI (count + classes DPE)
 *   - autres entreprises dirigées
 *   - historique BRH (client/prospect, CA, RDV)
 *   - contacts pro disponibles
 *
 * Le profil sert au commercial à préparer un appel/visite. Cible : 2-3 phrases
 * pour cerner la motivation probable + un angle d'accroche concret.
 *
 * Body : { nom: string, prenom?: string }
 * Returns : { profile: PsyProfile, generated_at, usage }
 *
 * Persiste dans brh_dirigeants.psy_profile (jsonb) + psy_profile_generated_at.
 *
 * Rate limit : 3/min/IP (anti-abus, coût IA).
 * Auth : Bearer token Supabase obligatoire (RLS via JWT).
 * Modèle : claude-opus-4-7 + prompt caching system prompt.
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-7'

interface RequestBody {
  nom: string
  prenom?: string
}

interface DirigeantRow {
  id: number | string
  nom: string | null
  prenom: string | null
  date_naissance: string | null
  est_decede: boolean | null
  deces_date: string | null
  autres_entreprises: unknown
  autres_entreprises_match_count: number | null
  tel_pro_via_entreprise: string | null
  email_pro_via_entreprise: string | null
  osint_telephone: string | null
  osint_email: string | null
  osint_linkedin: string | null
  psy_profile: unknown
  psy_profile_generated_at: string | null
}

interface PatrimoineSummary {
  total_dpe: number
  total_sci: number
  by_dpe_class: Record<string, number>
  communes_top: Array<{ commune: string; count: number }>
  score_vente_max: number | null
  score_vente_avg: number | null
}

interface BrhHistorique {
  is_client: boolean
  is_prospect: boolean
  ca_total: number | null
  premiere_facture: string | null
  derniere_facture: string | null
  rdv_count: number | null
}

interface PsyProfile {
  version: '1.0'
  generated_at: string
  model: string
  summary: string
  motivations: string[]
  pain_points: string[]
  best_approach: string
  red_flags: string[]
}

const SYSTEM_PROMPT = `Tu es analyste commercial senior pour BRH Habitat (cabinet d'audit énergétique breton). On te transmet le portrait factuel d'un dirigeant de SCI / chef d'entreprise breton. Tu produis un profil psycho-commercial structuré en JSON, court et utile pour un commercial qui prépare un appel ou une visite.

Contraintes obligatoires :
- Aucune invention. Si une info manque, dis-le ("inconnu", "à confirmer").
- Pas de jargon RH, pas de "synergies", pas de "growth mindset".
- Reste factuel, sobre, comme une note interne entre commerciaux.
- Pas de pronostic médical/psychiatrique. Reste sur les motivations commerciales probables.
- Si le dirigeant est décédé : signale-le en red_flag #1 et adapte les motivations en "succession à venir, héritiers à identifier".
- Si l'utility-flag est levé (ENEDIS/ORANGE/SNCF) : aucun profil, retourne summary="Personne morale utility — pas de prospection individuelle".

Format JSON STRICT (RAW, pas de markdown fenced blocks) :
{
  "version": "1.0",
  "summary": "2-3 phrases factuelles décrivant qui est cette personne et son potentiel commercial",
  "motivations": ["motivation 1 (concrète, 1 phrase)", "motivation 2", "motivation 3"],
  "pain_points": ["pain 1 (problème probable que BRH peut résoudre)", "pain 2"],
  "best_approach": "Phrase d'accroche commerciale recommandée (1-2 phrases, ton sobre)",
  "red_flags": ["flag 1 (signal d'alerte commercial)"]
}

Règles spécifiques BRH :
- Si patrimoine SCI > 50 DPE : c'est un patrimoine bailleur sérieux, ton respectueux, parle CAPEX et planning pluriannuel.
- Si beaucoup de DPE F ou G : urgence loi Climat&Résilience (interdiction location G dès 2025, F dès 2028).
- Si déjà client BRH : ton plus chaleureux, mentionne la continuité de la relation.
- Si prospect avec CA > 0 : appui sur la relation existante.
- Si zéro contact direct disponible : red_flag "pas de contact direct — chercher LinkedIn ou passer par la SCI".`

interface ClaudeContent {
  type: string
  text?: string
}

interface ClaudeResponse {
  content: ClaudeContent[]
  usage: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

function normalizeNameDb(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function buildUserMessage(
  dir: DirigeantRow,
  patrimoine: PatrimoineSummary,
  historique: BrhHistorique | null,
  autresEntreprisesNames: string[],
): string {
  const lines: string[] = []
  lines.push(`## Identité`)
  lines.push(`- Nom : ${dir.prenom ?? ''} ${dir.nom ?? ''}`.trim())
  if (dir.date_naissance) lines.push(`- Date naissance : ${dir.date_naissance}`)
  if (dir.est_decede && dir.deces_date) lines.push(`- ⚠️ DÉCÉDÉ le ${dir.deces_date}`)

  lines.push(``)
  lines.push(`## Patrimoine SCI`)
  lines.push(`- Total DPE détenus : ${patrimoine.total_dpe}`)
  lines.push(`- Nombre de SCI dirigées : ${patrimoine.total_sci}`)
  if (Object.keys(patrimoine.by_dpe_class).length > 0) {
    lines.push(`- Classes DPE : ${Object.entries(patrimoine.by_dpe_class).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  }
  if (patrimoine.communes_top.length > 0) {
    lines.push(`- Communes principales : ${patrimoine.communes_top.map((c) => `${c.commune} (${c.count})`).join(', ')}`)
  }
  if (patrimoine.score_vente_max != null) {
    lines.push(`- Score Vente Phase 16 max : ${patrimoine.score_vente_max}/100 (moy ${patrimoine.score_vente_avg})`)
  }

  lines.push(``)
  lines.push(`## Autres entreprises dirigées`)
  if (autresEntreprisesNames.length === 0) {
    lines.push(`- Aucune autre entreprise connue.`)
  } else {
    lines.push(`- ${autresEntreprisesNames.slice(0, 8).join(' · ')}${autresEntreprisesNames.length > 8 ? ` (+${autresEntreprisesNames.length - 8} autres)` : ''}`)
  }

  lines.push(``)
  lines.push(`## Historique BRH`)
  if (!historique) {
    lines.push(`- Aucun historique BRH (jamais client ni prospect).`)
  } else {
    lines.push(`- Statut : ${historique.is_client ? 'CLIENT' : historique.is_prospect ? 'PROSPECT' : 'inconnu'}`)
    if (historique.ca_total != null) lines.push(`- CA cumulé : ${historique.ca_total} €`)
    if (historique.premiere_facture) lines.push(`- Première facture : ${historique.premiere_facture}`)
    if (historique.derniere_facture) lines.push(`- Dernier RDV/facture : ${historique.derniere_facture}`)
    if (historique.rdv_count != null) lines.push(`- Nombre RDV : ${historique.rdv_count}`)
  }

  lines.push(``)
  lines.push(`## Contacts disponibles`)
  const contacts: string[] = []
  if (dir.tel_pro_via_entreprise) contacts.push(`tel pro entreprise : ${dir.tel_pro_via_entreprise}`)
  if (dir.email_pro_via_entreprise) contacts.push(`email pro entreprise : ${dir.email_pro_via_entreprise}`)
  if (dir.osint_telephone) contacts.push(`tel OSINT : ${dir.osint_telephone}`)
  if (dir.osint_email) contacts.push(`email OSINT : ${dir.osint_email}`)
  if (dir.osint_linkedin) contacts.push(`LinkedIn : ${dir.osint_linkedin}`)
  lines.push(contacts.length > 0 ? `- ${contacts.join('\n- ')}` : `- AUCUN contact direct.`)

  lines.push(``)
  lines.push(`Génère le profil JSON strict maintenant.`)
  return lines.join('\n')
}

function parseClaudeJson(raw: string): Omit<PsyProfile, 'version' | 'generated_at' | 'model'> {
  // Strip markdown fences si Claude en met malgré la consigne
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    summary: String(parsed.summary ?? ''),
    motivations: Array.isArray(parsed.motivations) ? parsed.motivations.map(String) : [],
    pain_points: Array.isArray(parsed.pain_points) ? parsed.pain_points.map(String) : [],
    best_approach: String(parsed.best_approach ?? ''),
    red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map(String) : [],
  }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const rl = checkRateLimit(req, 'dirigeant-psy-profile', { maxRequests: 3, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as RequestBody
    if (!body.nom || typeof body.nom !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing nom' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
      global: { headers: { Authorization: auth } },
    })

    // 1) Verify caller is authenticated (Supabase RLS via JWT)
    const { data: user, error: userErr } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
    if (userErr || !user?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const nomNorm = normalizeNameDb(body.nom)
    const prenomNorm = body.prenom ? normalizeNameDb(body.prenom) : ''

    // 2) Fetch dirigeant (best match)
    let dirQuery = supabase
      .from('brh_dirigeants')
      .select('id, nom, prenom, date_naissance, est_decede, deces_date, autres_entreprises, autres_entreprises_match_count, tel_pro_via_entreprise, email_pro_via_entreprise, osint_telephone, osint_email, osint_linkedin, psy_profile, psy_profile_generated_at')
      .eq('nom_norm', nomNorm)
      .limit(5)
    if (prenomNorm) dirQuery = dirQuery.eq('prenom_norm', prenomNorm)
    const { data: dirs, error: dirErr } = await dirQuery
    if (dirErr) throw dirErr
    if (!dirs || dirs.length === 0) {
      return new Response(JSON.stringify({ error: 'Dirigeant introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const dir = ([...dirs] as DirigeantRow[]).sort(
      (a, b) => (b.autres_entreprises_match_count ?? 0) - (a.autres_entreprises_match_count ?? 0),
    )[0]

    // 3) Patrimoine via SCI : on récupère les SIREN où la personne est dirigeante
    const { data: sciRows } = await supabase
      .from('brh_sci_companies')
      .select('siren, denomination, is_utility, dirigeants')
      .not('dirigeants', 'is', null)
      .limit(2000)
    const mySirens: string[] = []
    for (const row of (sciRows ?? []) as Array<Record<string, unknown>>) {
      const arr = Array.isArray(row.dirigeants) ? (row.dirigeants as Array<Record<string, unknown>>) : []
      const me = arr.find(
        (d) =>
          normalizeNameDb(String(d.nom ?? '')) === nomNorm &&
          (!prenomNorm || normalizeNameDb(String(d.prenom ?? '')).includes(prenomNorm)),
      )
      if (me && row.is_utility !== true) mySirens.push(String(row.siren))
    }

    const patrimoine: PatrimoineSummary = {
      total_dpe: 0,
      total_sci: mySirens.length,
      by_dpe_class: {},
      communes_top: [],
      score_vente_max: null,
      score_vente_avg: null,
    }
    if (mySirens.length > 0) {
      const { data: dpeRows } = await supabase
        .from('brh_dpe_prospects')
        .select('id, commune, etiquette_dpe')
        .in('owner_siren', mySirens)
        .limit(5000)
      const rows = (dpeRows ?? []) as Array<{ id: number; commune: string | null; etiquette_dpe: string | null }>
      patrimoine.total_dpe = rows.length
      const byClass: Record<string, number> = {}
      const byCommune: Record<string, number> = {}
      const ids: number[] = []
      for (const r of rows) {
        if (r.etiquette_dpe) byClass[r.etiquette_dpe] = (byClass[r.etiquette_dpe] ?? 0) + 1
        if (r.commune) byCommune[r.commune] = (byCommune[r.commune] ?? 0) + 1
        ids.push(r.id)
      }
      patrimoine.by_dpe_class = byClass
      patrimoine.communes_top = Object.entries(byCommune)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([commune, count]) => ({ commune, count }))

      if (ids.length > 0) {
        const { data: sv } = await supabase
          .from('brh_score_vente_v1')
          .select('score')
          .in('prospect_id', ids)
        const scores = (sv ?? []).map((s) => Number((s as { score: number }).score)).filter((x) => !Number.isNaN(x))
        if (scores.length > 0) {
          patrimoine.score_vente_max = Math.max(...scores)
          patrimoine.score_vente_avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }
      }
    }

    // 4) Historique BRH (best-effort)
    let historique: BrhHistorique | null = null
    const { data: clients } = await supabase
      .from('brh_clients')
      .select('id, ca_total, premiere_facture, derniere_facture')
      .eq('nom_norm', nomNorm)
      .limit(3)
    if (clients && clients.length > 0) {
      const c = clients[0] as { ca_total: number | null; premiere_facture: string | null; derniere_facture: string | null }
      historique = {
        is_client: true,
        is_prospect: false,
        ca_total: c.ca_total,
        premiere_facture: c.premiere_facture,
        derniere_facture: c.derniere_facture,
        rdv_count: null,
      }
    }

    // 5) Autres entreprises (synthèse noms)
    const autresRaw = Array.isArray(dir.autres_entreprises) ? (dir.autres_entreprises as Array<Record<string, unknown>>) : []
    const autresNoms = autresRaw.map((e) => String(e.denomination ?? '')).filter(Boolean)

    // 6) Appel Claude
    const userMessage = buildUserMessage(dir, patrimoine, historique, autresNoms)
    const t0 = Date.now()
    const claudeResp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
    if (!claudeResp.ok) {
      const errBody = await claudeResp.text()
      throw new Error(`Claude API ${claudeResp.status}: ${errBody}`)
    }
    const claudeData = (await claudeResp.json()) as ClaudeResponse
    const duration = Date.now() - t0

    const textBlock = claudeData.content.find((c) => c.type === 'text')
    if (!textBlock?.text) throw new Error('Claude returned no text')

    const parsed = parseClaudeJson(textBlock.text)
    const generated_at = new Date().toISOString()
    const profile: PsyProfile = {
      version: '1.0',
      generated_at,
      model: MODEL,
      ...parsed,
    }

    // 7) Persiste sur brh_dirigeants
    const { error: updErr } = await supabase
      .from('brh_dirigeants')
      .update({
        psy_profile: profile as unknown,
        psy_profile_generated_at: generated_at,
      })
      .eq('id', dir.id)
    if (updErr) console.error('persist psy_profile error:', updErr)

    return new Response(
      JSON.stringify({
        profile,
        generated_at,
        usage: {
          input_tokens: claudeData.usage.input_tokens ?? 0,
          output_tokens: claudeData.usage.output_tokens ?? 0,
          cache_read_input_tokens: claudeData.usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: claudeData.usage.cache_creation_input_tokens ?? 0,
        },
        duration_ms: duration,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('dirigeant-psy-profile error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
