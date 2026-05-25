import { useState } from 'react'
import {
  Calendar,
  Plus,
  Loader2,
  AlertCircle,
  ClipboardList,
  Clock,
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useUserAppointments } from '@/hooks/queries'
import { AppointmentCard } from './mes-rdv/AppointmentCard'
import { RequestModal } from './mes-rdv/RequestModal'

export default function MesRdv() {
  const { user } = useAppStore()
  const [showModal, setShowModal] = useState(false)

  const { data: appointments = [], isLoading, error } = useUserAppointments(user?.id)

  // Separate upcoming vs past
  const now = new Date()
  const upcoming = appointments.filter(a => {
    const d = a.confirmed_date ? new Date(a.confirmed_date) : (a.requested_date ? new Date(a.requested_date) : new Date())
    return d >= now && a.status !== 'annule' && a.status !== 'termine'
  })
  const past = appointments.filter(a => {
    const d = a.confirmed_date ? new Date(a.confirmed_date) : (a.requested_date ? new Date(a.requested_date) : new Date())
    return d < now || a.status === 'annule' || a.status === 'termine'
  })

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Mes rendez-vous</h1>
          <p className="font-body text-text-secondary mt-1">
            Consultez et gérez vos rendez-vous avec BRH Habitat
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Demander un RDV
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          Impossible de charger vos rendez-vous. Veuillez réessayer.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-400 mb-4">
            <Calendar size={28} />
          </div>
          <h2 className="font-display text-xl text-text-primary mb-2">Aucun rendez-vous</h2>
          <p className="font-body text-text-secondary text-sm max-w-xs leading-relaxed mb-6">
            Vous n'avez aucun rendez-vous planifié. Demandez un rendez-vous avec un conseiller BRH Habitat.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            Demander un rendez-vous
          </button>
        </div>
      )}

      {/* Upcoming appointments */}
      {!isLoading && !error && upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg text-text-primary mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            À venir
          </h2>
          <div className="space-y-4">
            {upcoming.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}

      {/* Past appointments */}
      {!isLoading && !error && past.length > 0 && (
        <div>
          <h2 className="font-display text-base text-text-secondary mb-4 flex items-center gap-2">
            <Clock size={15} />
            Historique
          </h2>
          <div className="space-y-3">
            {past.map(appt => (
              <div key={appt.id} className="opacity-70">
                <AppointmentCard appt={appt} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && user && (
        <RequestModal
          userId={user.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
