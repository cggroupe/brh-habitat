import { useState } from 'react'
import { LayoutDashboard, Award, Users, CheckCircle, Clock, Copy, MessageCircle, Gift, Star, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useAffiliateProspects, useRewardsCatalog } from '@/hooks/queries'
import type { AffiliateLevel } from '@/types/partner'

const LEVEL_CONFIG: Record<AffiliateLevel, { label: string; color: string; bg: string }> = {
  standard:    { label: 'Standard',    color: 'text-slate-600',  bg: 'bg-slate-100' },
  ambassadeur: { label: 'Ambassadeur', color: 'text-blue-700',   bg: 'bg-blue-100' },
  expert:      { label: 'Expert',      color: 'text-purple-700', bg: 'bg-purple-100' },
  vip:         { label: 'VIP',         color: 'text-amber-700',  bg: 'bg-amber-100' },
}

function copyToClipboard(text: string, onCopied: () => void) {
  navigator.clipboard.writeText(text).then(onCopied)
}

export default function PartDashboard() {
  const { user } = useAuth()
  const { data: affiliate, isLoading: loadingAffiliate } = useMyAffiliate(user?.id)
  const { data: prospects = [] } = useAffiliateProspects(affiliate?.id)
  const { data: rewards = [] } = useRewardsCatalog(true)

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedShort, setCopiedShort] = useState(false)

  const referralLink = affiliate
    ? `${window.location.origin}/inscription/particulier?ref=${affiliate.referral_code}`
    : ''

  const nbTotal = prospects.length
  const nbSigne = prospects.filter(p => p.status === 'signe' || p.status === 'termine').length
  const nbEnCours = prospects.filter(p => ['nouveau', 'etude', 'devis_envoye'].includes(p.status)).length

  const balance = affiliate?.points_balance ?? 0
  const nextReward = rewards
    .filter(r => r.points_required > balance)
    .sort((a, b) => a.points_required - b.points_required)[0]
  const pointsNeeded = nextReward ? nextReward.points_required - balance : 0

  const levelCfg = affiliate ? LEVEL_CONFIG[affiliate.level] : LEVEL_CONFIG.standard

  if (loadingAffiliate) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} className="text-primary" />
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
              Bonjour{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} !
            </h1>
            <p className="font-body text-sm text-slate-500">Votre espace affilie BRH Habitat</p>
          </div>
        </div>
        {affiliate && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-display uppercase tracking-wide ${levelCfg.bg} ${levelCfg.color}`}>
            <Star size={14} />
            {levelCfg.label}
          </span>
        )}
      </div>

      {/* Points + stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Award size={16} className="text-primary" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Solde points</span>
          </div>
          <p className="font-display text-4xl text-primary">{balance.toLocaleString('fr-FR')}</p>
          <p className="font-body text-xs text-slate-400 mt-1">{affiliate?.total_points_earned?.toLocaleString('fr-FR') ?? 0} pts gagnés au total</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-slate-400" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Total</span>
          </div>
          <p className="font-display text-3xl text-slate-900">{nbTotal}</p>
          <p className="font-body text-xs text-slate-400 mt-1">parrainages</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-500" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">Signés</span>
          </div>
          <p className="font-display text-3xl text-slate-900">{nbSigne}</p>
          <p className="font-body text-xs text-slate-400 mt-1">contrats signés</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-orange-400" />
            <span className="font-body text-xs text-slate-500 uppercase tracking-wide">En cours</span>
          </div>
          <p className="font-display text-3xl text-slate-900">{nbEnCours}</p>
          <p className="font-body text-xs text-slate-400 mt-1">en traitement</p>
        </div>
      </div>

      {/* Code & lien de parrainage */}
      {affiliate && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <p className="font-body text-sm text-slate-500 mb-3 uppercase tracking-wide">Mon code parrainage</p>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-lg flex-1 text-center">
                {affiliate.referral_code}
              </span>
              <button
                onClick={() => copyToClipboard(affiliate.referral_code, () => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) })}
                className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Copier le code"
              >
                <Copy size={18} className={copiedCode ? 'text-green-500' : 'text-slate-500'} />
              </button>
            </div>
            {copiedCode && <p className="font-body text-xs text-green-600 mt-2">Code copié !</p>}
          </div>

          {affiliate.short_code && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <p className="font-body text-sm text-slate-500 mb-3 uppercase tracking-wide">Mon code court</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Zap size={16} className="text-amber-500 shrink-0" />
                  <span className="font-display text-2xl tracking-widest text-amber-600 bg-amber-50 px-4 py-2 rounded-lg flex-1 text-center">
                    {affiliate.short_code}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(affiliate.short_code!, () => { setCopiedShort(true); setTimeout(() => setCopiedShort(false), 2000) })}
                  className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  title="Copier le code court"
                >
                  <Copy size={18} className={copiedShort ? 'text-green-500' : 'text-slate-500'} />
                </button>
              </div>
              {copiedShort && <p className="font-body text-xs text-green-600 mt-2">Code copié !</p>}
              <p className="font-body text-xs text-slate-400 mt-2">Code mémorisable pour partager oralement</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 md:col-span-2 lg:col-span-1">
            <p className="font-body text-sm text-slate-500 mb-3 uppercase tracking-wide">Mon lien de parrainage</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="font-body text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 truncate"
              />
              <button
                onClick={() => copyToClipboard(referralLink, () => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) })}
                className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Copier le lien"
              >
                <Copy size={18} className={copiedLink ? 'text-green-500' : 'text-slate-500'} />
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Demandez un devis BRH Habitat avec mon code : ${referralLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors"
                title="Partager sur WhatsApp"
              >
                <MessageCircle size={18} className="text-white" />
              </a>
            </div>
            {copiedLink && <p className="font-body text-xs text-green-600 mt-2">Lien copié !</p>}
          </div>
        </div>
      )}

      {/* Prochain cadeau */}
      {nextReward ? (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Gift size={20} className="text-primary" />
            <p className="font-display text-sm uppercase tracking-wide text-primary">Prochain cadeau accessible</p>
          </div>
          <p className="font-body text-slate-800 font-medium">{nextReward.name}</p>
          <p className="font-body text-sm text-slate-500 mt-1">
            Il vous manque <span className="font-display text-primary">{pointsNeeded.toLocaleString('fr-FR')} points</span> pour débloquer cette récompense.
          </p>
          <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, (balance / nextReward.points_required) * 100)}%` }}
            />
          </div>
          <p className="font-body text-xs text-slate-400 mt-1">{balance} / {nextReward.points_required} pts</p>
        </div>
      ) : rewards.length > 0 ? (
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3">
            <Gift size={20} className="text-green-600" />
            <div>
              <p className="font-display text-sm uppercase tracking-wide text-green-700">Tous les cadeaux sont accessibles !</p>
              <p className="font-body text-sm text-green-600 mt-0.5">Visitez le catalogue pour échanger vos points.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
