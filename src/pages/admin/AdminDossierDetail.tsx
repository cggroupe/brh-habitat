import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Wrench,
} from 'lucide-react'
import { useCaseDetail, useUpdateCase, useProfileDetail, useHomeDetail, useDiagnosticDetail } from '@/hooks/queries'
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
} from '@/data/constants'
import { AdminEditForm } from './admin-dossier/AdminEditForm'
import { LinkedRecordsSidebar } from './admin-dossier/LinkedRecordsSidebar'
import type { CaseStatus } from '@/types/database'

const STATUS_STEPS: CaseStatus[] = ['nouveau', 'en_cours', 'devis', 'travaux', 'termine']

export default function AdminDossierDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: caseData, isLoading, isError } = useCaseDetail(id)
  const updateCase = useUpdateCase()

  const { data: profileData } = useProfileDetail(caseData?.user_id)
  const { data: homeData } = useHomeDetail(caseData?.home_id ?? undefined)
  const { data: diagnosticRaw } = useDiagnosticDetail(caseData?.diagnostic_id ?? undefined)
  const diagnosticData = diagnosticRaw
    ? {
        contact_name: diagnosticRaw.contact_name ?? '',
        contact_email: diagnosticRaw.contact_email ?? '',
        types: diagnosticRaw.types,
      }
    : undefined

  const userFullName = profileData?.full_name ?? null

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [status, setStatus] = useState<CaseStatus>('nouveau')
  const [assignedTo, setAssignedTo] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [estimatedBudget, setEstimatedBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  useEffect(() => {
    if (!caseData) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form fields from server data
    setStatus(caseData.status)
    setAssignedTo(caseData.assigned_to ?? '')
    setAdminNotes(caseData.admin_notes ?? '')
    setEstimatedBudget(caseData.estimated_budget != null ? String(caseData.estimated_budget) : '')
    // start_date/end_date sont des colonnes `date` en DB (format YYYY-MM-DD sans heure)
    // slice(0,10) est defensif au cas ou Supabase ajoute un suffixe horaire
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
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <AdminEditForm
            status={status}
            assignedTo={assignedTo}
            adminNotes={adminNotes}
            estimatedBudget={estimatedBudget}
            startDate={startDate}
            endDate={endDate}
            isPending={updateCase.isPending}
            saveSuccess={saveSuccess}
            saveError={saveError}
            onStatusChange={setStatus}
            onAssignedToChange={setAssignedTo}
            onAdminNotesChange={setAdminNotes}
            onEstimatedBudgetChange={setEstimatedBudget}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSave={handleSave}
          />

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

        {/* Right column */}
        <LinkedRecordsSidebar
          caseData={caseData}
          userFullName={userFullName}
          homeData={homeData}
          diagnosticData={diagnosticData}
        />
      </div>
    </div>
  )
}
