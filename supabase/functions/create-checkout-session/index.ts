/**
 * Edge Function : create-checkout-session
 *
 * Phase 15 — Crée une session Stripe Checkout pour upgrade vers Pro / Expert.
 * Si STRIPE_SECRET_KEY non configuré : renvoie 503 avec message clair.
 *
 * Body : { tier: 'pro' | 'expert', successUrl?: string, cancelUrl?: string }
 * Returns : { url: 'https://checkout.stripe.com/...' }
 *
 * Rate limit : 5/min/IP (anti-abus)
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PRO_TIERS, type ProTier } from '../_shared/stripe-config.ts'

interface RequestBody {
  tier: ProTier
  successUrl?: string
  cancelUrl?: string
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://www.renovation-brh.fr'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'create-checkout-session', { maxRequests: 5, windowSeconds: 60 })
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
        JSON.stringify({
          error: 'Stripe non configuré',
          message: 'STRIPE_SECRET_KEY absent — contactez l\'admin pour activer les paiements.',
        }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const body: RequestBody = await req.json()
    if (!body.tier || (body.tier !== 'pro' && body.tier !== 'expert')) {
      return new Response(JSON.stringify({ error: 'tier doit être "pro" ou "expert"' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const tierConfig = PRO_TIERS[body.tier]
    if (!tierConfig.stripePriceId) {
      return new Response(
        JSON.stringify({
          error: 'Price Stripe non configuré',
          message: `STRIPE_PRICE_${body.tier.toUpperCase()} absent côté serveur.`,
        }),
        { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Auth user
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
    const userId = userData.user.id
    const userEmail = userData.user.email

    // Récupère ou crée customer Stripe
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: subRow } = await supa
      .from('brh_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('profile_id', userId)
      .maybeSingle()

    let customerId = subRow?.stripe_customer_id as string | null

    if (!customerId) {
      // Crée un Customer Stripe
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: userEmail ?? '',
          'metadata[profile_id]': userId,
        }),
      })
      if (!customerRes.ok) {
        const err = await customerRes.text()
        return new Response(JSON.stringify({ error: 'Stripe customer creation failed', details: err }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const customer = (await customerRes.json()) as { id: string }
      customerId = customer.id

      // Persiste le customer_id (upsert pour gérer 1ère création du sub)
      await supa.from('brh_pro_subscriptions').upsert(
        { profile_id: userId, stripe_customer_id: customerId },
        { onConflict: 'profile_id' },
      )
    }

    // Crée la session Checkout
    const successUrl = body.successUrl ?? `${SITE_URL}/pro/abonnement?checkout=success`
    const cancelUrl = body.cancelUrl ?? `${SITE_URL}/pro/abonnement?checkout=cancel`

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        customer: customerId,
        'line_items[0][price]': tierConfig.stripePriceId,
        'line_items[0][quantity]': '1',
        success_url: successUrl,
        cancel_url: cancelUrl,
        'metadata[profile_id]': userId,
        'metadata[tier]': body.tier,
        'subscription_data[metadata][profile_id]': userId,
        'subscription_data[metadata][tier]': body.tier,
      }),
    })

    if (!sessionRes.ok) {
      const err = await sessionRes.text()
      return new Response(JSON.stringify({ error: 'Stripe session failed', details: err }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const session = (await sessionRes.json()) as { url: string }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
