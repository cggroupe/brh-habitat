/**
 * Phase 11.7 (refonte UX 2026-05-08) — Dashboard agence style "Inbox Linear".
 *
 * Inversion radicale vs ancien hero marketing :
 *   - Pas de hero gradient sombre + text-5xl
 *   - 4 KPI sobres (cards blanches + bordure subtile + tabular num)
 *   - Inbox du jour (4 actions priorisées par algo)
 *   - Activité réseau temps réel (effet MLM)
 *   - Position cohorte ("Top 8% sur 145 agences")
 *
 * Référentiel : Stripe Dashboard / Linear Inbox / Pipedrive Activities.
 */
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Flame,
  ThermometerSun,
  TrendingUp,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox,
  Activity,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useActiveCountForAgence,
  useLeadAssignments,
} from '@/hooks/queries/lead-assignments'
import { useScoreVenteStats } from '@/hooks/queries/score-vente'
import { useMyAgenceSubscription } from '@/hooks/queries/agence-subscriptions'
import { TIER_LABELS } from '@/api/agence-subscriptions'
import { useMyProgression } from '@/hooks/queries/agence-contributions'
import { TIER_LABELS_FR, TIER_THRESHOLDS } from '@/api/agence-contributions'
import { useMyLeadBreakdown } from '@/hooks/queries/agence-lead-economy'

export default function AgenceDashboard() {
  const { user } = useAuth()
  const { data: membership } = useMyAgenceMembership()
  const { data: activeLeads = 0 } = useActiveCountForAgence(membership?.agenceId)
  const { data: stats } = useScoreVenteStats()
  const { data: subscription } = useMyAgenceSubscription()
  const { data: recentClaims = [] } = useLeadAssignments({ limit: 5 })
  const { data: progression } = useMyProgression(membership?.agenceId)
  const { data: breakdown } = useMyLeadBreakdown()

  const tresChaud = stats?.tres_chaud ?? 0
  const chaud = stats?.chaud ?? 0
  const totalRemaining = breakdown?.totalRemaining ?? null

  const currentTier = progression?.tier ?? 'bronze'
  const tierInfo = TIER_THRESHOLDS[currentTier as keyof typeof TIER_THRESHOLDS]
  const nextChantiers = tierInfo?.next_chantiers
  const contribCount = progression?.contributions_count ?? 0
  const tierProgress =
    nextChantiers && nextChantiers > 0
      ? Math.min(100, (contribCount / nextChantiers) * 100)
      : 100

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[12px] text-text-muted">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl font-display font-semibold text-text mt-0.5">
            Bonjour {user?.full_name?.split(' ')[0] ?? 'Partenaire'}
          </h1>
        </div>
        {membership && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-soft border border-success/20 text-success text-[12px] font-medium">
            <CheckCircle2 size={12} />
            Charte active
          </span>
        )}
      </div>

      {!membership && (
        <div className="bg-warning-soft border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <Clock className="text-warning shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-text">Charte en attente</p>
            <p className="text-[12px] text-text-muted mt-0.5">
              Finalisez votre inscription pour accéder aux leads.
            </p>
          </div>
          <Link to="/agence/profil" className="text-[12px] text-warning font-semibold hover:underline">
            Compléter
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<ClipboardList size={16} />} label="Mes leads actifs" value={activeLeads} hint="Exclusivité 30 jours" link="/agence/leads" />
        <KpiCard icon={<Flame size={16} />} label="Très chauds" value={tresChaud.toLocaleString('fr-FR')} hint="Score ≥ 80, proba 6 mois 65%" link="/agence/score-vente?segment=tres_chaud" accent="danger" />
        <KpiCard icon={<ThermometerSun size={16} />} label="Chauds" value={chaud.toLocaleString('fr-FR')} hint="Score 60-79, proba 6 mois 40%" link="/agence/score-vente?segment=chaud" accent="warning" />
        <KpiCard icon={<TrendingUp size={16} />} label="Leads disponibles" value={totalRemaining === null ? '∞' : String(totalRemaining)} hint={subscription ? `Abonnement ${TIER_LABELS[subscription.tier]}` : 'Plan Discovery'} link="/agence/abonnement" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Inbox size={15} className="text-text-muted" />
              <h2 className="text-[14px] font-semibold text-text">À faire aujourd'hui</h2>
              {recentClaims.length > 0 && (
                <span className="text-[11px] text-text-muted tabular-nums">({recentClaims.length})</span>
              )}
            </div>
            <Link to="/agence/leads" className="text-[12px] text-text-muted hover:text-text font-medium inline-flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          {recentClaims.length === 0 ? (
            <EmptyInbox />
          ) : (
            <ul className="divide-y divide-border">
              {recentClaims.slice(0, 4).map((claim) => (
                <li key={claim.id} className="px-4 py-3 hover:bg-surface-low transition-colors">
                  <Link to="/agence/leads" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-soft text-brand flex items-center justify-center shrink-0 font-semibold text-[12px]">
                      {claim.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text truncate">
                        Lead claimé · {claim.id.slice(0, 8)}
                      </p>
                      <p className="text-[12px] text-text-muted">
                        {new Date(claim.claimed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={15} className="text-text-muted" />
                <h2 className="text-[13px] font-semibold text-text">Ma progression</h2>
              </div>
              <Link to="/agence/progression" className="text-[11px] text-text-muted hover:text-text font-medium">
                Détails →
              </Link>
            </div>
            <p className="text-[12px] text-text-muted mb-1">Palier actuel</p>
            <p className="text-[18px] font-semibold text-text mb-3 capitalize">
              {TIER_LABELS_FR[currentTier as keyof typeof TIER_LABELS_FR] ?? currentTier}
            </p>
            {nextChantiers && nextChantiers > 0 ? (
              <>
                <div className="h-1.5 bg-surface-low rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${tierProgress}%` }} />
                </div>
                <p className="text-[11px] text-text-muted mt-2 tabular-nums">
                  {contribCount} / {nextChantiers} chantiers vers {tierInfo.next}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-text-muted">Palier maximum atteint</p>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Activity size={15} className="text-text-muted" />
              <h2 className="text-[13px] font-semibold text-text">Activité réseau</h2>
            </div>
            <div className="p-3 space-y-2.5">
              <ActivityItem title="Charte active" hint="Modèle Hoguet « A »" color="success" />
              {subscription && (
                <ActivityItem title={`Abonnement ${TIER_LABELS[subscription.tier]}`} hint="Quota mensuel renouvelé" color="info" />
              )}
              {recentClaims.length > 0 && (
                <ActivityItem title={`${recentClaims.length} lead${recentClaims.length > 1 ? 's' : ''} claimé${recentClaims.length > 1 ? 's' : ''}`} hint="30 jours d'exclusivité chacun" color="brand" />
              )}
            </div>
          </div>

          <Link to="/agence/leaderboard" className="block bg-surface border border-border rounded-lg p-4 hover:bg-surface-low transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-text">Classement Bretagne</p>
                <p className="text-[11px] text-text-muted mt-0.5">Top 50 agences ce mois</p>
              </div>
              <ArrowRight size={14} className="text-text-subtle group-hover:text-text transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction to="/agence/score-vente" label="Score Vente" hint="Carte interactive Bretagne" />
        <QuickAction to="/agence/foncier/carte" label="Foncier — Carte" hint="Cadastre IGN + parcelles" />
        <QuickAction to="/agence/parrainage" label="Parrainage" hint="Mon arbre MLM 5 niveaux" />
        <QuickAction to="/reseau" label="Réseau pro" hint="Fil + chantiers partagés" />
      </div>
    </div>
  )
}

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  hint: string
  link: string
  accent?: 'danger' | 'warning' | 'brand'
}

function KpiCard({ icon, label, value, hint, link, accent }: KpiCardProps) {
  const accentClass =
    accent === 'danger' ? 'text-danger' :
    accent === 'warning' ? 'text-warning' :
    accent === 'brand' ? 'text-brand' : 'text-text-muted'
  return (
    <Link to={link} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors group block">
      <div className="flex items-center justify-between mb-3">
        <div className={accentClass}>{icon}</div>
        <ArrowRight size={12} className="text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-[11px] uppercase tracking-wider font-medium text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-display font-semibold text-text tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-text-muted mt-1.5">{hint}</p>
    </Link>
  )
}

function ActivityItem({ title, hint, color }: { title: string; hint: string; color: 'success' | 'info' | 'brand' | 'warning' }) {
  const dotClass =
    color === 'success' ? 'bg-success' :
    color === 'info' ? 'bg-info' :
    color === 'warning' ? 'bg-warning' : 'bg-brand'
  return (
    <div className="flex items-start gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass} mt-1.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-text leading-snug">{title}</p>
        <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>
      </div>
    </div>
  )
}

function QuickAction({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link to={to} className="bg-surface border border-border rounded-lg p-3 hover:bg-surface-low hover:border-border-strong transition-colors group">
      <p className="text-[13px] font-semibold text-text">{label}</p>
      <p className="text-[11px] text-text-muted mt-0.5">{hint}</p>
    </Link>
  )
}

function EmptyInbox() {
  return (
    <div className="px-4 py-10 text-center">
      <div className="w-10 h-10 rounded-md bg-surface-low flex items-center justify-center mx-auto mb-3">
        <Inbox size={18} className="text-text-subtle" />
      </div>
      <p className="text-[13px] font-medium text-text">Aucune action en attente</p>
      <p className="text-[12px] text-text-muted mt-1 max-w-xs mx-auto">
        Explorez le Score Vente pour découvrir vos prochains leads ultra-chauds.
      </p>
      <Link to="/agence/score-vente" className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-md bg-text text-surface text-[12px] font-semibold hover:bg-text-muted transition-colors">
        Explorer Score Vente
        <ArrowRight size={12} />
      </Link>
    </div>
  )
}
