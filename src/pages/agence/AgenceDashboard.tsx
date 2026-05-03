/**
 * Phase 16.0.6 — Dashboard agence (`/agence`).
 *
 * Vue d'accueil pour une agence partenaire : KPI principaux + onboarding
 * status + lien vers Score Vente et Mes leads.
 */
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import { useActiveCountForAgence } from '@/hooks/queries/lead-assignments'
import { useScoreVenteStats } from '@/hooks/queries/score-vente'

export default function AgenceDashboard() {
  const { user } = useAuth()
  const { data: membership } = useMyAgenceMembership()
  const { data: activeLeads = 0 } = useActiveCountForAgence(membership?.agenceId)
  const { data: stats } = useScoreVenteStats()

  const tresChaud = stats?.tres_chaud ?? 0
  const chaud = stats?.chaud ?? 0

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      <header>
        <p className="text-sm text-blue-700 font-medium">
          Bonjour {user?.full_name?.split(' ')[0] ?? 'Partenaire'} 👋
        </p>
        <h1 className="text-3xl font-display tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-gray-600 mt-1">
          Bienvenue dans votre espace agence partenaire BRH Habitat.
        </p>
      </header>

      {/* Status charte */}
      {membership ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-emerald-900">Charte signée</p>
            <p className="text-xs text-emerald-700">
              Vous avez accès aux leads scorés conformément à la charte
              partenariat (modèle Hoguet "A" — fiches d'opportunité, pas de
              transaction directe).
            </p>
          </div>
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

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center gap-2 text-blue-700">
            <ClipboardList size={18} />
            <p className="text-sm font-semibold">Mes leads actifs</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2">
            {activeLeads.toLocaleString('fr-FR')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Exclusivité 30j · 2 tentatives max par lead
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <p className="text-sm font-semibold">Très chauds (≥ 80)</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2">
            {tresChaud.toLocaleString('fr-FR')}
          </p>
          <p className="text-xs opacity-80 mt-1">
            Probabilité vente 6m : 65 %
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} />
            <p className="text-sm font-semibold">Chauds (≥ 60)</p>
          </div>
          <p className="text-3xl font-bold tabular-nums mt-2">
            {chaud.toLocaleString('fr-FR')}
          </p>
          <p className="text-xs opacity-80 mt-1">Probabilité vente 6m : 40 %</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/agence/score-vente"
          className="group bg-white rounded-2xl border border-slate-100 p-6 hover:border-primary hover:shadow-sm transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Explorer Score Vente</h3>
              <p className="text-sm text-gray-600 mt-1">
                Identifiez les biens F/G les plus susceptibles de se vendre
                dans les 6 mois selon notre algo 13 règles.
              </p>
            </div>
            <ArrowRight
              size={20}
              className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition"
            />
          </div>
        </Link>

        <Link
          to="/agence/leads"
          className="group bg-white rounded-2xl border border-slate-100 p-6 hover:border-primary hover:shadow-sm transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">Mes leads actifs</h3>
              <p className="text-sm text-gray-600 mt-1">
                Consultez les fiches que vous avez claim, déclarez vos
                tentatives de contact, libérez les non-pertinents.
              </p>
            </div>
            <ArrowRight
              size={20}
              className="text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition"
            />
          </div>
        </Link>
      </div>

      {/* Rappel charte */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-blue-900 mb-2">
          🤝 Rappel des engagements de la charte
        </h3>
        <ul className="space-y-1 text-blue-800 text-xs leading-relaxed list-disc pl-5">
          <li>1 lead claim = exclusivité 30 jours pour votre agence</li>
          <li>Maximum <strong>2 tentatives</strong> de contact par lead</li>
          <li>Déclaration obligatoire de chaque tentative dans BRH</li>
          <li>Respect du droit d'opposition RGPD si le propriétaire le demande</li>
          <li>Audit aléatoire mensuel par BRH (5 % des leads contactés)</li>
        </ul>
      </div>
    </div>
  )
}
