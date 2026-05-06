/**
 * Edge Function : autaf-recommendations-fetch (Phase 18.8)
 *
 * Récupère les recommandations AUTAF read-only pour un autaf_user_id donné.
 * Utilise le token API AUTAF stocké dans `brh_autaf_link` pour authentifier
 * la requête côté autaf.fr.
 *
 * Body : { autaf_user_id: string }
 * Returns :
 *   { available: true, recommendations: [...] }   — succès
 *   { available: false, error: 'bridge_inactive' } — pas de bridge / inactif
 *   { available: false, error: 'autaf_unavailable' } — API AUTAF KO
 *
 * Spec API AUTAF attendue (voir docs/wiki/autaf-bridge.md) :
 *   GET https://www.autaf.fr/wp-json/autaf/v1/recommendations/:user_id
 *   Authorization: Bearer <token>
 *   Returns: [{ id, metier, body, author_name, created_at }]
 *
 * Auth Supabase requise (header Authorization Bearer JWT user).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const AUTAF_API_BASE = 'https://www.autaf.fr/wp-json/autaf/v1'

interface RequestBody {
  autaf_user_id?: string
}

interface AutafRecommendation {
  id: string
  metier: string | null
  body: string | null
  author_name: string | null
  created_at: string
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit anti-spam
  const rl = checkRateLimit(req, 'autaf-recommendations-fetch', {
    maxRequests: 60,
    windowSeconds: 60,
  })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json().catch(() => ({}))
    const autafUserId = body.autaf_user_id?.trim()
    if (!autafUserId) {
      return new Response(
        JSON.stringify({ available: false, error: 'autaf_user_id required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Auth check : JWT user dans le header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ available: false, error: 'unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Service role pour lire le token sans contraintes RLS sur les tokens chiffrés
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Vérification user authentifié
    const { data: userResp, error: userErr } = await supa.auth.getUser(authHeader.slice(7))
    if (userErr || !userResp.user) {
      return new Response(
        JSON.stringify({ available: false, error: 'unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Récupérer le bridge AUTAF du user qui demande (pas du autaf_user_id ciblé)
    // Note : le viewer doit avoir SON propre bridge actif pour fetcher les recos d'autrui
    const { data: link } = await supa
      .from('brh_autaf_link')
      .select('oauth_access_token_encrypted, is_active, scopes')
      .eq('profile_id', userResp.user.id)
      .maybeSingle()

    if (!link?.is_active) {
      return new Response(
        JSON.stringify({
          available: false,
          recommendations: [],
          error: 'bridge_inactive',
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!link.scopes?.includes('read_recommendations')) {
      return new Response(
        JSON.stringify({
          available: false,
          recommendations: [],
          error: 'scope_missing',
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Appel API AUTAF
    const autafUrl = `${AUTAF_API_BASE}/recommendations/${encodeURIComponent(autafUserId)}`
    let autafRes: Response
    try {
      autafRes = await fetch(autafUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${link.oauth_access_token_encrypted}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      // AUTAF API down / réseau / timeout → fallback gracieux
      // Marquer last_error pour traçabilité (sans bloquer)
      await supa
        .from('brh_autaf_link')
        .update({ last_error: 'autaf_unavailable', last_sync_at: new Date().toISOString() })
        .eq('profile_id', userResp.user.id)

      return new Response(
        JSON.stringify({
          available: false,
          recommendations: [],
          error: 'autaf_unavailable',
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!autafRes.ok) {
      const errorMsg = `autaf_http_${autafRes.status}`
      await supa
        .from('brh_autaf_link')
        .update({ last_error: errorMsg, last_sync_at: new Date().toISOString() })
        .eq('profile_id', userResp.user.id)

      return new Response(
        JSON.stringify({
          available: false,
          recommendations: [],
          error: errorMsg,
        }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const recommendations = (await autafRes.json()) as AutafRecommendation[]

    // Marquer succès
    await supa
      .from('brh_autaf_link')
      .update({ last_error: null, last_sync_at: new Date().toISOString() })
      .eq('profile_id', userResp.user.id)

    return new Response(
      JSON.stringify({
        available: true,
        recommendations: Array.isArray(recommendations) ? recommendations : [],
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        available: false,
        recommendations: [],
        error: err instanceof Error ? err.message : 'internal_error',
      }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
