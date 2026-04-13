import { useState } from 'react'
import { Network, Copy, Check, MessageCircle, TrendingUp, UserPlus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruitTree, useNetworkStats, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

const DEPTH_COLORS = [
  'bg-[#1c7b1d]/10 text-[#1c7b1d]',
  'bg-blue-50 text-blue-700',
  'bg-purple-50 text-purple-700',
  'bg-amber-50 text-amber-700',
  'bg-pink-50 text-pink-700',
]
const DEPTH_INDENT = [0, 20, 40, 60, 80]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR') + ' EUR'
}

export default function ProVendeurs() {
  const { user } = useAuth()
  const { data: tree = [], isLoading: loadingTree } = useMyRecruitTree(user?.id)
  const { data: stats } = useNetworkStats(user?.id)
  const { data: commissions = [], isLoading: loadingComm } = useMyRecruitmentCommissions(user?.id)
  const [copiedPro, setCopiedPro] = useState(false)
  const [copiedPart, setCopiedPart] = useState(false)

  const proLink = `${window.location.origin}/inscription/pro?recruiter=${user?.id ?? ''}`
  const partLink = `${window.location.origin}/inscription/particulier?recruiter=${user?.id ?? ''}`

  const isLoading = loadingTree || loadingComm

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Reseau</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">Mon reseau</h1>
        <p className="text-sm text-[#707a6a] mt-1">
          Recrutez des partenaires et touchez 2,5% a chaque niveau de la pyramide
        </p>
      </div>

      {/* Stats reseau */}
      {stats && stats.total_recruits > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { value: stats.total_recruits, label: 'Recrues total', color: 'text-[#1c7b1d]' },
            { value: stats.total_levels, label: 'Niveaux', color: 'text-[#1b1c1c]' },
            { value: stats.total_prospects, label: 'Prospects reseau', color: 'text-[#1b1c1c]' },
            { value: stats.total_signed, label: 'Signes', color: 'text-[#1c7b1d]' },
            { value: formatEur(stats.total_commission_earned), label: 'Commission gagnee', color: 'text-amber-600' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#707a6a] mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liens de recrutement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">
            Recruter un partenaire pro
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={proLink}
              className="flex-1 px-3 py-2.5 bg-[#f5f3f2] rounded-xl text-xs text-[#404a3c] truncate border-0 outline-none"
            />
            <button
              onClick={() => { void copyToClipboard(proLink); setCopiedPro(true); setTimeout(() => setCopiedPro(false), 2000) }}
              className="px-3 py-2.5 rounded-xl bg-[#f5f3f2] hover:bg-[#1c7b1d]/10 text-[#707a6a] hover:text-[#1c7b1d] transition-colors"
            >
              {copiedPro ? <Check size={14} className="text-[#1c7b1d]" /> : <Copy size={14} />}
            </button>
            <a
              href={getWhatsAppShareUrl('Devenez partenaire BRH Habitat !', proLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={14} />
            </a>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-3">
            Recruter un affilie particulier
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={partLink}
              className="flex-1 px-3 py-2.5 bg-[#f5f3f2] rounded-xl text-xs text-[#404a3c] truncate border-0 outline-none"
            />
            <button
              onClick={() => { void copyToClipboard(partLink); setCopiedPart(true); setTimeout(() => setCopiedPart(false), 2000) }}
              className="px-3 py-2.5 rounded-xl bg-[#f5f3f2] hover:bg-[#1c7b1d]/10 text-[#707a6a] hover:text-[#1c7b1d] transition-colors"
            >
              {copiedPart ? <Check size={14} className="text-[#1c7b1d]" /> : <Copy size={14} />}
            </button>
            <a
              href={getWhatsAppShareUrl('Parrainez vos proches avec BRH Habitat !', partLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={14} />
            </a>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Arborescence */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-5 overflow-hidden">
            <div className="px-6 py-5 bg-[#f5f3f2] flex items-center gap-2">
              <Network size={15} className="text-[#707a6a]" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
                Arborescence du reseau
              </p>
              <span className="text-[10px] font-bold text-[#707a6a]/60 ml-auto">
                {tree.length} membre{tree.length > 1 ? 's' : ''}
              </span>
            </div>
            {tree.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={24} className="text-[#707a6a]/30" />
                </div>
                <p className="text-sm text-[#707a6a] font-medium">Aucune recrue.</p>
                <p className="text-xs text-[#707a6a]/60 mt-1">Partagez vos liens ci-dessus pour commencer.</p>
              </div>
            ) : (
              <div>
                {tree.map((r, idx) => {
                  const depthColor = DEPTH_COLORS[Math.min(r.depth - 1, DEPTH_COLORS.length - 1)]
                  const indent = DEPTH_INDENT[Math.min(r.depth - 1, DEPTH_INDENT.length - 1)]
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 py-3.5 pr-6 hover:bg-[#f5f3f2]/50 transition-colors ${idx > 0 ? 'border-t border-[#f5f3f2]' : ''}`}
                      style={{ paddingLeft: `${24 + indent}px` }}
                    >
                      {r.depth > 1 && <ChevronRight size={12} className="text-[#707a6a]/30 shrink-0" />}
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1c7b1d]/20 to-[#0a4a0b]/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs text-[#1c7b1d]">{r.full_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1b1c1c] truncate">{r.full_name}</p>
                        <p className="text-xs text-[#707a6a]">{r.email}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${depthColor}`}>
                        N{r.depth}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        r.role === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-[#1c7b1d]/10 text-[#1c7b1d]'
                      }`}>
                        {r.role === 'pro' ? 'Pro' : 'Particulier'}
                      </span>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-[#707a6a]">
                        <span>{r.prospects_count} prospect{r.prospects_count > 1 ? 's' : ''}</span>
                        <span className="font-bold text-[#1c7b1d]">{r.signed_count} signe{r.signed_count > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commissions */}
          {commissions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
              <div className="px-6 py-5 bg-[#f5f3f2] flex items-center gap-2">
                <TrendingUp size={15} className="text-[#707a6a]" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">
                  Commissions reseau
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f5f3f2]">
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Recrue</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Niveau</th>
                      <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Montant source</th>
                      <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Votre commission</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-[#707a6a] hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c, idx) => (
                      <tr
                        key={c.id}
                        className={`hover:bg-[#f5f3f2]/50 transition-colors ${idx > 0 ? 'border-t border-[#f5f3f2]' : ''}`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-[#1b1c1c]">{c.recruited_name}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-[#f5f3f2] text-[#707a6a]">
                            N{c.chain_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#707a6a] text-right">{formatEur(c.source_amount)}</td>
                        <td className="px-6 py-4 font-display text-sm font-bold text-[#1c7b1d] text-right">+{formatEur(c.commission_amount)}</td>
                        <td className="px-6 py-4 text-xs text-[#707a6a] hidden sm:table-cell">{formatDate(c.created_at)}</td>
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
