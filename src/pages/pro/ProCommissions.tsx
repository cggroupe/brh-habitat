import { Euro, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCompanyDashboardStats } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import type { BrhQuoteRow } from '@/types/partner'

interface QuoteWithProspect extends BrhQuoteRow {
  prospect_name: string
  prospect_city: string | null
}

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  validee: 'Validee',
  versee: 'Versee',
}

const COMMISSION_STATUS_BADGE: Record<string, string> = {
  en_attente: 'bg-amber-50 text-amber-700',
  validee: 'bg-blue-50 text-blue-700',
  versee: 'bg-[#1c7b1d]/10 text-[#1c7b1d]',
}

function formatEur(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR') + ' EUR'
}

export default function ProCommissions() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)
  const { data: stats, isLoading: loadingStats } = useCompanyDashboardStats(company?.id)

  const [quotes, setQuotes] = useState<QuoteWithProspect[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const companyId = company?.id
    if (!companyId) return

    async function fetchQuotes() {
      setLoading(true)
      setError(null)

      try {
        const { data: prospects, error: prospectError } = await supabase
          .from('brh_prospects')
          .select('id, client_first_name, client_last_name, client_city')
          .eq('company_id', companyId)

        if (prospectError) throw prospectError
        if (!prospects?.length) {
          setQuotes([])
          return
        }

        const prospectIds = prospects.map((p) => p.id)
        const prospectMap = Object.fromEntries(
          prospects.map((p) => [p.id, { name: `${p.client_first_name} ${p.client_last_name}`, city: p.client_city }])
        )

        const { data: quotesData, error: quotesError } = await supabase
          .from('brh_quotes')
          .select('*')
          .in('prospect_id', prospectIds)
          .order('signed_at', { ascending: false })

        if (quotesError) throw quotesError

        const enriched: QuoteWithProspect[] = (quotesData ?? []).map((q) => ({
          ...q,
          prospect_name: q.prospect_id ? (prospectMap[q.prospect_id]?.name ?? '—') : '—',
          prospect_city: q.prospect_id ? (prospectMap[q.prospect_id]?.city ?? null) : null,
        }))

        setQuotes(enriched)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    void fetchQuotes()
  }, [company?.id])

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Finances</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">
          Mes commissions
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] relative overflow-hidden">
          <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-amber-500" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">
            Commissions dues
          </p>
          <p className="font-display text-2xl text-[#1b1c1c] font-bold">
            {loadingStats ? (
              <span className="inline-block w-24 h-7 bg-[#f5f3f2] rounded-lg animate-pulse" />
            ) : (
              formatEur(stats?.commissionsDues ?? 0)
            )}
          </p>
          <p className="text-xs text-[#707a6a] mt-1">En attente de versement</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] relative overflow-hidden">
          <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl bg-[#1c7b1d]/10 flex items-center justify-center">
            <Wallet size={20} className="text-[#1c7b1d]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">
            Commissions versees
          </p>
          <p className="font-display text-2xl text-[#1b1c1c] font-bold">
            {loadingStats ? (
              <span className="inline-block w-24 h-7 bg-[#f5f3f2] rounded-lg animate-pulse" />
            ) : (
              formatEur(stats?.commissionsVersees ?? 0)
            )}
          </p>
          <p className="text-xs text-[#707a6a] mt-1">Deja regles</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
        <div className="px-6 py-5 bg-[#f5f3f2]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
            Detail des commissions
          </p>
        </div>

        {loading && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center">
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-4">
              <Euro size={28} className="text-[#707a6a]/30" />
            </div>
            <p className="text-[#707a6a] text-sm font-medium">Aucune commission pour le moment.</p>
            <p className="text-xs text-[#707a6a]/60 mt-1">
              Les commissions apparaissent apres signature d'un devis.
            </p>
          </div>
        )}

        {!loading && !error && quotes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f3f2]">
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Prospect</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Montant devis</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Commission</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Statut</th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden md:table-cell">Date signature</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#1b1c1c]">{q.prospect_name}</p>
                      {q.prospect_city && (
                        <p className="text-xs text-[#707a6a] mt-0.5">{q.prospect_city}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#404a3c] font-medium">
                      {formatEur(q.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#1b1c1c]">
                        {q.commission_amount != null ? formatEur(q.commission_amount) : '—'}
                      </span>
                      {q.commission_rate_percent != null && (
                        <span className="ml-1.5 text-[10px] font-bold text-[#707a6a]">({q.commission_rate_percent}%)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${COMMISSION_STATUS_BADGE[q.commission_status] ?? 'bg-[#f5f3f2] text-[#707a6a]'}`}>
                        {COMMISSION_STATUS_LABELS[q.commission_status] ?? q.commission_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#707a6a] hidden md:table-cell">
                      {new Date(q.signed_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
