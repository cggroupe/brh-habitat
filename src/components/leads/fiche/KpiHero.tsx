import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber } from '../../../lib/format'

export interface KpiItem {
  label: string
  value: number | string | null | undefined
  icon?: ReactNode
  sublabel?: string
  /** Auto-derived si non précisé selon valeur (>0 = green pour KPI patrimonial, gray sinon). */
  color?: 'green' | 'amber' | 'red' | 'gray' | 'blue'
  onClick?: () => void
  emphasis?: 'primary' | 'secondary'
}

interface KpiHeroProps {
  items: KpiItem[]
}

// Palette Editorial Habitat — cards rounded-2xl ring-1 (matched dashboard)
const COLOR_DOT: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'bg-[#00600a]',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  gray: 'bg-stone-400',
}

const COLOR_TEXT: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'text-[#00600a]',
  amber: 'text-text',
  red: 'text-text',
  blue: 'text-text',
  gray: 'text-text',
}

/**
 * Hero KPI 3-5 stats — palette Editorial Habitat sobre.
 * Pas de bg-emerald-50 fluorescent : fond stone neutre, accent texte vert sombre.
 */
export default function KpiHero({ items }: KpiHeroProps) {
  if (items.length === 0) return null
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((kpi, i) => (
        <KpiCard key={`${kpi.label}-${i}`} kpi={kpi} />
      ))}
    </section>
  )
}

function KpiCard({ kpi }: { kpi: KpiItem }) {
  const color = kpi.color ?? 'gray'
  const isActionable = typeof kpi.onClick === 'function'
  const valueDisplay =
    typeof kpi.value === 'number' ? formatNumber(kpi.value) : (kpi.value ?? '—')
  const emphasis = kpi.emphasis ?? 'primary'

  // Grammaire dashboard : rounded-2xl + bg-surface + ring-1 ring-border-strong/20
  const baseCls = `flex flex-col gap-2 rounded-2xl bg-surface ring-1 ring-border-strong/20 px-4 ${emphasis === 'primary' ? 'py-4' : 'py-3'} transition`

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-muted font-bold">
          <span className={`h-1.5 w-1.5 rounded-full ${COLOR_DOT[color]}`} />
          {kpi.label}
        </span>
        {isActionable && <ChevronRight className="h-3.5 w-3.5 text-text-light" />}
      </div>
      <span
        className={`font-display ${emphasis === 'primary' ? 'text-2xl' : 'text-xl'} font-bold leading-none tabular-nums ${COLOR_TEXT[color]}`}
      >
        {valueDisplay}
      </span>
      {kpi.sublabel && (
        <span className="text-[11px] text-text-muted">{kpi.sublabel}</span>
      )}
    </>
  )

  if (isActionable) {
    return (
      <button
        type="button"
        onClick={kpi.onClick}
        className={`${baseCls} text-left hover:ring-text-muted/40 hover:shadow-sm`}
      >
        {inner}
      </button>
    )
  }
  return <div className={baseCls}>{inner}</div>
}
