import { useMemo } from 'react'
import { LayoutDashboard, TrendingUp, Euro, UserPlus, CheckCircle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  useMyCompany,
  useCompanyDashboardStats,
  useCompanyProspectStats,
  useCompanyProspects,
} from '@/hooks/queries'
import { MonthlyCAChart } from '@/components/pro/MonthlyCAChart'
import { supabase } from '@/lib/supabase'
import type { ProspectStatus } from '@/types/partner'

const LEVEL_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: 'bg-blue-500',
  etude: 'bg-orange-400',
  devis_envoye: 'bg-yellow-400',
  signe: 'bg-green-500',
  termine: 'bg-emerald-600',
  perdu: 'bg-red-400',
}

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: 'Nouveau',
  etude: 'Etude',
  devis_envoye: 'Devis',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

function formatEur(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR') + ' EUR'
}

// Build last 6 months as { year, month } descending
function getLast6Months(): { year: number; month: number; label: string }[] {
  const now = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] })
  }
  return result
}

// Fetch signed quotes for the company's prospects over the last 6 months
async function fetchMonthlyCA(prospectIds: string[]): Promise<{ signed_at: string; amount: number }[]> {
  if (prospectIds.length === 0) return []

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  // Use local date parts to avoid UTC shift
  const y = sixMonthsAgo.getFullYear()
  const m = String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')
  const d = String(sixMonthsAgo.getDate()).padStart(2, '0')
  const isoStart = `${y}-${m}-${d}`

  const { data, error } = await supabase
    .from('brh_quotes')
    .select('amount, signed_at')
    .in('prospect_id', prospectIds)
    .gte('signed_at', isoStart)

  if (error) throw error
  return (data ?? []) as { signed_at: string; amount: number }[]
}

export default function ProDashboard() {
  const { user } = useAuth()
  const { data: company, isLoading: loadingCompany } = useMyCompany(user?.id)
  const { data: stats, isLoading: loadingStats } = useCompanyDashboardStats(company?.id)
  const { data: prospectStats } = useCompanyProspectStats(company?.id)
  const { data: recentProspects } = useCompanyProspects(company?.id, 0)

  // Collect all prospect IDs to query quotes
  const allProspectIds = useMemo(
    () => recentProspects?.data?.map((p) => p.id) ?? [],
    [recentProspects?.data],
  )

  const { data: rawQuotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['company-monthly-ca', company?.id, allProspectIds.length],
    queryFn: () => fetchMonthlyCA(allProspectIds),
    enabled: allProspectIds.length > 0,
  })

  // Group quotes by month
  const monthlyCA = useMemo(() => {
    const months = getLast6Months()
    return months.map(({ year, month, label }) => {
      const amount = (rawQuotes ?? [])
        .filter((q) => {
          const d = new Date(q.signed_at)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((sum, q) => sum + (q.amount ?? 0), 0)
      return { label, amount }
    })
  }, [rawQuotes])

  if (loadingCompany) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[300px]">
        <p className="font-body text-slate-400">Chargement...</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6 lg:p-10">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="font-body text-slate-500">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const levelClass = LEVEL_COLORS[stats?.level ?? company.level] ?? LEVEL_COLORS.bronze
  const statuses: ProspectStatus[] = ['nouveau', 'etude', 'devis_envoye', 'signe', 'termine', 'perdu']
  const total = prospectStats?.total ?? 0
  const signedCount = prospectStats?.signe ?? 0

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Tableau de bord
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide ${levelClass}`}>
            {stats?.level ?? company.level}
          </span>
          <span className="font-body text-sm text-slate-500">
            Commission {stats?.commissionRate ?? company.commission_rate_percent}%
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">CA apporte</span>
          </div>
          <p className="font-display text-2xl text-slate-900">
            {loadingStats ? '...' : formatEur(stats?.totalCa ?? 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-orange-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Commissions dues</span>
          </div>
          <p className="font-display text-2xl text-slate-900">
            {loadingStats ? '...' : formatEur(stats?.commissionsDues ?? 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Commissions versees</span>
          </div>
          <p className="font-display text-2xl text-slate-900">
            {loadingStats ? '...' : formatEur(stats?.commissionsVersees ?? 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={16} className="text-blue-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Prospects total</span>
          </div>
          <p className="font-display text-2xl text-slate-900">{prospectStats?.total ?? 0}</p>
        </div>
      </div>

      {/* Monthly CA chart */}
      <MonthlyCAChart
        monthlyCA={monthlyCA}
        totalProspects={total}
        signedProspects={signedCount}
        loading={loadingQuotes && allProspectIds.length > 0}
      />

      {/* Pipeline mini */}
      {total > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">Pipeline prospects</h2>
          <div className="space-y-2">
            {statuses.map((s) => {
              const count = prospectStats?.[s] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className="font-body text-xs text-slate-500 w-20 shrink-0">{STATUS_LABELS[s]}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${STATUS_COLORS[s]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-body text-xs text-slate-600 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent prospects */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">Derniers prospects</h2>
          <Link
            to="/pro/prospects"
            className="flex items-center gap-1 text-xs font-body text-primary hover:text-primary-dark transition-colors"
          >
            Voir tout <ChevronRight size={14} />
          </Link>
        </div>
        {!recentProspects?.data?.length ? (
          <div className="p-8 text-center">
            <p className="font-body text-slate-400 text-sm">Aucun prospect pour le moment.</p>
            <Link
              to="/pro/prospects/nouveau"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
            >
              <UserPlus size={15} />
              Envoyer un prospect
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {recentProspects.data.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  to={`/pro/prospects/${p.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-body text-sm text-slate-800">
                      {p.client_first_name} {p.client_last_name}
                    </p>
                    <p className="font-body text-xs text-slate-400">{p.client_city ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body ${
                      p.status === 'nouveau' ? 'bg-blue-50 text-blue-600' :
                      p.status === 'signe' ? 'bg-green-50 text-green-600' :
                      p.status === 'perdu' ? 'bg-red-50 text-red-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
