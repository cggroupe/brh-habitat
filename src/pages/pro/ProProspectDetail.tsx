import { ArrowLeft, Phone, Mail, MapPin, Wrench, Clock, Star, FileText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useProspectDetail } from '@/hooks/queries'
import { TrackingPanel } from '@/components/terrain/TrackingPanel'
import type { ProspectStatus } from '@/types/partner'

const STATUS_BADGE: Record<ProspectStatus, string> = {
  nouveau: 'bg-blue-50 text-blue-700',
  etude: 'bg-amber-50 text-amber-700',
  devis_envoye: 'bg-yellow-50 text-yellow-700',
  signe: 'bg-primary/10 text-primary',
  termine: 'bg-emerald-50 text-emerald-700',
  perdu: 'bg-red-50 text-red-600',
}

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: 'Nouveau',
  etude: 'En etude',
  devis_envoye: 'Devis envoye',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const URGENCY_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  '3mois': 'Dans 3 mois',
  '6mois': 'Dans 6 mois',
  plus: 'Plus de 6 mois',
}

function formatBudget(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default function ProProspectDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: prospect, isLoading, error } = useProspectDetail(id)

  if (isLoading) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !prospect) {
    return (
      <div className="p-8 lg:p-10">
        <Link
          to="/pro/prospects"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-light hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft size={14} />
          Retour aux prospects
        </Link>
        <div className="bg-white rounded-2xl p-12 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <p className="text-text-light">Prospect introuvable.</p>
        </div>
      </div>
    )
  }

  const statusClass = STATUS_BADGE[prospect.status]

  return (
    <div className="p-8 lg:p-10">
      <Link
        to="/pro/prospects"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-light hover:text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        Retour aux prospects
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Detail du dossier</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
            {prospect.client_first_name} {prospect.client_last_name}
          </h1>
          <p className="text-sm text-text-light mt-1">
            Cree le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
          {STATUS_LABELS[prospect.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-5">
              Informations de contact
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-text-primary">{prospect.client_phone}</span>
              </div>
              {prospect.client_email && (
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{prospect.client_email}</span>
                </div>
              )}
              {(prospect.client_address || prospect.client_city) && (
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={14} className="text-primary" />
                  </div>
                  <div>
                    {prospect.client_address && (
                      <p className="text-sm font-medium text-text-primary">{prospect.client_address}</p>
                    )}
                    {prospect.client_city && (
                      <p className="text-sm text-text-light">
                        {prospect.client_postal_code ? `${prospect.client_postal_code} ` : ''}{prospect.client_city}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Travaux */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-5">
              Travaux et details
            </p>
            <div className="space-y-4">
              {prospect.work_type && prospect.work_type.length > 0 && (
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-2">Type de travaux</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prospect.work_type.map((t) => (
                        <span key={t} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide capitalize">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {prospect.estimated_budget != null && prospect.estimated_budget > 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-0.5">Budget estime</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatBudget(prospect.estimated_budget)}
                    </p>
                  </div>
                </div>
              )}
              {prospect.urgency && (
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-0.5">Urgence</p>
                    <p className="text-sm font-medium text-text-primary">
                      {URGENCY_LABELS[prospect.urgency] ?? prospect.urgency}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {prospect.notes && (
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center">
                  <FileText size={14} className="text-text-light" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">Notes</p>
              </div>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{prospect.notes}</p>
            </div>
          )}

          {/* Admin notes (read-only) */}
          {prospect.admin_notes && (
            <div className="bg-amber-50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FileText size={14} className="text-amber-600" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700">Notes BRH</p>
              </div>
              <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{prospect.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Lead score */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Star size={14} className="text-amber-500" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">Score du lead</p>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-display text-2xl text-text-primary font-bold">{prospect.lead_score}</span>
              <span className="text-sm text-text-light mb-0.5">/ 100</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all"
                style={{ width: `${Math.min(prospect.lead_score, 100)}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-5">
              Chronologie
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-0.5">Cree le</p>
                  <p className="text-sm font-medium text-text-primary">
                    {new Date(prospect.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-text-light/30 mt-1.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-0.5">Statut mis a jour le</p>
                  <p className="text-sm font-medium text-text-primary">
                    {new Date(prospect.status_updated_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Phase R10 — Suivi commercial terrain */}
          <div className="mt-6">
            <TrackingPanel
              targetType="prospect_dpe"
              targetId={String(prospect.id)}
              targetLabel={`${prospect.client_first_name ?? ''} ${prospect.client_last_name ?? ''}`.trim() || `Prospect #${prospect.id}`}
              email={prospect.client_email ?? null}
              phone={prospect.client_phone ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
