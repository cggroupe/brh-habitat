import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Home,
  FolderOpen,
  Calendar,
  ArrowRight,
  Search,
  PlayCircle,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { useUserHomes, useHomeHealthRecords, useHomeWorkHistory, useHomeDocuments, useUserDraftDiagnostic, useUserCompletedDiagnostics } from '@/hooks/queries'
import { HEALTH_DOMAINS } from '@/data/constants'
import { HomeHealthPanel } from './dashboard/HomeHealthPanel'
import { AlertsWorkSection } from './dashboard/AlertsWorkSection'
import { DiagnosticsSection } from './dashboard/DiagnosticsSection'
import type { BrhHomeRow, HealthDomain } from '@/types/database'
import type { DiagnosticType } from '@/stores/diagnosticStore'

// ─── Quick nav cards ───────────────────────────────────────────────────────────

const NAV_CARDS = [
  { icon: Search, label: 'Diagnostic', description: 'Lancez un diagnostic gratuit', to: '/diagnostic', color: 'bg-green-50 text-primary' },
  { icon: Home, label: 'Logements', description: 'Vos biens immobiliers', to: '/mes-logements', color: 'bg-blue-50 text-blue-600' },
  { icon: FolderOpen, label: 'Dossiers', description: 'Dossiers de renovation', to: '/mes-dossiers', color: 'bg-orange-50 text-orange-600' },
  { icon: Calendar, label: 'Rendez-vous', description: 'Vos rendez-vous', to: '/mes-rdv', color: 'bg-purple-50 text-purple-600' },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const { data: homes = [] } = useUserHomes(user?.id)
  const [selectedHomeIdx, setSelectedHomeIdx] = useState(0)

  // Diagnostics
  const { data: draftDiag } = useUserDraftDiagnostic(user?.id)
  const { data: completedDiags = [] } = useUserCompletedDiagnostics(user?.id)

  const diagnosticStore = useDiagnosticStore()
  const hasLocalDraft = diagnosticStore.step > 1 || diagnosticStore.selectedTypes.length > 0
  const hasDraft = !!draftDiag || hasLocalDraft

  const handleResumeDiagnostic = () => {
    if (draftDiag) {
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

  const { data: healthRecords = [] } = useHomeHealthRecords(selectedHome?.id)
  const { data: workHistory = [] } = useHomeWorkHistory(selectedHome?.id)
  const { data: documents = [] } = useHomeDocuments(selectedHome?.id)

  const globalScore = useMemo(() => {
    const evaluated = healthRecords.filter((r) => r.score != null)
    if (evaluated.length === 0) return null
    return Math.round(evaluated.reduce((s, r) => s + (r.score ?? 0), 0) / evaluated.length)
  }, [healthRecords])

  const scoreByDomain = useMemo(() => {
    const map: Partial<Record<HealthDomain, number | null>> = {}
    for (const d of HEALTH_DOMAINS) {
      const rec = healthRecords.find((r) => r.domain === d)
      map[d] = rec?.score ?? null
    }
    return map
  }, [healthRecords])

  const plannedWorks = useMemo(() =>
    workHistory.filter((w) => w.status !== 'termine').slice(0, 3),
    [workHistory]
  )

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

      {/* Bandeau : Reprendre le diagnostic */}
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

      {/* Section : Logement principal + Score */}
      {selectedHome ? (
        <HomeHealthPanel
          homes={homes}
          selectedHomeIdx={selectedHomeIdx}
          onSelectHome={setSelectedHomeIdx}
          selectedHome={selectedHome}
          globalScore={globalScore}
          scoreByDomain={scoreByDomain}
          healthRecordsCount={healthRecords.filter((r) => r.score != null).length}
        />
      ) : (
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

      {/* Section : Alertes + Travaux */}
      {selectedHome && (healthRecords.length > 0 || plannedWorks.length > 0 || expiredDocs.length > 0) && (
        <AlertsWorkSection
          home={selectedHome}
          healthRecords={healthRecords}
          plannedWorks={plannedWorks}
          expiredDocs={expiredDocs}
        />
      )}

      {/* Section : Historique diagnostics */}
      <DiagnosticsSection completedDiags={completedDiags} />

      {/* Section : Navigation rapide */}
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
