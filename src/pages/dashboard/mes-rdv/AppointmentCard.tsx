import { Calendar, Clock, MessageSquare } from 'lucide-react'
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '@/data/constants'
import type { BrhAppointmentRow, AppointmentType } from '@/types/database'

const TYPE_COLORS: Record<AppointmentType, string> = {
  diagnostic: 'bg-green-100 text-green-800',
  devis: 'bg-blue-100 text-blue-800',
  visite: 'bg-orange-100 text-orange-800',
  suivi: 'bg-purple-100 text-purple-800',
}

const TYPE_BG: Record<AppointmentType, string> = {
  diagnostic: 'bg-green-50 text-green-600',
  devis: 'bg-blue-50 text-blue-600',
  visite: 'bg-orange-50 text-orange-600',
  suivi: 'bg-purple-50 text-purple-600',
}

interface AppointmentCardProps {
  appt: BrhAppointmentRow
}

export function AppointmentCard({ appt }: AppointmentCardProps) {
  const requestedDate = new Date(appt.requested_date)
  const confirmedDate = appt.confirmed_date ? new Date(appt.confirmed_date) : null

  const displayDate = confirmedDate ?? requestedDate
  const isConfirmed = appt.status === 'confirme'

  return (
    <div className="bg-surface rounded-2xl border border-gray-light p-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TYPE_BG[appt.type]}`}>
          <Calendar size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${TYPE_COLORS[appt.type]}`}>
                {APPOINTMENT_TYPE_LABELS[appt.type]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${APPOINTMENT_STATUS_COLORS[appt.status]}`}>
                {APPOINTMENT_STATUS_LABELS[appt.status]}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="mb-3">
            {isConfirmed && confirmedDate ? (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-display text-text-primary">
                  <Clock size={13} className="text-primary" />
                  {confirmedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
                <p className="text-xs font-body text-green-700 mt-0.5 ml-5">Date confirmée</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5 text-sm font-body text-text-secondary">
                  <Clock size={13} />
                  Souhait : {requestedDate.toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
                {appt.status === 'demande' && (
                  <p className="text-xs font-body text-yellow-700 mt-0.5 ml-5">En attente de confirmation</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {appt.notes && (
            <div className="flex items-start gap-1.5 text-sm font-body text-text-secondary">
              <MessageSquare size={13} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{appt.notes}</span>
            </div>
          )}

          {/* Admin notes */}
          {appt.admin_notes && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs font-display text-blue-800 mb-0.5">Message de votre conseiller</p>
              <p className="text-sm font-body text-blue-700 leading-relaxed">{appt.admin_notes}</p>
            </div>
          )}
        </div>

        {/* Date column */}
        <div className="hidden sm:flex flex-col items-center justify-center text-center shrink-0 w-16">
          <span className="font-display text-2xl text-text-primary leading-none">
            {displayDate.getDate()}
          </span>
          <span className="font-body text-xs text-text-light capitalize">
            {displayDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
          <span className="font-body text-xs text-text-light">
            {displayDate.getFullYear()}
          </span>
        </div>
      </div>
    </div>
  )
}
