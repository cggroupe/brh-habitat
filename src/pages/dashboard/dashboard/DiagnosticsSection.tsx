import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, Clock } from 'lucide-react'
import type { BrhDiagnosticRow } from '@/types/database'

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
        {diag.property_surface && diag.property_surface > 0 && <span>{diag.property_surface} m²</span>}
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

interface DiagnosticsSectionProps {
  completedDiags: BrhDiagnosticRow[]
}

export function DiagnosticsSection({ completedDiags }: DiagnosticsSectionProps) {
  if (completedDiags.length === 0) return null

  return (
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
  )
}
