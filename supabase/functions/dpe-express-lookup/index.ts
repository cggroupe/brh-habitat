/**
 * Edge Function : dpe-express-lookup
 *
 * Proxy vers le simulateur BRH (FastAPI port 8915).
 * Permet à BRH Habitat (Vercel) d'appeler l'API du simulateur sans CORS issue.
 *
 * Pendant la transition Phase 6 (absorption simulateur), cette EF reste
 * un thin wrapper. Phase 6.1+ : la logique sera complètement portée côté
 * Supabase (table brh_dpe_prospects + lib TS) et l'EF sera remplacée.
 *
 * Body : { q, lat?, lng?, foyer?, rfr?, cp? }
 * Returns : payload `/api/dpe-virtuel` du simulateur
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const SIMULATEUR_URL = Deno.env.get('SIMULATEUR_BRH_URL') ?? 'http://147.93.52.70:8915'

interface RequestBody {
  q: string
  lat?: number
  lng?: number
  foyer?: number
  rfr?: number
  cp?: string
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit : 30 req/min par IP (autocomplete-style)
  const rl = checkRateLimit(req, 'dpe-express-lookup', { maxRequests: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes' }),
      { status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body: RequestBody = await req.json()
    if (!body.q || body.q.length < 3) {
      return new Response(JSON.stringify({ error: 'Adresse requise (3 caractères min)' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const params = new URLSearchParams({ q: body.q })
    if (body.lat) params.set('lat', String(body.lat))
    if (body.lng) params.set('lng', String(body.lng))
    if (body.cp) params.set('cp', body.cp)
    if (body.foyer) params.set('foyer', String(body.foyer))
    if (body.rfr) params.set('rfr', String(body.rfr))

    const res = await fetch(`${SIMULATEUR_URL}/api/dpe-virtuel?${params}`, {
      headers: { Accept: 'application/json' },
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('dpe-express-lookup error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne', details: String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
