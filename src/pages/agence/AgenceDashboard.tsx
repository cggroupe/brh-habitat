/**
 * Phase 11.7 (refonte UX 2026-05-08, design Stitch BRH Editorial Habitat).
 *
 * Layout matché au screenshot Stitch /root/.../app/.stitch/designs/dashboard.png
 * Stitch project ID 6037063388122355367.
 *
 * Référentiel : Stripe Dashboard / Linear Inbox / Pipedrive Activities + Editorial Habitat.
 */
import { Link } from 'react-router-dom'
import {
  PenLine,
  Search,
  AlertTriangle,
  PlusCircle,
  Map as MapIcon,
  ClipboardList,
  Settings,
  Flame,
  ThermometerSun,
  Infinity as InfinityIcon,
  Rocket,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import {
  useActiveCountForAgence,
} from '@/hooks/queries/lead-assignments'
import { useScoreVenteStats } from '@/hooks/queries/score-vente'
import { useMyAgenceSubscription } from '@/hooks/queries/agence-subscriptions'
import { useMyProgression } from '@/hooks/queries/agence-contributions'
import { TIER_LABELS_FR, TIER_THRESHOLDS } from '@/api/agence-contributions'
import { useMyLeadBreakdown } from '@/hooks/queries/agence-lead-economy'

export default function AgenceDashboard() {
  const { user } = useAuth()
  const { data: membership } = useMyAgenceMembership()
  const { data: activeLeads = 0 } = useActiveCountForAgence(membership?.agenceId)
  const { data: stats } = useScoreVenteStats()
  useMyAgenceSubscription() // pre-fetch for sidebar/footer in shell
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
  const remainingChantiers = nextChantiers ? nextChantiers - contribCount : 0

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const firstName = user?.full_name?.split(' ')[0] ?? 'Partenaire'

  return (
    <div className="px-10 py-8 max-w-[1280px] mx-auto">
      {/* Header sobre - matched Stitch */}
      <div className="flex items-end justify-between gap-3 mb-8 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-text-muted font-medium">
            {today}
          </p>
          <h1 className="font-display text-[44px] font-bold text-text leading-tight tracking-tight mt-1">
            Bonjour {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: '#00600a' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Charte Active
          </span>
          <span className="text-[12px] text-text-muted">{user?.email}</span>
        </div>
      </div>

      {/* 4 KPI cards - matched Stitch (label tiny + value 36px Epilogue + icon top-right circle) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Mes leads actifs"
          value={String(activeLeads)}
          icon={<Rocket size={16} className="text-text-muted" strokeWidth={1.5} />}
        />
        <KpiCard
          label="Très chauds"
          value={tresChaud.toLocaleString('fr-FR')}
          icon={<Flame size={16} className="text-danger" strokeWidth={1.5} />}
        />
        <KpiCard
          label="Chauds"
          value={chaud.toLocaleString('fr-FR')}
          icon={<ThermometerSun size={16} className="text-warning" strokeWidth={1.5} />}
        />
        <KpiCard
          label="Leads disponibles"
          value={
            totalRemaining === null ? '∞' : totalRemaining.toLocaleString('fr-FR')
          }
          icon={<InfinityIcon size={16} className="text-success" strokeWidth={1.5} />}
        />
      </div>

      {/* Section principale 2/3 + 1/3 — matched Stitch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inbox du jour 2/3 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-text">
              À faire aujourd&apos;hui
            </h2>
            <Link
              to="/agence/leads"
              className="text-[12px] text-text-muted hover:text-text font-medium underline-offset-2 hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="bg-surface rounded-2xl overflow-hidden">
            {totalRemaining !== null && totalRemaining > 0 ? (
              <>
                <InboxItem
                  icon={<Search size={18} className="text-info" strokeWidth={1.5} />}
                  iconBg="bg-info-soft"
                  title={`${totalRemaining} lead${totalRemaining > 1 ? 's' : ''} disponible${totalRemaining > 1 ? 's' : ''} à claimer`}
                  hint="Consultez les nouveaux prospects vendeurs F/G en Bretagne"
                  to="/agence/leads"
                />
                <div className="border-t border-border-strong/30">
                  <InboxItem
                    icon={<PenLine size={18} className="text-success" strokeWidth={1.5} />}
                    iconBg="bg-success-soft"
                    title="Cartographier le foncier"
                    hint="Cadastre, PLU, prospects DPE F/G par commune"
                    to="/agence/foncier/carte"
                  />
                </div>
                <div className="border-t border-border-strong/30">
                  <InboxItem
                    icon={<AlertTriangle size={18} className="text-warning" strokeWidth={1.5} />}
                    iconBg="bg-warning-soft"
                    title="Sociétés tertiaires en liquidation"
                    hint="Opportunités chantier rénovation tertiaire"
                    to="/agence/foncier/tertiaire"
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-low flex items-center justify-center">
                  <AlertTriangle size={20} className="text-text-muted" strokeWidth={1.5} />
                </div>
                <p className="text-base font-bold text-text mb-1">
                  Aucun lead disponible pour le moment
                </p>
                <p className="text-[13px] text-text-muted max-w-md mx-auto leading-relaxed">
                  Vos leads sont automatiquement attribués selon votre charte (tier + bonus).
                  Augmentez votre palier pour en recevoir davantage chaque mois.
                </p>
                <Link
                  to="/agence/progression"
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Voir ma progression
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar droite 1/3 */}
        <aside className="space-y-4">
          {/* Ma progression */}
          <div className="bg-surface rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
              Ma Progression
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-2xl font-bold text-text">
                Palier {TIER_LABELS_FR[currentTier as keyof typeof TIER_LABELS_FR] ?? 'Bronze'}
              </h3>
              {nextChantiers && (
                <span className="text-text-muted text-sm tabular-nums">
                  {contribCount}/{nextChantiers}
                </span>
              )}
            </div>
            <div className="mt-3 h-1.5 bg-surface-low rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${tierProgress}%`,
                  backgroundColor: '#00600a',
                }}
              />
            </div>
            {nextChantiers && remainingChantiers > 0 ? (
              <p className="text-[12px] text-text-muted mt-3 leading-snug">
                Encore {remainingChantiers} vente{remainingChantiers > 1 ? 's' : ''} pour passer
                au palier {tierInfo?.next ? TIER_LABELS_FR[tierInfo.next as keyof typeof TIER_LABELS_FR] : 'suivant'}.
              </p>
            ) : (
              <p className="text-[12px] text-text-muted mt-3">Palier maximum atteint</p>
            )}
          </div>

          {/* Activité réseau */}
          <div className="bg-surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                Activité réseau
              </p>
              <button
                type="button"
                className="text-[10px] text-text-muted hover:text-text"
                aria-label="Replier"
              >
                —
              </button>
            </div>
            <ul className="space-y-3">
              <ActivityRow
                color="#00600a"
                label={
                  <>
                    Nouveau lead exclusif disponible à <strong>Vannes</strong>.
                  </>
                }
              />
              <ActivityRow
                color="#a8a29e"
                label={
                  <>
                    <strong>Jean-Marc</strong> a validé son Score Vente.
                  </>
                }
              />
              <ActivityRow
                color="#a8a29e"
                label="Le simulateur Bretagne a été mis à jour."
              />
            </ul>
          </div>

          {/* Classement Bretagne CTA */}
          <Link
            to="/agence/leaderboard"
            className="block rounded-2xl p-5 relative overflow-hidden hover:opacity-95 transition-opacity"
            style={{
              backgroundColor: '#003404',
              boxShadow: '0px 20px 40px rgba(27, 28, 28, 0.06)',
            }}
          >
            <h3 className="font-display text-xl font-bold leading-tight text-white">
              Classement
              <br />
              Bretagne
            </h3>
            <p className="text-[13px] mt-2 leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Vous êtes actuellement <strong className="text-white">12e</strong> dans le Morbihan.
            </p>
            <span
              className="inline-flex mt-4 px-4 py-2 rounded-full text-[12px] font-bold"
              style={{ backgroundColor: '#fbf9f8', color: '#003404' }}
            >
              Voir le podium
            </span>
          </Link>
        </aside>
      </div>

      {/* 4 quick action cards bas — matched Stitch */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        <QuickAction
          icon={<PlusCircle size={22} strokeWidth={1.5} />}
          label="Nouveau Lead"
          to="/agence/contributions"
        />
        <QuickAction
          icon={<MapIcon size={22} strokeWidth={1.5} />}
          label="Carte Foncière"
          to="/agence/foncier/carte"
        />
        <QuickAction
          icon={<ClipboardList size={22} strokeWidth={1.5} />}
          label="Mes Leads"
          to="/agence/leads"
        />
        <QuickAction
          icon={<Settings size={22} strokeWidth={1.5} />}
          label="Paramètres"
          to="/agence/profil"
        />
      </div>
    </div>
  )
}

/* ============================================================================
   Sub-components
   ============================================================================ */

interface KpiCardProps {
  label: string
  value: string
  icon: React.ReactNode
}

function KpiCard({ label, value, icon }: KpiCardProps) {
  return (
    <div className="bg-surface rounded-2xl p-5 relative">
      <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
        {label}
      </p>
      <div className="flex items-end justify-between mt-2">
        <p className="font-display text-[40px] font-bold text-text tabular-nums leading-none">
          {value}
        </p>
        <div className="w-9 h-9 rounded-full bg-canvas flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  )
}

interface InboxItemProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  hint: string
  to: string
}

function InboxItem({ icon, iconBg, title, hint, to }: InboxItemProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 px-5 py-4 hover:bg-canvas/40 transition-colors group"
    >
      <div
        className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text leading-tight">{title}</p>
        <p className="text-[12px] text-text-muted mt-0.5 truncate">{hint}</p>
      </div>
      <span className="text-text-subtle group-hover:text-text-muted transition-colors">›</span>
    </Link>
  )
}

function ActivityRow({ color, label }: { color: string; label: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[13px] text-text leading-snug">{label}</span>
    </li>
  )
}

function QuickAction({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode
  label: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="bg-surface rounded-2xl py-7 px-4 text-center flex flex-col items-center justify-center gap-2 hover:bg-surface-low transition-colors"
    >
      <span className="text-text">{icon}</span>
      <p className="text-[13px] font-semibold text-text">{label}</p>
    </Link>
  )
}
