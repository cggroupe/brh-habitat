/**
 * Phase 16.1 — Page /agence/progression : ladder paliers + features débloquées.
 */
import { Link } from 'react-router-dom'
import {
  Award,
  Check,
  Lock,
  ArrowRight,
  Handshake,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import { useMyProgression } from '@/hooks/queries/agence-contributions'
import {
  TIER_LABELS_FR,
  TIER_THRESHOLDS,
  TIER_FEATURES,
  TIER_BASE_QUOTA,
  type AgenceProgression,
} from '@/api/agence-contributions'
import LeadBreakdownCard from '@/components/agence/LeadBreakdownCard'

const TIER_GRADIENTS: Record<AgenceProgression['tier'], string> = {
  bronze: 'from-amber-700 to-orange-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-amber-400 to-amber-600',
  platinum: 'from-violet-400 to-purple-600',
}

const TIER_ORDER: AgenceProgression['tier'][] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
]

export default function AgenceProgression() {
  const { data: membership } = useMyAgenceMembership()
  const { data: progression } = useMyProgression(membership?.agenceId)

  if (!progression) {
    return (
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        <p className="text-slate-500">Chargement…</p>
      </div>
    )
  }

  const currentTier = progression.tier
  const currentIdx = TIER_ORDER.indexOf(currentTier)
  const nextTier = TIER_ORDER[currentIdx + 1] ?? null
  const threshold = TIER_THRESHOLDS[currentTier]
  const remainingForNext = threshold.next_chantiers
    ? threshold.next_chantiers - progression.chantiers_signes
    : null
  const progressPct = threshold.next_chantiers
    ? Math.min(
        100,
        Math.round(
          (progression.chantiers_signes / threshold.next_chantiers) * 100,
        ),
      )
    : 100

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
            <Award size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display tracking-tight">Ma progression</h1>
            <p className="text-sm text-slate-500">
              Apportez des prospects travaux pour débloquer plus de leads vente + features
            </p>
          </div>
        </div>
      </header>

      {/* Tier actuel hero */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${TIER_GRADIENTS[currentTier]} p-6 text-white shadow-xl`}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-30 blur-3xl bg-white" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-widest opacity-80 font-bold">
            Palier actuel
          </p>
          <h2 className="text-4xl font-display tracking-tight mt-1 flex items-center gap-3">
            <Award size={32} />
            {TIER_LABELS_FR[currentTier]}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <Stat
              label="Chantiers signés"
              value={String(progression.chantiers_signes)}
              hint={`dont ${progression.chantiers_completes} terminés`}
            />
            <Stat
              label="Quota mensuel"
              value={
                TIER_BASE_QUOTA[currentTier] !== null
                  ? String(TIER_BASE_QUOTA[currentTier])
                  : '∞'
              }
              hint={`+ ${progression.bonus_leads_unlocked} bonus`}
            />
            <Stat
              label="Commissions dues"
              value={
                Math.round(progression.total_commission_due_cents / 100).toLocaleString(
                  'fr-FR',
                ) + ' €'
              }
              hint={`${Math.round(progression.total_commission_paid_cents / 100).toLocaleString('fr-FR')} € versées`}
            />
            <Stat
              label="Contributions"
              value={String(progression.contributions_count)}
              hint={`${progression.contributions_qualified} qualifiées`}
            />
          </div>

          {nextTier ? (
            <div className="mt-6 bg-white/10 border border-white/15 rounded-xl p-4 backdrop-blur">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-bold">
                  Prochain palier : {TIER_LABELS_FR[nextTier]}
                </span>
                <span className="text-xs opacity-90">
                  {remainingForNext} chantier{remainingForNext && remainingForNext > 1 ? 's' : ''} signé
                  {remainingForNext && remainingForNext > 1 ? 's' : ''} restant
                  {remainingForNext && remainingForNext > 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-white/15 border border-white/20 rounded-xl p-4 backdrop-blur text-center">
              <p className="font-bold flex items-center justify-center gap-2">
                <Sparkles size={16} />
                Palier maximum atteint !
              </p>
              <p className="text-xs opacity-90 mt-1">
                Vous bénéficiez de toutes les features BRH partenaire.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Décomposition leads dispo (4 sources) */}
      <LeadBreakdownCard />

      {/* Ladder paliers */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-3">
          Tous les paliers
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TIER_ORDER.map((tier, idx) => {
            const reached = idx <= currentIdx
            const isCurrent = tier === currentTier
            const tierThr = TIER_THRESHOLDS[tier]
            return (
              <div
                key={tier}
                className={`rounded-2xl border-2 p-5 transition ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                    : reached
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${TIER_GRADIENTS[tier]} flex items-center justify-center shadow`}
                    >
                      {reached ? (
                        <Check size={16} className="text-white" />
                      ) : (
                        <Lock size={14} className="text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {TIER_LABELS_FR[tier]}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {tierThr.chantiers === 0
                          ? 'Palier de départ'
                          : `${tierThr.chantiers} chantiers signés`}
                      </p>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                      Actuel
                    </span>
                  ) : null}
                </div>

                <ul className="space-y-1.5">
                  {TIER_FEATURES[tier].map((feat) => (
                    <li
                      key={feat.key}
                      className="text-sm flex items-start gap-2 text-slate-700"
                    >
                      <Check
                        size={14}
                        className={`mt-0.5 shrink-0 ${
                          reached ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span className={reached ? '' : 'text-slate-500'}>{feat.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA contribuer */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Handshake size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-emerald-900">Pas encore au palier visé ?</p>
            <p className="text-xs text-emerald-700">
              Apportez vos prospects vendeurs intéressés par la rénovation — commission 5% +
              5 leads bonus par chantier signé
            </p>
          </div>
        </div>
        <Link
          to="/agence/contributions"
          className="shrink-0 inline-flex items-center gap-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow"
        >
          <TrendingUp size={14} />
          Apporter
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider opacity-80 font-bold">{label}</p>
      <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
      {hint ? <p className="text-[11px] opacity-80 mt-0.5">{hint}</p> : null}
    </div>
  )
}
