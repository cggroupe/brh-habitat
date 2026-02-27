import { useState, useEffect } from 'react'
import {
  Calendar,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Clock,
  ClipboardList,
  MessageSquare,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'
import type { BrhAppointmentRow, AppointmentType, AppointmentStatus } from '@/types/database'

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AppointmentType, string> = {
  diagnostic: 'Diagnostic',
  devis: 'Devis',
  visite: 'Visite',
  suivi: 'Suivi',
}

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

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  demande: 'Demandé',
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé',
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  demande: 'bg-yellow-100 text-yellow-800',
  confirme: 'bg-green-100 text-green-800',
  annule: 'bg-red-100 text-red-700',
  termine: 'bg-gray-100 text-gray-600',
}

// ─── Appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: BrhAppointmentRow }) {
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
                {TYPE_LABELS[appt.type]}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-display ${STATUS_COLORS[appt.status]}`}>
                {STATUS_LABELS[appt.status]}
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

// ─── Request modal ────────────────────────────────────────────────────────────

interface RequestModalProps {
  userId: string
  onClose: () => void
  onCreated: (appt: BrhAppointmentRow) => void
}

function RequestModal({ userId, onClose, onCreated }: RequestModalProps) {
  const [type, setType] = useState<AppointmentType>('diagnostic')
  const [requestedDate, setRequestedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Min date: tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!requestedDate) {
      setError('Veuillez choisir une date souhaitée.')
      return
    }

    setSaving(true)
    const { data, error: supaErr } = await supabase
      .from('brh_appointments')
      .insert({
        user_id: userId,
        type,
        requested_date: new Date(requestedDate).toISOString(),
        status: 'demande',
        notes: notes.trim() || null,
        confirmed_date: null,
        case_id: null,
        home_id: null,
        admin_notes: null,
      })
      .select()
      .single()

    setSaving(false)

    if (supaErr || !data) {
      setError('Impossible de soumettre votre demande. Veuillez réessayer.')
      return
    }

    onCreated(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-light">
          <h2 className="font-display text-xl text-text-primary">Demander un rendez-vous</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-background transition-colors text-text-light"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-danger font-body">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">
              Type de rendez-vous
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as AppointmentType)}
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
            >
              <option value="diagnostic">Diagnostic</option>
              <option value="devis">Devis</option>
              <option value="visite">Visite</option>
              <option value="suivi">Suivi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">
              Date souhaitée <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={requestedDate}
              min={minDateStr}
              onChange={e => setRequestedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs font-body text-text-light mt-1">
              Nous ferons de notre mieux pour respecter votre souhait.
            </p>
          </div>

          <div>
            <label className="block text-xs font-display text-text-secondary mb-1.5">
              Informations complémentaires
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Précisez le contexte, l'adresse du bien, vos disponibilités..."
              className="w-full px-3.5 py-2.5 border border-gray-light rounded-xl text-sm font-body text-text-primary bg-background focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 border border-gray-light text-text-secondary font-display text-sm rounded-xl hover:bg-background transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
              {saving ? 'Envoi...' : 'Demander'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MesRdv() {
  const { user } = useAppStore()

  const [appointments, setAppointments] = useState<BrhAppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!user) return

    async function fetchAppointments() {
      setLoading(true)
      setError(null)
      const { data, error: supaErr } = await supabase
        .from('brh_appointments')
        .select('*')
        .eq('user_id', user!.id)
        .order('requested_date', { ascending: false })

      if (supaErr) {
        setError('Impossible de charger vos rendez-vous. Veuillez réessayer.')
      } else {
        setAppointments(data ?? [])
      }
      setLoading(false)
    }

    void fetchAppointments()
  }, [user])

  function handleCreated(appt: BrhAppointmentRow) {
    setAppointments(prev => [appt, ...prev])
    setShowModal(false)
  }

  // Separate upcoming vs past
  const now = new Date()
  const upcoming = appointments.filter(a => {
    const d = a.confirmed_date ? new Date(a.confirmed_date) : new Date(a.requested_date)
    return d >= now && a.status !== 'annule' && a.status !== 'termine'
  })
  const past = appointments.filter(a => {
    const d = a.confirmed_date ? new Date(a.confirmed_date) : new Date(a.requested_date)
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
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-danger font-body text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && appointments.length === 0 && (
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
      {!loading && !error && upcoming.length > 0 && (
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
      {!loading && !error && past.length > 0 && (
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
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
