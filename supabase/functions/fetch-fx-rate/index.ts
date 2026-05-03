/**
 * Edge Function : fetch-fx-rate (Phase 14.1)
 *
 * Récupère le taux de change USD/EUR (ou autres) depuis ECB via frankfurter.app
 * (gratuit, pas de clé API, basé sur ECB official rates).
 *
 * Cache 24h dans `brh_ext_cache` (réutilise le pattern Phase 11.1).
 *
 * Body : { from?: 'USD', to?: 'EUR' }  (par défaut USD→EUR pour Anthropic pricing)
 * Returns : { rate: 0.92, source: 'cache' | 'api', date: '2026-05-03' }
 *
 * Pas d'auth requise (lecture publique, rate-limit anti-bruteforce).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

interface RequestBody {
  from?: string
  to?: string
}

const CACHE_TTL_S = 24 * 60 * 60 // 24h

interface CacheEntry {
  payload: { rate: number; date: string }
  fetched_at: string
  ttl_seconds: number
}

function isCacheFresh(entry: CacheEntry): boolean {
  const fetched = new Date(entry.fetched_at).getTime()
  return Date.now() - fetched < entry.ttl_seconds * 1000
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit léger (60/min, anti-spam)
  const rl = checkRateLimit(req, 'fetch-fx-rate', { maxRequests: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const from = (body.from ?? 'USD').toUpperCase()
    const to = (body.to ?? 'EUR').toUpperCase()
    const cacheKey = `${from}-${to}`

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Lookup cache
    const { data: cached } = await supa
      .from('brh_ext_cache')
      .select('payload,fetched_at,ttl_seconds')
      .eq('source', 'frankfurter_fx')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (cached && isCacheFresh(cached as CacheEntry)) {
      const c = cached as unknown as CacheEntry
      return new Response(
        JSON.stringify({ ...c.payload, source: 'cache' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Fetch frankfurter.app (ECB rates)
    const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`
    const fxRes = await fetch(url)
    if (!fxRes.ok) {
      // Fallback : si frankfurter down, retourne le cache même expiré, sinon valeur par défaut 0.92
      if (cached) {
        const c = cached as unknown as CacheEntry
        return new Response(
          JSON.stringify({ ...c.payload, source: 'cache_stale' }),
          { headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify({ rate: 0.92, date: '2024-01-01', source: 'fallback' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const fxData = (await fxRes.json()) as { date: string; rates: Record<string, number> }
    const rate = fxData.rates?.[to]
    if (!rate || typeof rate !== 'number') {
      return new Response(
        JSON.stringify({ error: `Pas de taux ${from}/${to} dans la réponse` }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const payload = { rate, date: fxData.date }

    // 3. Stocke en cache (best-effort)
    await supa.from('brh_ext_cache').upsert(
      {
        source: 'frankfurter_fx',
        cache_key: cacheKey,
        payload,
        fetched_at: new Date().toISOString(),
        ttl_seconds: CACHE_TTL_S,
      },
      { onConflict: 'source,cache_key' },
    )

    return new Response(
      JSON.stringify({ ...payload, source: 'api' }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('fetch-fx-rate error:', err)
    return new Response(
      JSON.stringify({ rate: 0.92, date: '2024-01-01', source: 'error_fallback', error: err instanceof Error ? err.message : String(err) }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
