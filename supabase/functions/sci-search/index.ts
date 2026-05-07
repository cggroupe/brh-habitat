/**
 * Edge Function : sci-search (Phase 19 Sprint B)
 *
 * Recherche/fetch de SCI via recherche-entreprises.api.gouv.fr (DataInfogreffe gratuit).
 * Cache dans brh_sci_companies (TTL 30j).
 *
 * 2 modes :
 *   1. Par SIREN : { siren: '123456789' }
 *   2. Par recherche libre : { q: 'SCI Quimper', departement?: '29', limit?: 20 }
 *
 * Returns : { sci: BrhSciCompany[], source: 'cache' | 'api', cached_at: ISO }
 *
 * Auth : authenticated requise.
 *
 * Doc API recherche-entreprises :
 *   https://recherche-entreprises.api.gouv.fr/docs
 *   GET /search?q=...&departement=...&naturejuridique=6540&etat_administratif=A
 *   - 6540 = SCI (Société civile immobilière)
 *   - 6541 = SCPI
 *   - On peut élargir à toutes les "personnes morales"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'
const CACHE_TTL_S = 2_592_000 // 30 jours
const FETCH_TIMEOUT_MS = 8_000

// Codes nature juridique SCI (Insee) — on accepte plusieurs variantes
const SCI_CODES = ['6540', '6541', '6543', '6551']

interface RequestBody {
  siren?: string
  q?: string
  departement?: string
  limit?: number
  /** Force le refresh du cache même si fresh (utilisé par bouton "Rafraîchir"). */
  force_refresh?: boolean
}

interface ApiDirigeant {
  nom?: string
  prenoms?: string
  qualite?: string
  date_de_naissance?: string  // format YYYY-MM ou YYYY
  type_dirigeant?: 'personne physique' | 'personne morale'
}

interface ApiResult {
  siren: string
  nom_complet?: string
  nom_raison_sociale?: string
  date_creation?: string
  date_radiation?: string
  etat_administratif?: 'A' | 'C'
  nature_juridique?: string  // libellé
  forme_juridique?: string
  activite_principale?: string
  libelle_activite_principale?: string
  tranche_effectif_salarie?: string
  capital?: number  // en euros (entiers)
  siege?: {
    adresse?: string
    code_postal?: string
    libelle_commune?: string
    departement?: string
    code_insee_commune?: string
    latitude?: string
    longitude?: string
  }
  dirigeants?: ApiDirigeant[]
}

interface CompanyRow {
  siren: string
  denomination: string
  forme_juridique: string | null
  date_creation: string | null
  date_radiation: string | null
  is_active: boolean
  adresse_complete: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  code_insee_commune: string | null
  lat: number | null
  lng: number | null
  activite_principale: string | null
  activite_libelle: string | null
  capital_social_cents: number | null
  effectif: string | null
  dirigeants: Array<{
    nom: string
    prenom: string
    qualite: string | null
    date_naissance: string | null
    est_decede: boolean
    deces_match_score: number
  }>
  has_deceased_dirigeant: boolean
  succession_probable_score: number
  raw_response: ApiResult
  fetched_at: string
}

function mapApiResultToRow(r: ApiResult): CompanyRow {
  const denomination = r.nom_raison_sociale ?? r.nom_complet ?? '(SCI sans nom)'

  // Normalise date_naissance : YYYY-MM-DD ou YYYY-MM (on complète à 01) ou YYYY (on complète à 01-01)
  const dirigeants = (r.dirigeants ?? [])
    .filter((d) => d.type_dirigeant !== 'personne morale') // on garde uniquement les personnes physiques
    .map((d) => {
      let dob: string | null = null
      if (d.date_de_naissance) {
        const parts = d.date_de_naissance.split('-')
        if (parts.length === 3) dob = d.date_de_naissance
        else if (parts.length === 2) dob = `${parts[0]}-${parts[1]}-01`
        else if (parts.length === 1 && /^\d{4}$/.test(parts[0])) dob = `${parts[0]}-01-01`
      }
      return {
        nom: (d.nom ?? '').trim(),
        prenom: (d.prenoms ?? '').trim(),
        qualite: d.qualite?.trim() ?? null,
        date_naissance: dob,
        est_decede: false,         // sera mis à jour par EF sci-deces-match
        deces_match_score: 0,
      }
    })

  return {
    siren: r.siren,
    denomination,
    forme_juridique: r.forme_juridique ?? r.nature_juridique ?? null,
    date_creation: r.date_creation ?? null,
    date_radiation: r.date_radiation ?? null,
    is_active: r.etat_administratif !== 'C',
    adresse_complete: r.siege?.adresse ?? null,
    code_postal: r.siege?.code_postal ?? null,
    commune: r.siege?.libelle_commune ?? null,
    departement: r.siege?.departement ?? null,
    code_insee_commune: r.siege?.code_insee_commune ?? null,
    lat: r.siege?.latitude ? parseFloat(r.siege.latitude) : null,
    lng: r.siege?.longitude ? parseFloat(r.siege.longitude) : null,
    activite_principale: r.activite_principale ?? null,
    activite_libelle: r.libelle_activite_principale ?? null,
    capital_social_cents: typeof r.capital === 'number' ? Math.round(r.capital * 100) : null,
    effectif: r.tranche_effectif_salarie ?? null,
    dirigeants,
    has_deceased_dirigeant: false,
    succession_probable_score: 0,
    raw_response: r,
    fetched_at: new Date().toISOString(),
  }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'sci-search', { maxRequests: 30, windowSeconds: 60 })
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

    // ---- Mode SIREN précis ----
    if (body.siren) {
      if (!/^\d{9}$/.test(body.siren)) {
        return new Response(JSON.stringify({ error: 'siren_invalid' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      // Cache check (sauf si force_refresh)
      if (!body.force_refresh) {
        const { data: cached } = await supa
          .from('brh_sci_companies')
          .select('*')
          .eq('siren', body.siren)
          .maybeSingle()

        if (cached) {
          const ageMs = Date.now() - new Date(cached.fetched_at).getTime()
          if (ageMs < CACHE_TTL_S * 1000) {
            return new Response(
              JSON.stringify({ sci: [cached], source: 'cache', cached_at: cached.fetched_at }),
              { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
            )
          }
        }
      }

      // Fetch API recherche-entreprises (dirigeants inclus par defaut)
      const url = `${API_BASE}?q=${body.siren}`
      const apiRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: 'api_unavailable', status: apiRes.status }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const data = (await apiRes.json()) as { results?: ApiResult[] }
      const result = (data.results ?? []).find((r) => r.siren === body.siren)

      if (!result) {
        return new Response(
          JSON.stringify({ sci: [], source: 'api', cached_at: new Date().toISOString() }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }

      const row = mapApiResultToRow(result)
      await supa.from('brh_sci_companies').upsert(row, { onConflict: 'siren' })

      return new Response(
        JSON.stringify({ sci: [row], source: 'api', cached_at: row.fetched_at }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Mode recherche libre ----
    if (body.q) {
      const limit = Math.min(body.limit ?? 20, 50)
      // BUG API gouv : include=dirigeants casse la recherche multi-filtres (verifie 07/05/2026).
      // Heureusement les dirigeants sont retournes par defaut.
      const params = new URLSearchParams({
        q: body.q,
        per_page: String(limit),
        // Filter SCI/PM personnes morales actives
        nature_juridique: SCI_CODES.join(','),
        etat_administratif: 'A',
      })
      if (body.departement) params.set('departement', body.departement)

      const url = `${API_BASE}?${params.toString()}`
      const apiRes = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: 'api_unavailable', status: apiRes.status }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      const data = (await apiRes.json()) as { results?: ApiResult[]; total_results?: number }
      const rows = (data.results ?? []).map(mapApiResultToRow)

      // Upsert tout en batch (ne déclenche pas de matching décès — fait à la demande)
      // ⚠️ Si l'upsert échoue (RLS, contrainte, etc.) on continue quand même —
      // les résultats API sont retournés au client même sans cache.
      let upsertError: string | null = null
      if (rows.length > 0) {
        const { error: upsErr } = await supa
          .from('brh_sci_companies')
          .upsert(rows, { onConflict: 'siren', ignoreDuplicates: false })
        if (upsErr) upsertError = upsErr.message
      }

      return new Response(
        JSON.stringify({
          sci: rows,
          source: 'api',
          cached_at: new Date().toISOString(),
          total_results: data.total_results,
          api_total: data.total_results,
          api_query: { q: body.q, departement: body.departement, codes: SCI_CODES },
          upsert_error: upsertError,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'invalid_query',
        message: 'Provide one of: { siren } | { q, departement?, limit? }',
      }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
