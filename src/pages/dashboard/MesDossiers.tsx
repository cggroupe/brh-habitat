import { useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  Euro,
  CalendarDays,
  Wrench,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useUserCases } from '@/hooks/queries'
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS, CASE_STATUSES } from '@/data/constants'
import type { BrhCaseRow, CaseStatus } from '@/types/database'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${CASE_STATUS_COLORS[status]}`}>
      {CASE_STATUS_LABELS[status]}
    </span>
  )
}

// ─── Case card ────────────────────────────────────────────────────────────────

function CaseCard({ caseRow, onClick }: { caseRow: BrhCaseRow; onClick: () => void }) {
  const hasDateRange = caseRow.start_date || caseRow.end_date

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-display text-base text-text-primary leading-tight group-hover:text-primary transition-colors">
          {caseRow.title}
        </h3>
        <StatusBadge status={(caseRow.status ?? 'nouveau') as CaseStatus} />
      </div>

      {caseRow.description && (
        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
          {caseRow.description}
        </p>
      )}

      {/* Work types tags */}
      {(caseRow.work_types?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(caseRow.work_types ?? []).map(wt => (
            <span key={wt} className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded-full text-[11px] font-body text-text-secondary border border-gray-light">
              <Wrench size={9} />
              {wt}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-body text-text-light">
          {caseRow.estimated_budget !== null && (
            <span className="flex items-center gap-1">
              <Euro size={11} />
              {caseRow.estimated_budget.toLocaleString('fr-FR')} €
            </span>
          )}
          {hasDateRange && (
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {caseRow.start_date
                ? new Date(caseRow.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : '?'}
              {' → '}
              {caseRow.end_date
                ? new Date(caseRow.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'En cours'}
            </span>
          )}
        </div>
        <ArrowRight size={14} className="text-text-light opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MesDossiers() {
  const { user } = useAppStore()
  const navigate = useNavigate()

  const { data: cases = [], isLoading, error } = useUserCases(user?.id)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-text-primary">Mes dossiers</h1>
        <p className="font-body text-text-secondary mt-1">
          Suivez l'avancement de vos projets de rénovation
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          Impossible de charger vos dossiers. Veuillez réessayer.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-4">
            <FolderOpen size={28} />
          </div>
          <h2 className="font-display text-xl text-text-primary mb-2">Aucun dossier</h2>
          <p className="font-body text-text-secondary text-sm max-w-xs leading-relaxed mb-6">
            Vos dossiers de rénovation apparaîtront ici après qu'un conseiller BRH Habitat les aura créés suite à votre diagnostic.
          </p>
          <a
            href="/diagnostic"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            Lancer un diagnostic
          </a>
        </div>
      )}

      {/* Status summary strip */}
      {!isLoading && !error && cases.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {CASE_STATUSES.map(status => {
              const count = cases.filter(c => c.status === status).length
              if (count === 0) return null
              return (
                <span key={status} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display ${CASE_STATUS_COLORS[status]}`}>
                  {CASE_STATUS_LABELS[status]}
                  <span className="font-body">{count}</span>
                </span>
              )
            })}
          </div>

          <div className="space-y-4">
            {cases.map(caseRow => (
              <CaseCard
                key={caseRow.id}
                caseRow={caseRow}
                onClick={() => navigate(`/mes-dossiers/${caseRow.id}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
