import type { ReactNode } from 'react'

interface ProgressBarProps {
  label: string
  icon?: ReactNode
  /** Score entre 0 et 100. */
  score: number
  /** Couleur de la barre + texte. */
  color?: 'orange' | 'emerald' | 'red' | 'amber' | 'slate'
  /** Texte optionnel sous la barre (ex: breakdown). */
  caption?: ReactNode | string | null
}

const COLOR_MAP = {
  orange: { bg: 'bg-orange-500', txt: 'text-orange-700' },
  emerald: { bg: 'bg-emerald-500', txt: 'text-emerald-700' },
  red: { bg: 'bg-red-500', txt: 'text-red-700' },
  amber: { bg: 'bg-amber-500', txt: 'text-amber-700' },
  slate: { bg: 'bg-slate-500', txt: 'text-slate-700' },
} as const

/**
 * Barre de progression score 0-100 utilisée dans les fiches.
 *
 * Extrait de l'ancien IntentBar de FicheAdresseView.
 */
export default function ProgressBar({ label, icon, score, color = 'orange', caption }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, score))
  const { bg, txt } = COLOR_MAP[color]
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${txt}`}>
          {icon}
          {label}
        </span>
        <span className="font-bold text-slate-900">{score}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {caption && <div className="mt-1 text-[10px] text-slate-500">{caption}</div>}
    </div>
  )
}
