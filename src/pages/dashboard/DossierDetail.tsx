import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FolderOpen,
  Loader2,
  AlertCircle,
  Home,
  Euro,
  CalendarDays,
  Wrench,
  User,
  FileText,
  ClipboardList,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BrhCaseRow, BrhHomeRow, CaseStatus } from '@/types/database'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: CaseStatus[] = ['nouveau', 'en_cours', 'devis', 'travaux', 'termine']

const STATUS_LABELS: Record<CaseStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  devis: 'Devis',
  travaux: 'Travaux',
  termine: 'Terminé',
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-orange-100 text-orange-800',
  devis: 'bg-purple-100 text-purple-800',
  travaux: 'bg-yellow-100 text-yellow-800',
  termine: 'bg-green-100 text-green-800',
}

const STATUS_DESCRIPTIONS: Record<CaseStatus, string> = {
  nouveau: 'Votre dossier a été créé et est en attente de traitement.',
  en_cours: 'Votre dossier est en cours d\'analyse par notre équipe.',
  devis: 'Un devis est en cours de préparation pour vos travaux.',
  travaux: 'Les travaux sont en cours de réalisation.',
  termine: 'Vos travaux sont terminés. Dossier clôturé.',
}

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-display ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function StatusTimeline({ currentStatus }: { currentStatus: CaseStatus }) {
  const currentIndex = STATUS_STEPS.indexOf(currentStatus)

  return (
    <div className="relative">
      {/* Line */}
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-light" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${(currentIndex / (STATUS_STEPS.length - 1)) * (100 - 8)}%` }}
      />

      <div className="relative flex items-start justify-between">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                isCompleted
                  ? 'border-primary bg-primary text-white'
                  : isCurrent
                  ? 'border-primary bg-surface text-primary'
                  : 'border-gray-light bg-surface text-text-light'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 size={14} />
                ) : isCurrent ? (
                  <Circle size={10} className="fill-primary" />
                ) : (
                  <Circle size={10} />
                )}
              </div>
              <div className="text-center">
                <p className={`text-[11px] font-display leading-tight ${
                  isPending ? 'text-text-light' : 'text-text-primary'
                }`}>
                  {STATUS_LABELS[step]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

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

  const [caseRow, setCaseRow] = useState<BrhCaseRow | null>(null)
  const [linkedHome, setLinkedHome] = useState<BrhHomeRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    async function fetchData() {
      setLoading(true)
      setError(null)

      const { data: caseData, error: caseErr } = await supabase
        .from('brh_cases')
        .select('*')
        .eq('id', id!)
        .single()

      if (caseErr || !caseData) {
        setError('Dossier introuvable.')
        setLoading(false)
        return
      }

      setCaseRow(caseData)

      // Fetch linked home if any
      if (caseData.home_id) {
        const { data: homeData } = await supabase
          .from('brh_homes')
          .select('*')
          .eq('id', caseData.home_id)
          .single()
        setLinkedHome(homeData ?? null)
      }

      setLoading(false)
    }

    void fetchData()
  }, [id])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
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
          {error ?? 'Dossier introuvable.'}
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
            <InfoRow
              label="Date de début"
              value={formatDate(caseRow.start_date)}
            />
            <InfoRow
              label="Date de fin prévue"
              value={formatDate(caseRow.end_date)}
            />
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
        <div className="space-y-6">
          {/* Budget card */}
          {caseRow.estimated_budget !== null && (
            <div className="bg-surface rounded-2xl border border-gray-light p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-primary">
                  <Euro size={18} />
                </div>
                <div>
                  <p className="text-xs font-body text-text-light">Budget estimé</p>
                  <p className="font-display text-2xl text-text-primary">
                    {caseRow.estimated_budget.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </div>
              <p className="font-body text-xs text-text-light mt-2">
                Ce montant est une estimation et peut être révisé.
              </p>
            </div>
          )}

          {/* Dates */}
          <div className="bg-surface rounded-2xl border border-gray-light p-6">
            <h2 className="font-display text-base text-text-primary mb-4 flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" />
              Calendrier
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-body text-text-light">Début prévu</p>
                <p className="text-sm font-body text-text-primary mt-0.5">
                  {formatDate(caseRow.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-body text-text-light">Fin prévue</p>
                <p className="text-sm font-body text-text-primary mt-0.5">
                  {formatDate(caseRow.end_date)}
                </p>
              </div>
              {caseRow.start_date && caseRow.end_date && (
                <div>
                  <p className="text-xs font-body text-text-light">Durée estimée</p>
                  <p className="text-sm font-body text-text-primary mt-0.5">
                    {Math.ceil(
                      (new Date(caseRow.end_date).getTime() - new Date(caseRow.start_date).getTime()) /
                      (1000 * 60 * 60 * 24 * 7)
                    )}{' '}
                    semaines
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Linked home */}
          {linkedHome && (
            <Link
              to={`/mes-logements/${linkedHome.id}`}
              className="block bg-surface rounded-2xl border border-gray-light p-6 hover:border-primary hover:shadow-sm transition-all"
            >
              <h2 className="font-display text-base text-text-primary mb-3 flex items-center gap-2">
                <Home size={15} className="text-primary" />
                Logement associé
              </h2>
              <p className="font-body text-sm text-text-primary">{linkedHome.address}</p>
              <p className="font-body text-xs text-text-light mt-0.5">
                {linkedHome.postal_code} {linkedHome.city}
              </p>
              <p className="font-body text-xs text-primary mt-2 flex items-center gap-1">
                Voir le logement <ArrowLeft size={11} className="rotate-180" />
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
