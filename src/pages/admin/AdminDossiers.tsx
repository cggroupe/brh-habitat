import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, ChevronLeft, ChevronRight, AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhCaseRow, CaseStatus } from '@/types/database'

interface CaseWithUser extends BrhCaseRow {
  user_full_name: string | null
}

const PAGE_SIZE = 20

const caseStatusLabels: Record<CaseStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  devis: 'Devis',
  travaux: 'Travaux',
  termine: 'Terminé',
}

const caseStatusColors: Record<CaseStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  devis: 'bg-purple-100 text-purple-700',
  travaux: 'bg-orange-100 text-orange-700',
  termine: 'bg-green-100 text-green-700',
}

const ALL_STATUSES: CaseStatus[] = ['nouveau', 'en_cours', 'devis', 'travaux', 'termine']

export default function AdminDossiers() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<CaseStatus | ''>('')

  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('brh_cases')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (filterStatus) {
      query = query.eq('status', filterStatus)
    }

    const { data, count, error: fetchError } = await query

    if (fetchError) {
      setError('Erreur lors du chargement des dossiers.')
      setLoading(false)
      return
    }

    const rows = data ?? []
    const userIds = [...new Set(rows.map((c) => c.user_id))]
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

    setCases(rows.map((c) => ({ ...c, user_full_name: profileMap[c.user_id] ?? null })))
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filterStatus])

  useEffect(() => {
    void fetchCases()
  }, [fetchCases])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Dossiers</h1>
          <p className="font-body text-sm text-text-light mt-1">
            {total} dossier{total !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-surface rounded-2xl border border-gray-light p-4 mb-4 flex flex-wrap items-center gap-2">
        <span className="font-body text-sm text-text-secondary mr-1">Statut :</span>
        <button
          onClick={() => { setFilterStatus(''); setPage(0) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
            filterStatus === '' ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-gray-light'
          }`}
        >
          Tous
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
              filterStatus === s ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-gray-light'
            }`}
          >
            {caseStatusLabels[s]}
          </button>
        ))}
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-display text-base text-text-primary mb-1">Aucun dossier trouvé</p>
            <p className="font-body text-sm text-text-light">Modifiez le filtre de statut</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background border-b border-gray-light">
                  <tr>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Titre</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Travaux</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Budget estimé</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Assigné à</th>
                    <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/admin/dossiers/${c.id}`)}
                      className="border-b border-gray-light last:border-0 hover:bg-background transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3">
                        <p className="font-body text-sm text-text-primary font-medium max-w-[200px] truncate">{c.title}</p>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {c.user_full_name ?? <span className="italic text-text-light">Inconnu</span>}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${caseStatusColors[c.status]}`}>
                          {caseStatusLabels[c.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.work_types.slice(0, 2).map((w) => (
                            <span key={w} className="inline-block px-2 py-0.5 bg-gray-100 text-text-secondary text-xs rounded-full font-body">
                              {w}
                            </span>
                          ))}
                          {c.work_types.length > 2 && (
                            <span className="text-xs text-text-light font-body">+{c.work_types.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {c.estimated_budget != null
                          ? `${c.estimated_budget.toLocaleString('fr-FR')} €`
                          : <span className="text-text-light">—</span>}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary">
                        {c.assigned_to ?? <span className="text-text-light italic">Non assigné</span>}
                      </td>
                      <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3">
                        <ArrowRight size={15} className="text-text-light opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </tr>
                  ))}
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
