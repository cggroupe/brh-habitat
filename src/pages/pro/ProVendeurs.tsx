import { useState } from 'react'
import { Network, Copy, Check, MessageCircle, TrendingUp, UserPlus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruitTree, useNetworkStats, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

const DEPTH_COLORS = [
  'bg-primary/10 text-primary',
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
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Reseau</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">Mon reseau</h1>
        <p className="text-sm text-text-light mt-1">
          Recrutez des partenaires et touchez 2,5% a chaque niveau de la pyramide
        </p>
      </div>

      {/* Stats reseau */}
      {stats && stats.total_recruits > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { value: stats.total_recruits, label: 'Recrues total', color: 'text-primary' },
            { value: stats.total_levels, label: 'Niveaux', color: 'text-text-primary' },
            { value: stats.total_prospects, label: 'Prospects reseau', color: 'text-text-primary' },
            { value: stats.total_signed, label: 'Signes', color: 'text-primary' },
            { value: formatEur(stats.total_commission_earned), label: 'Commission gagnee', color: 'text-amber-600' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
              <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liens de recrutement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
            Recruter un partenaire pro
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={proLink}
              className="flex-1 px-3 py-2.5 bg-background rounded-xl text-xs text-text-secondary truncate border-0 outline-none"
            />
            <button
              onClick={() => { void copyToClipboard(proLink); setCopiedPro(true); setTimeout(() => setCopiedPro(false), 2000) }}
              className="px-3 py-2.5 rounded-xl bg-background hover:bg-primary/10 text-text-light hover:text-primary transition-colors"
            >
              {copiedPro ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
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
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
            Recruter un affilie particulier
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={partLink}
              className="flex-1 px-3 py-2.5 bg-background rounded-xl text-xs text-text-secondary truncate border-0 outline-none"
            />
            <button
              onClick={() => { void copyToClipboard(partLink); setCopiedPart(true); setTimeout(() => setCopiedPart(false), 2000) }}
              className="px-3 py-2.5 rounded-xl bg-background hover:bg-primary/10 text-text-light hover:text-primary transition-colors"
            >
              {copiedPart ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
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
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Arborescence */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-5 overflow-hidden">
            <div className="px-6 py-5 bg-background flex items-center gap-2">
              <Network size={15} className="text-text-light" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Arborescence du reseau
              </p>
              <span className="text-[10px] font-bold text-text-light/60 ml-auto">
                {tree.length} membre{tree.length > 1 ? 's' : ''}
              </span>
            </div>
            {tree.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={24} className="text-text-light/30" />
                </div>
                <p className="text-sm text-text-light font-medium">Aucune recrue.</p>
                <p className="text-xs text-text-light/60 mt-1">Partagez vos liens ci-dessus pour commencer.</p>
              </div>
            ) : (
              <div>
                {tree.map((r, idx) => {
                  const depthColor = DEPTH_COLORS[Math.min(r.depth - 1, DEPTH_COLORS.length - 1)]
                  const indent = DEPTH_INDENT[Math.min(r.depth - 1, DEPTH_INDENT.length - 1)]
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-3 py-3.5 pr-6 hover:bg-background/50 transition-colors ${idx > 0 ? 'border-t border-background' : ''}`}
                      style={{ paddingLeft: `${24 + indent}px` }}
                    >
                      {r.depth > 1 && <ChevronRight size={12} className="text-text-light/30 shrink-0" />}
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-xs text-primary">{r.full_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{r.full_name}</p>
                        <p className="text-xs text-text-light">{r.email}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${depthColor}`}>
                        N{r.depth}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        r.role === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-primary/10 text-primary'
                      }`}>
                        {r.role === 'pro' ? 'Pro' : 'Particulier'}
                      </span>
                      <div className="hidden sm:flex items-center gap-3 text-xs text-text-light">
                        <span>{r.prospects_count} prospect{r.prospects_count > 1 ? 's' : ''}</span>
                        <span className="font-bold text-primary">{r.signed_count} signe{r.signed_count > 1 ? 's' : ''}</span>
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
              <div className="px-6 py-5 bg-background flex items-center gap-2">
                <TrendingUp size={15} className="text-text-light" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                  Commissions reseau
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background">
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Recrue</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Niveau</th>
                      <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Montant source</th>
                      <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light">Votre commission</th>
                      <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-text-light hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c, idx) => (
                      <tr
                        key={c.id}
                        className={`hover:bg-background/50 transition-colors ${idx > 0 ? 'border-t border-background' : ''}`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-text-primary">{c.recruited_name}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-background text-text-light">
                            N{c.chain_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-light text-right">{formatEur(c.source_amount)}</td>
                        <td className="px-6 py-4 font-display text-sm font-bold text-primary text-right">+{formatEur(c.commission_amount)}</td>
                        <td className="px-6 py-4 text-xs text-text-light hidden sm:table-cell">{formatDate(c.created_at)}</td>
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
