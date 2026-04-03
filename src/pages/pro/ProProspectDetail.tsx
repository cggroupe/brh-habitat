import { ArrowLeft, Phone, Mail, MapPin, Wrench, Clock, Star, FileText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useProspectDetail } from '@/hooks/queries'
import type { ProspectStatus } from '@/types/partner'

const STATUS_BADGE: Record<ProspectStatus, string> = {
  nouveau: 'bg-blue-50 text-blue-700 border border-blue-200',
  etude: 'bg-orange-50 text-orange-700 border border-orange-200',
  devis_envoye: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  signe: 'bg-green-50 text-green-700 border border-green-200',
  termine: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  perdu: 'bg-red-50 text-red-700 border border-red-200',
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

const BUDGET_LABELS: Record<string, string> = {
  '<5000': 'Moins de 5 000 EUR',
  '5000-15000': '5 000 – 15 000 EUR',
  '15000-30000': '15 000 – 30 000 EUR',
  '30000-50000': '30 000 – 50 000 EUR',
  '>50000': 'Plus de 50 000 EUR',
}

export default function ProProspectDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: prospect, isLoading, error } = useProspectDetail(id)

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[300px]">
        <p className="font-body text-slate-400">Chargement...</p>
      </div>
    )
  }

  if (error || !prospect) {
    return (
      <div className="p-6 lg:p-10">
        <Link
          to="/pro/prospects"
          className="inline-flex items-center gap-2 text-sm font-body text-slate-500 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux prospects
        </Link>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="font-body text-slate-500">Prospect introuvable.</p>
        </div>
      </div>
    )
  }

  const statusClass = STATUS_BADGE[prospect.status]

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/pro/prospects"
        className="inline-flex items-center gap-2 text-sm font-body text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux prospects
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            {prospect.client_first_name} {prospect.client_last_name}
          </h1>
          <p className="font-body text-sm text-slate-400 mt-1">
            Prospect cree le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-display uppercase tracking-wide ${statusClass}`}>
          {STATUS_LABELS[prospect.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xs uppercase tracking-wide text-slate-500 mb-4">
              Informations de contact
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-primary shrink-0" />
                <span className="font-body text-sm text-slate-800">{prospect.client_phone}</span>
              </div>
              {prospect.client_email && (
                <div className="flex items-center gap-3">
                  <Mail size={15} className="text-primary shrink-0" />
                  <span className="font-body text-sm text-slate-800">{prospect.client_email}</span>
                </div>
              )}
              {(prospect.client_address || prospect.client_city) && (
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    {prospect.client_address && (
                      <p className="font-body text-sm text-slate-800">{prospect.client_address}</p>
                    )}
                    {prospect.client_city && (
                      <p className="font-body text-sm text-slate-600">
                        {prospect.client_postal_code ? `${prospect.client_postal_code} ` : ''}{prospect.client_city}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Travaux */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xs uppercase tracking-wide text-slate-500 mb-4">
              Travaux et details
            </h2>
            <div className="space-y-3">
              {prospect.work_type && prospect.work_type.length > 0 && (
                <div className="flex items-start gap-3">
                  <Wrench size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-body text-xs text-slate-400 mb-1">Type de travaux</p>
                    <div className="flex flex-wrap gap-1">
                      {prospect.work_type.map((t) => (
                        <span key={t} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-body capitalize">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {prospect.estimated_budget && (
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 shrink-0" />
                  <div>
                    <p className="font-body text-xs text-slate-400">Budget estime</p>
                    <p className="font-body text-sm text-slate-800">
                      {BUDGET_LABELS[prospect.estimated_budget] ?? prospect.estimated_budget}
                    </p>
                  </div>
                </div>
              )}
              {prospect.urgency && (
                <div className="flex items-center gap-3">
                  <Clock size={15} className="text-primary shrink-0" />
                  <div>
                    <p className="font-body text-xs text-slate-400">Urgence</p>
                    <p className="font-body text-sm text-slate-800">
                      {URGENCY_LABELS[prospect.urgency] ?? prospect.urgency}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {prospect.notes && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-primary" />
                <h2 className="font-display text-xs uppercase tracking-wide text-slate-500">Notes</h2>
              </div>
              <p className="font-body text-sm text-slate-700 whitespace-pre-wrap">{prospect.notes}</p>
            </div>
          )}

          {/* Admin notes (read-only) */}
          {prospect.admin_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-amber-600" />
                <h2 className="font-display text-xs uppercase tracking-wide text-amber-700">Notes BRH</h2>
              </div>
              <p className="font-body text-sm text-amber-800 whitespace-pre-wrap">{prospect.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Lead score */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Star size={15} className="text-primary" />
              <h2 className="font-display text-xs uppercase tracking-wide text-slate-500">Score du lead</h2>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="font-display text-3xl text-slate-900">{prospect.lead_score}</span>
              <span className="font-body text-sm text-slate-400 mb-1">/ 100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(prospect.lead_score, 100)}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xs uppercase tracking-wide text-slate-500 mb-4">
              Dates
            </h2>
            <div className="space-y-2">
              <div>
                <p className="font-body text-xs text-slate-400">Cree le</p>
                <p className="font-body text-sm text-slate-700">
                  {new Date(prospect.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-slate-400">Statut mis a jour le</p>
                <p className="font-body text-sm text-slate-700">
                  {new Date(prospect.status_updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
