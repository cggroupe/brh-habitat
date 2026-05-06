/**
 * Phase 18.12 — API abonnements Pro Premium réseau.
 *
 * 4 tiers :
 *   - free       — 0€/mois, 5 posts/jour, pas de boost
 *   - premium    — 19€/mois, 20 posts/jour, boost feed +20%, stats avancées
 *   - featured   — 49€/mois (V2), top recherches /reseau/decouvrir
 *   - enterprise — sur devis (V3)
 */
import { supabase } from '@/lib/supabase'

export type ReseauTier = 'free' | 'premium' | 'featured' | 'enterprise'
export type StripeStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused'

export interface ReseauSubscription {
  id: string
  tenant_id: string
  profile_id: string
  pro_id: string | null
  tier: ReseauTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  stripe_status: StripeStatus | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  amount_cents: number | null
  currency: string
  benefits: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ReseauTierDef {
  id: ReseauTier
  label: string
  monthly_cents: number
  benefits: {
    posts_per_day: number
    feed_boost: boolean
    stats_advanced: boolean
    featured_profile: boolean
    no_ads: boolean
  }
  cta: string
  highlight?: boolean
}

export const RESEAU_TIERS: ReseauTierDef[] = [
  {
    id: 'free',
    label: 'Free',
    monthly_cents: 0,
    benefits: {
      posts_per_day: 5,
      feed_boost: false,
      stats_advanced: false,
      featured_profile: false,
      no_ads: false,
    },
    cta: 'Plan actuel',
  },
  {
    id: 'premium',
    label: 'Premium',
    monthly_cents: 1900,
    benefits: {
      posts_per_day: 20,
      feed_boost: true,
      stats_advanced: true,
      featured_profile: false,
      no_ads: true,
    },
    cta: 'Passer Premium',
    highlight: true,
  },
  {
    id: 'featured',
    label: 'Featured',
    monthly_cents: 4900,
    benefits: {
      posts_per_day: 50,
      feed_boost: true,
      stats_advanced: true,
      featured_profile: true,
      no_ads: true,
    },
    cta: 'Disponible V2',
  },
]

export const reseauSubscriptionsApi = {
  async getMy(): Promise<ReseauSubscription | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return null
    const { data, error } = await supabase
      .from('brh_reseau_subscriptions')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as ReseauSubscription | null
  },

  /**
   * Crée une session Stripe Checkout pour upgrade vers premium.
   * Réutilise l'EF générique `create-checkout-session` existante.
   * Retourne l'URL Stripe à laquelle rediriger l'utilisateur.
   */
  async createCheckoutSession(targetTier: 'premium' | 'featured'): Promise<{ url: string } | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')

    const { data, error } = await supabase.functions.invoke<{ url: string }>(
      'create-checkout-session',
      {
        body: {
          product: 'reseau_subscription',
          tier: targetTier,
          success_url: `${window.location.origin}/reseau/abonnement?status=success`,
          cancel_url: `${window.location.origin}/reseau/abonnement?status=cancel`,
        },
      },
    )
    if (error) throw error
    return data ?? null
  },

  /** Annulation à la fin de la période courante (Stripe gère via webhook). */
  async cancelAtPeriodEnd(): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Pas de session active')
    const { error } = await supabase.functions.invoke('create-portal-session', {
      body: {
        return_url: `${window.location.origin}/reseau/abonnement`,
      },
    })
    if (error) throw error
  },
}
