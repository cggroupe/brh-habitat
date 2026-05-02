/**
 * Edge Function : create-portal-session
 *
 * Phase 15 — Crée une session du Customer Portal Stripe pour gestion abonnement
 * (changement carte, annulation, factures).
 *
 * Body : { returnUrl?: string }
 * Returns : { url: 'https://billing.stripe.com/...' }
 *
 * Rate limit : 10/min/IP.
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.renovation-brh.fr'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'create-portal-session', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe non configuré', message: 'STRIPE_SECRET_KEY absent.' }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization requis' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await userClient.auth.getUser()
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Auth invalide' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: subRow } = await supa
      .from('brh_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('profile_id', userData.user.id)
      .maybeSingle()

    const customerId = subRow?.stripe_customer_id as string | null
    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement Stripe trouvé pour cet utilisateur' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const body = (await req.json().catch(() => ({}))) as { returnUrl?: string }
    const returnUrl = body.returnUrl ?? `${SITE_URL}/pro/abonnement`

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      }),
    })

    if (!portalRes.ok) {
      const err = await portalRes.text()
      return new Response(JSON.stringify({ error: 'Stripe portal failed', details: err }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const portal = (await portalRes.json()) as { url: string }

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-portal-session error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
