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

// Palette Editorial Habitat tonée — fond neutre stone, accent texte uniquement
const COLOR_BG: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'border-stone-300 bg-white',
  amber: 'border-stone-300 bg-white',
  red: 'border-red-200 bg-white',
  blue: 'border-stone-300 bg-white',
  gray: 'border-stone-200 bg-stone-50',
}

const COLOR_TEXT: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'text-[#00600a]',
  amber: 'text-amber-800',
  red: 'text-red-800',
  blue: 'text-blue-900',
  gray: 'text-stone-900',
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

  const baseCls = `flex flex-col gap-1 rounded-lg border px-4 ${emphasis === 'primary' ? 'py-3' : 'py-2'} transition ${COLOR_BG[color]}`

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-stone-500">
          {kpi.icon}
          {kpi.label}
        </span>
        {isActionable && <ChevronRight className="h-3.5 w-3.5 text-stone-400" />}
      </div>
      <span
        className={`font-display ${emphasis === 'primary' ? 'text-3xl' : 'text-xl'} font-semibold leading-none ${COLOR_TEXT[color]}`}
      >
        {valueDisplay}
      </span>
      {kpi.sublabel && (
        <span className="text-[11px] text-stone-500">{kpi.sublabel}</span>
      )}
    </>
  )

  if (isActionable) {
    return (
      <button
        type="button"
        onClick={kpi.onClick}
        className={`${baseCls} text-left hover:border-stone-400 hover:shadow-sm`}
      >
        {inner}
      </button>
    )
  }
  return <div className={baseCls}>{inner}</div>
}
