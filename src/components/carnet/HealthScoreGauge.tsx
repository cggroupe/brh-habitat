import type { HealthUrgency } from '@/types/database'
import { URGENCY_LABELS, URGENCY_COLORS } from '@/data/constants'
import { CheckCircle2, Info, TrendingUp, AlertTriangle } from 'lucide-react'

const URGENCY_ICONS = {
  faible: CheckCircle2,
  modere: Info,
  eleve: TrendingUp,
  critique: AlertTriangle,
}

const STROKE_COLORS: Record<HealthUrgency, string> = {
  faible: '#16a34a',
  modere: '#ca8a04',
  eleve: '#ea580c',
  critique: '#dc2626',
}

export function getUrgencyFromScore(score: number): HealthUrgency {
  if (score >= 75) return 'critique'
  if (score >= 50) return 'eleve'
  if (score >= 25) return 'modere'
  return 'faible'
}

interface HealthScoreGaugeProps {
  score: number
  urgency?: HealthUrgency
  size?: 'sm' | 'md'
}

export function HealthScoreGauge({ score, urgency, size = 'md' }: HealthScoreGaugeProps) {
  const level = urgency ?? getUrgencyFromScore(score)
  const config = URGENCY_COLORS[level]
  const Icon = URGENCY_ICONS[level]

  const isSm = size === 'sm'
  const svgSize = isSm ? 'w-16 h-16' : 'w-28 h-28'
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${svgSize}`}>
        <svg className={`${svgSize} -rotate-90`} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={STROKE_COLORS[level]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-accent ${isSm ? 'text-xl' : 'text-3xl'} text-slate-900`}>{score}</span>
          <span className={`font-body ${isSm ? 'text-[10px]' : 'text-xs'} text-slate-400`}>/100</span>
        </div>
      </div>
      {!isSm && (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display ${config.text} ${config.bg} border ${config.border}`}
        >
          <Icon size={14} />
          {URGENCY_LABELS[level]}
        </div>
      )}
    </div>
  )
}
