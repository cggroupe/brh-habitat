import { useState } from 'react'
import { Users, Copy, Check, MessageCircle, Network, TrendingUp, UserPlus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruitTree, useNetworkStats, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

const DEPTH_COLORS = [
  'bg-[#1c7b1d]/10 text-[#1c7b1d]',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
]
const DEPTH_INDENT = [0, 20, 40, 60, 80]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PartVendeurs() {
  const { user } = useAuth()
  const { data: tree = [], isLoading: loadingTree } = useMyRecruitTree(user?.id)
  const { data: stats } = useNetworkStats(user?.id)
  const { data: commissions = [], isLoading: loadingComm } = useMyRecruitmentCommissions(user?.id)
  const [copied, setCopied] = useState(false)

  const recruitLink = `${window.location.origin}/inscription/particulier?recruiter=${user?.id ?? ''}`

  async function handleCopy() {
    await copyToClipboard(recruitLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLoading = loadingTree || loadingComm

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Recrutement</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-[#1b1c1c]">
          Mon reseau
        </h1>
        <p className="text-sm text-[#707a6a] mt-1">
          Recrutez des affilies et touchez 2,5% sur leurs gains a chaque niveau
        </p>
      </div>

      {/* Stats reseau */}
      {stats && (stats.total_recruits > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { value: stats.total_recruits, label: 'Recrues total', color: 'text-[#1c7b1d]' },
            { value: stats.total_levels, label: 'Niveaux', color: 'text-[#1b1c1c]' },
            { value: stats.total_prospects, label: 'Prospects reseau', color: 'text-[#1b1c1c]' },
            { value: stats.total_signed, label: 'Signes', color: 'text-green-600' },
            { value: `${stats.total_commission_earned} pts`, label: 'Commission gagnee', color: 'text-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lien de recrutement */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 bg-[#1c7b1d]/10 rounded-xl flex items-center justify-center">
            <UserPlus size={16} className="text-[#1c7b1d]" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
            Lien de recrutement
          </p>
        </div>
        <p className="text-sm text-[#707a6a] mb-4">
          Partagez ce lien. Vos recrues recrutent a leur tour → vous touchez 2,5% a chaque niveau.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={recruitLink}
            className="flex-1 px-4 py-3 bg-[#f5f3f2] rounded-xl text-xs text-[#404a3c] truncate focus:outline-none"
          />
          <button
            onClick={() => void handleCopy()}
            className="px-3.5 py-3 rounded-xl bg-[#f5f3f2] hover:bg-[#e8e5e2] transition-colors"
          >
            {copied
              ? <Check size={16} className="text-green-500" />
              : <Copy size={16} className="text-[#404a3c]" />
            }
          </button>
          <a
            href={getWhatsAppShareUrl('Rejoignez le reseau BRH Habitat et gagnez des points !', recruitLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={16} />
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1c7b1d] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Arborescence */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6 overflow-hidden">
            <div className="px-6 py-5 bg-[#f5f3f2] flex items-center gap-2.5">
              <Network size={16} className="text-[#1c7b1d]" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
                Arborescence du reseau
              </p>
              <span className="text-xs text-[#707a6a] ml-auto">
                {tree.length} membre{tree.length > 1 ? 's' : ''}
              </span>
            </div>

            {tree.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-[#f5f3f2] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-[#707a6a]" />
                </div>
                <p className="text-sm text-[#707a6a] font-medium">Aucune recrue pour le moment.</p>
              </div>
            ) : (
              <div>
                {tree.map((r) => {
                  const depthColor = DEPTH_COLORS[Math.min(r.depth - 1, DEPTH_COLORS.length - 1)]
                  const indent = DEPTH_INDENT[Math.min(r.depth - 1, DEPTH_INDENT.length - 1)]
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f5f3f2]/50 transition-colors border-b border-[#f5f3f2] last:border-0"
                      style={{ paddingLeft: `${24 + indent}px` }}
                    >
                      {r.depth > 1 && <ChevronRight size={12} className="text-[#707a6a]/40 shrink-0" />}
                      <div className="w-9 h-9 rounded-xl bg-[#1c7b1d]/10 flex items-center justify-center shrink-0">
                        <span className="font-display text-sm font-bold text-[#1c7b1d]">
                          {r.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1b1c1c] truncate">{r.full_name}</p>
                        <p className="text-xs text-[#707a6a]">{r.email}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${depthColor}`}>
                        N{r.depth}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        r.role === 'pro'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {r.role === 'pro' ? 'Pro' : 'Particulier'}
                      </span>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-[#707a6a]">
                        <span>{r.prospects_count} prospect{r.prospects_count > 1 ? 's' : ''}</span>
                        <span className="text-green-600 font-medium">
                          {r.signed_count} signe{r.signed_count > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commissions recrutement */}
          {commissions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
              <div className="px-6 py-5 bg-[#f5f3f2] flex items-center gap-2.5">
                <TrendingUp size={16} className="text-[#1c7b1d]" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
                  Commissions reseau
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f5f3f2]">
                      <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Recrue</th>
                      <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Niveau</th>
                      <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Type</th>
                      <th className="text-right px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Commission</th>
                      <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-semibold text-[#1b1c1c]">{c.recruited_name}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f5f3f2] text-[#404a3c]">
                            N{c.chain_level}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#707a6a]">
                          {c.source_type === 'points_particulier' ? 'Points' : 'Commission'}
                        </td>
                        <td className="px-5 py-3.5 font-display font-bold text-sm text-green-600 text-right">
                          +{c.source_type === 'points_particulier'
                            ? `${c.commission_amount} pts`
                            : `${(c.commission_amount / 100).toLocaleString('fr-FR')} EUR`}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#707a6a] hidden sm:table-cell">
                          {formatDate(c.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
