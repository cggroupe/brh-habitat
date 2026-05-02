/**
 * Phase 15 — Page abonnement SaaS pro RGE.
 *
 * 3 cards (Free / Pro / Expert) avec features matrix + bouton Stripe Checkout.
 * Affiche l'état du sub actuel + quota utilisé + lien portail Stripe.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  Sparkles,
  Loader,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Settings,
} from 'lucide-react'
import {
  useMyProSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
  useRefreshSubscription,
} from '@/hooks/queries/pro-subscription'
import { PRO_TIERS_FRONT, type ProTier } from '@/api/pro-subscription'

export default function ProAbonnement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const checkoutResult = searchParams.get('checkout')

  const [error, setError] = useState<string | null>(null)
  const { data: sub, isLoading } = useMyProSubscription()
  const checkout = useCreateCheckoutSession()
  const portal = useCreatePortalSession()
  const refresh = useRefreshSubscription()

  // Auto-refresh après retour Stripe Checkout success
  useEffect(() => {
    if (checkoutResult === 'success') {
      refresh()
      const timer = setTimeout(() => {
        setSearchParams((prev) => {
          prev.delete('checkout')
          return prev
        })
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [checkoutResult, refresh, setSearchParams])

  const handleUpgrade = async (tier: 'pro' | 'expert') => {
    setError(null)
    try {
      const { url } = await checkout.mutateAsync(tier)
      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handlePortal = async () => {
    setError(null)
    try {
      const { url } = await portal.mutateAsync()
      window.location.assign(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const currentTier = sub?.tier ?? 'free'
  const usagePct = sub
    ? Math.round((sub.letters_used_this_period / sub.quota_letters_per_month) * 100)
    : 0

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abonnement BRH Habitat</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choisissez le plan qui correspond à votre activité de prospection énergétique.
        </p>
      </div>

      {/* Bandeau succès Checkout */}
      {checkoutResult === 'success' && (
        <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Abonnement activé</div>
            <div className="text-xs">
              Votre paiement a été confirmé. Le tier sera mis à jour dans quelques secondes.
            </div>
          </div>
        </div>
      )}
      {checkoutResult === 'cancel' && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Abonnement non finalisé</div>
            <div className="text-xs">Vous pouvez réessayer à tout moment.</div>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Erreur</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {/* État sub actuel */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        sub && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Plan actuel
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-900">
                    {PRO_TIERS_FRONT[currentTier].label}
                  </span>
                  <span className="text-sm text-blue-700">
                    {PRO_TIERS_FRONT[currentTier].priceMonthlyEur > 0
                      ? `${PRO_TIERS_FRONT[currentTier].priceMonthlyEur} € / mois`
                      : 'gratuit'}
                  </span>
                </div>
                {sub.stripe_status && (
                  <div className="mt-1 text-xs text-blue-700">
                    Statut Stripe : <strong>{sub.stripe_status}</strong>
                    {sub.cancel_at_period_end &&
                      ' · Résiliation programmée à la fin de la période'}
                  </div>
                )}
              </div>
              <div className="text-right text-sm">
                <div className="text-xs text-blue-700">
                  Courriers utilisés ce mois
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {sub.letters_used_this_period} / {sub.quota_letters_per_month}
                </div>
                <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-blue-200">
                  <div
                    className={`h-full ${
                      usagePct > 90 ? 'bg-red-600' : usagePct > 70 ? 'bg-orange-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
              </div>
            </div>

            {sub.stripe_customer_id && (
              <div className="mt-4 border-t border-blue-200 pt-3">
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portal.isPending}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-950 disabled:opacity-50"
                >
                  <Settings className="h-3 w-3" />
                  Gérer mon abonnement (Stripe Portal)
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* 3 cards plans */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['free', 'pro', 'expert'] as ProTier[]).map((tier) => {
          const config = PRO_TIERS_FRONT[tier]
          const isCurrent = currentTier === tier
          const isUpgrade =
            (currentTier === 'free' && (tier === 'pro' || tier === 'expert')) ||
            (currentTier === 'pro' && tier === 'expert')

          return (
            <div
              key={tier}
              className={`flex flex-col rounded-lg border-2 bg-white p-5 shadow-sm transition ${
                tier === 'pro' && !isCurrent
                  ? 'border-purple-500 shadow-md'
                  : isCurrent
                    ? 'border-blue-500'
                    : 'border-gray-200'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                    tier === 'free'
                      ? 'bg-gray-100 text-gray-700'
                      : tier === 'pro'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {tier === 'pro' && <Sparkles className="h-3 w-3" />}
                  {config.label}
                </span>
                {tier === 'pro' && !isCurrent && (
                  <span className="rounded-full bg-purple-700 px-2 py-0.5 text-xs font-bold text-white">
                    POPULAIRE
                  </span>
                )}
                {isCurrent && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-900">
                    PLAN ACTUEL
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {config.priceMonthlyEur === 0 ? '0' : config.priceMonthlyEur}
                  </span>
                  <span className="text-lg text-gray-500">€</span>
                  <span className="text-sm text-gray-500">/ mois HT</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {config.quotaLettersPerMonth} courriers IA / mois
                </div>
              </div>

              <ul className="mb-5 flex-1 space-y-2 text-sm">
                {config.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    <span className="text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
                >
                  Plan actuel
                </button>
              ) : tier === 'free' ? (
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portal.isPending || !sub?.stripe_customer_id}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Rétrograder
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgrade(tier as 'pro' | 'expert')}
                  disabled={checkout.isPending}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                    tier === 'pro'
                      ? 'bg-purple-700 text-white hover:bg-purple-800'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  } disabled:opacity-50`}
                >
                  {checkout.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isUpgrade ? 'Passer au plan' : 'Souscrire'} {config.label}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
        <strong>Engagement :</strong> aucun. Résiliation possible à tout moment via Stripe Portal.
        Garantie satisfait ou remboursé 14 jours sur Pro et Expert.
        <br />
        <strong>TVA :</strong> 20 % en sus pour les organisations FR. Facture automatique mensuelle.
      </div>
    </div>
  )
}
