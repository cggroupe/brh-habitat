/**
 * Phase 16.1 Step B — Carte décomposition leads disponibles.
 *
 * Affiche : tier (forfait Stripe) + 3 sources de bonus (social, contribution,
 * referral). Chaque ligne montre `consumed / unlocked` avec barre de progression.
 *
 * Le tier est consommé en premier au claim, puis les bonus dans l'ordre
 * contribution → referral → social. Reset le 1er du mois (toutes sources).
 */
import { Sparkles, Share2, Handshake, Network, Infinity as InfinityIcon, Gift } from 'lucide-react'
import { useMyLeadBreakdown } from '@/hooks/queries/agence-lead-economy'

const TIER_LABELS: Record<string, string> = {
  discovery: 'Forfait Discovery',
  standard: 'Forfait Standard',
  premium: 'Forfait Premium',
  expert: 'Forfait Expert',
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
    <div className={`p-3 rounded-xl ${highlight ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={highlight ? 'text-orange-600' : 'text-slate-500'} />
        <p className={`text-xs font-bold ${highlight ? 'text-orange-800' : 'text-slate-700'}`}>
          {label}
        </p>
        <span className="ml-auto text-xs font-bold tabular-nums text-slate-800">
          {remaining} <span className="text-slate-400 font-normal">/ {unlocked}</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            highlight ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-slate-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">{helpText}</p>
    </div>
  )
}

export default function LeadBreakdownCard() {
  const { data, isLoading } = useMyLeadBreakdown()

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
        <div className="h-6 w-40 bg-slate-200 rounded mb-3" />
        <div className="h-12 w-24 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm text-slate-500">Aucun abonnement actif.</p>
      </div>
    )
  }

  const isUnlimited = data.tier === 'expert' || data.totalRemaining === null
  const tierLabel = data.tier ? TIER_LABELS[data.tier] : 'Forfait'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
          Leads disponibles ce mois
        </p>
        <span className="text-[10px] uppercase font-bold tracking-wide text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
          Reset 1er du mois
        </span>
      </div>

      <div className="flex items-end gap-2 mb-4">
        {isUnlimited ? (
          <>
            <InfinityIcon size={36} className="text-orange-500" strokeWidth={2.5} />
            <span className="text-sm font-bold text-slate-700 mb-1">Illimité (Expert)</span>
          </>
        ) : (
          <>
            <span className="text-4xl font-bold tabular-nums text-slate-800">
              {data.totalRemaining}
            </span>
            <span className="text-sm text-slate-500 mb-1">leads restants</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {/* Forfait tier */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={13} className="text-orange-300" />
            <p className="text-xs font-bold">{tierLabel}</p>
            <span className="ml-auto text-xs font-bold tabular-nums">
              {data.tierQuota === null ? (
                <InfinityIcon size={12} className="inline" />
              ) : (
                <>
                  {data.tierRemaining} <span className="text-slate-400 font-normal">/ {data.tierQuota}</span>
                </>
              )}
            </span>
          </div>
          {data.tierQuota !== null && data.tierRemaining !== null && (
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                style={{ width: `${(data.tierUsed / data.tierQuota) * 100}%` }}
              />
            </div>
          )}
          <p className="text-[10px] text-slate-300 mt-1.5">
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
          helpText="+5 leads par charte signée d'une agence parrainée."
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
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
          <Gift size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            Vous avez <strong>{data.bonusTotalRemaining} leads bonus</strong> en plus de votre forfait.
            Ils sont consommés une fois votre forfait épuisé. Reset le 1er du mois.
          </p>
        </div>
      )}
    </div>
  )
}
