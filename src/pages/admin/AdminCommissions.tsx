import { useState, useEffect } from 'react'
import { Euro, ChevronLeft, ChevronRight, AlertCircle, CalendarCheck } from 'lucide-react'
import { useAdminQuotes, useUpdateCommissionStatus } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import { formatLocalDate } from '@/lib/utils'
import { PAGE_SIZE } from '@/data/constants'
import type { BrhQuoteRow, CommissionStatus } from '@/types/partner'

const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  en_attente: 'En attente',
  validee: 'Validée',
  versee: 'Versée',
}

const COMMISSION_STATUS_COLORS: Record<CommissionStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  validee: 'bg-blue-100 text-blue-700',
  versee: 'bg-green-100 text-green-700',
}

const NEXT_STATUS: Partial<Record<CommissionStatus, CommissionStatus>> = {
  en_attente: 'validee',
  validee: 'versee',
}

const NEXT_STATUS_LABELS: Partial<Record<CommissionStatus, string>> = {
  en_attente: 'Valider',
  validee: 'Marquer versée',
}

function useSummaryTotals() {
  const [totals, setTotals] = useState({ en_attente: 0, validee: 0, versee: 0 })

  useEffect(() => {
    supabase
      .from('brh_quotes')
      .select('commission_amount, commission_status')
      .then(({ data }) => {
        const acc = { en_attente: 0, validee: 0, versee: 0 }
        for (const q of data ?? []) {
          const s = q.commission_status as CommissionStatus
          if (s in acc) acc[s] += q.commission_amount ?? 0
        }
        setTotals(acc)
      })
  }, [])

  return totals
}

function useProspectNames(prospectIds: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (prospectIds.length === 0) return
    const missing = prospectIds.filter((id) => !(id in names))
    if (missing.length === 0) return

    supabase
      .from('brh_prospects')
      .select('id, client_first_name, client_last_name')
      .in('id', missing)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const p of data ?? []) {
          map[p.id] = `${p.client_first_name} ${p.client_last_name}`
        }
        setNames((prev) => ({ ...prev, ...map }))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectIds.join(',')])

  return names
}

interface PaidAtModalProps {
  quote: BrhQuoteRow
  onClose: () => void
}

function PaidAtModal({ quote, onClose }: PaidAtModalProps) {
  const [paidAt, setPaidAt] = useState(formatLocalDate())
  const updateStatus = useUpdateCommissionStatus()

  function handleConfirm() {
    updateStatus.mutate(
      { id: quote.id, status: 'versee', paidAt },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck size={18} className="text-primary" />
          <h2 className="font-display text-lg uppercase tracking-wide text-slate-900">
            Marquer comme versée
          </h2>
        </div>
        <p className="font-body text-sm text-slate-500 mb-4">
          Commission de{' '}
          <span className="font-semibold text-slate-800">
            {((quote.commission_amount ?? 0) / 100).toLocaleString('fr-FR')} EUR
          </span>
        </p>
        <label className="block mb-1 font-body text-xs text-slate-500 uppercase tracking-wide">
          Date de versement
        </label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-5"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 font-body text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
            className="px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60"
          >
            {updateStatus.isPending ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCommissions() {
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useState<CommissionStatus | undefined>(undefined)
  const [paidAtQuote, setPaidAtQuote] = useState<BrhQuoteRow | null>(null)

  const { data, isLoading, isError } = useAdminQuotes(page, filterStatus)
  const updateStatus = useUpdateCommissionStatus()
  const totals = useSummaryTotals()

  const quotes = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const prospectIds = quotes.map((q) => q.prospect_id).filter(Boolean) as string[]
  const prospectNames = useProspectNames(prospectIds)

  function handleAdvanceStatus(quote: BrhQuoteRow) {
    const next = NEXT_STATUS[(quote.commission_status ?? 'en_attente') as CommissionStatus]
    if (!next) return
    if (next === 'versee') {
      setPaidAtQuote(quote)
    } else {
      updateStatus.mutate({ id: quote.id, status: next })
    }
  }

  const SUMMARY_CARDS: Array<{ key: CommissionStatus; label: string; color: string }> = [
    { key: 'en_attente', label: 'En attente', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { key: 'validee', label: 'Validées', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { key: 'versee', label: 'Versées', color: 'bg-green-50 border-green-200 text-green-700' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Euro size={20} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Commissions
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {SUMMARY_CARDS.map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl border p-5 ${color}`}>
            <p className="font-body text-xs uppercase tracking-wide opacity-70 mb-1">{label}</p>
            <p className="font-display text-2xl">
              {(totals[key] / 100).toLocaleString('fr-FR')} EUR
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-xl border border-slate-100 p-3 mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => { setFilterStatus(undefined); setPage(0) }}
          className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
            filterStatus === undefined ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tous
        </button>
        {(Object.keys(COMMISSION_STATUS_LABELS) as CommissionStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(0) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display transition-colors ${
              filterStatus === s ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {COMMISSION_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isError && (
          <div className="flex items-center gap-2 p-4 text-red-600 font-body text-sm">
            <AlertCircle size={16} /> Erreur lors du chargement.
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center">
            <Euro size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="font-display text-base text-slate-700 mb-1">Aucun devis trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Prospect</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Montant devis</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Commission</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Taux</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left font-display text-xs text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-3 font-body text-sm text-slate-700">
                        {q.prospect_id
                          ? (prospectNames[q.prospect_id] ?? <span className="text-slate-300 italic">Chargement…</span>)
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 font-body text-sm font-semibold text-slate-800">
                        {(q.amount / 100).toLocaleString('fr-FR')} EUR
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-700">
                        {q.commission_amount != null
                          ? `${(q.commission_amount / 100).toLocaleString('fr-FR')} EUR`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-500">
                        {q.commission_rate_percent != null ? `${q.commission_rate_percent} %` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-display ${COMMISSION_STATUS_COLORS[(q.commission_status ?? 'en_attente') as CommissionStatus]}`}>
                          {COMMISSION_STATUS_LABELS[(q.commission_status ?? 'en_attente') as CommissionStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-slate-500 whitespace-nowrap">
                        {q.signed_at ? new Date(q.signed_at).toLocaleDateString('fr-FR') : '—'}
                        {q.commission_paid_at && (
                          <p className="text-xs text-green-600">
                            Versé le {new Date(q.commission_paid_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {NEXT_STATUS[(q.commission_status ?? 'en_attente') as CommissionStatus] && (
                          <button
                            onClick={() => handleAdvanceStatus(q)}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60 whitespace-nowrap"
                          >
                            {NEXT_STATUS_LABELS[(q.commission_status ?? 'en_attente') as CommissionStatus]}
                          </button>
                        )}
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

      {paidAtQuote && (
        <PaidAtModal
          quote={paidAtQuote}
          onClose={() => setPaidAtQuote(null)}
        />
      )}
    </div>
  )
}
