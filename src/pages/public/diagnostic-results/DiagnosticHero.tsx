import { Euro, BadgeEuro, Leaf } from 'lucide-react'
import { URGENCY_CONFIG, REVENUE_LABELS, formatBudgetRange, formatEur, type UrgencyLevel } from './diagnosticHelpers'
import { ScoreBadge } from './ScoreBadge'
import type { DiagnosticResult } from '@/lib/diagnostic-engine'
import type { AideResult } from '@/lib/aides-engine'

interface DiagnosticHeroProps {
  results: DiagnosticResult
  aides: AideResult | null
  revenueProfile: string | null | undefined
}

export function DiagnosticHero({ results, aides, revenueProfile }: DiagnosticHeroProps) {
  const overallConfig = URGENCY_CONFIG[results.urgencyLevel as UrgencyLevel]
  const totalAides = aides ? aides.mprTotal + aides.ceeTotal : 0
  const revenueLabel = revenueProfile ? REVENUE_LABELS[revenueProfile] : null

  return (
    <div className={`${overallConfig.bg} border-b ${overallConfig.border}`}>
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          <ScoreBadge score={results.overallScore} urgency={results.urgencyLevel as UrgencyLevel} />

          <div className="flex-1 text-center sm:text-left">
            <p className="font-body text-xs text-slate-400 uppercase tracking-widest mb-1">
              Votre diagnostic BRH Habitat
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-slate-900 mb-2 leading-tight">
              Rapport d'analyse personnalise
            </h1>

            {revenueLabel && (
              <span className="inline-block mb-3 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1">
                {revenueLabel}
              </span>
            )}

            <p className={`font-body text-base ${overallConfig.color} mb-5`}>
              Niveau d'urgence global :&nbsp;<strong>{overallConfig.label}</strong>
            </p>

            {/* Budget + aides */}
            <div className={`inline-block rounded-2xl border ${overallConfig.border} bg-white/80 px-5 py-4 text-left`}>
              <div className="flex items-center gap-2 mb-2">
                <Euro size={16} className="text-slate-400" />
                <span className="font-body text-xs text-slate-400 uppercase tracking-wide">Budget brut estime</span>
              </div>
              <p className="font-display text-xl text-slate-900 mb-3">
                {formatBudgetRange(results.totalBudgetMin, results.totalBudgetMax)}
              </p>
              {totalAides > 0 && (
                <div className="flex items-center gap-2 text-sm text-primary font-body mb-1">
                  <BadgeEuro size={14} />
                  Aides estimees :&nbsp;
                  <span className="font-bold">- {formatEur(totalAides)}</span>
                </div>
              )}
              {aides && (
                <div className="flex items-center gap-2 font-body">
                  <Leaf size={14} className="text-primary" />
                  <span className="text-sm font-black text-slate-900">
                    Reste a charge :&nbsp;
                    {formatBudgetRange(aides.resteAChargeMin, aides.resteAChargeMax)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
