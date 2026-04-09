import { useState } from 'react'
import { Users, Copy, Check, MessageCircle, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruits, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

export default function PartVendeurs() {
  const { user } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)

  const recruitmentLink = user
    ? `${window.location.origin}/inscription/particulier?recruiter=${user.id}`
    : ''

  const { data: recruits = [], isLoading: recruitsLoading } = useMyRecruits(user?.id)
  const { data: commissions = [], isLoading: commissionsLoading } = useMyRecruitmentCommissions(user?.id)

  async function handleCopy() {
    const ok = await copyToClipboard(recruitmentLink)
    if (ok) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const whatsappUrl = getWhatsAppShareUrl(
    'Rejoins le reseau BRH Habitat et gagne des cadeaux en parrainant tes proches !',
    recruitmentLink,
  )

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const statusLabel: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    paid: { label: 'Paye', className: 'bg-green-50 text-green-700' },
    cancelled: { label: 'Annule', className: 'bg-red-50 text-red-700' },
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl text-slate-900 uppercase tracking-wide">Mes vendeurs</h1>
          <p className="font-body text-sm text-slate-500">Recrutez des affilies et touchez 2,5% sur leurs gains</p>
        </div>
      </div>

      {/* Recruitment link section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={16} className="text-primary" />
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-900">Votre lien de recrutement</h2>
        </div>
        <p className="font-body text-sm text-slate-500 mb-4">
          Partagez ce lien pour recruter de nouveaux affilies. Vous toucherez 2,5% sur leurs gains.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-body text-sm text-slate-600 truncate">
            {recruitmentLink}
          </div>
          <button
            onClick={() => void handleCopy()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-body text-sm font-semibold hover:bg-primary-dark transition-colors shrink-0"
          >
            {copiedLink ? <Check size={15} /> : <Copy size={15} />}
            {copiedLink ? 'Copie !' : 'Copier'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-body text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Recruits list */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-display text-sm uppercase tracking-wide text-slate-900 mb-4">
          Affilies recrutés ({recruits.length})
        </h2>

        {recruitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : recruits.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-body text-sm text-slate-500">Aucun affilie recrute pour l'instant.</p>
            <p className="font-body text-xs text-slate-400 mt-1">Partagez votre lien pour commencer !</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {recruits.map((recruit) => (
              <div key={recruit.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-display text-sm text-primary font-bold">
                    {recruit.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-slate-900 truncate">{recruit.full_name}</p>
                  <p className="font-body text-xs text-slate-500 truncate">{recruit.email}</p>
                  <p className="font-body text-xs text-slate-400 mt-0.5">Inscrit le {formatDate(recruit.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="font-display text-base text-slate-900">{recruit.prospects_count}</p>
                    <p className="font-body text-xs text-slate-400">Prospects</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-display text-base text-primary">{recruit.signed_count}</p>
                    <p className="font-body text-xs text-slate-400">Signes</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-body font-semibold ${
                    recruit.role === 'pro' ? 'bg-blue-50 text-blue-700' : 'bg-primary/10 text-primary'
                  }`}>
                    {recruit.role === 'pro' ? 'Pro' : 'Particulier'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commissions table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-display text-sm uppercase tracking-wide text-slate-900 mb-4">
          Commissions de recrutement
        </h2>

        {commissionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-sm text-slate-500">Aucune commission de recrutement pour l'instant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recrue</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant source</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commission 2,5%</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const isPro = c.source_type === 'commission_pro'
                  const s = statusLabel[c.status] ?? { label: c.status, className: 'bg-slate-100 text-slate-600' }
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-2 py-3 text-slate-900 font-semibold">{c.recruited_name ?? '—'}</td>
                      <td className="px-2 py-3 text-slate-600">
                        {isPro ? 'Commission pro' : 'Points particulier'}
                      </td>
                      <td className="px-2 py-3 text-right text-slate-700">
                        {isPro
                          ? `${(c.source_amount / 100).toFixed(2)} EUR`
                          : `${c.source_amount} pts`}
                      </td>
                      <td className="px-2 py-3 text-right text-primary font-semibold">
                        {isPro
                          ? `${(c.commission_amount / 100).toFixed(2)} EUR`
                          : `${c.commission_amount} pts`}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-500 text-xs">{formatDate(c.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
