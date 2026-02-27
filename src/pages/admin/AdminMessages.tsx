import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhDiagnosticRow, DiagnosticStatus } from '@/types/database'

const PAGE_SIZE = 20

const diagnosticStatusLabels: Record<DiagnosticStatus, string> = {
  pending: 'En attente',
  analyzed: 'Analysé',
  contacted: 'Contacté',
  closed: 'Clôturé',
}

const diagnosticStatusColors: Record<DiagnosticStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  analyzed: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-600',
}

const ALL_STATUSES: DiagnosticStatus[] = ['pending', 'analyzed', 'contacted', 'closed']

export default function AdminMessages() {
  const [diagnostics, setDiagnostics] = useState<BrhDiagnosticRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<DiagnosticStatus | ''>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, DiagnosticStatus>>({})

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('brh_diagnostics')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (filterStatus) {
      query = query.eq('status', filterStatus)
    }

    const { data, count, error: fetchError } = await query

    if (fetchError) {
      setError('Erreur lors du chargement.')
      setLoading(false)
      return
    }

    const rows = data ?? []
    setDiagnostics(rows)
    setTotal(count ?? 0)

    // Initialize local statuses
    setLocalStatuses((prev) => {
      const next = { ...prev }
      rows.forEach((r) => {
        if (!(r.id in next)) next[r.id] = r.status
      })
      return next
    })

    setLoading(false)
  }, [page, filterStatus])

  useEffect(() => {
    void fetchDiagnostics()
  }, [fetchDiagnostics])

  async function updateStatus(id: string, newStatus: DiagnosticStatus) {
    setSavingId(id)

    const { error: updateError } = await supabase
      .from('brh_diagnostics')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!updateError) {
      setDiagnostics((prev) => prev.map((d) => d.id === id ? { ...d, status: newStatus } : d))
      setSavedId(id)
      setTimeout(() => setSavedId(null), 2500)
    }

    setSavingId(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
          onClick={() => { setFilterStatus(''); setPage(0) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
            filterStatus === '' ? 'bg-primary text-white' : 'bg-surface border border-gray-light text-text-secondary hover:bg-background'
          }`}
        >
          Tous ({total})
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
              filterStatus === s ? 'bg-primary text-white' : 'bg-surface border border-gray-light text-text-secondary hover:bg-background'
            }`}
          >
            {diagnosticStatusLabels[s]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-danger font-body text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
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
                    {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  </p>

                  {/* Status selector */}
                  <div className="shrink-0 flex items-center gap-2">
                    {savingId === d.id ? (
                      <span className="text-xs font-body text-text-light">Sauvegarde...</span>
                    ) : savedId === d.id ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : null}
                    <select
                      value={currentStatus}
                      onChange={(e) => {
                        const s = e.target.value as DiagnosticStatus
                        setLocalStatuses((prev) => ({ ...prev, [d.id]: s }))
                        void updateStatus(d.id, s)
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-display border outline-none cursor-pointer ${diagnosticStatusColors[currentStatus]} border-transparent`}
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{diagnosticStatusLabels[s]}</option>
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
                      {Object.keys(d.symptoms).length > 0 && (
                        <div>
                          <h3 className="font-display text-xs text-text-light uppercase tracking-wider mb-2">Symptômes</h3>
                          <div className="space-y-2">
                            {Object.entries(d.symptoms).map(([category, items]) => (
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
                          {d.photos.length > 0 ? `${d.photos.length} photo${d.photos.length !== 1 ? 's' : ''} jointe${d.photos.length !== 1 ? 's' : ''}` : 'Aucune photo'}
                        </p>
                        {d.admin_notes && (
                          <div className="mt-2 p-2.5 bg-surface rounded-lg border border-gray-light">
                            <p className="font-display text-xs text-text-light mb-0.5">Note admin</p>
                            <p className="font-body text-sm text-text-primary">{d.admin_notes}</p>
                          </div>
                        )}
                        <p className="font-body text-xs text-text-light mt-2">ID: {d.id.slice(0, 8)}…</p>
                        <p className="font-body text-xs text-text-light">
                          Reçu le {new Date(d.created_at).toLocaleDateString('fr-FR')}
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
      {!loading && totalPages > 1 && (
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
