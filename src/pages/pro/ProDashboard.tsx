import { useMemo } from 'react'
import { TrendingUp, Euro, UserPlus, CheckCircle, ChevronRight, ArrowUpRight } from 'lucide-react'
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
import type { ProspectStatus, CompanyLevel } from '@/types/partner'

// ─── Level badge gradients ────────────────────────────────────────────────────
const LEVEL_GRADIENT: Record<CompanyLevel, string> = {
  bronze:   'from-amber-600 to-yellow-500 shadow-amber-300/40',
  silver:   'from-slate-400 to-slate-300 shadow-slate-300/40',
  gold:     'from-amber-400 to-yellow-500 shadow-amber-200/50',
  platinum: 'from-purple-500 to-violet-400 shadow-purple-300/50',
}

const LEVEL_LABEL: Record<CompanyLevel, string> = {
  bronze:   'Bronze',
  silver:   'Silver',
  gold:     'Gold',
  platinum: 'Platinum',
}

// ─── Pipeline statuses ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau:      'bg-blue-400',
  etude:        'bg-orange-400',
  devis_envoye: 'bg-yellow-400',
  signe:        'bg-[#1c7b1d]',
  termine:      'bg-emerald-600',
  perdu:        'bg-red-400',
}

const STATUS_BADGE: Record<ProspectStatus, string> = {
  nouveau:      'bg-blue-50 text-blue-600',
  etude:        'bg-orange-50 text-orange-600',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe:        'bg-[#1c7b1d]/10 text-[#1c7b1d]',
  termine:      'bg-emerald-50 text-emerald-700',
  perdu:        'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau:      'Nouveau',
  etude:        'Etude',
  devis_envoye: 'Devis',
  signe:        'Signe',
  termine:      'Termine',
  perdu:        'Perdu',
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

function formatEur(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR') + ' EUR'
}

function getLast6Months(): { year: number; month: number; label: string }[] {
  const now = new Date()
  const result = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] })
  }
  return result
}

async function fetchMonthlyCA(prospectIds: string[]): Promise<{ signed_at: string; amount: number }[]> {
  if (prospectIds.length === 0) return []

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProDashboard() {
  const { user } = useAuth()
  const { data: company, isLoading: loadingCompany } = useMyCompany(user?.id)
  const { data: stats, isLoading: loadingStats } = useCompanyDashboardStats(company?.id)
  const { data: prospectStats } = useCompanyProspectStats(company?.id)
  const { data: recentProspects } = useCompanyProspects(company?.id, 0)

  const allProspectIds = useMemo(
    () => recentProspects?.data?.map((p) => p.id) ?? [],
    [recentProspects?.data],
  )

  const { data: rawQuotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['company-monthly-ca', company?.id, allProspectIds.length],
    queryFn: () => fetchMonthlyCA(allProspectIds),
    enabled: allProspectIds.length > 0,
  })

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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingCompany) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-[#1c7b1d] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-8 lg:p-10">
        <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 text-center">
          <p className="text-sm text-[#707a6a]">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const currentLevel = (stats?.level ?? company.level) as CompanyLevel
  const levelGradient = LEVEL_GRADIENT[currentLevel] ?? LEVEL_GRADIENT.bronze
  const levelLabel = LEVEL_LABEL[currentLevel] ?? currentLevel
  const commissionRate = stats?.commissionRate ?? company.commission_rate_percent

  const statuses: ProspectStatus[] = ['nouveau', 'etude', 'devis_envoye', 'signe', 'termine', 'perdu']
  const total = prospectStats?.total ?? 0
  const signedCount = prospectStats?.signe ?? 0

  const firstName = user?.full_name?.split(' ')[0] ?? company.name

  return (
    <div className="p-8 lg:p-10">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-2xl text-[#1b1c1c] tracking-[0.04em]">
            Bonjour, <span className="text-[#1c7b1d]">{firstName}</span> !
          </h1>
          <p className="text-sm text-[#707a6a] mt-0.5">{company.name}</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${levelGradient} text-white shadow-lg`}
          >
            {levelLabel}
          </span>
          <div className="bg-white rounded-xl px-4 py-2 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Commission</span>
            <p className="font-display text-lg text-[#1c7b1d] leading-tight">{commissionRate}%</p>
          </div>
        </div>
      </div>

      {/* ── 4 stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* CA apporte */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-[#1c7b1d]/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-[#1c7b1d]" />
            </div>
            <ArrowUpRight size={14} className="text-[#81c784]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">CA apporte</p>
          <p className="font-display text-2xl text-[#1b1c1c]">
            {loadingStats ? (
              <span className="text-[#707a6a] text-lg">...</span>
            ) : formatEur(stats?.totalCa ?? 0)}
          </p>
        </div>

        {/* Commissions dues */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-400/10 rounded-xl flex items-center justify-center">
              <Euro size={20} className="text-orange-500" />
            </div>
            <ArrowUpRight size={14} className="text-orange-300" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Commissions dues</p>
          <p className="font-display text-2xl text-[#1b1c1c]">
            {loadingStats ? (
              <span className="text-[#707a6a] text-lg">...</span>
            ) : formatEur(stats?.commissionsDues ?? 0)}
          </p>
        </div>

        {/* Commissions versees */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-[#81c784]/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-[#1c7b1d]" />
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#81c784]/20 text-[#1c7b1d] font-bold">
              Verse
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Commissions versees</p>
          <p className="font-display text-2xl text-[#1b1c1c]">
            {loadingStats ? (
              <span className="text-[#707a6a] text-lg">...</span>
            ) : formatEur(stats?.commissionsVersees ?? 0)}
          </p>
        </div>

        {/* Prospects total */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-400/10 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-blue-500" />
            </div>
            <ArrowUpRight size={14} className="text-blue-300" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Prospects total</p>
          <p className="font-display text-3xl text-[#1b1c1c]">{prospectStats?.total ?? 0}</p>
        </div>
      </div>

      {/* ── Monthly CA chart — wrapped in premium card ───────────────────────── */}
      <div className="mb-6 [&>div]:!rounded-2xl [&>div]:!shadow-[0_8px_30px_rgba(27,28,28,0.04)] [&>div]:!border-white/80">
        <MonthlyCAChart
          monthlyCA={monthlyCA}
          totalProspects={total}
          signedProspects={signedCount}
          loading={loadingQuotes && allProspectIds.length > 0}
        />
      </div>

      {/* ── Pipeline ─────────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 mb-6">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-5">
            Pipeline prospects
          </p>
          <div className="space-y-3">
            {statuses.map((s) => {
              const count = prospectStats?.[s] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={s} className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#404a3c] w-24 shrink-0">{STATUS_LABELS[s]}</span>
                  <div className="flex-1 bg-[#f5f3f2] rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${STATUS_COLORS[s]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#707a6a] w-5 text-right tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent prospects ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f5f3f2]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
            Derniers prospects
          </p>
          <Link
            to="/pro/prospects"
            className="flex items-center gap-1 text-xs font-bold text-[#1c7b1d] hover:text-[#359932] transition-colors uppercase tracking-wider"
          >
            Voir tout <ChevronRight size={13} />
          </Link>
        </div>

        {!recentProspects?.data?.length ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-[#1c7b1d]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus size={22} className="text-[#1c7b1d]" />
            </div>
            <p className="text-sm text-[#707a6a] mb-4">Aucun prospect pour le moment.</p>
            <Link
              to="/pro/prospects/nouveau"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1c7b1d] text-white text-xs font-bold rounded-xl hover:bg-[#359932] transition-colors uppercase tracking-wider"
            >
              <UserPlus size={14} />
              Envoyer un prospect
            </Link>
          </div>
        ) : (
          <ul>
            {recentProspects.data.slice(0, 5).map((p, idx) => (
              <li
                key={p.id}
                className={idx < recentProspects.data.slice(0, 5).length - 1 ? 'border-b border-[#f5f3f2]' : ''}
              >
                <Link
                  to={`/pro/prospects/${p.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-[#f5f3f2]/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1c7b1d]/08 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-[#1c7b1d]">
                        {p.client_first_name.charAt(0)}{p.client_last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1b1c1c]">
                        {p.client_first_name} {p.client_last_name}
                      </p>
                      <p className="text-[11px] text-[#707a6a]">{p.client_city ?? ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                    <ChevronRight size={14} className="text-[#c8c8c0] group-hover:text-[#707a6a] transition-colors" />
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
