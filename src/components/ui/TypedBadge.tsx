import type { ReactNode } from 'react'

export type BadgeVariant =
  | 'score'
  | 'dpe'
  | 'entity-class'
  | 'solvabilite'
  | 'status'
  | 'neutral'

export type BadgeColor =
  | 'green'
  | 'amber'
  | 'red'
  | 'gray'
  | 'blue'
  | 'purple'
  | 'orange'

interface TypedBadgeProps {
  variant: BadgeVariant
  /** Couleur explicite (sinon dérivée du label pour `dpe` / `solvabilite` / `entity-class`). */
  color?: BadgeColor
  label: string
  icon?: ReactNode
  title?: string
  size?: 'sm' | 'md'
}

/**
 * Badge typé pour les fiches BRH — distingue visuellement les rôles, scores,
 * statuts. Reproduit le pattern Data-B "score = catégorie sémantique" et
 * "distinction utility vs patrimoine".
 */
export default function TypedBadge({
  variant,
  color,
  label,
  icon,
  title,
  size = 'sm',
}: TypedBadgeProps) {
  const resolvedColor = color ?? deriveColor(variant, label)
  const cls = colorClasses(resolvedColor)
  const sizeCls =
    size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full font-medium ${cls} ${sizeCls}`}
    >
      {icon}
      {label}
    </span>
  )
}

function deriveColor(variant: BadgeVariant, label: string): BadgeColor {
  const v = label.toLowerCase()
  if (variant === 'dpe') {
    if (v === 'a') return 'green'
    if (v === 'b' || v === 'c') return 'green'
    if (v === 'd') return 'amber'
    if (v === 'e') return 'orange'
    return 'red' // F, G
  }
  if (variant === 'entity-class') {
    if (v.includes('sci patrimoniale') || v.includes('patrimonial')) return 'green'
    if (v.includes('utility') || v.includes('opérateur')) return 'gray'
    if (v.includes('bailleur')) return 'blue'
    if (v.includes('collectivit')) return 'purple'
    return 'gray'
  }
  if (variant === 'solvabilite') {
    if (v.includes('faible')) return 'green'
    if (v.includes('modér')) return 'amber'
    if (v.includes('élevé')) return 'orange'
    if (v.includes('procédure') || v.includes('cessation')) return 'red'
    return 'gray'
  }
  if (variant === 'score') {
    if (v.includes('ultra') || v.includes('chaud')) return 'red'
    if (v.includes('prioritaire') || v.includes('mpr')) return 'orange'
    if (v.includes('modér') || v.includes('standard')) return 'amber'
    if (v.includes('faible') || v.includes('cold')) return 'gray'
  }
  return 'gray'
}

function colorClasses(c: BadgeColor): string {
  switch (c) {
    case 'green':
      return 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200'
    case 'amber':
      return 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200'
    case 'orange':
      return 'bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-200'
    case 'red':
      return 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200'
    case 'blue':
      return 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200'
    case 'purple':
      return 'bg-purple-100 text-purple-800 ring-1 ring-inset ring-purple-200'
    case 'gray':
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
  }
}
