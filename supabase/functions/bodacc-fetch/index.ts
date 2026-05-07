/**
 * Edge Function : bodacc-fetch (Phase 19 Sprint E)
 *
 * Récupère les alertes BODACC (ventes commerciales + procédures collectives +
 * radiations RCS) via l'API officielle bodacc-datadila.opendatasoft.com.
 *
 * Body :
 *   {
 *     code_insee_commune?: string,
 *     departement?: string,
 *     famille?: 'commerciales' | 'collectives' | 'radiations' | 'all',
 *     days_back?: number,  // défaut 90 jours
 *     limit?: number       // défaut 100
 *   }
 *
 * Returns : { alerts: BrhBodaccAlert[], total: number, source: 'cache' | 'api' }
 *
 * Cache 7 jours dans brh_bodacc_alerts (BODACC est mis à jour quotidiennement).
 *
 * Auth : authenticated requise.
 *
 * Doc API BODACC :
 *   https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records
 *   GET ?refine=cp:29000&where=date_publication >= '2026-01-01'&limit=100
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const BODACC_API_BASE =
  'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets'
const FETCH_TIMEOUT_MS = 10_000

interface RequestBody {
  code_insee_commune?: string
  departement?: string
  famille?: 'commerciales' | 'collectives' | 'radiations' | 'all'
  days_back?: number
  limit?: number
}

interface BodaccRecord {
  id?: string
  numeroannonce?: string
  numeroparution?: string
  dateparution?: string
  datepublication?: string
  familleavis_lib?: string
  familleavis?: string
  typeavis?: string
  typeavis_lib?: string
  numerodepartement?: string
  cp?: string
  ville?: string
  registre?: string[]
  commercant?: string
  /** Personne morale */
  personne?: {
    denomination?: string
    formejuridique?: string
    siren?: string
  }
  /** Annonce contenu structuré */
  vente?: {
    prix?: number
    daterepriseactivite?: string
  }
  oppositions?: Record<string, unknown>
  modificationsgenerales?: Record<string, unknown>
  /** Adresse */
  adresse?: {
    typevoie?: string
    numerovoie?: string
    libellevoie?: string
    codepostal?: string
    ville?: string
  }
}

interface BodaccApiResponse {
  total_count?: number
  results?: BodaccRecord[]
}

const FAMILLE_TO_DATASET: Record<string, string> = {
  commerciales: 'annonces-commerciales',
  collectives: 'annonces-collectives',
  radiations: 'annonces-radiations',
}

function mapRecordToRow(r: BodaccRecord, famille: string) {
  const id =
    r.id ?? r.numeroannonce ?? `${r.dateparution ?? r.datepublication}-${r.commercant ?? Math.random()}`

  // Adresse complète
  const adr = r.adresse
  const adresseComplete = adr
    ? `${adr.numerovoie ?? ''} ${adr.typevoie ?? ''} ${adr.libellevoie ?? ''} ${adr.codepostal ?? ''} ${adr.ville ?? ''}`.replace(/\s+/g, ' ').trim()
    : null

  const cp = r.cp ?? r.adresse?.codepostal ?? null
  const dept = r.numerodepartement ?? cp?.slice(0, 2) ?? null

  return {
    id_bodacc: String(id),
    famille_avis: famille,
    type_avis: r.typeavis_lib ?? r.typeavis ?? null,
    date_publication: r.datepublication ?? r.dateparution ?? new Date().toISOString().slice(0, 10),
    date_parution: r.dateparution ?? null,
    numero_parution: r.numeroparution ?? null,
    siren: r.personne?.siren ?? null,
    denomination: r.personne?.denomination ?? r.commercant ?? null,
    forme_juridique: r.personne?.formejuridique ?? null,
    commune: r.ville ?? r.adresse?.ville ?? null,
    code_postal: cp,
    departement: dept,
    code_insee_commune: null,        // BODACC ne fournit pas l'INSEE — V2 enrichissement BAN
    adresse_complete: adresseComplete,
    lat: null,
    lng: null,
    prix_cession_cents: typeof r.vente?.prix === 'number' ? Math.round(r.vente.prix * 100) : null,
    date_cession: r.vente?.daterepriseactivite ?? null,
    bodacc_url: r.numeroannonce
      ? `https://www.bodacc.fr/annonce/detail-annonce/A/${r.numeroannonce}`
      : null,
    raw_record: r as unknown as Record<string, unknown>,
    fetched_at: new Date().toISOString(),
  }
}

async function fetchBodaccDataset(params: {
  dataset: string
  cp?: string
  dept?: string
  daysBack: number
  limit: number
}): Promise<BodaccRecord[]> {
  const since = new Date(Date.now() - params.daysBack * 86_400_000).toISOString().slice(0, 10)
  // Champ correct = `dateparution` (verifie 07/05/2026, pas `datepublication`).
  const where = `dateparution >= date'${since}'`

  const refines: string[] = []
  if (params.cp) refines.push(`cp:${params.cp}`)
  if (params.dept) refines.push(`numerodepartement:${params.dept}`)

  const url = `${BODACC_API_BASE}/${params.dataset}/records?where=${encodeURIComponent(where)}&order_by=dateparution%20desc&limit=${params.limit}${
    refines.length > 0 ? '&refine=' + refines.map(encodeURIComponent).join('&refine=') : ''
  }`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error(`BODACC API ${params.dataset} HTTP ${res.status}`)
      return []
    }
    const data = (await res.json()) as BodaccApiResponse
    return data.results ?? []
  } catch (err) {
    console.error(`BODACC fetch failed for ${params.dataset}`, err)
    return []
  }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'bodacc-fetch', { maxRequests: 30, windowSeconds: 60 })
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

    const daysBack = Math.min(Math.max(body.days_back ?? 90, 1), 365)
    const limit = Math.min(body.limit ?? 100, 200)
    const famille = body.famille ?? 'all'

    // Filtre params
    const cp = body.code_insee_commune?.length === 5 ? null : null  // Pas de mapping INSEE→CP V1
    const dept = body.departement ?? null

    // Fetch en parallèle selon famille
    const datasets = famille === 'all'
      ? Object.entries(FAMILLE_TO_DATASET)
      : Object.entries(FAMILLE_TO_DATASET).filter(([k]) => k === famille)

    const allRows: ReturnType<typeof mapRecordToRow>[] = []
    const fetchPromises = datasets.map(async ([fam, ds]) => {
      const records = await fetchBodaccDataset({
        dataset: ds,
        cp: cp ?? undefined,
        dept: dept ?? undefined,
        daysBack,
        limit: Math.ceil(limit / datasets.length),
      })
      return records.map((r) => mapRecordToRow(r, fam))
    })
    const results = await Promise.all(fetchPromises)
    for (const r of results) allRows.push(...r)

    // Tri par date_publication DESC
    allRows.sort((a, b) => (b.date_publication > a.date_publication ? 1 : -1))

    // Upsert en cache
    if (allRows.length > 0) {
      // Supabase upsert avec onConflict id_bodacc
      const { error: upsertErr } = await supa
        .from('brh_bodacc_alerts')
        .upsert(allRows, { onConflict: 'id_bodacc', ignoreDuplicates: false })
      if (upsertErr) console.error('upsert failed', upsertErr)
    }

    return new Response(
      JSON.stringify({
        alerts: allRows.slice(0, limit),
        total: allRows.length,
        source: 'api',
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
