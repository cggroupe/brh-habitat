import { BarChart3, Trophy, Medal, Award } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany } from '@/hooks/queries'

interface TeamMemberStat {
  member_id: string
  full_name: string
  prospects_total: number
  prospects_signes: number
  ca_apporte: number // cents
}

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
}

const PODIUM_CONFIG = [
  {
    bg: 'bg-gradient-to-br from-amber-100 to-amber-50',
    iconBg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: Trophy,
    label: '1er',
    ring: 'ring-1 ring-amber-200',
  },
  {
    bg: 'bg-gradient-to-br from-slate-100 to-slate-50',
    iconBg: 'bg-slate-100',
    text: 'text-slate-600',
    icon: Medal,
    label: '2eme',
    ring: 'ring-1 ring-slate-200',
  },
  {
    bg: 'bg-gradient-to-br from-orange-100 to-orange-50',
    iconBg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: Award,
    label: '3eme',
    ring: 'ring-1 ring-orange-200',
  },
]

export default function ProTeamStats() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['team-stats', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_stats', { p_company_id: company!.id })
      if (error) throw error
      return (data ?? []).map((r: Record<string, unknown>) => ({
        member_id: r.member_id as string,
        full_name: r.full_name as string,
        prospects_total: Number(r.prospects_count ?? 0),
        prospects_signes: Number(r.signed_count ?? 0),
        ca_apporte: Number(r.total_ca ?? 0),
      })) as TeamMemberStat[]
    },
    enabled: !!company?.id,
  })

  const sorted = [...stats].sort((a, b) => b.ca_apporte - a.ca_apporte)
  const maxCa = sorted[0]?.ca_apporte ?? 1
  const maxProspects = Math.max(...stats.map((s) => s.prospects_total), 1)

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Performance</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
          Statistiques equipe
        </h1>
      </div>

      {/* Loading */}
      {(isLoading || !company) && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && company && stats.length === 0 && (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center mx-auto mb-5">
            <BarChart3 size={28} className="text-text-light/30" />
          </div>
          <p className="font-display text-lg font-bold text-text-primary uppercase tracking-wide mb-2">Aucune donnee</p>
          <p className="text-sm text-text-light">
            Invitez des membres a rejoindre votre equipe pour voir leurs statistiques.
          </p>
        </div>
      )}

      {!isLoading && company && stats.length > 0 && (
        <>
          {/* Podium top 3 */}
          {sorted.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {sorted.slice(0, 3).map((member, idx) => {
                const config = PODIUM_CONFIG[idx]
                const IconComponent = config.icon
                return (
                  <div
                    key={member.member_id}
                    className={`rounded-2xl p-6 ${config.bg} ${config.ring} text-center shadow-[0_4px_16px_rgba(27,28,28,0.06)]`}
                  >
                    <div className={`w-12 h-12 rounded-2xl ${config.iconBg} mx-auto mb-3 flex items-center justify-center`}>
                      <IconComponent size={20} className={config.text} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${config.text}`}>{config.label}</span>
                    <p className="font-bold text-sm text-text-primary mt-1.5 truncate">{member.full_name}</p>
                    <p className="font-display text-base font-bold text-primary mt-1">
                      {formatEur(member.ca_apporte)}
                    </p>
                    <p className="text-xs text-text-light mt-0.5">
                      {member.prospects_signes} signe{member.prospects_signes > 1 ? 's' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className="font-display text-2xl text-text-primary font-bold">
                {stats.reduce((acc, s) => acc + s.prospects_total, 0)}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mt-1.5">Prospects total</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className="font-display text-2xl text-primary font-bold">
                {stats.reduce((acc, s) => acc + s.prospects_signes, 0)}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mt-1.5">Signes total</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className="font-display text-base text-text-primary font-bold leading-tight">
                {formatEur(stats.reduce((acc, s) => acc + s.ca_apporte, 0))}
              </p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mt-1.5">CA total apporte</p>
            </div>
          </div>

          {/* Bar chart + table */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
            <div className="px-6 py-5 bg-background">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Detail par membre
              </p>
            </div>
            <div>
              {sorted.map((member, idx) => {
                const caBarPct = maxCa > 0 ? (member.ca_apporte / maxCa) * 100 : 0
                const prospBarPct = maxProspects > 0 ? (member.prospects_total / maxProspects) * 100 : 0
                return (
                  <div
                    key={member.member_id}
                    className={`px-6 py-5 hover:bg-background/50 transition-colors ${idx > 0 ? 'border-t border-background' : ''}`}
                  >
                    {/* Name row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-text-primary">{member.full_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-sm font-bold text-text-primary">{formatEur(member.ca_apporte)}</p>
                        <p className="text-xs text-text-light">
                          {member.prospects_signes} signe{member.prospects_signes > 1 ? 's' : ''} / {member.prospects_total} prospect{member.prospects_total > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* CA bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-text-light">CA apporte</span>
                        <span className="text-[10px] font-bold text-primary">{formatEur(member.ca_apporte)}</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all duration-700"
                          style={{ width: `${caBarPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Prospects bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-text-light">Prospects</span>
                        <span className="text-[10px] font-bold text-text-secondary">{member.prospects_total}</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <div
                          className="bg-primary/30 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${prospBarPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
