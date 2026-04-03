import { useState } from 'react'
import { UserPlus, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCompanyProspects } from '@/hooks/queries'
import type { ProspectStatus } from '@/types/partner'

const TABS: { label: string; value: ProspectStatus | undefined }[] = [
  { label: 'Tous', value: undefined },
  { label: 'Nouveau', value: 'nouveau' },
  { label: 'Etude', value: 'etude' },
  { label: 'Devis', value: 'devis_envoye' },
  { label: 'Signe', value: 'signe' },
  { label: 'Termine', value: 'termine' },
  { label: 'Perdu', value: 'perdu' },
]

const STATUS_BADGE: Record<ProspectStatus, string> = {
  nouveau: 'bg-blue-50 text-blue-600',
  etude: 'bg-orange-50 text-orange-600',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe: 'bg-green-50 text-green-700',
  termine: 'bg-emerald-50 text-emerald-700',
  perdu: 'bg-red-50 text-red-600',
}

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: 'Nouveau',
  etude: 'Etude',
  devis_envoye: 'Devis envoye',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '3mois': '3 mois',
  '6mois': '6 mois',
  plus: '+ 6 mois',
}

export default function ProProspects() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | undefined>(undefined)

  const { data, isLoading } = useCompanyProspects(company?.id, page, statusFilter)

  const totalPages = data ? Math.ceil(data.count / 20) : 0

  function handleTabChange(value: ProspectStatus | undefined) {
    setStatusFilter(value)
    setPage(0)
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <UserPlus size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mes prospects
          </h1>
        </div>
        <Link
          to="/pro/prospects/nouveau"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
        >
          <Plus size={16} />
          Nouveau prospect
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`px-3 py-1.5 rounded-lg font-body text-sm transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="font-body text-slate-400">Chargement...</p>
          </div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center">
            <p className="font-body text-slate-400">Aucun prospect{statusFilter ? ' pour ce statut' : ''}.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Nom client</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">Telephone</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden lg:table-cell">Travaux</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden lg:table-cell">Urgence</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Statut</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden sm:table-cell">Score</th>
                    <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.data.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/pro/prospects/${p.id}`}
                          className="font-body text-sm text-slate-800 hover:text-primary transition-colors"
                        >
                          {p.client_first_name} {p.client_last_name}
                        </Link>
                        <p className="font-body text-xs text-slate-400">{p.client_city ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-slate-600 hidden md:table-cell">
                        {p.client_phone}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(p.work_type ?? []).slice(0, 2).map((t) => (
                            <span key={t} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-body capitalize">
                              {t}
                            </span>
                          ))}
                          {(p.work_type ?? []).length > 2 && (
                            <span className="text-xs font-body text-slate-400">+{p.work_type.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-slate-500 hidden lg:table-cell">
                        {p.urgency ? URGENCY_LABELS[p.urgency] ?? p.urgency : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-body ${STATUS_BADGE[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${Math.min(p.lead_score, 100)}%` }}
                            />
                          </div>
                          <span className="font-body text-xs text-slate-500">{p.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-slate-400 hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="font-body text-xs text-slate-400">
                  {data.count} prospect{data.count > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-body text-xs text-slate-600">
                    Page {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
