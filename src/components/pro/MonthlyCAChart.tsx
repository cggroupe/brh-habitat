import { useMemo } from 'react'
import { TrendingUp, Percent } from 'lucide-react'

interface MonthlyData {
  label: string
  amount: number // in centimes
}

interface Props {
  monthlyCA: MonthlyData[]
  totalProspects: number
  signedProspects: number
  loading?: boolean
}

function formatEurShort(centimes: number): string {
  if (centimes === 0) return '0 EUR'
  const euros = centimes / 100
  if (euros >= 1000) return `${(euros / 1000).toFixed(1).replace('.0', '')}k EUR`
  return `${euros.toLocaleString('fr-FR')} EUR`
}

export function MonthlyCAChart({ monthlyCA, totalProspects, signedProspects, loading = false }: Props) {
  const maxAmount = useMemo(() => Math.max(...monthlyCA.map((m) => m.amount), 1), [monthlyCA])
  const conversionRate = totalProspects > 0 ? Math.round((signedProspects / totalProspects) * 100) : 0
  const totalCA = monthlyCA.reduce((sum, m) => sum + m.amount, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6 animate-pulse">
        <div className="h-4 w-32 bg-slate-100 rounded mb-6" />
        <div className="flex items-end gap-2 h-28">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 bg-slate-100 rounded-t" style={{ height: `${40 + i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const hasData = monthlyCA.some((m) => m.amount > 0)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">CA mensuel (6 derniers mois)</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Conversion rate badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
            <Percent size={12} className="text-green-600" />
            <span className="font-display text-xs text-green-700 uppercase tracking-wide">
              Taux de conversion : {conversionRate}%
            </span>
          </div>
          {/* Total */}
          <span className="font-body text-xs text-slate-400">
            Total : <span className="font-semibold text-slate-700">{formatEurShort(totalCA)}</span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-28 text-center">
          <p className="font-body text-sm text-slate-400">Aucun chiffre d'affaires signe sur les 6 derniers mois</p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="flex items-end gap-2 h-28 mb-3">
            {monthlyCA.map((m) => {
              const heightPct = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, m.amount > 0 ? 4 : 0) : 0
              const isMax = m.amount === maxAmount && m.amount > 0
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group">
                  {/* Tooltip on hover */}
                  <div className="relative w-full flex flex-col items-center justify-end h-full">
                    {m.amount > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-body text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatEurShort(m.amount)}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isMax ? 'bg-primary' : m.amount > 0 ? 'bg-primary/50' : 'bg-slate-100'
                      }`}
                      style={{ height: `${heightPct}%`, minHeight: m.amount > 0 ? 4 : 2 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Month labels */}
          <div className="flex gap-2">
            {monthlyCA.map((m) => (
              <div key={m.label} className="flex-1 text-center">
                <span className="font-body text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
