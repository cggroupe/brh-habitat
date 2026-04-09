import { useState } from 'react'
import { Network, Copy, Check, MessageCircle, TrendingUp, UserPlus, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruitTree, useNetworkStats, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

const DEPTH_COLORS = ['bg-primary/10 text-primary', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-pink-100 text-pink-700']
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
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3 mb-8">
        <Network size={24} className="text-primary" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">Mon reseau</h1>
          <p className="font-body text-sm text-slate-500">Recrutez des partenaires et touchez 2,5% a chaque niveau de la pyramide</p>
        </div>
      </div>

      {/* Stats reseau */}
      {stats && stats.total_recruits > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl text-primary">{stats.total_recruits}</p>
            <p className="font-body text-xs text-slate-500">Recrues total</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl text-slate-900">{stats.total_levels}</p>
            <p className="font-body text-xs text-slate-500">Niveaux</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl text-slate-900">{stats.total_prospects}</p>
            <p className="font-body text-xs text-slate-500">Prospects reseau</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl text-green-600">{stats.total_signed}</p>
            <p className="font-body text-xs text-slate-500">Signes</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl text-amber-600">{formatEur(stats.total_commission_earned)}</p>
            <p className="font-body text-xs text-slate-500">Commission gagnee</p>
          </div>
        </div>
      )}

      {/* Liens de recrutement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="font-display text-xs uppercase tracking-wide text-slate-500 mb-2">Recruter un partenaire pro</p>
          <div className="flex gap-2">
            <input readOnly value={proLink} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-body text-xs text-slate-600 truncate" />
            <button onClick={() => { void copyToClipboard(proLink); setCopiedPro(true); setTimeout(() => setCopiedPro(false), 2000) }}
              className="px-2.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
              {copiedPro ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-slate-500" />}
            </button>
            <a href={getWhatsAppShareUrl('Devenez partenaire BRH Habitat !', proLink)} target="_blank" rel="noopener noreferrer"
              className="px-2.5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><MessageCircle size={14} /></a>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <p className="font-display text-xs uppercase tracking-wide text-slate-500 mb-2">Recruter un affilie particulier</p>
          <div className="flex gap-2">
            <input readOnly value={partLink} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-body text-xs text-slate-600 truncate" />
            <button onClick={() => { void copyToClipboard(partLink); setCopiedPart(true); setTimeout(() => setCopiedPart(false), 2000) }}
              className="px-2.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
              {copiedPart ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-slate-500" />}
            </button>
            <a href={getWhatsAppShareUrl('Parrainez vos proches avec BRH Habitat !', partLink)} target="_blank" rel="noopener noreferrer"
              className="px-2.5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><MessageCircle size={14} /></a>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Arborescence */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Network size={16} className="text-primary" />
              <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">Arborescence du reseau</h2>
              <span className="font-body text-xs text-slate-400 ml-auto">{tree.length} membre{tree.length > 1 ? 's' : ''}</span>
            </div>
            {tree.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="font-body text-sm text-slate-400">Aucune recrue. Partagez vos liens ci-dessus pour commencer.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {tree.map((r) => {
                  const depthColor = DEPTH_COLORS[Math.min(r.depth - 1, DEPTH_COLORS.length - 1)]
                  const indent = DEPTH_INDENT[Math.min(r.depth - 1, DEPTH_INDENT.length - 1)]
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50" style={{ paddingLeft: `${24 + indent}px` }}>
                      {r.depth > 1 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-display text-xs text-primary">{r.full_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-slate-800 truncate">{r.full_name}</p>
                        <p className="font-body text-xs text-slate-400">{r.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-body ${depthColor}`}>N{r.depth}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-body ${r.role === 'pro' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {r.role === 'pro' ? 'Pro' : 'Particulier'}
                      </span>
                      <div className="hidden sm:flex items-center gap-3 text-xs font-body text-slate-400">
                        <span>{r.prospects_count} prospect{r.prospects_count > 1 ? 's' : ''}</span>
                        <span className="text-green-600">{r.signed_count} signe{r.signed_count > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Commissions */}
          {commissions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h2 className="font-display text-sm uppercase tracking-wide text-slate-700">Commissions reseau</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 font-display text-xs uppercase text-slate-500">Recrue</th>
                      <th className="text-left px-4 py-3 font-display text-xs uppercase text-slate-500">Niveau</th>
                      <th className="text-right px-4 py-3 font-display text-xs uppercase text-slate-500">Montant source</th>
                      <th className="text-right px-4 py-3 font-display text-xs uppercase text-slate-500">Votre commission</th>
                      <th className="text-left px-4 py-3 font-display text-xs uppercase text-slate-500 hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-body text-sm text-slate-800">{c.recruited_name}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-body bg-slate-100 text-slate-600">N{c.chain_level}</span></td>
                        <td className="px-4 py-3 font-body text-sm text-slate-500 text-right">{formatEur(c.source_amount)}</td>
                        <td className="px-4 py-3 font-display text-sm text-green-600 text-right">+{formatEur(c.commission_amount)}</td>
                        <td className="px-4 py-3 font-body text-xs text-slate-400 hidden sm:table-cell">{formatDate(c.created_at)}</td>
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
