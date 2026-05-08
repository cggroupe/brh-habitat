/**
 * Edge Function : georisques-fetch (Phase 11.1)
 *
 * Récupère le résumé des risques (naturels + technologiques) d'une commune
 * via l'API officielle www.georisques.gouv.fr (gratuite, illimitée).
 *
 * Cache 90 jours dans `brh_ext_cache` (source='georisques').
 *
 * Body : { code_insee: string, force_refresh?: boolean }
 * Returns : { risques: { adresse, commune, url, risquesNaturels[], risquesTechnologiques[] }, source: 'cache' | 'api' }
 *
 * Auth : authenticated requise.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const GEORISQUES_API = 'https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque'
const FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_S = 7_776_000 // 90 jours

interface RequestBody {
  code_insee?: string
  force_refresh?: boolean
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'georisques-fetch', { maxRequests: 60, windowSeconds: 60 })
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
    const cacheKey = `INSEE-${body.code_insee}`
    if (!body.force_refresh) {
      const { data: cached } = await supa
        .from('brh_ext_cache')
        .select('payload, fetched_at')
        .eq('source', 'georisques')
        .eq('cache_key', cacheKey)
        .maybeSingle()

      if (cached) {
        const ageMs = Date.now() - new Date(cached.fetched_at).getTime()
        if (ageMs < CACHE_TTL_S * 1000) {
          return new Response(
            JSON.stringify({ risques: cached.payload, source: 'cache', cached_at: cached.fetched_at }),
            { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }
      }
    }

    // Fetch live
    const url = `${GEORISQUES_API}?code_insee=${body.code_insee}`
    const apiRes = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: 'georisques_api_error', status: apiRes.status }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    const data = await apiRes.json()

    // Upsert cache (admin-only RLS, bypassed via service_role)
    await supa
      .from('brh_ext_cache')
      .upsert(
        { source: 'georisques', cache_key: cacheKey, payload: data, fetched_at: new Date().toISOString() },
        { onConflict: 'source,cache_key' },
      )

    return new Response(
      JSON.stringify({ risques: data, source: 'api', cached_at: new Date().toISOString() }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
