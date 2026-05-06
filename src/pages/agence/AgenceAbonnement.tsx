/**
 * Phase 16.0.8 — Page `/agence/abonnement` : visualisation tier + upgrade.
 *
 * Pour MVP : changement de tier direct via UPDATE Supabase (pas de Stripe).
 * Stripe checkout sera branché en Phase 16.0.8b via EF agence-checkout
 * (preview-safe : 503 si STRIPE_SECRET_KEY absent).
 */
import { Loader, CreditCard, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import { useMyAgenceSubscription } from '@/hooks/queries/agence-subscriptions'
import {
  TIER_LABELS,
  TIER_PRICES,
  TIER_QUOTAS,
  type AgenceTier,
} from '@/api/agence-subscriptions'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const TIER_FEATURES: Record<AgenceTier, string[]> = {
  discovery: ['5 leads / mois', 'Score Vente v1', 'Anti-doublon 30j', 'Email support'],
  standard: ['30 leads / mois', 'Filtrage avancé', 'Export CSV', 'Priorité support'],
  premium: ['100 leads / mois', 'Alertes nouveaux leads', 'Dashboard analytics', 'SLA 24h'],
  expert: ['Leads illimités', 'API directe', 'Support dédié', 'Compte manager'],
}

export default function AgenceAbonnement() {
  const { data: membership } = useMyAgenceMembership()
  const { data: subscription, isLoading } = useMyAgenceSubscription()
  const qc = useQueryClient()

  const [upgrading, setUpgrading] = useState<AgenceTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelectTier(newTier: AgenceTier) {
    if (!subscription) return
    if (newTier === subscription.tier) return

    setUpgrading(newTier)
    setError(null)
    try {
      // MVP : update direct. Prod : redirect Stripe Checkout via EF agence-checkout.
      const { error: updErr } = await supabase
        .from('brh_agence_subscriptions')
        .update({ tier: newTier })
        .eq('id', subscription.id)
      if (updErr) throw updErr
      await qc.invalidateQueries({ queryKey: ['agence-subscriptions'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setUpgrading(null)
    }
  }

  if (isLoading || !membership) {
    return (
      <div className="p-12 flex justify-center">
        <Loader className="animate-spin text-blue-600" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center">
        <p>Aucun abonnement trouvé. Contactez le support.</p>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-display flex items-center gap-2">
          <CreditCard className="text-blue-600" size={24} />
          Abonnement
        </h1>
        <p className="text-sm text-gray-600">
          Palier en cours et options d'évolution
        </p>
      </header>

      <section className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
        <p className="text-xs uppercase text-gray-500 tracking-wide">Palier actuel</p>
        <div className="flex items-baseline gap-3 mt-1">
          <h2 className="text-3xl font-display">{TIER_LABELS[subscription.tier]}</h2>
          <p className="text-sm text-gray-500">
            {TIER_PRICES[subscription.tier] === 0
              ? 'Gratuit'
              : `${TIER_PRICES[subscription.tier]} € HT / mois`}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Quota mensuel</p>
            <p className="font-semibold">
              {subscription.monthly_lead_quota === null
                ? 'Illimité'
                : `${subscription.monthly_lead_quota} leads`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Consommé ce mois</p>
            <p className="font-semibold">
              {subscription.current_month_claims}{' '}
              {subscription.monthly_lead_quota !== null
                ? `(${Math.round((subscription.current_month_claims / subscription.monthly_lead_quota) * 100)} %)`
                : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Période</p>
            <p className="font-semibold text-xs">
              {new Date(subscription.current_period_start).toLocaleDateString('fr-FR')}
              {' → '}
              {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Statut Stripe</p>
            <p className="font-semibold text-xs">
              {subscription.stripe_status ?? <span className="text-gray-400 italic">N/A (MVP)</span>}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section>
        <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-3">
          Changer de palier
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['discovery', 'standard', 'premium', 'expert'] as const).map((t) => {
            const isCurrent = t === subscription.tier
            return (
              <div
                key={t}
                className={`bg-white rounded-2xl border-2 p-4 ${
                  isCurrent ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">{TIER_LABELS[t]}</p>
                  {isCurrent ? (
                    <span className="text-xs text-blue-600 font-medium">Actuel</span>
                  ) : null}
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {TIER_PRICES[t] === 0 ? 'Gratuit' : `${TIER_PRICES[t]} €`}
                  {TIER_PRICES[t] > 0 ? (
                    <span className="text-xs font-normal text-gray-500"> /mois</span>
                  ) : null}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {TIER_QUOTAS[t] === null ? 'Leads illimités' : `${TIER_QUOTAS[t]} leads/mois`}
                </p>
                <ul className="text-xs text-gray-700 mt-3 space-y-1">
                  {TIER_FEATURES[t].map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent ? (
                  <button
                    onClick={() => handleSelectTier(t)}
                    disabled={upgrading !== null}
                    className="w-full mt-4 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                  >
                    {upgrading === t ? (
                      <Loader className="animate-spin" size={12} />
                    ) : (
                      <ArrowUpRight size={12} />
                    )}
                    {TIER_PRICES[t] > TIER_PRICES[subscription.tier]
                      ? 'Upgrader'
                      : 'Downgrader'}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <div className="text-xs text-gray-500 italic">
        ⚠ MVP — changement direct sans paiement. En production, le clic redirigera vers
        Stripe Checkout (EF <code>agence-checkout</code> à activer avec STRIPE_SECRET_KEY).
      </div>
    </div>
  )
}
