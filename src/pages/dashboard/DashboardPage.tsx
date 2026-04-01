import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  FolderOpen,
  Calendar,
  ArrowRight,
  Search,
  MapPin,
  Wrench,
  ChevronDown,
  HeartPulse,
  PlayCircle,
  ClipboardCheck,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { useUserHomes, useHomeHealthRecords, useHomeWorkHistory, useHomeDocuments, useUserDraftDiagnostic, useUserCompletedDiagnostics } from '@/hooks/queries'
import { HEALTH_DOMAINS, HEALTH_DOMAIN_LABELS, HEALTH_DOMAIN_COLORS, WORK_STATUS_LABELS, WORK_STATUS_COLORS } from '@/data/constants'
import { HealthScoreGauge, getUrgencyFromScore } from '@/components/carnet/HealthScoreGauge'
import { BretagneAlerts } from '@/components/carnet/BretagneAlerts'
import type { BrhHomeRow, BrhDiagnosticRow, HealthDomain } from '@/types/database'
import type { DiagnosticType } from '@/stores/diagnosticStore'

// ---------------------------------------------------------------------------
// Mini domain bar
// ---------------------------------------------------------------------------
function DomainBar({ domain, score }: { domain: HealthDomain; score: number | null }) {
  const colors = HEALTH_DOMAIN_COLORS[domain]
  const urgency = score != null ? getUrgencyFromScore(score) : null
  const barColor = urgency === 'critique' ? 'bg-red-500'
    : urgency === 'eleve' ? 'bg-orange-500'
    : urgency === 'modere' ? 'bg-yellow-500'
    : urgency === 'faible' ? 'bg-green-500'
    : 'bg-slate-200'

  return (
    <div className="flex items-center gap-2">
      <span className={`w-20 text-xs font-body ${colors.text} truncate`}>{HEALTH_DOMAIN_LABELS[domain]}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score ?? 0}%` }} />
      </div>
      <span className="w-8 text-xs font-accent text-text-primary text-right">{score ?? '—'}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diagnostic history card
// ---------------------------------------------------------------------------
function DiagnosticCard({ diag }: { diag: BrhDiagnosticRow }) {
  const results = diag.results as Record<string, unknown> | null
  const score = results?.overallScore as number | undefined
  const urgency = results?.urgencyLevel as string | undefined
  const date = new Date(diag.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const urgencyColor = urgency === 'critique' ? 'bg-red-100 text-red-700'
    : urgency === 'eleve' ? 'bg-orange-100 text-orange-700'
    : urgency === 'modere' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-green-100 text-green-700'

  const urgencyLabel = urgency === 'critique' ? 'Critique'
    : urgency === 'eleve' ? 'Eleve'
    : urgency === 'modere' ? 'Modere'
    : 'Faible'

  return (
    <Link
      to={`/diagnostic/resultats/${diag.id}`}
      className="group bg-surface rounded-xl border border-gray-light p-4 hover:border-primary hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-primary" />
          <span className="font-display text-sm text-text-primary">
            {diag.property_address || 'Diagnostic'}
          </span>
        </div>
        {score != null && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-display ${urgencyColor}`}>
            {score}/100 — {urgencyLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs font-body text-text-light">
        <span className="flex items-center gap-1">
          <Clock size={11} /> {date}
        </span>
        <span>{diag.types.length} domaine{diag.types.length > 1 ? 's' : ''}</span>
        {diag.property_surface > 0 && <span>{diag.property_surface} m²</span>}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {diag.types.slice(0, 4).map((t) => (
          <span key={t} className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-body text-text-secondary capitalize">
            {t}
          </span>
        ))}
        {diag.types.length > 4 && (
          <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-body text-text-light">
            +{diag.types.length - 4}
          </span>
        )}
      </div>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Quick nav cards
// ---------------------------------------------------------------------------
const NAV_CARDS = [
  { icon: Search, label: 'Diagnostic', description: 'Lancez un diagnostic gratuit', to: '/diagnostic', color: 'bg-green-50 text-primary' },
  { icon: Home, label: 'Logements', description: 'Vos biens immobiliers', to: '/mes-logements', color: 'bg-blue-50 text-blue-600' },
  { icon: FolderOpen, label: 'Dossiers', description: 'Dossiers de renovation', to: '/mes-dossiers', color: 'bg-orange-50 text-orange-600' },
  { icon: Calendar, label: 'Rendez-vous', description: 'Vos rendez-vous', to: '/mes-rdv', color: 'bg-purple-50 text-purple-600' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const { data: homes = [] } = useUserHomes(user?.id)
  const [selectedHomeIdx, setSelectedHomeIdx] = useState(0)

  // Diagnostics
  const { data: draftDiag } = useUserDraftDiagnostic(user?.id)
  const { data: completedDiags = [] } = useUserCompletedDiagnostics(user?.id)

  // Store diagnostic (pour vérifier s'il y a un brouillon local aussi)
  const diagnosticStore = useDiagnosticStore()
  const hasLocalDraft = diagnosticStore.step > 1 || diagnosticStore.selectedTypes.length > 0

  // Le brouillon à reprendre : priorité DB, sinon local
  const hasDraft = !!draftDiag || hasLocalDraft

  const handleResumeDiagnostic = () => {
    if (draftDiag) {
      // Restaurer depuis la DB
      diagnosticStore.restoreDraft({
        id: draftDiag.id,
        step: draftDiag.current_step ?? 1,
        selectedTypes: (draftDiag.types ?? []) as DiagnosticType[],
        property: {
          type: draftDiag.property_type || undefined,
          address: draftDiag.property_address || undefined,
          surface: draftDiag.property_surface || undefined,
          year: draftDiag.property_year || undefined,
          floors: draftDiag.property_floors || undefined,
        },
        equipment: (draftDiag.equipment as Record<string, string>) ?? {},
        symptoms: (draftDiag.symptoms as Record<DiagnosticType, string[]>) ?? {},
      })
    }
    navigate('/diagnostic')
  }

  const selectedHome: BrhHomeRow | null = homes[selectedHomeIdx] ?? null

  // Health data pour le logement selectionne
  const { data: healthRecords = [] } = useHomeHealthRecords(selectedHome?.id)
  const { data: workHistory = [] } = useHomeWorkHistory(selectedHome?.id)
  const { data: documents = [] } = useHomeDocuments(selectedHome?.id)

  // Score global
  const globalScore = useMemo(() => {
    const evaluated = healthRecords.filter((r) => r.score != null)
    if (evaluated.length === 0) return null
    return Math.round(evaluated.reduce((s, r) => s + (r.score ?? 0), 0) / evaluated.length)
  }, [healthRecords])

  // Scores par domaine
  const scoreByDomain = useMemo(() => {
    const map: Partial<Record<HealthDomain, number | null>> = {}
    for (const d of HEALTH_DOMAINS) {
      const rec = healthRecords.find((r) => r.domain === d)
      map[d] = rec?.score ?? null
    }
    return map
  }, [healthRecords])

  // Travaux planifies
  const plannedWorks = useMemo(() =>
    workHistory.filter((w) => w.status !== 'termine').slice(0, 3),
    [workHistory]
  )

  // Documents expires
  const expiredDocs = useMemo(() =>
    documents.filter((d) => {
      if (!d.expires_at) return false
      return new Date(d.expires_at) < new Date()
    }),
    [documents]
  )

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-text-primary">Tableau de bord</h1>
        {user && (
          <p className="font-body text-text-secondary mt-1">
            Bienvenue, <span className="font-semibold text-primary">{user.full_name}</span>
          </p>
        )}
      </div>

      {/* === BANDEAU : Reprendre le diagnostic === */}
      {hasDraft && (
        <button
          onClick={handleResumeDiagnostic}
          className="w-full mb-6 bg-gradient-to-r from-primary/10 to-green-50 border border-primary/30 rounded-2xl p-5 flex items-center gap-4 hover:border-primary hover:shadow-md transition-all group text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
            <PlayCircle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base text-text-primary">
              Reprendre votre diagnostic
            </p>
            <p className="font-body text-sm text-text-secondary mt-0.5">
              {draftDiag
                ? `Etape ${draftDiag.current_step}/5 — ${draftDiag.types.length} domaine${draftDiag.types.length > 1 ? 's' : ''} selectionne${draftDiag.types.length > 1 ? 's' : ''}`
                : `Etape ${diagnosticStore.step}/5 — ${diagnosticStore.selectedTypes.length} domaine${diagnosticStore.selectedTypes.length > 1 ? 's' : ''}`
              }
              {draftDiag?.property_address ? ` — ${draftDiag.property_address}` : ''}
            </p>
          </div>
          <ArrowRight size={20} className="text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* === SECTION : Logement principal + Score === */}
      {selectedHome ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Carte logement + selecteur */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            {homes.length > 1 ? (
              <div className="relative mb-4">
                <select
                  value={selectedHomeIdx}
                  onChange={(e) => setSelectedHomeIdx(Number(e.target.value))}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-gray-light rounded-xl font-display text-sm bg-background outline-none focus:border-primary transition-colors"
                >
                  {homes.map((h, i) => (
                    <option key={h.id} value={i}>{h.address} — {h.city}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
              </div>
            ) : (
              <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Mon logement</p>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Home size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-base text-text-primary leading-tight">{selectedHome.address}</p>
                <p className="font-body text-xs text-text-light flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {selectedHome.postal_code} {selectedHome.city}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs font-body bg-background px-2 py-0.5 rounded-full text-text-secondary">{selectedHome.surface} m²</span>
                  <span className="text-xs font-body bg-background px-2 py-0.5 rounded-full text-text-secondary">{selectedHome.year_built}</span>
                  {selectedHome.dpe_rating && (
                    <span className="text-xs font-display bg-primary/10 text-primary px-2 py-0.5 rounded-full">DPE {selectedHome.dpe_rating}</span>
                  )}
                </div>
              </div>
            </div>

            <Link
              to={`/mes-logements/${selectedHome.id}`}
              className="inline-flex items-center gap-1 mt-4 text-sm text-primary font-body hover:underline"
            >
              Voir le detail <ArrowRight size={12} />
            </Link>
          </div>

          {/* Score global */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6 flex flex-col items-center justify-center">
            <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HeartPulse size={14} /> Score sante
            </p>
            {globalScore !== null ? (
              <>
                <HealthScoreGauge score={globalScore} />
                <p className="font-body text-xs text-text-light mt-2">
                  {healthRecords.filter((r) => r.score != null).length} / {HEALTH_DOMAINS.length} domaines
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="font-body text-sm text-text-light mb-3">Aucune evaluation</p>
                <Link
                  to={`/mes-logements/${selectedHome.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary font-display text-sm rounded-xl hover:bg-primary/20 transition-colors"
                >
                  Evaluer mon logement
                </Link>
              </div>
            )}
          </div>

          {/* Scores par domaine */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <p className="font-display text-xs text-text-light uppercase tracking-wider mb-4">Par domaine</p>
            <div className="space-y-2.5">
              {HEALTH_DOMAINS.map((d) => (
                <DomainBar key={d} domain={d} score={scoreByDomain[d] ?? null} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Pas de logement */
        <div className="bg-surface rounded-2xl border border-gray-light p-8 mb-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto mb-4">
            <Home size={24} />
          </div>
          <h2 className="font-display text-xl text-text-primary mb-2">Ajoutez votre premier logement</h2>
          <p className="font-body text-sm text-text-secondary mb-4 max-w-md mx-auto">
            Pour profiter du carnet de sante et des statistiques, commencez par enregistrer votre logement.
          </p>
          <Link
            to="/mes-logements"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            Ajouter un logement <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* === SECTION : Alertes + Travaux === */}
      {selectedHome && (healthRecords.length > 0 || plannedWorks.length > 0 || expiredDocs.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Alertes Bretagne */}
          <div>
            <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Alertes</p>
            <BretagneAlerts home={selectedHome} records={healthRecords} maxAlerts={3} />
            {healthRecords.length === 0 && expiredDocs.length === 0 && (
              <div className="bg-surface rounded-2xl border border-gray-light p-4 text-center">
                <p className="font-body text-xs text-text-light">Aucune alerte</p>
              </div>
            )}
            {expiredDocs.length > 0 && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="font-display text-sm text-red-700 mb-1">{expiredDocs.length} document{expiredDocs.length > 1 ? 's' : ''} expire{expiredDocs.length > 1 ? 's' : ''}</p>
                <p className="font-body text-xs text-red-600">
                  {expiredDocs.map((d) => d.title).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Travaux a venir */}
          <div>
            <p className="font-display text-xs text-text-light uppercase tracking-wider mb-3">Travaux a venir</p>
            {plannedWorks.length > 0 ? (
              <div className="space-y-2">
                {plannedWorks.map((w) => (
                  <div key={w.id} className="bg-surface rounded-xl border border-gray-light p-4 flex items-center gap-3">
                    <Wrench size={16} className="text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm text-text-primary truncate">{w.title}</p>
                      <p className="font-body text-xs text-text-light">
                        {w.domain !== 'autre' ? HEALTH_DOMAIN_LABELS[w.domain] : 'Autre'}
                        {w.cost != null && ` — ${w.cost.toLocaleString('fr-FR')} EUR`}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-display ${WORK_STATUS_COLORS[w.status]}`}>
                      {WORK_STATUS_LABELS[w.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface rounded-2xl border border-gray-light p-4 text-center">
                <p className="font-body text-xs text-text-light">Aucun travail planifie</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SECTION : Historique diagnostics === */}
      {completedDiags.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display text-xs text-text-light uppercase tracking-wider">
              Mes diagnostics ({completedDiags.length})
            </p>
            <Link
              to="/diagnostic"
              className="text-xs font-body text-primary hover:underline flex items-center gap-1"
            >
              Nouveau diagnostic <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {completedDiags.slice(0, 6).map((diag) => (
              <DiagnosticCard key={diag.id} diag={diag} />
            ))}
          </div>
          {completedDiags.length > 6 && (
            <p className="text-center mt-3">
              <Link to="/mes-dossiers" className="text-sm font-body text-primary hover:underline">
                Voir tous les diagnostics
              </Link>
            </p>
          )}
        </div>
      )}

      {/* === SECTION : Navigation rapide === */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {NAV_CARDS.map(({ icon: Icon, label, description, to, color }) => (
          <Link
            key={to}
            to={to}
            className="group bg-surface rounded-2xl border border-gray-light p-5 hover:border-primary hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon size={20} />
            </div>
            <h2 className="font-display text-sm text-text-primary mb-0.5">{label}</h2>
            <p className="font-body text-xs text-text-secondary leading-relaxed hidden sm:block">{description}</p>
            <div className="flex items-center gap-1 mt-2 text-primary text-xs font-body opacity-0 group-hover:opacity-100 transition-opacity">
              Acceder <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
