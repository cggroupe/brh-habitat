/**
 * Edge Function : georisques-lookup
 *
 * Wrapper API Géorisques (BRGM/MTE) avec cache Supabase 90j (TTL_SECONDS = 7_776_000).
 *
 * Phase 11.1 — Tier 1 socle scoring.
 * Référence : docs/wiki/external-data-sources.md § Edge Functions.
 *
 * Body : { codeInsee: string, lat?: number, lng?: number }
 * Returns : { rga, radon, inondation, cavites, agg: RisquesAdresse, source: 'cache'|'api' }
 *
 * Source : https://www.georisques.gouv.fr/doc-api
 * Rate limit : 30/min/IP
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEORISQUES_API = 'https://georisques.gouv.fr/api/v1'
const CACHE_TTL_S = 7_776_000 // 90j

interface RequestBody {
  codeInsee: string
  lat?: number
  lng?: number
}

interface CacheEntry {
  payload: unknown
  fetched_at: string
  ttl_seconds: number
}

async function getCache(supa: ReturnType<typeof createClient>, codeInsee: string): Promise<CacheEntry | null> {
  const { data, error } = await supa
    .from('brh_ext_cache')
    .select('payload, fetched_at, ttl_seconds')
    .eq('source', 'georisques')
    .eq('cache_key', `commune:${codeInsee}`)
    .maybeSingle()
  if (error || !data) return null
  return data as CacheEntry
}

function isCacheFresh(entry: CacheEntry): boolean {
  const fetched = new Date(entry.fetched_at).getTime()
  const now = Date.now()
  return now - fetched < entry.ttl_seconds * 1000
}

async function setCache(
  supa: ReturnType<typeof createClient>,
  codeInsee: string,
  payload: unknown,
): Promise<void> {
  await supa.from('brh_ext_cache').upsert(
    {
      source: 'georisques',
      cache_key: `commune:${codeInsee}`,
      payload,
      fetched_at: new Date().toISOString(),
      ttl_seconds: CACHE_TTL_S,
    },
    { onConflict: 'source,cache_key' },
  )
}

async function fetchAllGeorisques(codeInsee: string): Promise<{
  rga: unknown
  radon: unknown
  inondation: unknown
  cavites: unknown
}> {
  const urls = {
    rga: `${GEORISQUES_API}/rga?code_insee=${codeInsee}`,
    radon: `${GEORISQUES_API}/radon?code_insee=${codeInsee}`,
    inondation: `${GEORISQUES_API}/risques?code_insee=${codeInsee}&rayon=200`,
    cavites: `${GEORISQUES_API}/cavites?code_insee=${codeInsee}`,
  }

  const [rga, radon, inondation, cavites] = await Promise.all([
    fetch(urls.rga).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(urls.radon).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(urls.inondation).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(urls.cavites).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])

  return { rga, radon, inondation, cavites }
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'georisques-lookup', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json()
    if (!body.codeInsee || !/^\d{5}$|^2[AB]\d{3}$/.test(body.codeInsee)) {
      return new Response(JSON.stringify({ error: 'codeInsee requis (5 caractères)' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Lookup cache
    const cached = await getCache(supa, body.codeInsee)
    if (cached && isCacheFresh(cached)) {
      return new Response(
        JSON.stringify({ ...cached.payload as object, source: 'cache' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Fetch APIs Géorisques en parallèle
    const payload = await fetchAllGeorisques(body.codeInsee)

    // 3. Store cache (best-effort)
    await setCache(supa, body.codeInsee, payload)

    return new Response(
      JSON.stringify({ ...payload, source: 'api' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('georisques-lookup error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
