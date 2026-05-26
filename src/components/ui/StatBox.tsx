import type { ReactNode } from 'react'

interface StatBoxProps {
  label: string
  value: ReactNode
  /** Met le texte en rouge (cas alerte, ex: DPE F/G, succession ouverte). */
  accent?: boolean
  /** Variante visuelle : "card" (par défaut) ou "hero" (plus grande, pour KpiHero). */
  size?: 'card' | 'hero'
}

/**
 * Affichage KPI compact dans les fiches BRH.
 *
 * `size="card"` : carré 44×44px label + valeur, utilisé dans les détails fiche.
 * `size="hero"` : 90px hauteur, valeur en grande typo display, pour `KpiHero`.
 */
export default function StatBox({ label, value, accent, size = 'card' }: StatBoxProps) {
  if (size === 'hero') {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
        <span
          className={`font-display text-2xl font-semibold leading-none ${
            accent ? 'text-red-700' : 'text-slate-900'
          }`}
        >
          {value ?? '—'}
        </span>
      </div>
    )
  }
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          accent ? 'text-red-700' : 'text-slate-900'
        }`}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}
