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
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-orange-300 text-sm font-medium mb-1">
            Bonjour {user?.full_name?.split(' ')[0] ?? 'Partenaire'} 👋
          </p>
          <h1 className="text-3xl font-display tracking-tight mb-2">
            {tresChaud + chaud} opportunités à explorer
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Propriétaires F/G en Bretagne avec le plus fort potentiel de mise en
            vente sur les 6 prochains mois, scorés par notre algo 13 règles.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              to="/agence/score-vente"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:from-orange-600 hover:to-red-700 transition"
            >
              <Flame size={16} />
              Explorer Score Vente
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/agence/leads"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 backdrop-blur text-white text-sm font-medium rounded-lg border border-white/10 transition"
            >
              <ClipboardList size={16} />
              Mes leads ({activeLeads})
            </Link>
          </div>
        </div>
      </header>

      {/* Status charte */}
      {membership ? (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="text-emerald-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Charte partenaire active</p>
            <p className="text-xs text-slate-600">
              Modèle Hoguet « A » · fiches d'opportunité scorées · pas de transaction directe
            </p>
          </div>
          <Link
            to="/agence/profil"
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1"
          >
            Relire <ArrowRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">Charte en attente</p>
            <p className="text-xs text-amber-700">
              Finalisez votre inscription pour accéder aux leads.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards 4 col */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Mes leads
            </p>
            <ClipboardList size={16} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">{activeLeads}</p>
          <p className="text-[11px] text-slate-500 mt-1">Actifs · exclusivité 30j</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white shadow-md shadow-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
              Très chauds
            </p>
            <Flame size={16} />
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {tresChaud.toLocaleString('fr-FR')}
          </p>
          <p className="text-[11px] opacity-90 mt-1">Score ≥ 80 · proba 6m 65 %</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-md shadow-orange-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">
              Chauds
            </p>
            <ThermometerSun size={16} />
          </div>
          <p className="text-3xl font-bold tabular-nums">{chaud.toLocaleString('fr-FR')}</p>
          <p className="text-[11px] opacity-90 mt-1">Score 60-79 · proba 6m 40 %</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Leads dispo
            </p>
            <TrendingUp size={16} className="text-slate-400" />
          </div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">
            {totalRemaining === null ? (
              <span className="text-orange-500">∞</span>
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
        <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 rounded-2xl border border-emerald-200 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Award size={16} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Palier {TIER_LABELS_FR[progression.tier]}
                </p>
                <p className="text-[11px] text-slate-500">
                  {progression.chantiers_signes} chantiers signés ·{' '}
                  {progression.bonus_leads_unlocked} leads bonus débloqués
                </p>
              </div>
            </div>
            <Link
              to="/agence/progression"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1"
            >
              Voir <ArrowRight size={12} />
            </Link>
          </div>

          {TIER_THRESHOLDS[progression.tier].next_chantiers ? (
            <>
              <div className="h-2 bg-white rounded-full overflow-hidden border border-emerald-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
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
              <p className="text-[11px] text-emerald-700 mt-2">
                {TIER_THRESHOLDS[progression.tier].next_chantiers! -
                  progression.chantiers_signes}{' '}
                chantier(s) signé(s) restant pour passer{' '}
                <strong>
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
            className="mt-3 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-sm font-bold rounded-lg shadow hover:shadow-md transition"
          >
            <Handshake size={14} />
            Apporter un prospect travaux (+5 % commission)
          </Link>
        </div>
      ) : null}

      {/* Recent claims */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-800">Mes derniers claims</h3>
          </div>
          <Link
            to="/agence/leads"
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
          >
            Voir tout →
          </Link>
        </div>
        {recentClaims.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Aucun claim pour l'instant.
            <Link
              to="/agence/score-vente"
              className="block mt-2 text-orange-600 font-semibold hover:underline"
            >
              Explorer les opportunités →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentClaims.slice(0, 3).map((claim) => (
              <div key={claim.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    claim.status === 'contacted'
                      ? 'bg-emerald-500'
                      : claim.status === 'active'
                      ? 'bg-orange-500'
                      : 'bg-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    Lead #{claim.prospect_id}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Claim le {new Date(claim.claimed_at).toLocaleDateString('fr-FR')} ·{' '}
                    {claim.contact_attempts} tentative
                    {claim.contact_attempts > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rappel charte */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className="text-emerald-600" />
          Rappel des engagements de la charte
        </h3>
        <ul className="space-y-1.5 text-slate-700 text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>1 lead claim = exclusivité 30 jours pour votre agence</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>
              Maximum <strong>2 tentatives</strong> de contact par lead
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>Déclaration obligatoire de chaque tentative dans BRH</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Respect du droit d'opposition RGPD si le propriétaire le demande</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <span>Audit aléatoire mensuel par BRH (5 % des leads contactés)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
