import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber } from '../../lib/format'

interface ClickableCounterProps {
  /** Nombre à afficher. */
  count: number | null | undefined
  /** Texte descriptif après le nombre (ex: "DPE détenus"). */
  label: string
  /** Tooltip optionnel ("Cliquez pour voir les 1100 DPE"). */
  tooltip?: string
  /** Anchor target (ex: `#tab-patrimoine`) ou callback. Si null/undefined, le compteur n'est pas cliquable. */
  onClick?: () => void
  href?: string
  /** Variante visuelle. */
  variant?: 'inline' | 'card'
  /** Icône optionnelle (ex: maison, antenne). */
  icon?: ReactNode
}

/**
 * Pattern Data-B "le compteur est un bouton".
 *
 * Tout chiffre affiché sur une fiche doit être actionnable si une liste
 * sous-jacente existe. Si `onClick` ou `href` est fourni, le compteur devient
 * cliquable avec chevron de droite. Sinon il reste un badge inerte.
 */
export default function ClickableCounter({
  count,
  label,
  tooltip,
  onClick,
  href,
  variant = 'inline',
  icon,
}: ClickableCounterProps) {
  const isActionable = (typeof onClick === 'function' || !!href) && (count ?? 0) > 0
  const display = formatNumber(count ?? 0)

  if (variant === 'card') {
    const inner = (
      <>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="font-display text-xl font-semibold text-slate-900">{display}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        </div>
        {isActionable && <ChevronRight className="h-4 w-4 text-slate-400" />}
      </>
    )
    const baseCls =
      'flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 transition'
    if (!isActionable) {
      return (
        <div className={baseCls} title={tooltip}>
          {inner}
        </div>
      )
    }
    if (href) {
      return (
        <a
          href={href}
          className={`${baseCls} hover:border-emerald-300 hover:bg-emerald-50`}
          title={tooltip}
        >
          {inner}
        </a>
      )
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseCls} hover:border-emerald-300 hover:bg-emerald-50`}
        title={tooltip}
      >
        {inner}
      </button>
    )
  }

  // variant inline
  const innerInline = (
    <>
      {icon}
      <span className="font-semibold">{display}</span>
      <span className="text-slate-500">{label}</span>
      {isActionable && <ChevronRight className="h-3 w-3 text-slate-400" />}
    </>
  )
  if (!isActionable) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
        title={tooltip}
      >
        {innerInline}
      </span>
    )
  }
  if (href) {
    return (
      <a
        href={href}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
        title={tooltip}
      >
        {innerInline}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
      title={tooltip}
    >
      {innerInline}
    </button>
  )
}
