import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber } from '../../lib/format'

interface ClickableCounterProps {
  count: number | null | undefined
  label: string
  tooltip?: string
  onClick?: () => void
  href?: string
  variant?: 'inline' | 'card'
  icon?: ReactNode
}

/**
 * Pattern Data-B "le compteur est un bouton" — palette stone/vert sombre sobre.
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
            <div className="font-display text-xl font-semibold text-stone-900">{display}</div>
            <div className="text-xs text-stone-500">{label}</div>
          </div>
        </div>
        {isActionable && <ChevronRight className="h-4 w-4 text-stone-400" />}
      </>
    )
    const baseCls =
      'flex items-center justify-between gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 transition'
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
          className={`${baseCls} hover:border-stone-400 hover:bg-stone-50`}
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
        className={`${baseCls} hover:border-stone-400 hover:bg-stone-50`}
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
      <span className="text-stone-500">{label}</span>
      {isActionable && <ChevronRight className="h-3 w-3 text-stone-400" />}
    </>
  )
  if (!isActionable) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
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
        className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-[#00600a] ring-1 ring-stone-300 hover:bg-stone-200"
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
      className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-[#00600a] ring-1 ring-stone-300 hover:bg-stone-200"
      title={tooltip}
    >
      {innerInline}
    </button>
  )
}
