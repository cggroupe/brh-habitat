/**
 * Edge Function : artisan-invite-verify (Phase 13.6.5)
 *
 * Endpoint PUBLIC (pas d'auth requise) — vérifie un token magic link.
 * Retourne les infos artisan si le token est valide + non expiré.
 *
 * Body : { token: string }
 * Returns : { valid: true, artisan: { nom_entreprise, ... }, expiresAt }
 *           OR { valid: false, reason: 'expired' | 'invalid' | 'accepted' }
 *
 * Pas de rate limit strict (endpoint public, mais checkRateLimit basique anti-bruteforce).
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

  // Anti-bruteforce sur les tokens : 60/min/IP (généreux mais prévient enum)
  const rl = checkRateLimit(req, 'artisan-invite-verify', { maxRequests: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ valid: false, reason: 'rate_limit' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: RequestBody = await req.json()
    if (!body.token || typeof body.token !== 'string' || body.token.length < 32) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Service-role pour bypass RLS (on est public)
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: inv, error: iErr } = await supa
      .from('brh_artisan_invitations')
      .select('id,artisan_id,status,expires_at,email_to,message_personnel')
      .eq('token', body.token)
      .maybeSingle()

    if (iErr || !inv) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (inv.status === 'accepted') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'accepted' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (inv.status === 'revoked') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'revoked' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const expiresAt = new Date(inv.expires_at as string)
    if (expiresAt < new Date()) {
      // Mark as expired
      await supa.from('brh_artisan_invitations').update({ status: 'expired' }).eq('id', inv.id)
      return new Response(
        JSON.stringify({ valid: false, reason: 'expired' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Charge l'artisan
    const { data: artisan } = await supa
      .from('brh_artisans_rge')
      .select('id,nom_entreprise,representant,commune,code_postal,departement,geste_specialites')
      .eq('id', inv.artisan_id)
      .single()

    return new Response(
      JSON.stringify({
        valid: true,
        artisan,
        emailTo: inv.email_to,
        messagePersonnel: inv.message_personnel,
        expiresAt: inv.expires_at,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('artisan-invite-verify error:', err)
    return new Response(
      JSON.stringify({ valid: false, reason: 'error', message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
