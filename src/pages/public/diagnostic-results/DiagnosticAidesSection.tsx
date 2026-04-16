import { BadgeEuro } from 'lucide-react'
import { AidesCard } from '@/components/AidesCard'
import { SectionCard, SectionHeader } from './SectionCard'
import { formatEur } from './diagnosticHelpers'
import type { DiagnosticResult } from '@/lib/diagnostic-engine'
import type { AideResult } from '@/lib/aides-engine'

interface DiagnosticAidesSectionProps {
  results: DiagnosticResult
  aides: AideResult
  revenueProfile: string | null | undefined
}

export function DiagnosticAidesSection({ results, aides, revenueProfile }: DiagnosticAidesSectionProps) {
  return (
    <SectionCard>
      <SectionHeader
        icon={<BadgeEuro size={18} className="text-primary" />}
        title="Vos aides financieres"
        subtitle={aides.estimated ? 'Estimation sur profil median — renseignez vos revenus pour personnaliser' : undefined}
      />
      <div className="p-6">
        <AidesCard
          budgetMin={results.totalBudgetMin}
          budgetMax={results.totalBudgetMax}
          mprAmount={aides.mprTotal}
          ceeAmount={aides.ceeTotal}
          resteAChargeMin={aides.resteAChargeMin}
          resteAChargeMax={aides.resteAChargeMax}
          revenueProfile={revenueProfile ?? null}
          ecoPtz={aides.ecoPtz}
          tvaReduite={aides.tvaReduite}
        />

        {/* Detail MPR par geste */}
        {aides.mprDetails.length > 0 && (
          <div className="mt-5 border-t border-slate-50 pt-4">
            <p className="font-display text-xs text-slate-400 uppercase tracking-wider mb-3">
              Detail MaPrimeRenov' 2026
            </p>
            <div className="space-y-2">
              {aides.mprDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-body text-slate-600">{detail.label}</span>
                  <span className="font-bold text-primary shrink-0">
                    - {formatEur(detail.montant)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detail CEE */}
        {aides.ceeDetails.length > 0 && (
          <div className="mt-4 border-t border-slate-50 pt-4">
            <p className="font-display text-xs text-slate-400 uppercase tracking-wider mb-3">
              Detail Certificats CEE
            </p>
            <div className="space-y-2">
              {aides.ceeDetails.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-body text-slate-600">{detail.label}</span>
                  <span className="font-bold text-primary-green shrink-0">
                    - {formatEur(detail.montant)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
