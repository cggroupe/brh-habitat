import { useState } from 'react'
import { Network, Copy, Check, MessageCircle, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyRecruits, useMyRecruitmentCommissions } from '@/hooks/queries'
import { copyToClipboard, getWhatsAppShareUrl } from '@/lib/referral'

type LinkKey = 'pro' | 'particulier'

export default function ProVendeurs() {
  const { user } = useAuth()
  const [copied, setCopied] = useState<LinkKey | null>(null)

  const proLink = user ? `${window.location.origin}/inscription/pro?recruiter=${user.id}` : ''
  const partLink = user ? `${window.location.origin}/inscription/particulier?recruiter=${user.id}` : ''

  const { data: recruits = [], isLoading: recruitsLoading } = useMyRecruits(user?.id)
  const { data: commissions = [], isLoading: commissionsLoading } = useMyRecruitmentCommissions(user?.id)

  async function handleCopy(key: LinkKey, link: string) {
    const ok = await copyToClipboard(link)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const statusLabel: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    paid: { label: 'Paye', className: 'bg-green-50 text-green-700' },
    cancelled: { label: 'Annule', className: 'bg-red-50 text-red-700' },
  }

  const links: { key: LinkKey; label: string; link: string; whatsappMsg: string }[] = [
    {
      key: 'pro',
      label: 'Recruter un pro',
      link: proLink,
      whatsappMsg: 'Rejoins le reseau de partenaires pro BRH Habitat et developpez votre activite !',
    },
    {
      key: 'particulier',
      label: 'Recruter un particulier',
      link: partLink,
      whatsappMsg: 'Rejoins le reseau BRH Habitat et gagne des cadeaux en parrainant tes proches !',
    },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Network size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl text-slate-900 uppercase tracking-wide">Mon reseau</h1>
          <p className="font-body text-sm text-slate-500">Recrutez des partenaires et touchez 2,5% sur leurs commissions</p>
        </div>
      </div>

      {/* Recruitment links */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div>
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-900 mb-1">Vos liens de recrutement</h2>
          <p className="font-body text-sm text-slate-500">
            Partagez ces liens pour recruter de nouveaux partenaires. Vous toucherez 2,5% sur leurs gains.
          </p>
        </div>

        {links.map(({ key, label, link, whatsappMsg }) => (
          <div key={key}>
            <p className="font-body text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{label}</p>
            <div className="flex gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-body text-sm text-slate-600 truncate">
                {link}
              </div>
              <button
                onClick={() => void handleCopy(key, link)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-body text-sm font-semibold hover:bg-primary-dark transition-colors shrink-0"
              >
                {copied === key ? <Check size={15} /> : <Copy size={15} />}
                {copied === key ? 'Copie !' : 'Copier'}
              </button>
              <a
                href={getWhatsAppShareUrl(whatsappMsg, link)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-body text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Recruits list */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h2 className="font-display text-sm uppercase tracking-wide text-slate-900 mb-4">
          Partenaires recrutés ({recruits.length})
        </h2>

        {recruitsLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="inline-block w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : recruits.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-body text-sm text-slate-500">Aucun partenaire recrute pour l'instant.</p>
            <p className="font-body text-xs text-slate-400 mt-1">Partagez vos liens pour commencer !</p>
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
                  const s = statusLabel[c.status] ?? { label: c.status, className: 'bg-slate-100 text-slate-600' }
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-2 py-3 text-slate-900 font-semibold">{c.recruited_name ?? '—'}</td>
                      <td className="px-2 py-3 text-slate-600">
                        {c.source_type === 'commission_pro' ? 'Commission pro' : 'Points particulier'}
                      </td>
                      <td className="px-2 py-3 text-right text-slate-700">
                        {(c.source_amount / 100).toFixed(2)} EUR
                      </td>
                      <td className="px-2 py-3 text-right text-primary font-semibold">
                        {(c.commission_amount / 100).toFixed(2)} EUR
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
