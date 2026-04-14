import { URGENCY_CONFIG, type UrgencyLevel } from './diagnosticHelpers'

interface ScoreBadgeProps {
  score: number
  urgency: UrgencyLevel
}

export function ScoreBadge({ score, urgency }: ScoreBadgeProps) {
  const config = URGENCY_CONFIG[urgency]
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const strokeColor =
    urgency === 'faible' ? '#16a34a'
    : urgency === 'modere' ? '#ca8a04'
    : urgency === 'eleve' ? '#ea580c'
    : '#dc2626'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-accent text-3xl text-slate-900">{score}</span>
          <span className="font-body text-xs text-slate-400">/100</span>
        </div>
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display ${config.color} ${config.bg} border ${config.border}`}
      >
        <config.icon size={14} />
        {config.label}
      </div>
    </div>
  )
}
