import { useEffect, useState, useCallback } from 'react'
import { Calendar, AlertCircle, CheckCircle2, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhAppointmentRow, AppointmentType, AppointmentStatus } from '@/types/database'

interface RdvWithUser extends BrhAppointmentRow {
  user_full_name: string | null
}

interface EditState {
  status: AppointmentStatus
  confirmedDate: string
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

const PAGE_SIZE = 20

const appointmentTypeLabels: Record<AppointmentType, string> = {
  diagnostic: 'Diagnostic',
  devis: 'Devis',
  visite: 'Visite',
  suivi: 'Suivi',
}

const appointmentTypeColors: Record<AppointmentType, string> = {
  diagnostic: 'bg-green-100 text-green-700',
  devis: 'bg-blue-100 text-blue-700',
  visite: 'bg-purple-100 text-purple-700',
  suivi: 'bg-gray-100 text-gray-600',
}

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  demande: 'Demandé',
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé',
}

const appointmentStatusColors: Record<AppointmentStatus, string> = {
  demande: 'bg-amber-100 text-amber-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}

const ALL_STATUSES: AppointmentStatus[] = ['demande', 'confirme', 'annule', 'termine']
const ALL_TYPES: AppointmentType[] = ['diagnostic', 'devis', 'visite', 'suivi']

export default function AdminRdv() {
  const [rdvList, setRdvList] = useState<RdvWithUser[]>([])
  const [editStates, setEditStates] = useState<Record<string, EditState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | ''>('')
  const [filterType, setFilterType] = useState<AppointmentType | ''>('')

  const fetchRdv = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('brh_appointments')
      .select('*', { count: 'exact' })
      .order('requested_date', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterType) query = query.eq('type', filterType)

    const { data, count, error: fetchError } = await query

    if (fetchError) {
      setError('Erreur lors du chargement des rendez-vous.')
      setLoading(false)
      return
    }

    const rows = data ?? []
    const userIds = [...new Set(rows.filter((r) => r.user_id).map((r) => r.user_id as string))]
    let profileMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]))
      }
    }

    const enriched: RdvWithUser[] = rows.map((r) => ({
      ...r,
      user_full_name: r.user_id ? (profileMap[r.user_id] ?? null) : null,
    }))

    setRdvList(enriched)
    setTotal(count ?? 0)

    // Initialize edit states (preserve existing dirty states)
    setEditStates((prev) => {
      const next: Record<string, EditState> = {}
      enriched.forEach((r) => {
        if (prev[r.id]?.dirty) {
          next[r.id] = prev[r.id]
        } else {
          next[r.id] = {
            status: r.status,
            confirmedDate: r.confirmed_date ? r.confirmed_date.slice(0, 10) : '',
            dirty: false,
            saving: false,
            saved: false,
            error: null,
          }
        }
      })
      return next
    })

    setLoading(false)
  }, [page, filterStatus, filterType])

  useEffect(() => {
    void fetchRdv()
  }, [fetchRdv])

  function updateEdit(id: string, patch: Partial<EditState>) {
    setEditStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, dirty: true },
    }))
  }

  async function saveRdv(id: string) {
    const edit = editStates[id]
    if (!edit) return

    setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], saving: true, error: null } }))

    const { error: updateError } = await supabase
      .from('brh_appointments')
      .update({
        status: edit.status,
        confirmed_date: edit.confirmedDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      setEditStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: false, error: 'Erreur de sauvegarde.' },
      }))
    } else {
      setEditStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: false, saved: true, dirty: false },
      }))
      setTimeout(() => {
        setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], saved: false } }))
      }, 3000)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-text-primary">Rendez-vous</h1>
        <p className="font-body text-sm text-text-light mt-1">
          {total} rendez-vous au total
        </p>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-gray-light p-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-body text-sm text-text-secondary">Statut :</span>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as AppointmentStatus | ''); setPage(0) }}
            className="font-body text-sm text-text-primary bg-background border border-gray-light rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{appointmentStatusLabels[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-sm text-text-secondary">Type :</span>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as AppointmentType | ''); setPage(0) }}
            className="font-body text-sm text-text-primary bg-background border border-gray-light rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{appointmentTypeLabels[t]}</option>
            ))}
          </select>
        </div>
        {(filterStatus || filterType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); setPage(0) }}
            className="text-xs font-body text-danger hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
        {error && (
          <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rdvList.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary mb-1">Aucun rendez-vous trouvé</p>
            <p className="font-body text-sm text-text-light">Modifiez les filtres</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-light">
                  <tr>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Date demandée</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Date confirmée</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rdvList.map((rdv) => {
                    const edit = editStates[rdv.id]
                    if (!edit) return null
                    return (
                      <tr key={rdv.id} className={`border-b border-gray-light last:border-0 transition-colors ${edit.dirty ? 'bg-amber-50' : 'hover:bg-background'}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${appointmentTypeColors[rdv.type]}`}>
                            {appointmentTypeLabels[rdv.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-text-primary">
                          {rdv.user_full_name ?? <span className="italic text-text-light">Anonyme</span>}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                          {new Date(rdv.requested_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={edit.confirmedDate}
                            onChange={(e) => updateEdit(rdv.id, { confirmedDate: e.target.value })}
                            className="px-2 py-1.5 bg-background border border-gray-light rounded-lg font-body text-xs text-text-primary outline-none focus:border-primary w-[140px]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={edit.status}
                            onChange={(e) => updateEdit(rdv.id, { status: e.target.value as AppointmentStatus })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-display border outline-none cursor-pointer ${appointmentStatusColors[edit.status]} border-transparent`}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{appointmentStatusLabels[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-text-secondary max-w-[180px]">
                          <span className="line-clamp-2">{rdv.notes ?? rdv.admin_notes ?? <span className="text-text-light">—</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          {edit.saved ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : edit.error ? (
                            <span className="text-danger text-xs font-body">{edit.error}</span>
                          ) : (
                            <button
                              onClick={() => void saveRdv(rdv.id)}
                              disabled={!edit.dirty || edit.saving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Save size={12} />
                              {edit.saving ? '...' : 'Sauver'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-light">
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
          </>
        )}
      </div>
    </div>
  )
}
