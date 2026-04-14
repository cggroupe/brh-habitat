import { Link } from 'react-router-dom'
import { Home, MapPin, ChevronDown, HeartPulse, ArrowRight } from 'lucide-react'
import { HEALTH_DOMAINS, HEALTH_DOMAIN_LABELS, HEALTH_DOMAIN_COLORS } from '@/data/constants'
import { HealthScoreGauge } from '@/components/carnet/HealthScoreGauge'
import { getUrgencyFromScore } from '@/lib/health'
import type { BrhHomeRow } from '@/types/database'
import type { HealthDomain } from '@/types/database'

function DomainBar({ domain, score }: { domain: HealthDomain; score: number | null }) {
  const colors = HEALTH_DOMAIN_COLORS[domain]
  const urgency = score != null ? getUrgencyFromScore(score) : null
  const barColor = urgency === 'critique' ? 'bg-red-500'
    : urgency === 'eleve' ? 'bg-orange-500'
    : urgency === 'modere' ? 'bg-yellow-500'
    : urgency === 'faible' ? 'bg-green-500'
    : 'bg-slate-200'

  return (
    <div className="flex items-center gap-2">
      <span className={`w-20 text-xs font-body ${colors.text} truncate`}>{HEALTH_DOMAIN_LABELS[domain]}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score ?? 0}%` }} />
      </div>
      <span className="w-8 text-xs font-accent text-text-primary text-right">{score ?? '—'}</span>
    </div>
  )
}

interface HomeHealthPanelProps {
  homes: BrhHomeRow[]
  selectedHomeIdx: number
  onSelectHome: (idx: number) => void
  selectedHome: BrhHomeRow
  globalScore: number | null
  scoreByDomain: Partial<Record<HealthDomain, number | null>>
  healthRecordsCount: number
}

export function HomeHealthPanel({
  homes,
  selectedHomeIdx,
  onSelectHome,
  selectedHome,
  globalScore,
  scoreByDomain,
  healthRecordsCount,
}: HomeHealthPanelProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      {/* Carte logement + selecteur */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6">
        {homes.length > 1 ? (
          <div className="relative mb-4">
            <select
              value={selectedHomeIdx}
              onChange={(e) => onSelectHome(Number(e.target.value))}
              className="w-full appearance-none px-3 py-2 pr-8 border border-gray-light rounded-xl font-display text-sm bg-background outline-none focus:border-primary transition-colors"
            >
              {homes.map((h, i) => (
                <option key={h.id} value={i}>{h.address} — {h.city}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
          </div>
        ) : (
          <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Mon logement</p>
        )}

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Home size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base text-text-primary leading-tight">{selectedHome.address}</p>
            <p className="font-body text-xs text-text-light flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {selectedHome.postal_code} {selectedHome.city}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs font-body bg-background px-2 py-0.5 rounded-full text-text-secondary">{selectedHome.surface} m²</span>
              <span className="text-xs font-body bg-background px-2 py-0.5 rounded-full text-text-secondary">{selectedHome.year_built}</span>
              {selectedHome.dpe_rating && (
                <span className="text-xs font-display bg-primary/10 text-primary px-2 py-0.5 rounded-full">DPE {selectedHome.dpe_rating}</span>
              )}
            </div>
          </div>
        </div>

        <Link
          to={`/mes-logements/${selectedHome.id}`}
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary font-body hover:underline"
        >
          Voir le detail <ArrowRight size={12} />
        </Link>
      </div>

      {/* Score global */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6 flex flex-col items-center justify-center">
        <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <HeartPulse size={14} /> Score sante
        </p>
        {globalScore !== null ? (
          <>
            <HealthScoreGauge score={globalScore} />
            <p className="font-body text-xs text-text-light mt-2">
              {healthRecordsCount} / {HEALTH_DOMAINS.length} domaines
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="font-body text-sm text-text-light mb-3">Aucune evaluation</p>
            <Link
              to={`/mes-logements/${selectedHome.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary font-display text-sm rounded-xl hover:bg-primary/20 transition-colors"
            >
              Evaluer mon logement
            </Link>
          </div>
        )}
      </div>

      {/* Scores par domaine */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6">
        <p className="font-display text-xs text-text-light uppercase tracking-wider mb-4">Par domaine</p>
        <div className="space-y-2.5">
          {HEALTH_DOMAINS.map((d) => (
            <DomainBar key={d} domain={d} score={scoreByDomain[d] ?? null} />
          ))}
        </div>
      </div>
    </div>
  )
}
