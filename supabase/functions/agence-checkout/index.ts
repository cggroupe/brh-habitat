/**
 * Edge Function : agence-checkout (Phase 16.0.8)
 *
 * Crée une session Stripe Checkout pour upgrade abonnement agence.
 * Preview-safe : retourne 503 si STRIPE_SECRET_KEY absent.
 *
 * Body : { tier: 'standard' | 'premium' | 'expert', success_url, cancel_url }
 * Returns : { url: string }   (URL Stripe Checkout)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  // À renseigner dans les env vars Supabase Cloud :
  // STRIPE_PRICE_AGENCE_STANDARD, STRIPE_PRICE_AGENCE_PREMIUM, STRIPE_PRICE_AGENCE_EXPERT
  standard: Deno.env.get('STRIPE_PRICE_AGENCE_STANDARD'),
  premium: Deno.env.get('STRIPE_PRICE_AGENCE_PREMIUM'),
  expert: Deno.env.get('STRIPE_PRICE_AGENCE_EXPERT'),
}

interface RequestBody {
  tier?: 'standard' | 'premium' | 'expert'
  success_url?: string
  cancel_url?: string
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return new Response(
      JSON.stringify({
        error: 'Stripe non configuré (preview mode). Ajouter STRIPE_SECRET_KEY + STRIPE_PRICE_AGENCE_* en env Supabase.',
      }),
      { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const rl = checkRateLimit(req, 'agence-checkout', { maxRequests: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Authentication requise' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    )
    const { data: { user } } = await supa.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const body: RequestBody = await req.json().catch(() => ({}))
    const tier = body.tier
    if (!tier || !STRIPE_PRICE_IDS[tier]) {
      return new Response(
        JSON.stringify({ error: `Tier invalide ou Stripe price ID absent : ${tier}` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const priceId = STRIPE_PRICE_IDS[tier]!
    const successUrl = body.success_url ?? 'https://www.renovation-brh.fr/agence/abonnement?status=success'
    const cancelUrl = body.cancel_url ?? 'https://www.renovation-brh.fr/agence/abonnement?status=cancelled'

    // Récupère ou crée le Stripe customer
    const supaAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: sub } = await supaAdmin
      .from('brh_agence_subscriptions')
      .select('id, agence_id, stripe_customer_id')
      .eq('signer_profile_id', user.id)
      .maybeSingle()

    if (!sub) {
      return new Response(
        JSON.stringify({ error: 'Aucune agence rattachée à ce compte' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Stripe API : POST /v1/checkout/sessions
    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[agence_id]': sub.agence_id,
      'metadata[tier]': tier,
      'metadata[subscription_id]': sub.id,
    })
    if (sub.stripe_customer_id) {
      params.set('customer', sub.stripe_customer_id)
    } else {
      params.set('customer_email', user.email ?? '')
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const stripeData = await res.json()

    if (!res.ok) {
      console.error('Stripe checkout error:', stripeData)
      return new Response(
        JSON.stringify({ error: stripeData.error?.message ?? 'Stripe error' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ url: stripeData.url, session_id: stripeData.id }),
      { headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('agence-checkout error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
