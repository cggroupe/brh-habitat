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
  signe: 'bg-primary/10 text-primary',
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
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Portefeuille</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
            Mes prospects
          </h1>
        </div>
        <Link
          to="/pro/prospects/nouveau"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
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
                ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20'
                : 'bg-white text-text-light hover:text-text-primary shadow-[0_2px_8px_rgba(27,28,28,0.06)]'
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
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : !data?.data?.length ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="text-text-light/20 mx-auto mb-3" />
            <p className="text-text-light text-sm">
              Aucun prospect{statusFilter ? ' pour ce statut' : ''}.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-background">
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Nom client</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden md:table-cell">Telephone</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden lg:table-cell">Travaux</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden lg:table-cell">Urgence</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Statut</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden sm:table-cell">Score</th>
                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => (
                    <tr key={p.id} className="hover:bg-background/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/pro/prospects/${p.id}`}
                          className="font-semibold text-sm text-text-primary hover:text-primary transition-colors"
                        >
                          {p.client_first_name} {p.client_last_name}
                        </Link>
                        <p className="text-xs text-text-light mt-0.5">{p.client_city ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary hidden md:table-cell">
                        {p.client_phone}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(p.work_type ?? []).slice(0, 2).map((t) => (
                            <span key={t} className="bg-background text-text-secondary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide capitalize">
                              {t}
                            </span>
                          ))}
                          {(p.work_type ?? []).length > 2 && (
                            <span className="text-xs text-text-light">+{(p.work_type ?? []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light hidden lg:table-cell">
                        {p.urgency ? URGENCY_LABELS[p.urgency] ?? p.urgency : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[(p.status ?? 'nouveau') as ProspectStatus]}`}>
                          {STATUS_LABELS[(p.status ?? 'nouveau') as ProspectStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-background rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${Math.min(p.lead_score ?? 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-light font-bold">{p.lead_score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-light hidden md:table-cell">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-background">
                <p className="text-xs text-text-light font-bold uppercase tracking-wider">
                  {data.count} prospect{data.count > 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-xl bg-white shadow-sm text-text-light hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-text-secondary font-bold px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-xl bg-white shadow-sm text-text-light hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
