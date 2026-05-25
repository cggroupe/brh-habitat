import { useState } from 'react'
import { MessageSquare, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useAdminDiagnostics,
  useUpdateDiagnosticStatus,
} from '@/hooks/queries'
import {
  DIAGNOSTIC_STATUSES,
  DIAGNOSTIC_STATUS_LABELS,
  DIAGNOSTIC_STATUS_COLORS,
  PAGE_SIZE,
} from '@/data/constants'
import type { DiagnosticStatus } from '@/types/database'

export default function AdminMessages() {
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<DiagnosticStatus | undefined>(undefined)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, DiagnosticStatus>>({})

  const { data, isLoading, isError } = useAdminDiagnostics(page, filterStatus)
  const updateStatus = useUpdateDiagnosticStatus()

  const diagnostics = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleStatusChange(id: string, newStatus: DiagnosticStatus) {
    setLocalStatuses((prev) => ({ ...prev, [id]: newStatus }))
    updateStatus.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => {
          setSavedId(id)
          setTimeout(() => setSavedId(null), 2500)
        },
      },
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-text-primary">Messages & Diagnostics</h1>
        <p className="font-body text-sm text-text-light mt-1">
          Demandes reçues via le formulaire de diagnostic
        </p>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setFilterStatus(undefined); setPage(0) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
            filterStatus === undefined ? 'bg-primary text-white' : 'bg-surface border border-gray-light text-text-secondary hover:bg-background'
          }`}
        >
          Tous ({total})
        </button>
        {DIAGNOSTIC_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
              filterStatus === s ? 'bg-primary text-white' : 'bg-surface border border-gray-light text-text-secondary hover:bg-background'
            }`}
          >
            {DIAGNOSTIC_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isError && (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-danger font-body text-sm">
            <AlertCircle size={16} /> Erreur lors du chargement.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : diagnostics.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-gray-light p-12 text-center">
            <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary mb-1">Aucun message dans cette catégorie</p>
            <p className="font-body text-sm text-text-light">Modifiez le filtre de statut</p>
          </div>
        ) : (
          diagnostics.map((d) => {
            const isExpanded = expandedId === d.id
            const currentStatus = localStatuses[d.id] ?? d.status
            const isSaving = updateStatus.isPending && updateStatus.variables?.id === d.id

            return (
              <div key={d.id} className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    currentStatus === 'pending' ? 'bg-amber-400' :
                    currentStatus === 'analyzed' ? 'bg-blue-400' :
                    currentStatus === 'contacted' ? 'bg-purple-400' : 'bg-gray-300'
                  }`} />

                  {/* Contact info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-body text-sm text-text-primary font-semibold">{d.contact_name}</p>
                      <p className="font-body text-sm text-text-secondary">{d.contact_email}</p>
                      {d.contact_phone && (
                        <p className="font-body text-sm text-text-secondary">{d.contact_phone}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {d.types.map((t) => (
                        <span key={t} className="inline-block px-2 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <p className="font-body text-xs text-text-light shrink-0 hidden sm:block">
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}
                  </p>

                  {/* Status selector */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isSaving ? (
                      <span className="text-xs font-body text-text-light">Sauvegarde...</span>
                    ) : savedId === d.id ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : null}
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(d.id, e.target.value as DiagnosticStatus)}
                      disabled={isSaving}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-display border outline-none cursor-pointer disabled:opacity-60 ${DIAGNOSTIC_STATUS_COLORS[currentStatus]} border-transparent`}
                    >
                      {DIAGNOSTIC_STATUSES.map((s) => (
                        <option key={s} value={s}>{DIAGNOSTIC_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="p-1.5 rounded-lg hover:bg-background transition-colors shrink-0"
                    aria-label={isExpanded ? 'Réduire' : 'Développer'}
                  >
                    {isExpanded ? <ChevronUp size={16} className="text-text-light" /> : <ChevronDown size={16} className="text-text-light" />}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-light px-5 py-5 bg-background">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {/* Property info */}
                      <div>
                        <h3 className="font-display text-xs text-text-light uppercase tracking-wider mb-2">Bien immobilier</h3>
                        <div className="space-y-1">
                          <p className="font-body text-sm text-text-primary">{d.property_address}</p>
                          <p className="font-body text-sm text-text-secondary">{d.property_type}</p>
                          <p className="font-body text-sm text-text-secondary">{d.property_surface} m² — {d.property_floors} étage(s)</p>
                          <p className="font-body text-sm text-text-secondary">Construit en {d.property_year}</p>
                        </div>
                      </div>

                      {/* Symptoms */}
                      {d.symptoms && Object.keys(d.symptoms).length > 0 && (
                        <div>
                          <h3 className="font-display text-xs text-text-light uppercase tracking-wider mb-2">Symptômes</h3>
                          <div className="space-y-2">
                            {Object.entries(d.symptoms as Record<string, string[]>).map(([category, items]) => (
                              <div key={category}>
                                <p className="font-body text-xs text-text-secondary font-semibold mb-1">{category}</p>
                                <div className="flex flex-wrap gap-1">
                                  {(items as string[]).map((item) => (
                                    <span key={item} className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-body">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photos + notes */}
                      <div>
                        <h3 className="font-display text-xs text-text-light uppercase tracking-wider mb-2">Compléments</h3>
                        <p className="font-body text-sm text-text-secondary">
                          {(d.photos?.length ?? 0) > 0 ? `${d.photos?.length ?? 0} photo${(d.photos?.length ?? 0) !== 1 ? 's' : ''} jointe${(d.photos?.length ?? 0) !== 1 ? 's' : ''}` : 'Aucune photo'}
                        </p>
                        {d.admin_notes && (
                          <div className="mt-2 p-2.5 bg-surface rounded-lg border border-gray-light">
                            <p className="font-display text-xs text-text-light mb-0.5">Note admin</p>
                            <p className="font-body text-sm text-text-primary">{d.admin_notes}</p>
                          </div>
                        )}
                        <p className="font-body text-xs text-text-light mt-2">ID: {d.id.slice(0, 8)}…</p>
                        <p className="font-body text-xs text-text-light">
                          Reçu le {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 bg-surface rounded-2xl border border-gray-light px-6 py-4">
          <p className="font-body text-sm text-text-light">
            Page {page + 1} sur {totalPages} — {total} résultats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
