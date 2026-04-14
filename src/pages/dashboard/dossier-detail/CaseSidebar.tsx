import { Link } from 'react-router-dom'
import { Euro, CalendarDays, Home, ArrowLeft } from 'lucide-react'
import { useHomeDetail } from '@/hooks/queries'
import type { CaseStatus } from '@/types/database'

interface CaseRow {
  id: string
  home_id: string | null
  estimated_budget: number | null
  start_date: string | null
  end_date: string | null
  status: CaseStatus
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function LinkedHomeCard({ homeId }: { homeId: string }) {
  const { data: linkedHome } = useHomeDetail(homeId)

  if (!linkedHome) return null

  return (
    <Link
      to={`/mes-logements/${linkedHome.id}`}
      className="block bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-sm transition-all"
    >
      <h2 className="font-display text-base text-text-primary mb-3 flex items-center gap-2">
        <Home size={15} className="text-primary" />
        Logement associé
      </h2>
      <p className="font-body text-sm text-text-primary">{linkedHome.address}</p>
      <p className="font-body text-xs text-text-light mt-0.5">
        {linkedHome.postal_code} {linkedHome.city}
      </p>
      <p className="font-body text-xs text-primary mt-2 flex items-center gap-1">
        Voir le logement <ArrowLeft size={11} className="rotate-180" />
      </p>
    </Link>
  )
}

interface CaseSidebarProps {
  caseRow: CaseRow
}

export function CaseSidebar({ caseRow }: CaseSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Budget card */}
      {caseRow.estimated_budget !== null && (
        <div className="bg-surface rounded-2xl border border-gray-light p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-primary">
              <Euro size={18} />
            </div>
            <div>
              <p className="text-xs font-body text-text-light">Budget estimé</p>
              <p className="font-display text-2xl text-text-primary">
                {caseRow.estimated_budget.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
          <p className="font-body text-xs text-text-light mt-2">
            Ce montant est une estimation et peut être révisé.
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6">
        <h2 className="font-display text-base text-text-primary mb-4 flex items-center gap-2">
          <CalendarDays size={15} className="text-primary" />
          Calendrier
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-body text-text-light">Début prévu</p>
            <p className="text-sm font-body text-text-primary mt-0.5">
              {formatDate(caseRow.start_date)}
            </p>
          </div>
          <div>
            <p className="text-xs font-body text-text-light">Fin prévue</p>
            <p className="text-sm font-body text-text-primary mt-0.5">
              {formatDate(caseRow.end_date)}
            </p>
          </div>
          {caseRow.start_date && caseRow.end_date && (
            <div>
              <p className="text-xs font-body text-text-light">Durée estimée</p>
              <p className="text-sm font-body text-text-primary mt-0.5">
                {Math.ceil(
                  (new Date(caseRow.end_date).getTime() - new Date(caseRow.start_date).getTime()) /
                  (1000 * 60 * 60 * 24 * 7)
                )}{' '}
                semaines
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Linked home */}
      {caseRow.home_id && (
        <LinkedHomeCard homeId={caseRow.home_id} />
      )}
    </div>
  )
}
