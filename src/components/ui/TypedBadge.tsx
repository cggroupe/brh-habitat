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
 * Badge typé pour les fiches BRH — palette Editorial Habitat tonée.
 * Vert utilisé avec parcimonie : uniquement pour signaler positivement
 * un atout (SCI patrimoniale, risque faible). Les autres badges utilisent
 * stone (neutres beige) ou amber/red sobres.
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
    if (v.includes('modér')) return 'gray'
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

/**
 * Palette tonée Editorial Habitat (vert #00600a / neutres stone).
 * Vert réservé aux signaux positifs (patrimoine, atout). Les autres signaux
 * utilisent stone/amber/red sans saturation excessive.
 */
function colorClasses(c: BadgeColor): string {
  switch (c) {
    case 'green':
      // Vert sombre Editorial Habitat — accent uniquement, pas de bright bg
      return 'bg-stone-50 text-[#00600a] ring-1 ring-inset ring-stone-300'
    case 'amber':
      return 'bg-stone-50 text-amber-900 ring-1 ring-inset ring-amber-300'
    case 'orange':
      return 'bg-stone-50 text-orange-900 ring-1 ring-inset ring-orange-300'
    case 'red':
      return 'bg-stone-50 text-red-900 ring-1 ring-inset ring-red-300'
    case 'blue':
      return 'bg-stone-50 text-blue-900 ring-1 ring-inset ring-blue-300'
    case 'purple':
      return 'bg-stone-50 text-purple-900 ring-1 ring-inset ring-purple-300'
    case 'gray':
    default:
      return 'bg-stone-50 text-stone-700 ring-1 ring-inset ring-stone-300'
  }
}
