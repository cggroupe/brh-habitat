import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FolderOpen,
  Loader2,
  AlertCircle,
  Euro,
  Wrench,
  User,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { useCaseDetail } from '@/hooks/queries'
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '@/data/constants'
import { StatusTimeline } from './dossier-detail/StatusTimeline'
import { CaseSidebar } from './dossier-detail/CaseSidebar'
import type { CaseStatus } from '@/types/database'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_DESCRIPTIONS: Record<CaseStatus, string> = {
  nouveau: 'Votre dossier a été créé et est en attente de traitement.',
  en_cours: "Votre dossier est en cours d'analyse par notre équipe.",
  devis: 'Un devis est en cours de préparation pour vos travaux.',
  travaux: 'Les travaux sont en cours de réalisation.',
  termine: 'Vos travaux sont terminés. Dossier clôturé.',
}

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-display ${CASE_STATUS_COLORS[status]}`}>
      {CASE_STATUS_LABELS[status]}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-light last:border-0">
      <span className="font-body text-sm text-text-light shrink-0 w-44">{label}</span>
      <span className="font-body text-sm text-text-primary text-right">{value ?? '—'}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: caseRow, isLoading, error } = useCaseDetail(id)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  if (error || !caseRow) {
    return (
      <div className="p-6 lg:p-8">
        <Link
          to="/mes-dossiers"
          className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Retour aux dossiers
        </Link>
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          Dossier introuvable.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Back */}
      <Link
        to="/mes-dossiers"
        className="inline-flex items-center gap-1.5 text-sm font-body text-text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={15} /> Retour aux dossiers
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
          <FolderOpen size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="font-display text-3xl text-text-primary leading-tight">
              {caseRow.title}
            </h1>
            <StatusBadge status={caseRow.status} />
          </div>
          {caseRow.description && (
            <p className="font-body text-text-secondary mt-2 leading-relaxed">
              {caseRow.description}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-surface rounded-2xl border border-gray-light p-6 mb-6">
        <h2 className="font-display text-base text-text-primary mb-6">Avancement du dossier</h2>
        <StatusTimeline currentStatus={caseRow.status} />
        <p className="font-body text-sm text-text-secondary mt-6 text-center">
          {STATUS_DESCRIPTIONS[caseRow.status]}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations du dossier */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
              <ClipboardList size={16} className="text-primary" />
              Informations du dossier
            </h2>
            <InfoRow label="Statut" value={<StatusBadge status={caseRow.status} />} />
            <InfoRow label="Date de début" value={formatDate(caseRow.start_date)} />
            <InfoRow label="Date de fin prévue" value={formatDate(caseRow.end_date)} />
            <InfoRow
              label="Budget estimé"
              value={
                caseRow.estimated_budget !== null ? (
                  <span className="flex items-center gap-1">
                    <Euro size={13} />
                    {caseRow.estimated_budget.toLocaleString('fr-FR')} €
                  </span>
                ) : '—'
              }
            />
            {caseRow.assigned_to && (
              <InfoRow
                label="Conseiller assigné"
                value={
                  <span className="flex items-center gap-1.5">
                    <User size={13} />
                    {caseRow.assigned_to}
                  </span>
                }
              />
            )}
            <InfoRow label="Créé le" value={formatDate(caseRow.created_at)} />
          </div>

          {/* Types de travaux */}
          {caseRow.work_types.length > 0 && (
            <div className="bg-surface rounded-2xl border border-gray-light p-6">
              <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
                <Wrench size={16} className="text-primary" />
                Types de travaux
              </h2>
              <div className="flex flex-wrap gap-2">
                {caseRow.work_types.map(wt => (
                  <span
                    key={wt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-gray-light rounded-xl text-sm font-body text-text-primary"
                  >
                    <Wrench size={12} className="text-primary" />
                    {wt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Documents
            </h2>
            {caseRow.documents.length === 0 ? (
              <p className="font-body text-sm text-text-light">Aucun document disponible pour ce dossier.</p>
            ) : (
              <div className="space-y-2">
                {caseRow.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-background rounded-xl text-sm font-body text-primary hover:underline"
                  >
                    <FileText size={14} />
                    Document {idx + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Notes admin */}
          {caseRow.admin_notes && (
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
              <h2 className="font-display text-base text-blue-900 mb-3 flex items-center gap-2">
                <FileText size={15} />
                Message de votre conseiller
              </h2>
              <p className="font-body text-sm text-blue-800 leading-relaxed">
                {caseRow.admin_notes}
              </p>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <CaseSidebar caseRow={caseRow} />
      </div>
    </div>
  )
}
