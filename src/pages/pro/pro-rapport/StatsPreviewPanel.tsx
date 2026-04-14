import { Euro, TrendingUp, CheckCircle, Users, Download } from 'lucide-react'
import type { RapportData } from '@/lib/rapport-pdf'

function StatCard({
  icon,
  label,
  value,
  prev,
}: {
  icon: React.ReactNode
  label: string
  value: string
  prev: string | null
}) {
  return (
    <div className="bg-background rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold text-text-light">{label}</span>
      </div>
      <p className="font-display text-base font-bold text-text-primary">{value}</p>
      {prev !== null && (
        <p className="text-[10px] text-text-light mt-0.5">Prec. : {prev}</p>
      )}
    </div>
  )
}

function formatEurDisplay(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR') + ' EUR'
}

function monthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface StatsPreviewPanelProps {
  rapportData: RapportData
  selectedMonth: number
  selectedYear: number
  onDownload: () => void
}

export function StatsPreviewPanel({ rapportData, selectedMonth, selectedYear, onDownload }: StatsPreviewPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] p-6 mb-5">
      <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-5">
        Apercu — {monthLabel(selectedMonth, selectedYear)}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Euro size={15} className="text-primary" />}
          label="CA apporte"
          value={formatEurDisplay(rapportData.stats.ca_apporte)}
          prev={rapportData.prev_stats ? formatEurDisplay(rapportData.prev_stats.ca_apporte) : null}
        />
        <StatCard
          icon={<TrendingUp size={15} className="text-blue-500" />}
          label="Commissions dues"
          value={formatEurDisplay(rapportData.stats.commissions_dues)}
          prev={rapportData.prev_stats ? formatEurDisplay(rapportData.prev_stats.commissions_dues) : null}
        />
        <StatCard
          icon={<CheckCircle size={15} className="text-emerald-500" />}
          label="Comm. versees"
          value={formatEurDisplay(rapportData.stats.commissions_versees)}
          prev={null}
        />
        <StatCard
          icon={<Users size={15} className="text-amber-500" />}
          label="Prospects soumis"
          value={String(rapportData.stats.nb_prospects)}
          prev={rapportData.prev_stats ? String(rapportData.prev_stats.nb_prospects) : null}
        />
        <StatCard
          icon={<CheckCircle size={15} className="text-primary" />}
          label="Signes"
          value={String(rapportData.stats.nb_signes)}
          prev={rapportData.prev_stats ? String(rapportData.prev_stats.nb_signes) : null}
        />
        <StatCard
          icon={<TrendingUp size={15} className="text-purple-500" />}
          label="Taux conversion"
          value={
            rapportData.stats.nb_prospects > 0
              ? ((rapportData.stats.nb_signes / rapportData.stats.nb_prospects) * 100).toFixed(1) + '%'
              : '0%'
          }
          prev={null}
        />
      </div>

      <button
        onClick={onDownload}
        className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
      >
        <Download size={15} />
        Telecharger le rapport PDF
      </button>
    </div>
  )
}
