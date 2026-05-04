/**
 * Phase R10 — Liste des visites passées pour une cible (prospect/artisan/agence).
 *
 * Affichée dans la fiche détail. RLS scope automatiquement aux visites
 * de la company de l'utilisateur (member voit toutes les visites de ses
 * collègues).
 */
import { useVisitsForTarget } from '@/hooks/queries/field-visits'
import type { VisitTargetType, VisitStatus } from '@/api/field-visits'
import { Loader, Calendar, User as UserIcon } from 'lucide-react'

const STATUS_LABELS: Record<VisitStatus, string> = {
  planned: 'Planifiée',
  completed: 'Effectuée',
  no_answer: 'Pas de réponse',
  refused: 'Refusée',
  interested: 'Intéressé(e)',
}

const STATUS_BADGE: Record<VisitStatus, string> = {
  planned: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  no_answer: 'bg-amber-100 text-amber-800',
  refused: 'bg-red-100 text-red-800',
  interested: 'bg-purple-100 text-purple-800',
}

interface VisitHistoryListProps {
  targetType: VisitTargetType
  targetId: string
  /** Si défini, scope au niveau company (sinon RLS scope tout seul). */
  companyId?: string
  /** Compact = 1 ligne par visite. Defaut = full. */
  compact?: boolean
}

export function VisitHistoryList({
  targetType,
  targetId,
  companyId,
  compact = false,
}: VisitHistoryListProps) {
  const { data: visits, isLoading } = useVisitsForTarget(targetType, targetId, companyId)

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader className="animate-spin text-primary" size={20} />
      </div>
    )
  }

  if (!visits || visits.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic p-3">
        Aucune visite enregistrée pour cette cible.
      </p>
    )
  }

  if (compact) {
    return (
      <ul className="text-xs space-y-1.5">
        {visits.map((v) => (
          <li key={v.id} className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_BADGE[v.status]}`}>
              {STATUS_LABELS[v.status]}
            </span>
            <span className="text-gray-500">
              {v.completed_at
                ? new Date(v.completed_at).toLocaleDateString('fr-FR')
                : v.scheduled_at
                  ? `Prévue ${new Date(v.scheduled_at).toLocaleDateString('fr-FR')}`
                  : '—'}
            </span>
            <span className="text-gray-400">par {v.employee?.full_name ?? '—'}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="space-y-2">
      {visits.map((v) => {
        const dateText = v.completed_at
          ? `Effectuée le ${new Date(v.completed_at).toLocaleString('fr-FR')}`
          : v.scheduled_at
            ? `Prévue le ${new Date(v.scheduled_at).toLocaleString('fr-FR')}`
            : 'Date non renseignée'
        return (
          <li
            key={v.id}
            className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-100"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[v.status]}`}>
                {STATUS_LABELS[v.status]}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> {dateText}
              </span>
            </div>
            <p className="text-xs text-gray-600 flex items-center gap-1 mb-1">
              <UserIcon size={12} /> {v.employee?.full_name ?? 'Employé inconnu'} ·{' '}
              <span className="capitalize">{v.visit_type.replace(/_/g, ' ')}</span>
            </p>
            {v.notes ? (
              <p className="text-xs italic text-gray-700 mt-1 bg-white rounded p-2 border border-gray-100">
                {v.notes}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
