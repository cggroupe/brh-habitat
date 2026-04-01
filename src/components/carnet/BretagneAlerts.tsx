import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import type { BrhHomeRow, BrhHealthRecordRow } from '@/types/database'
import { computeBretagneAlerts, type AlertSeverity } from '@/data/bretagne-alerts'
import { HEALTH_DOMAIN_LABELS } from '@/data/constants'

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; text: string; icon: React.ElementType }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: ShieldAlert },
}

interface Props {
  home: BrhHomeRow
  records: BrhHealthRecordRow[]
  maxAlerts?: number
}

export function BretagneAlerts({ home, records, maxAlerts }: Props) {
  const alerts = computeBretagneAlerts(home, records)
  const displayed = maxAlerts ? alerts.slice(0, maxAlerts) : alerts

  if (displayed.length === 0) return null

  return (
    <div className="space-y-3">
      {displayed.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity]
        const Icon = style.icon
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} animate-fadeIn`}
          >
            <Icon size={18} className={`${style.text} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`font-display text-sm ${style.text}`}>{alert.title}</p>
                {alert.relatedDomain && (
                  <span className="text-xs font-body text-slate-400">
                    {HEALTH_DOMAIN_LABELS[alert.relatedDomain]}
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-slate-600 leading-relaxed">
                {alert.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
