/**
 * Edge Function : artisan-invite-accept (Phase 13.6.5)
 *
 * Endpoint authentifié — JWT Supabase obligatoire (user déjà signed-up via signInWithOtp côté front).
 * Lie le user authentifié à l'artisan via le helper SQL atomique `brh_artisan_invite_accept`.
 *
 * Body : { token: string }
 * Returns : { success, artisanId, message }
 *
 * Rate limit : 10/min/IP.
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  token: string
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'artisan-invite-accept', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requise' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: uErr } = await userClient.auth.getUser()
    if (uErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Auth invalide' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    if (!body.token || typeof body.token !== 'string') {
      return new Response(JSON.stringify({ error: 'token requis' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Le helper SQL utilise `auth.uid()` directement → on appelle via userClient (RLS aware)
    // Mais pour activer auth.uid() dans la fonction, il faut que l'appelant ait son JWT → userClient OK
    const { data: rows, error: rErr } = await userClient.rpc('brh_artisan_invite_accept', {
      p_token: body.token,
      p_user_id: userData.user.id,
    })

    if (rErr) {
      return new Response(JSON.stringify({ error: rErr.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const result = (rows as Array<{ success: boolean; artisan_id: string | null; message: string }>)?.[0]
    if (!result) {
      return new Response(JSON.stringify({ error: 'Réponse vide' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, message: result.message }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // S'assure que le profile existe (l'utilisateur peut être tout neuf)
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    await supa.from('profiles').upsert(
      { id: userData.user.id, email: userData.user.email, role: 'artisan' },
      { onConflict: 'id' },
    )

    return new Response(
      JSON.stringify({
        success: true,
        artisanId: result.artisan_id,
        message: 'Compte artisan activé',
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('artisan-invite-accept error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
