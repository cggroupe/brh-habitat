import { useState } from 'react'
import { UserPlus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { useAdminAllProspects, useUpdateProspect } from '@/hooks/queries'
import { PAGE_SIZE } from '@/data/constants'
import type { ProspectStatus } from '@/types/partner'

const STATUS_TABS: Array<{ value: ProspectStatus | undefined; label: string }> = [
  { value: undefined, label: 'Tous' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'etude', label: 'En étude' },
  { value: 'devis_envoye', label: 'Devis envoyé' },
  { value: 'signe', label: 'Signé' },
  { value: 'termine', label: 'Terminé' },
  { value: 'perdu', label: 'Perdu' },
]

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-700',
  etude: 'bg-amber-100 text-amber-700',
  devis_envoye: 'bg-purple-100 text-purple-700',
  signe: 'bg-green-100 text-green-700',
  termine: 'bg-slate-100 text-slate-600',
  perdu: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: 'Nouveau',
  etude: 'En étude',
  devis_envoye: 'Devis envoyé',
  signe: 'Signé',
  termine: 'Terminé',
  perdu: 'Perdu',
}

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Immédiate',
  '3mois': '3 mois',
  '6mois': '6 mois',
  plus: '+ de 6 mois',
}

export default function AdminProspects() {
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | undefined>(undefined)

  const { data, isLoading, isError } = useAdminAllProspects(page, filterStatus)
  const updateProspect = useUpdateProspect()

  const prospects = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleStatusChange(id: string, status: ProspectStatus) {
    updateProspect.mutate({ id, payload: { status } })
  }

  function handleFilterChange(status: ProspectStatus | undefined) {
    setFilterStatus(status)
    setPage(0)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={20} className="text-primary" />
            <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
              Prospects
            </h1>
          </div>
          <p className="font-body text-sm text-slate-500">
            {total} prospect{total !== 1 ? 's' : ''} au total — toutes sources
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 mb-4 flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={String(tab.value)}
            onClick={() => handleFilterChange(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
              filterStatus === tab.value
                ? 'bg-primary text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isError && (
          <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm">
            <AlertCircle size={16} /> Erreur lors du chargement des prospects.
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : prospects.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-display text-base text-slate-700 mb-1">Aucun prospect trouvé</p>
            <p className="font-body text-sm text-slate-400">Modifiez le filtre de statut</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Source</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Urgence</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Changer statut</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="font-body text-sm font-semibold text-slate-800">
                          {p.client_first_name} {p.client_last_name}
                        </p>
                        {p.client_city && (
                          <p className="font-body text-xs text-slate-400">{p.client_city}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${
                          p.source_type === 'pro'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {p.source_type === 'pro' ? 'Pro' : 'Particulier'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-body text-sm text-slate-700 font-semibold">
                          {p.lead_score}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-600">
                        {p.urgency ? URGENCY_LABELS[p.urgency] ?? p.urgency : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-500 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p.id, e.target.value as ProspectStatus)}
                          className="border border-slate-200 rounded-lg px-2 py-1 font-body text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                          {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <p className="font-body text-sm text-slate-400">
                  Page {page + 1} sur {totalPages} — {total} résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
