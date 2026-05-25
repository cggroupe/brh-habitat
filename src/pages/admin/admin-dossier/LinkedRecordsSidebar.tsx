import { User, Euro, Calendar, Home, BarChart3, Clock } from 'lucide-react'
import type { BrhHomeRow } from '@/types/database'

interface DiagnosticData {
  contact_name: string
  contact_email: string
  types: string[]
}

interface CaseData {
  user_id: string | null
  estimated_budget: number | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  updated_at: string | null
}

interface LinkedRecordsSidebarProps {
  caseData: CaseData
  userFullName: string | null
  homeData: BrhHomeRow | null | undefined
  diagnosticData: DiagnosticData | null | undefined
}

export function LinkedRecordsSidebar({ caseData, userFullName, homeData, diagnosticData }: LinkedRecordsSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Client */}
      <div className="bg-surface rounded-2xl border border-gray-light p-5">
        <h3 className="font-display text-sm text-text-primary mb-4 flex items-center gap-2">
          <User size={14} className="text-primary" /> Client
        </h3>
        <p className="font-body text-sm text-text-primary font-medium">{userFullName ?? '—'}</p>
        <p className="font-body text-xs text-text-light mt-1">ID: {caseData.user_id ? `${caseData.user_id.slice(0, 8)}…` : '—'}</p>
      </div>

      {/* Budget */}
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

      {/* Planning */}
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

      {/* Logement lié */}
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

      {/* Diagnostic lié */}
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

      {/* Historique */}
      <div className="bg-surface rounded-2xl border border-gray-light p-5">
        <h3 className="font-display text-sm text-text-primary mb-3 flex items-center gap-2">
          <Clock size={14} className="text-primary" /> Historique
        </h3>
        <div className="space-y-2">
          <div>
            <p className="font-display text-xs text-text-light uppercase tracking-wider">Créé le</p>
            <p className="font-body text-sm text-text-primary">{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString('fr-FR') : '—'}</p>
          </div>
          <div>
            <p className="font-display text-xs text-text-light uppercase tracking-wider">Mis à jour le</p>
            <p className="font-body text-sm text-text-primary">{caseData.updated_at ? new Date(caseData.updated_at).toLocaleDateString('fr-FR') : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
