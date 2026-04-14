import { useState } from 'react'
import { X, Loader2, AlertCircle, Calendar } from 'lucide-react'
import { useCreateAppointment } from '@/hooks/queries'
import { useScrollLock } from '@/hooks/useScrollLock'
import type { AppointmentType } from '@/types/database'
import type { Database } from '@/types/database'

type AppointmentInsert = Database['public']['Tables']['brh_appointments']['Insert']

interface RequestModalProps {
  userId: string
  onClose: () => void
}

export function RequestModal({ userId, onClose }: RequestModalProps) {
  const [type, setType] = useState<AppointmentType>('diagnostic')
  const [requestedDate, setRequestedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useCreateAppointment()
  useScrollLock()

  // Min date: tomorrow (local timezone safe)
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!requestedDate) {
      setFormError('Veuillez choisir une date souhaitée.')
      return
    }

    const payload: AppointmentInsert = {
      user_id: userId,
      type,
      requested_date: new Date(requestedDate).toISOString(),
      status: 'demande',
      notes: notes.trim() || null,
      confirmed_date: null,
      case_id: null,
      home_id: null,
      admin_notes: null,
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      diagnostic_id: null,
      preferred_slot: null,
      referral_code: null,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        onClose()
      },
      onError: () => {
        setFormError('Impossible de soumettre votre demande. Veuillez réessayer.')
      },
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-danger font-body">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {formError}
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
              disabled={createMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
              {createMutation.isPending ? 'Envoi...' : 'Demander'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
