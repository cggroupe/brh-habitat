import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Home,
  BarChart3,
  User,
  Calendar,
  Euro,
  Wrench,
  FileText,
  Clock,
} from 'lucide-react'
import { useCaseDetail, useUpdateCase, useProfileDetail, useHomeDetail, useDiagnosticDetail } from '@/hooks/queries'
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
} from '@/data/constants'
import type { CaseStatus } from '@/types/database'

const STATUS_STEPS: CaseStatus[] = ['nouveau', 'en_cours', 'devis', 'travaux', 'termine']

export default function AdminDossierDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: caseData, isLoading, isError } = useCaseDetail(id)
  const updateCase = useUpdateCase()

  // Fetch linked records via hooks
  const { data: profileData } = useProfileDetail(caseData?.user_id)
  const { data: homeData } = useHomeDetail(caseData?.home_id ?? undefined)
  const { data: diagnosticData } = useDiagnosticDetail(caseData?.diagnostic_id ?? undefined)

  const userFullName = profileData?.full_name ?? null

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Editable fields
  const [status, setStatus] = useState<CaseStatus>('nouveau')
  const [assignedTo, setAssignedTo] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [estimatedBudget, setEstimatedBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Populate form when case data loads
  useEffect(() => {
    if (!caseData) return
    setStatus(caseData.status)
    setAssignedTo(caseData.assigned_to ?? '')
    setAdminNotes(caseData.admin_notes ?? '')
    setEstimatedBudget(caseData.estimated_budget != null ? String(caseData.estimated_budget) : '')
    setStartDate(caseData.start_date ? caseData.start_date.slice(0, 10) : '')
    setEndDate(caseData.end_date ? caseData.end_date.slice(0, 10) : '')
  }, [caseData])

  function handleSave() {
    if (!id) return
    setSaveError(null)
    setSaveSuccess(false)

    updateCase.mutate(
      {
        id,
        payload: {
          status,
          assigned_to: assignedTo.trim() || null,
          admin_notes: adminNotes.trim() || null,
          estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
        },
        onError: () => {
          setSaveError('Erreur lors de la sauvegarde.')
        },
      },
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(status)

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !caseData) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-2 text-danger font-body text-sm mb-4">
          <AlertCircle size={16} /> Dossier introuvable.
        </div>
        <Link to="/admin/dossiers" className="text-primary font-body text-sm hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Retour aux dossiers
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          to="/admin/dossiers"
          className="inline-flex items-center gap-1.5 text-sm font-body text-text-light hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft size={15} /> Retour aux dossiers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-text-primary">{caseData.title}</h1>
            <p className="font-body text-sm text-text-light mt-1">
              Créé le {new Date(caseData.created_at).toLocaleDateString('fr-FR')} —{' '}
              <span className="text-primary font-medium">{userFullName ?? 'Utilisateur inconnu'}</span>
            </p>
          </div>
          <span className={`shrink-0 inline-block px-3 py-1.5 rounded-full text-sm font-display border ${CASE_STATUS_COLORS[caseData.status]}`}>
            {CASE_STATUS_LABELS[caseData.status]}
          </span>
        </div>
      </div>

      {/* Status timeline */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6 mb-6">
        <h2 className="font-display text-sm text-text-light uppercase tracking-wider mb-4">Progression</h2>
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => {
            const isDone = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            const isLast = i === STATUS_STEPS.length - 1
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display transition-colors ${
                      isDone ? 'bg-primary text-white' :
                      isCurrent ? 'bg-primary-dark text-white ring-2 ring-primary ring-offset-2' :
                      'bg-gray-100 text-text-light'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs font-body mt-1.5 whitespace-nowrap ${isCurrent ? 'text-primary font-semibold' : 'text-text-light'}`}>
                    {CASE_STATUS_LABELS[step]}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < currentStepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: editable admin fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin edition card */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-5 flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Gestion du dossier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStatus)}
                  className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
                >
                  {CASE_STATUSES.map((s) => (
                    <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Assigned to */}
              <div>
                <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                  Assigné à
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Nom du conseiller..."
                  className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-light"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                  Budget estimé (€)
                </label>
                <input
                  type="number"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  placeholder="Ex : 15000"
                  min="0"
                  className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors placeholder:text-text-light"
                />
              </div>

              {/* Dates */}
              <div>
                <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="sm:col-span-2 sm:w-1/2">
                <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Admin notes */}
            <div className="mt-4">
              <label className="font-display text-xs text-text-light uppercase tracking-wider block mb-1.5">
                Notes administrateur
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                placeholder="Notes internes (non visibles par le client)..."
                className="w-full px-3 py-2.5 bg-background border border-gray-light rounded-xl font-body text-sm text-text-primary outline-none focus:border-primary transition-colors resize-none placeholder:text-text-light"
              />
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={updateCase.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={15} />
                {updateCase.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-success font-body text-sm">
                  <CheckCircle2 size={15} /> Modifications enregistrées
                </span>
              )}
              {saveError && (
                <span className="flex items-center gap-1.5 text-danger font-body text-sm">
                  <AlertCircle size={15} /> {saveError}
                </span>
              )}
            </div>
          </div>

          {/* Case details */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-4 flex items-center gap-2">
              <Wrench size={16} className="text-primary" /> Informations du dossier
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {caseData.description && (
                <div className="sm:col-span-2">
                  <p className="font-display text-xs text-text-light uppercase tracking-wider mb-1">Description</p>
                  <p className="font-body text-sm text-text-primary leading-relaxed">{caseData.description}</p>
                </div>
              )}

              <div>
                <p className="font-display text-xs text-text-light uppercase tracking-wider mb-1">Types de travaux</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {caseData.work_types.length > 0 ? caseData.work_types.map((w) => (
                    <span key={w} className="inline-block px-2.5 py-1 bg-green-50 text-primary text-xs rounded-full font-body">
                      {w}
                    </span>
                  )) : <span className="text-text-light font-body text-sm">—</span>}
                </div>
              </div>

              {caseData.documents.length > 0 && (
                <div>
                  <p className="font-display text-xs text-text-light uppercase tracking-wider mb-1">Documents ({caseData.documents.length})</p>
                  <p className="font-body text-sm text-text-secondary">{caseData.documents.length} fichier{caseData.documents.length !== 1 ? 's' : ''} attaché{caseData.documents.length !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: metadata + linked records */}
        <div className="space-y-4">
          {/* Info summary */}
          <div className="bg-surface rounded-2xl border border-gray-light p-5">
            <h3 className="font-display text-sm text-text-primary mb-4 flex items-center gap-2">
              <User size={14} className="text-primary" /> Client
            </h3>
            <p className="font-body text-sm text-text-primary font-medium">{userFullName ?? '—'}</p>
            <p className="font-body text-xs text-text-light mt-1">ID: {caseData.user_id.slice(0, 8)}…</p>
          </div>

          {/* Budget summary */}
          {caseData.estimated_budget != null && (
            <div className="bg-surface rounded-2xl border border-gray-light p-5">
              <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
                <Euro size={14} className="text-primary" /> Budget
              </h3>
              <p className="font-display text-2xl text-primary">
                {caseData.estimated_budget.toLocaleString('fr-FR')} €
              </p>
            </div>
          )}

          {/* Dates */}
          {(caseData.start_date || caseData.end_date) && (
            <div className="bg-surface rounded-2xl border border-gray-light p-5">
              <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
                <Calendar size={14} className="text-primary" /> Planning
              </h3>
              {caseData.start_date && (
                <div className="mb-2">
                  <p className="font-display text-xs text-text-light uppercase tracking-wider">Début</p>
                  <p className="font-body text-sm text-text-primary">{new Date(caseData.start_date).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {caseData.end_date && (
                <div>
                  <p className="font-display text-xs text-text-light uppercase tracking-wider">Fin</p>
                  <p className="font-body text-sm text-text-primary">{new Date(caseData.end_date).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
            </div>
          )}

          {/* Linked home */}
          {homeData && (
            <div className="bg-surface rounded-2xl border border-gray-light p-5">
              <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
                <Home size={14} className="text-primary" /> Logement lié
              </h3>
              <p className="font-body text-sm text-text-primary font-medium">{homeData.address}</p>
              <p className="font-body text-xs text-text-secondary mt-0.5">{homeData.city} {homeData.postal_code}</p>
              <p className="font-body text-xs text-text-light mt-0.5">{homeData.property_type} — {homeData.surface} m²</p>
            </div>
          )}

          {/* Linked diagnostic */}
          {diagnosticData && (
            <div className="bg-surface rounded-2xl border border-gray-light p-5">
              <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
                <BarChart3 size={14} className="text-primary" /> Diagnostic lié
              </h3>
              <p className="font-body text-sm text-text-primary font-medium">{diagnosticData.contact_name}</p>
              <p className="font-body text-xs text-text-secondary mt-0.5">{diagnosticData.contact_email}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {diagnosticData.types.map((t) => (
                  <span key={t} className="inline-block px-2 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-surface rounded-2xl border border-gray-light p-5">
            <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
              <Clock size={14} className="text-primary" /> Historique
            </h3>
            <div className="space-y-2">
              <div>
                <p className="font-display text-xs text-text-light uppercase tracking-wider">Créé le</p>
                <p className="font-body text-sm text-text-primary">{new Date(caseData.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="font-display text-xs text-text-light uppercase tracking-wider">Mis à jour le</p>
                <p className="font-body text-sm text-text-primary">{new Date(caseData.updated_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
