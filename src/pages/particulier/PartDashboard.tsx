import { useState } from 'react'
import { Users, CheckCircle, Clock, Copy, MessageCircle, Gift, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useAffiliateProspects, useRewardsCatalog } from '@/hooks/queries'
import type { AffiliateLevel } from '@/types/partner'

// ─── Level badge config ───────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<AffiliateLevel, { label: string; gradient: string; shadow: string }> = {
  standard:    {
    label:    'Standard',
    gradient: 'from-slate-500 to-slate-400',
    shadow:   'shadow-slate-300/40',
  },
  ambassadeur: {
    label:    'Ambassadeur',
    gradient: 'from-blue-500 to-sky-400',
    shadow:   'shadow-blue-300/40',
  },
  expert: {
    label:    'Expert',
    gradient: 'from-purple-500 to-violet-400',
    shadow:   'shadow-purple-300/40',
  },
  vip: {
    label:    'VIP',
    gradient: 'from-amber-400 to-yellow-500',
    shadow:   'shadow-amber-200/50',
  },
}

function copyToClipboard(text: string, onCopied: () => void) {
  navigator.clipboard.writeText(text).then(onCopied)
}

// ─── Component ────────────────────────────────────────────────────────────────
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

  const nbTotal  = prospects.length
  const nbSigne  = prospects.filter(p => p.status === 'signe' || p.status === 'termine').length
  const nbEnCours = prospects.filter(p => ['nouveau', 'etude', 'devis_envoye'].includes(p.status)).length

  const balance    = affiliate?.points_balance ?? 0
  const nextReward = rewards
    .filter(r => r.points_required > balance)
    .sort((a, b) => a.points_required - b.points_required)[0]
  const pointsNeeded = nextReward ? nextReward.points_required - balance : 0
  const progressPct  = nextReward ? Math.min(100, (balance / nextReward.points_required) * 100) : 100

  const levelCfg   = affiliate ? LEVEL_CONFIG[affiliate.level] : LEVEL_CONFIG.standard
  const firstName  = user?.full_name?.split(' ')[0] ?? 'vous'

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingAffiliate) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">

      {/* ── Welcome header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-[0.04em]">
            Bonjour, <span className="text-primary">{firstName}</span> !
          </h1>
          <p className="text-sm text-text-light mt-0.5">Votre espace affilie BRH Habitat</p>
        </div>
        {affiliate && (
          <span
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${levelCfg.gradient} ${levelCfg.shadow} text-white shadow-lg`}
          >
            {levelCfg.label}
          </span>
        )}
      </div>

      {/* ── Big points display + 3 stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        {/* Points balance — hero card */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 col-span-2 md:col-span-1 flex flex-col justify-between">
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
            Solde points
          </p>
          <p
            className="font-display text-6xl text-primary leading-none"
            style={{ textShadow: '0 0 40px rgba(28,123,29,0.18)' }}
          >
            {balance.toLocaleString('fr-FR')}
          </p>
          <p className="text-[11px] text-text-light mt-3">
            {(affiliate?.total_points_earned ?? 0).toLocaleString('fr-FR')} pts gagnes au total
          </p>
        </div>

        {/* Parrainages */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Parrainages</p>
          <p className="font-display text-3xl text-text-primary">{nbTotal}</p>
          <p className="text-[11px] text-text-light mt-1">au total</p>
        </div>

        {/* Signes */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary-light/20 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Signes</p>
          <p className="font-display text-3xl text-text-primary">{nbSigne}</p>
          <p className="text-[11px] text-text-light mt-1">contrats signes</p>
        </div>

        {/* En cours */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-400/10 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-orange-500" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">En cours</p>
          <p className="font-display text-3xl text-text-primary">{nbEnCours}</p>
          <p className="text-[11px] text-text-light mt-1">en traitement</p>
        </div>
      </div>

      {/* ── Referral cards ──────────────────────────────────────────────────── */}
      {affiliate && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

          {/* Code parrainage */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
              Mon code parrainage
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-background rounded-xl px-4 py-3 text-center">
                <span className="font-display text-2xl tracking-[0.2em] text-primary">
                  {affiliate.referral_code}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(affiliate.referral_code, () => {
                  setCopiedCode(true)
                  setTimeout(() => setCopiedCode(false), 2000)
                })}
                className="w-11 h-11 rounded-xl border border-neutral-light flex items-center justify-center hover:bg-background transition-colors shrink-0"
                title="Copier le code"
              >
                <Copy size={16} className={copiedCode ? 'text-primary' : 'text-text-light'} />
              </button>
            </div>
            {copiedCode && (
              <p className="text-[11px] text-primary font-bold mt-2">Code copie !</p>
            )}
          </div>

          {/* Code court */}
          {affiliate.short_code && (
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={13} className="text-amber-500" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                  Mon code court
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 text-center">
                  <span className="font-display text-2xl tracking-[0.2em] text-amber-600">
                    {affiliate.short_code}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(affiliate.short_code!, () => {
                    setCopiedShort(true)
                    setTimeout(() => setCopiedShort(false), 2000)
                  })}
                  className="w-11 h-11 rounded-xl border border-neutral-light flex items-center justify-center hover:bg-background transition-colors shrink-0"
                  title="Copier le code court"
                >
                  <Copy size={16} className={copiedShort ? 'text-primary' : 'text-text-light'} />
                </button>
              </div>
              {copiedShort && (
                <p className="text-[11px] text-primary font-bold mt-2">Code copie !</p>
              )}
              <p className="text-[11px] text-text-light mt-2">Code memorisable pour partager oralement</p>
            </div>
          )}

          {/* Lien de parrainage + WhatsApp */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 md:col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
              Mon lien de parrainage
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 text-[11px] text-text-secondary bg-background rounded-xl px-3 py-2.5 truncate border-0 outline-none"
              />
              <button
                onClick={() => copyToClipboard(referralLink, () => {
                  setCopiedLink(true)
                  setTimeout(() => setCopiedLink(false), 2000)
                })}
                className="w-10 h-10 rounded-xl border border-neutral-light flex items-center justify-center hover:bg-background transition-colors shrink-0"
                title="Copier le lien"
              >
                <Copy size={15} className={copiedLink ? 'text-primary' : 'text-text-light'} />
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Demandez un devis BRH Habitat avec mon code : ${referralLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shrink-0"
                title="Partager sur WhatsApp"
              >
                <MessageCircle size={16} className="text-white" />
              </a>
            </div>
            {copiedLink && (
              <p className="text-[11px] text-primary font-bold mt-2">Lien copie !</p>
            )}
          </div>
        </div>
      )}

      {/* ── Next reward progress ─────────────────────────────────────────────── */}
      {nextReward ? (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Gift size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Prochain cadeau accessible
              </p>
              <p className="text-sm font-bold text-text-primary mt-0.5">{nextReward.name}</p>
            </div>
          </div>

          <p className="text-sm text-text-light mb-4">
            Il vous manque{' '}
            <span className="font-bold text-primary">
              {pointsNeeded.toLocaleString('fr-FR')} points
            </span>{' '}
            pour debloquer cette recompense.
          </p>

          {/* Animated gradient progress bar */}
          <div className="h-3 bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] font-bold text-primary">
              {balance.toLocaleString('fr-FR')} pts
            </span>
            <span className="text-[11px] text-text-light">
              {nextReward.points_required.toLocaleString('fr-FR')} pts
            </span>
          </div>
        </div>
      ) : rewards.length > 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light/20 rounded-xl flex items-center justify-center shrink-0">
              <Gift size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-0.5">
                Tous les cadeaux sont accessibles !
              </p>
              <p className="text-sm text-text-light">Visitez le catalogue pour echanger vos points.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
