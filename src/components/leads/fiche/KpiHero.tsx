import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber } from '../../../lib/format'

export interface KpiItem {
  label: string
  value: number | string | null | undefined
  /** Icône optionnelle à gauche du label. */
  icon?: ReactNode
  /** Texte sous la valeur (ex: "France entière"). */
  sublabel?: string
  /** Couleur accent (vert/ambre/rouge/gris) ou auto-derived. */
  color?: 'green' | 'amber' | 'red' | 'gray' | 'blue'
  /** Cliquable → scroll vers tab/section ou drill-down. */
  onClick?: () => void
  /** Variante visuelle pour distinguer KPI primaire (gros) vs secondaire (compact). */
  emphasis?: 'primary' | 'secondary'
}

interface KpiHeroProps {
  items: KpiItem[]
}

const COLOR_BG: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'border-emerald-200 bg-emerald-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
  blue: 'border-blue-200 bg-blue-50',
  gray: 'border-slate-200 bg-white',
}

const COLOR_TEXT: Record<NonNullable<KpiItem['color']>, string> = {
  green: 'text-emerald-800',
  amber: 'text-amber-800',
  red: 'text-red-800',
  blue: 'text-blue-800',
  gray: 'text-slate-900',
}

/**
 * Hero KPI 3-5 stats en grille horizontale — pattern Data-B "fiche entité avec
 * KPI hero qui résume le potentiel métier en un coup d'œil".
 *
 * Sur fiche SCI : Dirigeants · DPE détenus · m² total · Mutations DVF 5 ans
 * Sur fiche Dirigeant : SCI patrimoniales · DPE via SCI · m² total · Mandats actifs
 *
 * Toujours rendu, même si vide (les KPIs à 0 sont affichés en gris pour
 * différencier "vide" de "manquant").
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
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
          {kpi.icon}
          {kpi.label}
        </span>
        {isActionable && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
      </div>
      <span
        className={`font-display ${emphasis === 'primary' ? 'text-3xl' : 'text-xl'} font-semibold leading-none ${COLOR_TEXT[color]}`}
      >
        {valueDisplay}
      </span>
      {kpi.sublabel && (
        <span className="text-[11px] text-slate-500">{kpi.sublabel}</span>
      )}
    </>
  )

  if (isActionable) {
    return (
      <button
        type="button"
        onClick={kpi.onClick}
        className={`${baseCls} text-left hover:border-emerald-300 hover:shadow-sm`}
      >
        {inner}
      </button>
    )
  }
  return <div className={baseCls}>{inner}</div>
}
