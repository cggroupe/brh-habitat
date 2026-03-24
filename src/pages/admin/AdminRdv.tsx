import { useState } from 'react'
import { Calendar, AlertCircle, CheckCircle2, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAdminAppointments, useUpdateAppointment } from '@/hooks/queries'
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  PAGE_SIZE,
} from '@/data/constants'
import type { AppointmentType, AppointmentStatus } from '@/types/database'

const appointmentTypeColors: Record<AppointmentType, string> = {
  diagnostic: 'bg-green-100 text-green-700',
  devis: 'bg-blue-100 text-blue-700',
  visite: 'bg-purple-100 text-purple-700',
  suivi: 'bg-gray-100 text-gray-600',
}

interface EditState {
  status: AppointmentStatus
  confirmedDate: string
  dirty: boolean
  saved: boolean
  error: string | null
}

export default function AdminRdv() {
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | undefined>(undefined)
  const [filterType, setFilterType] = useState<AppointmentType | undefined>(undefined)
  const [editStates, setEditStates] = useState<Record<string, EditState>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const filters = {
    status: filterStatus,
    type: filterType,
  }

  const { data, isLoading, isError } = useAdminAppointments(page, filters)
  const updateAppointment = useUpdateAppointment()

  const rdvList = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Initialize edit states for rows not yet tracked
  rdvList.forEach((r) => {
    if (!(r.id in editStates)) {
      setEditStates((prev) => ({
        ...prev,
        [r.id]: {
          status: r.status,
          confirmedDate: r.confirmed_date ? r.confirmed_date.slice(0, 10) : '',
          dirty: false,
          saved: false,
          error: null,
        },
      }))
    }
  })

  function updateEdit(id: string, patch: Partial<EditState>) {
    setEditStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch, dirty: true },
    }))
  }

  function saveRdv(id: string) {
    const edit = editStates[id]
    if (!edit) return

    setSavingId(id)
    setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], error: null } }))

    updateAppointment.mutate(
      {
        id,
        payload: {
          status: edit.status,
          confirmed_date: edit.confirmedDate || null,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setEditStates((prev) => ({
            ...prev,
            [id]: { ...prev[id], saved: true, dirty: false },
          }))
          setTimeout(() => {
            setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], saved: false } }))
          }, 3000)
          setSavingId(null)
        },
        onError: () => {
          setEditStates((prev) => ({
            ...prev,
            [id]: { ...prev[id], error: 'Erreur de sauvegarde.' },
          }))
          setSavingId(null)
        },
      },
    )
  }

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
            value={filterStatus ?? ''}
            onChange={(e) => {
              setFilterStatus(e.target.value ? e.target.value as AppointmentStatus : undefined)
              setPage(0)
            }}
            className="font-body text-sm text-text-primary bg-background border border-gray-light rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-body text-sm text-text-secondary">Type :</span>
          <select
            value={filterType ?? ''}
            onChange={(e) => {
              setFilterType(e.target.value ? e.target.value as AppointmentType : undefined)
              setPage(0)
            }}
            className="font-body text-sm text-text-primary bg-background border border-gray-light rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        {(filterStatus || filterType) && (
          <button
            onClick={() => { setFilterStatus(undefined); setFilterType(undefined); setPage(0) }}
            className="text-xs font-body text-danger hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-gray-light overflow-hidden">
        {isError && (
          <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
            <AlertCircle size={16} /> Erreur lors du chargement des rendez-vous.
          </div>
        )}

        {isLoading ? (
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
                    const isSaving = savingId === rdv.id
                    return (
                      <tr key={rdv.id} className={`border-b border-gray-light last:border-0 transition-colors ${edit.dirty ? 'bg-amber-50' : 'hover:bg-background'}`}>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${appointmentTypeColors[rdv.type]}`}>
                            {APPOINTMENT_TYPE_LABELS[rdv.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-text-primary">
                          <span className="italic text-text-light">—</span>
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
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-display border outline-none cursor-pointer ${APPOINTMENT_STATUS_COLORS[edit.status]} border-transparent`}
                          >
                            {APPOINTMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
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
                              onClick={() => saveRdv(rdv.id)}
                              disabled={!edit.dirty || isSaving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Save size={12} />
                              {isSaving ? '...' : 'Sauver'}
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
