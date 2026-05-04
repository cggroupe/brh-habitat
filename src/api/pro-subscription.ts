/**
 * API pro-subscription — Phase 15.
 *
 * Pair volontaire avec hooks/queries/pro-subscription.ts.
 */

import { supabase } from '@/lib/supabase'

export type ProTier = 'free' | 'pro' | 'expert'

export interface ProSubscriptionRow {
  id: string
  profile_id: string
  tier: ProTier
  quota_letters_per_month: number
  letters_used_this_period: number
  current_period_start: string
  current_period_end: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  stripe_status: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface TierFeatures {
  tier: ProTier
  label: string
  priceMonthlyEur: number
  quotaLettersPerMonth: number
  features: string[]
}

export const PRO_TIERS_FRONT: Record<ProTier, TierFeatures> = {
  free: {
    tier: 'free',
    label: 'Découverte',
    priceMonthlyEur: 0,
    quotaLettersPerMonth: 5,
    features: [
      'Accès tableau prospects scorés v2',
      'Carte chaleur Bretagne',
      'Dashboard analytique',
      '5 courriers IA / mois',
    ],
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceMonthlyEur: 49,
    quotaLettersPerMonth: 100,
    features: [
      'Tout Découverte +',
      '100 courriers IA / mois',
      'Génération bulk top 50',
      'Téléchargement ZIP',
      'Export CSV prospects',
      'Support email prioritaire',
    ],
  },
  expert: {
    tier: 'expert',
    label: 'Expert',
    priceMonthlyEur: 149,
    quotaLettersPerMonth: 500,
    features: [
      'Tout Pro +',
      '500 courriers IA / mois',
      'Marketplace artisans RGE (à venir)',
      'API REST développeur',
      'Multi-utilisateurs (équipe)',
      'Onboarding dédié + formation',
    ],
  },
}

export const proSubscriptionApi = {
  /**
   * Récupère l'abonnement du pro courant. Auto-crée free si absent.
   */
  async getMine(): Promise<ProSubscriptionRow | null> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return null

    // SELECT (auto-création se fera au premier appel à brh_consume_letter_quota côté EF)
    const { data, error } = await supabase
      .from('brh_pro_subscriptions')
      .select('*')
      .eq('profile_id', userData.user.id)
      .maybeSingle()
    if (error) throw error

    if (!data) {
      // Crée free par défaut côté front (lecture-seule fallback)
      return {
        id: '',
        profile_id: userData.user.id,
        tier: 'free',
        quota_letters_per_month: 5,
        letters_used_this_period: 0,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_status: null,
        cancel_at_period_end: false,
        canceled_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    return data as ProSubscriptionRow
  },

  /**
   * Crée une session Checkout Stripe pour upgrade vers tier `pro` ou `expert`.
   * Redirige le user vers Stripe Checkout.
   */
  async createCheckoutSession(tier: 'pro' | 'expert'): Promise<{ url: string }> {
    const { data, error } = await supabase.functions.invoke<{ url: string }>(
      'create-checkout-session',
      { body: { tier } },
    )
    if (error) throw error
    if (!data?.url) throw new Error('Aucune URL Stripe retournée')
    return data
  },

  /**
   * Crée une session du Customer Portal Stripe (gestion abonnement existant).
   */
  async createPortalSession(): Promise<{ url: string }> {
    const { data, error } = await supabase.functions.invoke<{ url: string }>(
      'create-portal-session',
      { body: {} },
    )
    if (error) throw error
    if (!data?.url) throw new Error('Aucune URL Stripe retournée')
    return data
  },
}
