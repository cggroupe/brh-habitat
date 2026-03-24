import { AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface TimelineStep {
  order: number
  phase: string
  phaseIcon: string
  types: Array<{ type: string; score: number; budgetMin: number; budgetMax: number }>
  reason: string
  timing: string
  budgetMin: number
  budgetMax: number
}

interface TimelineWarning {
  icon: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

interface RenovationTimelineProps {
  steps: TimelineStep[]
  warnings: TimelineWarning[]
  totalBudgetMin: number
  totalBudgetMax: number
}

function formatEur(value: number): string {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

const WARNING_STYLES: Record<TimelineWarning['severity'], { bg: string; border: string; icon: string; text: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    icon: 'text-blue-500',
    text: 'text-blue-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    text: 'text-amber-900',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    text: 'text-red-900',
  },
}

function WarningIcon({ severity }: { severity: TimelineWarning['severity'] }) {
  const cls = `size-4 shrink-0 ${WARNING_STYLES[severity].icon}`
  if (severity === 'critical') return <AlertCircle className={cls} />
  if (severity === 'warning') return <AlertTriangle className={cls} />
  return <Info className={cls} />
}

export function RenovationTimeline({
  steps,
  warnings,
  totalBudgetMin,
  totalBudgetMax,
}: RenovationTimelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="w-full">
      {/* Liste des etapes */}
      <div className="relative">
        {/* Ligne verte verticale */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#1c7b1d] via-[#359932] to-slate-200 rounded-full" />

        <div className="space-y-0">
          {steps.map((step, idx) => {
            // Warnings rattaches a cette etape (par ordre correspondant)
            const stepWarnings = warnings.filter((_, wi) => wi === idx)

            return (
              <div key={step.order}>
                {/* Step card */}
                <div className="relative flex gap-4 pb-6">
                  {/* Cercle numerote */}
                  <div className="relative z-10 shrink-0 size-10 rounded-full bg-[#1c7b1d] text-white flex items-center justify-center text-sm font-black shadow-md shadow-[#1c7b1d]/30">
                    {step.order}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm p-4 -mt-0.5">
                    {/* En-tete */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">{step.phaseIcon}</span>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{step.phase}</h4>
                      </div>
                      <span className="shrink-0 text-xs font-semibold bg-slate-100 text-slate-500 rounded-full px-2.5 py-1 whitespace-nowrap">
                        {step.timing}
                      </span>
                    </div>

                    {/* Types de travaux */}
                    {step.types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {step.types.map((t) => (
                          <span
                            key={t.type}
                            className="text-xs font-semibold bg-[#1c7b1d]/10 text-[#1c7b1d] rounded-full px-2.5 py-0.5 capitalize"
                          >
                            {t.type}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Raison */}
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{step.reason}</p>

                    {/* Budget */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Budget estime</span>
                      <span className="text-sm font-bold text-slate-800">
                        {formatEur(step.budgetMin)}
                        {step.budgetMin !== step.budgetMax && (
                          <span className="text-slate-400 font-semibold"> – {formatEur(step.budgetMax)}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings associes a cette etape */}
                {stepWarnings.map((w, wi) => {
                  const style = WARNING_STYLES[w.severity]
                  return (
                    <div
                      key={wi}
                      className={`relative flex gap-4 pb-6 ml-0`}
                    >
                      {/* Icone de warning sur la timeline */}
                      <div className="relative z-10 shrink-0 size-10 flex items-center justify-center">
                        <div className={`size-7 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
                          <WarningIcon severity={w.severity} />
                        </div>
                      </div>

                      <div className={`flex-1 rounded-xl border ${style.border} ${style.bg} p-3 -mt-0.5`}>
                        <p className={`text-xs font-bold mb-0.5 ${style.text}`}>{w.icon} {w.title}</p>
                        <p className={`text-xs leading-relaxed ${style.text} opacity-80`}>{w.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Total global */}
      <div className="mt-2 bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-0.5">Budget total (aides deduites)</p>
          <p className="text-xl font-black leading-none">
            {formatEur(totalBudgetMin)}
            {totalBudgetMin !== totalBudgetMax && (
              <span className="text-base font-bold text-slate-400"> – {formatEur(totalBudgetMax)}</span>
            )}
          </p>
        </div>
        <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-lg">🏠</span>
        </div>
      </div>
    </div>
  )
}
