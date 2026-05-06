/**
 * Phase 16.1 Step B — Carte décomposition leads disponibles.
 *
 * Affiche : tier (forfait Stripe) + 3 sources de bonus (social, contribution,
 * referral). Chaque ligne montre `consumed / unlocked` avec barre de progression.
 *
 * Le tier est consommé en premier au claim, puis les bonus dans l'ordre
 * contribution → referral → social. Reset le 1er du mois (toutes sources).
 *
 * Design system BRH : palette verte primary, fonts DM Sans + Inter,
 * shadow signature `0_8px_30px_rgba(27,28,28,0.04)`, border-white/80.
 */
import { Sparkles, Share2, Handshake, Network, Infinity as InfinityIcon, Gift } from 'lucide-react'
import { useMyLeadBreakdown } from '@/hooks/queries/agence-lead-economy'

const TIER_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  standard: 'Standard',
  premium: 'Premium',
  expert: 'Expert',
}

interface SourceLineProps {
  label: string
  icon: typeof Share2
  remaining: number
  unlocked: number
  helpText: string
  highlight?: boolean
}

function SourceLine({ label, icon: Icon, remaining, unlocked, helpText, highlight }: SourceLineProps) {
  const consumed = unlocked - remaining
  const pct = unlocked > 0 ? (consumed / unlocked) * 100 : 0

  return (
    <div
      className={`p-3.5 rounded-xl transition-colors ${
        highlight
          ? 'bg-primary/5 border border-primary/20'
          : 'bg-background border border-neutral-light'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            highlight ? 'bg-primary/10' : 'bg-surface-low'
          }`}
        >
          <Icon size={13} className={highlight ? 'text-primary' : 'text-text-light'} />
        </div>
        <p className={`text-xs font-bold ${highlight ? 'text-primary-dark' : 'text-text-secondary'}`}>
          {label}
        </p>
        <span className="ml-auto text-sm font-display font-bold tabular-nums text-text-primary">
          {remaining}
          <span className="text-text-light text-xs font-normal ml-0.5">/ {unlocked}</span>
        </span>
      </div>
      <div className="h-1.5 bg-neutral-light rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            highlight ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-text-light/40'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-text-light mt-2 leading-relaxed">{helpText}</p>
    </div>
  )
}

export default function LeadBreakdownCard() {
  const { data, isLoading } = useMyLeadBreakdown()

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6 animate-pulse">
        <div className="h-4 w-48 bg-neutral-light rounded mb-3" />
        <div className="h-12 w-32 bg-neutral-light rounded mb-5" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-background rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
        <p className="text-sm text-text-light">Aucun abonnement actif.</p>
      </div>
    )
  }

  const isUnlimited = data.tier === 'expert' || data.totalRemaining === null
  const tierLabel = data.tier ? TIER_LABELS[data.tier] : 'Forfait'

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
      {/* Header avec eyebrow + reset badge */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
          Leads disponibles ce mois
        </p>
        <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-1">
          Reset 1er du mois
        </span>
      </div>

      {/* Total restant — chiffre oversized DM Sans */}
      <div className="flex items-end gap-2.5 mb-5">
        {isUnlimited ? (
          <>
            <InfinityIcon size={42} className="text-primary" strokeWidth={2.5} />
            <span className="text-sm font-bold text-text-secondary mb-1.5">Illimité (Expert)</span>
          </>
        ) : (
          <>
            <span className="font-display text-5xl font-bold tabular-nums text-text-primary tracking-tight leading-none">
              {data.totalRemaining}
            </span>
            <span className="text-sm text-text-light mb-1.5 font-medium">leads restants</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {/* Forfait tier — card principale dark deep green */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-deep to-primary-dark text-white shadow-md shadow-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-primary-light" />
            </div>
            <p className="text-xs font-bold">Forfait {tierLabel}</p>
            <span className="ml-auto text-sm font-display font-bold tabular-nums">
              {data.tierQuota === null ? (
                <InfinityIcon size={14} className="inline" />
              ) : (
                <>
                  {data.tierRemaining}
                  <span className="text-white/60 text-xs font-normal ml-0.5">/ {data.tierQuota}</span>
                </>
              )}
            </span>
          </div>
          {data.tierQuota !== null && data.tierRemaining !== null && (
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-light to-secondary"
                style={{ width: `${(data.tierUsed / data.tierQuota) * 100}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-white/70 mt-2 leading-relaxed">
            {data.tierQuota === null
              ? 'Claim sans limite chaque mois.'
              : 'Inclus dans votre abonnement (consommé en premier).'}
          </p>
        </div>

        <SourceLine
          label="Bonus contributions"
          icon={Handshake}
          remaining={data.contribution.remaining}
          unlocked={data.contribution.unlocked}
          helpText="+5 leads par chantier signé via vos apports."
          highlight={data.contribution.remaining > 0}
        />
        <SourceLine
          label="Bonus parrainage"
          icon={Network}
          remaining={data.referral.remaining}
          unlocked={data.referral.unlocked}
          helpText="+5 leads par charte signée d'une agence parrainée (max 30/mois)."
          highlight={data.referral.remaining > 0}
        />
        <SourceLine
          label="Bonus réseaux sociaux"
          icon={Share2}
          remaining={data.social.remaining}
          unlocked={data.social.unlocked}
          helpText="+5 leads par publication validée (max 2/mois)."
          highlight={data.social.remaining > 0}
        />
      </div>

      {data.bonusTotalRemaining > 0 && !isUnlimited && (
        <div className="mt-5 p-3.5 bg-success/5 border border-success/20 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Gift size={14} className="text-success" />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Vous avez{' '}
            <strong className="text-text-primary">{data.bonusTotalRemaining} leads bonus</strong>{' '}
            en plus de votre forfait. Ils sont consommés une fois votre forfait épuisé. Reset le
            1er du mois.
          </p>
        </div>
      )}
    </div>
  )
}
