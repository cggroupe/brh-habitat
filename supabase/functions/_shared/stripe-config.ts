/**
 * Phase 15 — Configuration tarification SaaS pros RGE.
 *
 * IDs Stripe Price (à remplir quand l'organisation Stripe sera créée).
 * Pour l'instant, les EFs Stripe fonctionnent en mode "preview" si STRIPE_SECRET_KEY non set.
 */

export type ProTier = 'free' | 'pro' | 'expert'

export interface TierConfig {
  tier: ProTier
  label: string
  priceMonthlyEur: number
  quotaLettersPerMonth: number
  features: string[]
  stripePriceId: string | null
}

export const PRO_TIERS: Record<ProTier, TierConfig> = {
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
    stripePriceId: null, // free = pas de Stripe
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
    stripePriceId: Deno.env.get('STRIPE_PRICE_PRO') ?? null,
  },
  expert: {
    tier: 'expert',
    label: 'Expert',
    priceMonthlyEur: 149,
    quotaLettersPerMonth: 500,
    features: [
      'Tout Pro +',
      '500 courriers IA / mois',
      'Marketplace artisans RGE (Phase 13.6)',
      'API REST développeur',
      'Multi-utilisateurs (équipe)',
      'Onboarding dédié + formation',
    ],
    stripePriceId: Deno.env.get('STRIPE_PRICE_EXPERT') ?? null,
  },
}

export function tierFromStripePrice(priceId: string): ProTier | null {
  for (const [tier, config] of Object.entries(PRO_TIERS)) {
    if (config.stripePriceId === priceId) return tier as ProTier
  }
  return null
}
