import {
  Droplets, Thermometer, Wind, Square, Zap, Home, Wrench, Euro,
} from 'lucide-react'
import { diagnosticTypes } from '@/data/diagnostic-types'
import {
  URGENCY_CONFIG, PRIORITY_BADGE, PRIORITY_LABEL, formatBudgetRange, formatEur,
  type UrgencyLevel,
} from './diagnosticHelpers'
import type { TypeResult } from '@/lib/diagnostic-engine'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Droplets,
  Thermometer,
  Wind,
  Square,
  Zap,
  Home,
  Wrench,
}

function DiagnosticIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Home
  return <Icon size={size} className={className} />
}

interface TypeResultCardProps {
  result: TypeResult
  mprAmount: number
}

export function TypeResultCard({ result, mprAmount }: TypeResultCardProps) {
  const typeConfig = diagnosticTypes.find((t) => t.id === result.type)
  const urgencyConfig = URGENCY_CONFIG[result.urgencyLevel as UrgencyLevel]
  if (!typeConfig || !urgencyConfig) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-fadeIn">
      {/* En-tete */}
      <div className={`flex items-center gap-3 px-5 py-4 ${typeConfig.bgColor}`}>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <DiagnosticIcon name={typeConfig.icon} size={20} className={typeConfig.color} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base text-slate-900">{typeConfig.label}</h3>
          <p className={`text-xs font-body ${urgencyConfig.color}`}>{urgencyConfig.label}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-accent text-2xl text-slate-900">{result.score}</span>
          <span className="font-body text-xs text-slate-400">/100</span>
        </div>
      </div>

      {/* Barre de score */}
      <div className="px-5 pt-4 pb-1">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${urgencyConfig.bar}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* Budget + aide MPR */}
      <div className="px-5 py-3 flex items-center justify-between gap-2 text-sm border-b border-slate-50">
        <div className="flex items-center gap-2 font-body text-slate-500">
          <Euro size={14} className="text-primary shrink-0" />
          Budget :&nbsp;
          <span className="font-semibold text-slate-800">{formatBudgetRange(result.budgetMin, result.budgetMax)}</span>
        </div>
        {mprAmount > 0 && (
          <span className="shrink-0 text-xs font-bold text-primary bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
            MPR -{formatEur(mprAmount)}
          </span>
        )}
      </div>

      {/* Recommandations */}
      {result.recommendations.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          <p className="font-display text-xs text-slate-400 uppercase tracking-wider">Recommandations</p>
          {result.recommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 text-xs font-display px-2 py-0.5 rounded-md ${PRIORITY_BADGE[rec.priority]}`}>
                {PRIORITY_LABEL[rec.priority]}
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm text-slate-900 leading-snug">{rec.title}</p>
                <p className="font-body text-xs text-slate-500 mt-0.5 leading-relaxed">{rec.description}</p>
                <p className="font-body text-xs text-primary mt-1">{rec.estimatedBudget}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
