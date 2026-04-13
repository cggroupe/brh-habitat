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
  nouveau: 'bg-blue-50 text-blue-700',
  etude: 'bg-amber-50 text-amber-700',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe: 'bg-[#1c7b1d]/10 text-[#1c7b1d]',
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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Portefeuille</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">
            Mes prospects
          </h1>
        </div>
        <Link
          to="/pro/prospects/nouveau"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus size={15} />
          Nouveau prospect
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              statusFilter === tab.value
                ? 'bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white shadow-md shadow-[#1c7b1d]/20'
                : 'bg-white text-[#707a6a] hover:text-[#1b1c1c] shadow-[0_2px_8px_rgba(27,28,28,0.06)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin mx-auto" />
          </div>
        ) : !data?.data?.length ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="text-[#707a6a]/20 mx-auto mb-3" />
            <p className="text-[#707a6a] text-sm">
              Aucun prospect{statusFilter ? ' pour ce statut' : ''}.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f5f3f2]">
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Nom client</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden md:table-cell">Telephone</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden lg:table-cell">Travaux</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden lg:table-cell">Urgence</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Statut</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden sm:table-cell">Score</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/pro/prospects/${p.id}`}
                          className="font-semibold text-sm text-[#1b1c1c] hover:text-[#1c7b1d] transition-colors"
                        >
                          {p.client_first_name} {p.client_last_name}
                        </Link>
                        <p className="text-xs text-[#707a6a] mt-0.5">{p.client_city ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#404a3c] hidden md:table-cell">
                        {p.client_phone}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(p.work_type ?? []).slice(0, 2).map((t) => (
                            <span key={t} className="bg-[#f5f3f2] text-[#404a3c] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide capitalize">
                              {t}
                            </span>
                          ))}
                          {(p.work_type ?? []).length > 2 && (
                            <span className="text-xs text-[#707a6a]">+{p.work_type.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#707a6a] hidden lg:table-cell">
                        {p.urgency ? URGENCY_LABELS[p.urgency] ?? p.urgency : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#f5f3f2] rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-[#1c7b1d]"
                              style={{ width: `${Math.min(p.lead_score, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#707a6a] font-bold">{p.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#707a6a] hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-[#f5f3f2]">
                <p className="text-xs text-[#707a6a] font-bold uppercase tracking-wider">
                  {data.count} prospect{data.count > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-xl bg-white shadow-sm text-[#707a6a] hover:text-[#1c7b1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-[#404a3c] font-bold px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-xl bg-white shadow-sm text-[#707a6a] hover:text-[#1c7b1d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={15} />
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
