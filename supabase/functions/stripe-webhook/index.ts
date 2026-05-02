/**
 * Edge Function : stripe-webhook
 *
 * Phase 15 — Reçoit les events Stripe (subscription created/updated/deleted)
 * et synchronise la table brh_pro_subscriptions.
 *
 * Events gérés :
 *   - checkout.session.completed       → activation initiale
 *   - customer.subscription.created    → création
 *   - customer.subscription.updated    → upgrade/downgrade/period rollover
 *   - customer.subscription.deleted    → annulation
 *
 * Pas de rate limit (Stripe envoie ses webhooks).
 * Vérification signature Stripe via STRIPE_WEBHOOK_SECRET.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { tierFromStripePrice, PRO_TIERS, type ProTier } from '../_shared/stripe-config.ts'

interface StripeSubscription {
  id: string
  customer: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  items: {
    data: Array<{ price: { id: string } }>
  }
  metadata: { profile_id?: string; tier?: ProTier }
}

interface StripeEvent {
  type: string
  data: { object: StripeSubscription | { subscription?: string; metadata?: { profile_id?: string } } }
}

/**
 * Vérifie la signature Stripe (HMAC SHA-256).
 * Référence : https://stripe.com/docs/webhooks/signatures
 */
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature) return false
  const parts = signature.split(',').reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split('=')
    if (k && v) acc[k] = v
    return acc
  }, {})
  const timestamp = parts.t
  const v1 = parts.v1
  if (!timestamp || !v1) return false

  const signedPayload = `${timestamp}.${payload}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return expected === v1
}

async function applySubscription(
  supa: ReturnType<typeof createClient>,
  sub: StripeSubscription,
): Promise<void> {
  const profileId = sub.metadata?.profile_id
  if (!profileId) {
    console.warn('Subscription without profile_id metadata:', sub.id)
    return
  }

  const priceId = sub.items?.data?.[0]?.price?.id
  const tier: ProTier = (sub.metadata?.tier as ProTier) ?? tierFromStripePrice(priceId ?? '') ?? 'pro'
  const tierConfig = PRO_TIERS[tier]

  await supa.from('brh_pro_subscriptions').upsert(
    {
      profile_id: profileId,
      tier,
      quota_letters_per_month: tierConfig.quotaLettersPerMonth,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      stripe_status: sub.status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    },
    { onConflict: 'profile_id' },
  )
}

async function applyCancellation(
  supa: ReturnType<typeof createClient>,
  sub: StripeSubscription,
): Promise<void> {
  // Downgrade vers Free
  await supa
    .from('brh_pro_subscriptions')
    .update({
      tier: 'free',
      quota_letters_per_month: PRO_TIERS.free.quotaLettersPerMonth,
      stripe_status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancel_at_period_end: false,
    })
    .eq('stripe_subscription_id', sub.id)
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  // En prod : signature obligatoire. En dev : skip si STRIPE_WEBHOOK_SECRET absent.
  if (webhookSecret) {
    const valid = await verifyStripeSignature(payload, signature, webhookSecret)
    if (!valid) {
      console.warn('Invalid Stripe signature')
      return new Response('Invalid signature', { status: 401 })
    }
  }

  try {
    const event = JSON.parse(payload) as StripeEvent
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const obj = event.data.object as StripeSubscription
        // checkout.session.completed n'a pas la sub directement — elle est sur obj.subscription
        if (event.type === 'checkout.session.completed' && 'subscription' in (event.data.object as object)) {
          // On laisse subscription.created/updated handle la suite (Stripe envoie les 2 events)
          break
        }
        await applySubscription(supa, obj)
        break
      }
      case 'customer.subscription.deleted': {
        const obj = event.data.object as StripeSubscription
        await applyCancellation(supa, obj)
        break
      }
      default:
        // Event ignoré (charge.succeeded, invoice.paid, etc.)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('stripe-webhook error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
