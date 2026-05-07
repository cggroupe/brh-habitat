/**
 * Edge Function : sci-deces-match (Phase 19 Sprint B)
 *
 * Vérifie si les dirigeants d'une SCI sont décédés via api.deces.matchid.io
 * (matching INSEE fichier des personnes décédées, gratuit, communautaire).
 *
 * Body : { siren: string } → match tous les dirigeants de la SCI
 * Returns :
 *   { siren, dirigeants_updated: N, succession_score: 0..100, matches: [...] }
 *
 * Workflow :
 *   1. Lit brh_sci_companies pour récupérer les dirigeants
 *   2. Pour chaque dirigeant avec date_naissance → query matchid.io
 *   3. Calcule score de confiance basé sur match nom/prénom/dob
 *   4. Met à jour brh_sci_companies.dirigeants[].est_decede + log brh_sci_deces_matches
 *   5. Recompute succession_probable_score via RPC SQL
 *
 * Auth : authenticated requise. Mais audit trail RGPD = admin only (RLS brh_sci_deces_matches).
 *
 * Doc matchid.io :
 *   https://deces.matchid.io/deces/api/v1/search
 *   GET ?firstName=...&lastName=...&birthDate=YYYY-MM-DD
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const MATCHID_BASE = 'https://deces.matchid.io/deces/api/v1/search'
const FETCH_TIMEOUT_MS = 8_000

interface RequestBody {
  siren?: string
}

interface MatchidPerson {
  id?: string
  name?: { first?: string[] | string; last?: string }
  birth?: { date?: string; location?: { city?: string; departmentCode?: string } }
  death?: { date?: string; location?: { city?: string; departmentCode?: string } }
}

interface MatchidResponse {
  response?: {
    persons?: MatchidPerson[]
    total?: number
  }
}

interface Dirigeant {
  nom: string
  prenom: string
  qualite: string | null
  date_naissance: string | null
  est_decede: boolean
  deces_match_score: number
}

/**
 * Normalise une chaîne pour comparaison : minuscules, sans accents, trim.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
    .trim()
}

/**
 * Calcule un score de confiance 0-100 entre un dirigeant et une persona décédée matchid.
 */
function computeMatchScore(d: Dirigeant, m: MatchidPerson): number {
  const dNom = normalize(d.nom)
  const dPrenom = normalize(d.prenom)
  const mNom = normalize(m.name?.last ?? '')
  const mPrenom = normalize(
    Array.isArray(m.name?.first) ? m.name.first.join(' ') : (m.name?.first ?? ''),
  )

  // Match nom (obligatoire pour score > 0)
  if (!dNom || !mNom || dNom !== mNom) return 0

  // Match prénom : exact OU le prénom matchid contient celui du dirigeant
  let prenomScore = 0
  if (dPrenom && mPrenom) {
    if (dPrenom === mPrenom) prenomScore = 100
    else if (mPrenom.includes(dPrenom) || dPrenom.includes(mPrenom)) prenomScore = 70
    else {
      // Premier prénom seulement (matchid renvoie souvent plusieurs prénoms)
      const mFirst = mPrenom.split(/\s+/)[0]
      if (dPrenom === mFirst) prenomScore = 80
    }
  }
  if (prenomScore === 0) return 0

  // Match date de naissance : exact / mois proche / année seule
  let dobScore = 0
  if (d.date_naissance && m.birth?.date) {
    const dDob = d.date_naissance
    const mDob = m.birth.date
    if (dDob === mDob) dobScore = 100
    else if (dDob.slice(0, 7) === mDob.slice(0, 7)) dobScore = 85
    else if (dDob.slice(0, 4) === mDob.slice(0, 4)) {
      // Même année — calcul écart en mois
      const dD = new Date(dDob)
      const mD = new Date(mDob)
      const diffMonths = Math.abs(
        (dD.getFullYear() - mD.getFullYear()) * 12 + (dD.getMonth() - mD.getMonth()),
      )
      if (diffMonths <= 2) dobScore = 75
      else if (diffMonths <= 6) dobScore = 60
      else dobScore = 50
    }
  } else if (!d.date_naissance) {
    // Pas de DOB chez le dirigeant — match basé uniquement sur nom+prénom
    dobScore = 40 // confiance modérée, à signaler
  }

  // Score composite : pondération nom+prénom (50%) + dob (50%)
  const score = Math.round(prenomScore * 0.5 + dobScore * 0.5)
  return Math.min(100, Math.max(0, score))
}

const MIN_CONFIDENCE = 60 // seuil pour flagger un dirigeant comme décédé

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'sci-deces-match', { maxRequests: 20, windowSeconds: 60 })
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
    if (!body.siren || !/^\d{9}$/.test(body.siren)) {
      return new Response(JSON.stringify({ error: 'siren_required' }), {
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

    // Lit la SCI cachée
    const { data: company, error: ce } = await supa
      .from('brh_sci_companies')
      .select('siren, dirigeants')
      .eq('siren', body.siren)
      .maybeSingle()

    if (ce) throw ce
    if (!company) {
      return new Response(JSON.stringify({ error: 'sci_not_cached' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const dirigeants = (company.dirigeants ?? []) as Dirigeant[]
    if (dirigeants.length === 0) {
      return new Response(
        JSON.stringify({ siren: body.siren, dirigeants_updated: 0, succession_score: 0, matches: [] }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const matchesLog: Array<{
      siren: string
      dirigeant_index: number
      nom: string
      prenom: string
      date_naissance: string | null
      match_found: boolean
      match_confidence: number
      deces_date: string | null
      deces_commune: string | null
      deces_departement: string | null
      source: string
      raw_response: MatchidPerson | null
    }> = []

    let updated = 0
    const updatedDirigeants: Dirigeant[] = []

    for (let i = 0; i < dirigeants.length; i++) {
      const d = dirigeants[i]
      if (!d.nom || !d.prenom) {
        updatedDirigeants.push(d)
        continue
      }

      const params = new URLSearchParams({
        firstName: d.prenom,
        lastName: d.nom,
      })
      if (d.date_naissance) params.set('birthDate', d.date_naissance)

      let bestMatch: MatchidPerson | null = null
      let bestScore = 0

      try {
        const apiRes = await fetch(`${MATCHID_BASE}?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
        if (apiRes.ok) {
          const data = (await apiRes.json()) as MatchidResponse
          const persons = data.response?.persons ?? []
          for (const p of persons) {
            const score = computeMatchScore(d, p)
            if (score > bestScore) {
              bestScore = score
              bestMatch = p
            }
          }
        }
      } catch {
        // matchid.io down ou timeout → fallback gracieux
      }

      const matchFound = bestScore >= MIN_CONFIDENCE && !!bestMatch
      const updatedD: Dirigeant = {
        ...d,
        est_decede: matchFound,
        deces_match_score: bestScore,
      }
      updatedDirigeants.push(updatedD)
      if (matchFound !== d.est_decede || bestScore !== d.deces_match_score) updated++

      matchesLog.push({
        siren: body.siren,
        dirigeant_index: i,
        nom: d.nom,
        prenom: d.prenom,
        date_naissance: d.date_naissance,
        match_found: matchFound,
        match_confidence: bestScore,
        deces_date: bestMatch?.death?.date ?? null,
        deces_commune: bestMatch?.death?.location?.city ?? null,
        deces_departement: bestMatch?.death?.location?.departmentCode ?? null,
        source: 'matchid.io',
        raw_response: bestMatch,
      })
    }

    // Update SCI avec les flags décès
    await supa
      .from('brh_sci_companies')
      .update({
        dirigeants: updatedDirigeants,
        deces_last_checked_at: new Date().toISOString(),
      })
      .eq('siren', body.siren)

    // Log audit trail (admin only via RLS)
    if (matchesLog.length > 0) {
      await supa.from('brh_sci_deces_matches').insert(matchesLog)
    }

    // Recompute succession_probable_score via RPC SQL
    await supa.rpc('brh_sci_recompute_succession_score', { p_siren: body.siren })

    // Re-fetch pour avoir le score à jour
    const { data: refreshed } = await supa
      .from('brh_sci_companies')
      .select('succession_probable_score, has_deceased_dirigeant')
      .eq('siren', body.siren)
      .maybeSingle()

    return new Response(
      JSON.stringify({
        siren: body.siren,
        dirigeants_updated: updated,
        succession_score: refreshed?.succession_probable_score ?? 0,
        has_deceased_dirigeant: refreshed?.has_deceased_dirigeant ?? false,
        // On ne renvoie pas matchesLog en clair pour préserver RGPD côté front
        matches_count: matchesLog.filter((m) => m.match_found).length,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
