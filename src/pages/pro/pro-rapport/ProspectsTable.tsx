import type { RapportProspectLine } from '@/lib/rapport-pdf'

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  etude: 'En etude',
  devis_envoye: 'Devis envoye',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const PROSPECT_STATUS_BADGE: Record<string, string> = {
  nouveau: 'bg-blue-50 text-blue-700',
  etude: 'bg-amber-50 text-amber-700',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe: 'bg-primary/10 text-primary',
  termine: 'bg-emerald-50 text-emerald-700',
  perdu: 'bg-background text-text-light',
}

function formatEurDisplay(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR') + ' EUR'
}

function StatusBadge({ status }: { status: string | null }) {
  const safe = status ?? 'nouveau'
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${PROSPECT_STATUS_BADGE[safe] ?? 'bg-background text-text-light'}`}>
      {PROSPECT_STATUS_LABELS[safe] ?? safe}
    </span>
  )
}

interface ProspectsTableProps {
  prospects: RapportProspectLine[]
}

export function ProspectsTable({ prospects }: ProspectsTableProps) {
  if (prospects.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
      <div className="px-6 py-5 bg-background">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
          Prospects du mois ({prospects.length})
        </p>
      </div>
      <div>
        {prospects.map((p, i) => (
          <div
            key={i}
            className={`px-6 py-4 flex items-center justify-between gap-4 hover:bg-background/50 transition-colors ${i > 0 ? 'border-t border-background' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{p.client_name}</p>
              <p className="text-xs text-text-light truncate">{p.work_type}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={p.status} />
              {p.commission_amount !== null && (
                <span className="text-xs font-bold text-primary">
                  {formatEurDisplay(p.commission_amount)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
