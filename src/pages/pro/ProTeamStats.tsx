import { BarChart3, Loader2, Trophy, Medal, Award } from 'lucide-react'
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

const PODIUM_COLORS = [
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: Trophy, label: '1er' },
  { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: Medal, label: '2eme' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: Award, label: '3eme' },
]

export default function ProTeamStats() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['team-stats', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_stats', { p_company_id: company!.id })
      if (error) throw error
      return (data ?? []) as TeamMemberStat[]
    },
    enabled: !!company?.id,
  })

  const sorted = [...stats].sort((a, b) => b.ca_apporte - a.ca_apporte)
  const maxCa = sorted[0]?.ca_apporte ?? 1
  const maxProspects = Math.max(...stats.map((s) => s.prospects_total), 1)

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Statistiques equipe
        </h1>
      </div>

      {/* Loading */}
      {(isLoading || !company) && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {!isLoading && company && stats.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <BarChart3 size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="font-display text-lg text-slate-500">Aucune donnee disponible</p>
          <p className="font-body text-sm text-slate-400 mt-1">
            Invitez des membres a rejoindre votre equipe pour voir leurs statistiques.
          </p>
        </div>
      )}

      {!isLoading && company && stats.length > 0 && (
        <>
          {/* Podium top 3 */}
          {sorted.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {sorted.slice(0, 3).map((member, idx) => {
                const config = PODIUM_COLORS[idx]
                const IconComponent = config.icon
                return (
                  <div
                    key={member.member_id}
                    className={`bg-white rounded-xl p-5 shadow-sm border ${config.border} text-center`}
                  >
                    <div className={`w-12 h-12 rounded-full ${config.bg} mx-auto mb-3 flex items-center justify-center`}>
                      <IconComponent size={20} className={config.text} />
                    </div>
                    <span className={`font-body text-xs ${config.text} font-semibold`}>{config.label}</span>
                    <p className="font-display text-sm text-slate-900 mt-1 truncate">{member.full_name}</p>
                    <p className="font-display text-base font-semibold text-primary mt-1">
                      {formatEur(member.ca_apporte)}
                    </p>
                    <p className="font-body text-xs text-slate-400 mt-0.5">
                      {member.prospects_signes} signe{member.prospects_signes > 1 ? 's' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
              <p className="font-display text-2xl text-slate-900">
                {stats.reduce((acc, s) => acc + s.prospects_total, 0)}
              </p>
              <p className="font-body text-xs text-slate-500 mt-1">Prospects total</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
              <p className="font-display text-2xl text-primary">
                {stats.reduce((acc, s) => acc + s.prospects_signes, 0)}
              </p>
              <p className="font-body text-xs text-slate-500 mt-1">Signes total</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
              <p className="font-display text-lg text-slate-900">
                {formatEur(stats.reduce((acc, s) => acc + s.ca_apporte, 0))}
              </p>
              <p className="font-body text-xs text-slate-500 mt-1">CA total apporte</p>
            </div>
          </div>

          {/* Bar chart + table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">
                Detail par membre
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {sorted.map((member) => {
                const caBarPct = maxCa > 0 ? (member.ca_apporte / maxCa) * 100 : 0
                const prospBarPct = maxProspects > 0 ? (member.prospects_total / maxProspects) * 100 : 0
                return (
                  <div key={member.member_id} className="px-5 py-4">
                    {/* Name row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-sm shrink-0">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-body text-sm text-slate-800 font-medium">{member.full_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-sm font-semibold text-slate-900">{formatEur(member.ca_apporte)}</p>
                        <p className="font-body text-xs text-slate-400">
                          {member.prospects_signes} signe{member.prospects_signes > 1 ? 's' : ''} / {member.prospects_total} prospect{member.prospects_total > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* CA bar */}
                    <div className="mb-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs text-slate-400">CA apporte</span>
                        <span className="font-body text-xs text-primary">{formatEur(member.ca_apporte)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${caBarPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Prospects bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-xs text-slate-400">Prospects</span>
                        <span className="font-body text-xs text-slate-600">{member.prospects_total}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-primary/40 h-2 rounded-full transition-all duration-500"
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
