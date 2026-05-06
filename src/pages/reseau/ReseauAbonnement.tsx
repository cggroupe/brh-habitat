/**
 * Phase 18.12 — Page abonnement réseau `/reseau/abonnement`.
 *
 * 3 tiers : Free / Premium 19€/mois / Featured 49€/mois (V2).
 * Réutilise l'EF `create-checkout-session` (pattern Phase 15).
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Crown, Check, Sparkles, Star, AlertCircle, ExternalLink } from 'lucide-react'
import {
  useMyReseauSubscription,
  useCreateReseauCheckout,
  useOpenReseauPortal,
} from '@/hooks/queries/reseau-subscriptions'
import { RESEAU_TIERS, type ReseauTierDef } from '@/api/reseau-subscriptions'

const BENEFIT_LABELS: Record<keyof ReseauTierDef['benefits'], string> = {
  posts_per_day: 'posts par jour',
  feed_boost: 'Boost feed +20%',
  stats_advanced: 'Statistiques avancées',
  featured_profile: 'Profil mis en avant /decouvrir',
  no_ads: 'Sans publicité',
}

export default function ReseauAbonnement() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sub = useMyReseauSubscription()
  const checkout = useCreateReseauCheckout()
  const portal = useOpenReseauPortal()

  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      setStatusMessage('✓ Paiement validé. Votre abonnement est actif.')
      // Clear param après 5s
      setTimeout(() => {
        setSearchParams({})
        setStatusMessage(null)
      }, 5000)
    } else if (status === 'cancel') {
      setStatusMessage('Paiement annulé. Vous restez sur le plan Free.')
      setTimeout(() => {
        setSearchParams({})
        setStatusMessage(null)
      }, 5000)
    }
  }, [searchParams, setSearchParams])

  const currentTier = sub.data?.tier ?? 'free'
  const isPaying = currentTier !== 'free'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-10 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <Crown size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Abonnement réseau</h1>
          <p className="text-sm text-slate-500">
            Boostez votre visibilité et débloquez des stats avancées
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            statusMessage.includes('✓')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border border-slate-200 text-slate-700'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Plan courant */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Mon plan actuel
          </p>
          <p className="text-lg font-display text-slate-800 inline-flex items-center gap-2">
            {currentTier === 'free' && 'Free'}
            {currentTier === 'premium' && (
              <>
                <Sparkles size={16} className="text-cyan-600" />
                Premium · 19 € / mois
              </>
            )}
            {currentTier === 'featured' && (
              <>
                <Star size={16} className="text-amber-600" fill="currentColor" />
                Featured · 49 € / mois
              </>
            )}
          </p>
          {sub.data?.current_period_end && (
            <p className="text-xs text-slate-500 mt-0.5">
              Prochain renouvellement :{' '}
              {new Date(sub.data.current_period_end).toLocaleDateString('fr-FR')}
              {sub.data.cancel_at_period_end && ' (annulation programmée)'}
            </p>
          )}
        </div>
        {isPaying && (
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <ExternalLink size={12} /> Gérer mon abonnement
          </button>
        )}
      </div>

      {/* Tiers grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RESEAU_TIERS.map((tier) => {
          const isCurrent = tier.id === currentTier
          const isAvailable = tier.id !== 'featured' // V2 = featured pas encore branché Stripe

          return (
            <article
              key={tier.id}
              className={`rounded-2xl border-2 p-5 flex flex-col ${
                isCurrent
                  ? 'border-cyan-500 bg-cyan-50/30 shadow-md'
                  : tier.highlight
                  ? 'border-cyan-200 bg-white shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <header className="mb-4">
                {tier.highlight && (
                  <span className="inline-block text-[10px] uppercase tracking-wide font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded mb-2">
                    Recommandé
                  </span>
                )}
                <h2 className="text-xl font-display text-slate-800">{tier.label}</h2>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {tier.monthly_cents === 0
                    ? 'Gratuit'
                    : `${(tier.monthly_cents / 100).toFixed(0)} €`}
                  {tier.monthly_cents > 0 && (
                    <span className="text-sm font-normal text-slate-500"> /mois</span>
                  )}
                </p>
              </header>

              <ul className="space-y-2 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    <strong>{tier.benefits.posts_per_day}</strong> {BENEFIT_LABELS.posts_per_day}
                  </span>
                </li>
                {tier.benefits.feed_boost && (
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>{BENEFIT_LABELS.feed_boost}</span>
                  </li>
                )}
                {tier.benefits.stats_advanced && (
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>{BENEFIT_LABELS.stats_advanced}</span>
                  </li>
                )}
                {tier.benefits.featured_profile && (
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>{BENEFIT_LABELS.featured_profile}</span>
                  </li>
                )}
                {tier.benefits.no_ads && (
                  <li className="flex items-start gap-2">
                    <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>{BENEFIT_LABELS.no_ads}</span>
                  </li>
                )}
              </ul>

              <div className="mt-5 pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 text-slate-500 text-sm font-semibold"
                  >
                    Plan actuel
                  </button>
                ) : tier.id === 'free' ? (
                  <button
                    onClick={() => portal.mutate()}
                    disabled={portal.isPending}
                    className="w-full px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
                  >
                    {portal.isPending ? 'Chargement…' : 'Rétrograder'}
                  </button>
                ) : !isAvailable ? (
                  <button
                    disabled
                    className="w-full px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold cursor-not-allowed"
                  >
                    Disponible V2
                  </button>
                ) : (
                  <button
                    onClick={() => checkout.mutate(tier.id as 'premium' | 'featured')}
                    disabled={checkout.isPending}
                    className={`w-full px-4 py-2 rounded-lg text-white text-sm font-semibold transition ${
                      tier.highlight
                        ? 'bg-cyan-600 hover:bg-cyan-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    } disabled:bg-slate-300`}
                  >
                    {checkout.isPending ? 'Redirection…' : tier.cta}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {checkout.isError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} />
          Erreur lors de la création du paiement Stripe.
          {' '}
          <strong>Note V1 :</strong> l'EF <code>create-checkout-session</code> doit accepter
          le product <code>reseau_subscription</code> avec les price IDs Premium/Featured.
        </div>
      )}

      <div className="rounded-xl bg-cyan-50/30 border border-cyan-200/60 p-4 text-xs text-cyan-900">
        <p className="font-semibold mb-1">À savoir</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Paiement sécurisé via Stripe (CB ou SEPA prélèvement)</li>
          <li>Annulable à tout moment, sans engagement</li>
          <li>Facture mensuelle auto envoyée par email</li>
          <li>TVA 20 % incluse pour pros français</li>
          <li><strong>V2</strong> : tier Featured (49€/mois) débloque le profil mis en avant dans la découverte</li>
        </ul>
      </div>
    </div>
  )
}
