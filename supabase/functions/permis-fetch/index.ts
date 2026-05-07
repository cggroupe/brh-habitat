/**
 * Edge Function : permis-fetch (Phase 19 Sprint E)
 *
 * V1 minimaliste : lecture du cache `brh_permis_construire` uniquement.
 *
 * L'ingestion massive Sit@del2 se fait via script TS standalone à exécuter
 * mensuellement (Sprint E.bis). Sit@del2 = CSV ~500 MB/mois → trop lourd pour
 * une Edge Function (limite 6s/150 MB mémoire).
 *
 * Body : { code_insee_commune?, departement?, parcelle_idu?, days_back? }
 * Returns : { permis: BrhPermisConstruire[], total: number, source: 'cache' }
 *
 * Auth : authenticated requise.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

interface RequestBody {
  code_insee_commune?: string
  departement?: string
  parcelle_idu?: string
  days_back?: number
  limit?: number
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'permis-fetch', { maxRequests: 60, windowSeconds: 60 })
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

    const limit = Math.min(body.limit ?? 50, 200)
    const daysBack = Math.min(Math.max(body.days_back ?? 365, 30), 1825) // 30j → 5 ans

    let q = supa
      .from('brh_permis_construire')
      .select('*')
      .order('date_depot', { ascending: false })
      .limit(limit)

    // Date filter
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)
    q = q.gte('date_depot', since)

    // Filtres
    if (body.parcelle_idu) q = q.eq('parcelle_idu', body.parcelle_idu)
    else if (body.code_insee_commune) q = q.eq('code_insee_commune', body.code_insee_commune)
    else if (body.departement) q = q.eq('departement', body.departement)

    const { data, error } = await q
    if (error) throw error

    return new Response(
      JSON.stringify({
        permis: data ?? [],
        total: data?.length ?? 0,
        source: 'cache',
        note: 'V1 lecture cache uniquement. Ingestion Sit@del2 mensuelle = script standalone Sprint E.bis.',
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
