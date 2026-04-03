import { Euro } from 'lucide-react'
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
  en_attente: 'bg-yellow-50 text-yellow-700',
  validee: 'bg-blue-50 text-blue-700',
  versee: 'bg-green-50 text-green-700',
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
    if (!company?.id) return

    async function fetchQuotes() {
      setLoading(true)
      setError(null)

      try {
        // Fetch prospects for the company
        const { data: prospects, error: prospectError } = await supabase
          .from('brh_prospects')
          .select('id, client_first_name, client_last_name, client_city')
          .eq('company_id', company!.id)

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
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3 mb-8">
        <Euro size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Mes commissions
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-orange-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Commissions dues</span>
          </div>
          <p className="font-display text-2xl text-slate-900">
            {loadingStats ? '...' : formatEur(stats?.commissionsDues ?? 0)}
          </p>
          <p className="font-body text-xs text-slate-400 mt-1">En attente de versement</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-green-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Commissions versees</span>
          </div>
          <p className="font-display text-2xl text-slate-900">
            {loadingStats ? '...' : formatEur(stats?.commissionsVersees ?? 0)}
          </p>
          <p className="font-body text-xs text-slate-400 mt-1">Deja regles</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">
            Detail des commissions
          </h2>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <p className="font-body text-slate-400">Chargement...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-8 text-center">
            <p className="font-body text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && quotes.length === 0 && (
          <div className="p-8 text-center">
            <Euro size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="font-body text-slate-400 text-sm">Aucune commission pour le moment.</p>
            <p className="font-body text-xs text-slate-300 mt-1">
              Les commissions apparaissent apres signature d'un devis.
            </p>
          </div>
        )}

        {!loading && !error && quotes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Prospect</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Montant devis</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Commission</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500">Statut</th>
                  <th className="text-left px-4 py-3 font-display text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">Date signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-body text-sm text-slate-800">{q.prospect_name}</p>
                      {q.prospect_city && (
                        <p className="font-body text-xs text-slate-400">{q.prospect_city}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-slate-700">
                      {formatEur(q.amount)}
                    </td>
                    <td className="px-4 py-3 font-body text-sm font-medium text-slate-800">
                      {q.commission_amount != null ? formatEur(q.commission_amount) : '—'}
                      {q.commission_rate_percent != null && (
                        <span className="ml-1 text-xs text-slate-400">({q.commission_rate_percent}%)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${COMMISSION_STATUS_BADGE[q.commission_status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {COMMISSION_STATUS_LABELS[q.commission_status] ?? q.commission_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-slate-400 hidden md:table-cell">
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
