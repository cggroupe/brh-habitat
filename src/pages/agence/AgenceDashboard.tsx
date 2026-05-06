/**
 * Phase 16.0.6 — Dashboard agence (`/agence`).
 * Refonte 2026-05-04 : KPI denses, derniers claims, accent orange/rouge thématique.
 */
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  ThermometerSun,
  AlertCircle,
  ShieldCheck,
  Eye,
  Award,
  Handshake,
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
import LeadBreakdownCard from '@/components/agence/LeadBreakdownCard'

export default function AgenceDashboard() {
  const { user } = useAuth()
  const { data: membership } = useMyAgenceMembership()
  const { data: activeLeads = 0 } = useActiveCountForAgence(membership?.agenceId)
  const { data: stats } = useScoreVenteStats()
  const { data: subscription } = useMyAgenceSubscription()
  const { data: recentClaims = [] } = useLeadAssignments({ limit: 3 })
  const { data: progression } = useMyProgression(membership?.agenceId)
  const { data: breakdown } = useMyLeadBreakdown()

  const tresChaud = stats?.tres_chaud ?? 0
  const chaud = stats?.chaud ?? 0
  const totalRemaining = breakdown?.totalRemaining ?? null
  const bonusRemaining = breakdown?.bonusTotalRemaining ?? 0

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Hero header */}
      <header className="bg-gradient-to-br from-deep via-primary-dark to-deep rounded-2xl p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20">
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #81c784 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary-light mb-2">
            Bonjour {user?.full_name?.split(' ')[0] ?? 'Partenaire'}
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-3 leading-[1.05]">
            {tresChaud + chaud} opportunités<br />à explorer
          </h1>
          <p className="text-sm text-white/70 max-w-xl leading-relaxed">
            Propriétaires F/G en Bretagne avec le plus fort potentiel de mise en
            vente sur les 6 prochains mois, scorés par notre algo 13 règles.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              to="/agence/score-vente"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-text-primary text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Flame size={14} className="text-primary" />
              Explorer Score Vente
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/agence/leads"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur text-white text-xs font-bold uppercase tracking-widest rounded-xl border border-white/15 transition-colors"
            >
              <ClipboardList size={14} />
              Mes leads ({activeLeads})
            </Link>
          </div>
        </div>
      </header>

      {/* Status charte */}
      {membership ? (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="text-success" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-text-primary">Charte partenaire active</p>
            <p className="text-xs text-text-light mt-0.5">
              Modèle Hoguet « A » · fiches d'opportunité scorées · pas de transaction directe
            </p>
          </div>
          <Link
            to="/agence/profil"
            className="text-xs text-primary hover:text-primary-dark font-bold inline-flex items-center gap-1 transition-colors"
          >
            Relire <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="bg-warning/5 border border-warning/30 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Clock className="text-warning" size={22} />
          </div>
          <div>
            <p className="font-display font-bold text-text-primary">Charte en attente</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Finalisez votre inscription pour accéder aux leads.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards 4 col — pattern Pro premium */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ClipboardList size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">
            Mes leads
          </p>
          <p className="font-display text-3xl font-bold tabular-nums text-text-primary tracking-tight">
            {activeLeads}
          </p>
          <p className="text-[11px] text-text-light mt-1">Actifs · exclusivité 30j</p>
        </div>

        {/* Très chauds — gardé rouge sémantique métier */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg shadow-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Flame size={18} className="text-white" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-90 mb-1">
            Très chauds
          </p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">
            {tresChaud.toLocaleString('fr-FR')}
          </p>
          <p className="text-[11px] opacity-80 mt-1">Score ≥ 80 · proba 6m 65 %</p>
        </div>

        {/* Chauds — gardé orange sémantique métier */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <ThermometerSun size={18} className="text-white" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-90 mb-1">
            Chauds
          </p>
          <p className="font-display text-3xl font-bold tabular-nums tracking-tight">
            {chaud.toLocaleString('fr-FR')}
          </p>
          <p className="text-[11px] opacity-80 mt-1">Score 60-79 · proba 6m 40 %</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">
            Leads dispo
          </p>
          <p className="font-display text-3xl font-bold tabular-nums text-text-primary tracking-tight">
            {totalRemaining === null ? (
              <span className="text-primary">∞</span>
            ) : (
              totalRemaining
            )}
          </p>
          {bonusRemaining > 0 && (
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              dont +{bonusRemaining} bonus
            </p>
          )}
          {subscription && bonusRemaining === 0 ? (
            <p className="text-[11px] text-slate-500 mt-1">
              Forfait {TIER_LABELS[subscription.tier]}
            </p>
          ) : null}
        </div>
      </div>

      {/* Décomposition complète des leads dispo (4 sources) */}
      <LeadBreakdownCard />

      {/* Widget progression affiliation */}
      {progression ? (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-md shadow-primary/20">
                <Award size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-0.5">
                  Palier
                </p>
                <p className="font-display text-xl font-bold text-text-primary tracking-tight">
                  {TIER_LABELS_FR[progression.tier]}
                </p>
                <p className="text-[11px] text-text-light mt-0.5">
                  {progression.chantiers_signes} chantiers signés ·{' '}
                  {progression.bonus_leads_unlocked} leads bonus débloqués
                </p>
              </div>
            </div>
            <Link
              to="/agence/progression"
              className="text-xs text-primary hover:text-primary-dark font-bold inline-flex items-center gap-1 transition-colors"
            >
              Voir <ArrowRight size={12} />
            </Link>
          </div>

          {TIER_THRESHOLDS[progression.tier].next_chantiers ? (
            <>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (progression.chantiers_signes /
                          TIER_THRESHOLDS[progression.tier].next_chantiers!) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-text-secondary mt-2">
                {TIER_THRESHOLDS[progression.tier].next_chantiers! -
                  progression.chantiers_signes}{' '}
                chantier(s) signé(s) restant pour passer{' '}
                <strong className="text-primary">
                  {
                    TIER_LABELS_FR[
                      TIER_THRESHOLDS[progression.tier]
                        .next as keyof typeof TIER_LABELS_FR
                    ]
                  }
                </strong>
                .
              </p>
            </>
          ) : null}

          <Link
            to="/agence/contributions"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-br from-primary to-primary-dark text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <Handshake size={14} />
            Apporter un prospect travaux (+5 % commission)
          </Link>
        </div>
      ) : null}

      {/* Recent claims */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-text-light" />
            <h3 className="font-display text-base font-bold text-text-primary tracking-tight">
              Mes derniers claims
            </h3>
          </div>
          <Link
            to="/agence/leads"
            className="text-xs text-primary hover:text-primary-dark font-bold transition-colors"
          >
            Voir tout →
          </Link>
        </div>
        {recentClaims.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-light">
            Aucun claim pour l'instant.
            <Link
              to="/agence/score-vente"
              className="block mt-2 text-primary font-bold hover:underline"
            >
              Explorer les opportunités →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-light">
            {recentClaims.slice(0, 3).map((claim) => (
              <div key={claim.id} className="px-6 py-4 flex items-center gap-3 hover:bg-background transition-colors">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    claim.status === 'contacted'
                      ? 'bg-success'
                      : claim.status === 'active'
                      ? 'bg-primary'
                      : 'bg-text-light/40'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    Lead #{claim.prospect_id}
                  </p>
                  <p className="text-[11px] text-text-light">
                    Claim le {new Date(claim.claimed_at).toLocaleDateString('fr-FR')} ·{' '}
                    {claim.contact_attempts} tentative
                    {claim.contact_attempts > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-background text-text-secondary capitalize font-medium">
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rappel charte */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] border border-white/80 p-6">
        <h3 className="font-display text-base font-bold text-text-primary mb-4 flex items-center gap-2 tracking-tight">
          <ShieldCheck size={18} className="text-primary" />
          Rappel des engagements de la charte
        </h3>
        <ul className="space-y-2 text-text-secondary text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
            <span>1 lead claim = exclusivité 30 jours pour votre agence</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
            <span>
              Maximum <strong className="text-text-primary">2 tentatives</strong> de contact par lead
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
            <span>Déclaration obligatoire de chaque tentative dans BRH</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
            <span>Respect du droit d'opposition RGPD si le propriétaire le demande</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
            <span>Audit aléatoire mensuel par BRH (5 % des leads contactés)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
