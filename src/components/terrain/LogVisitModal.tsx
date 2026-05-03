/**
 * Phase R2 — Modal "Logger une visite" (porte-à-porte / consultation / rappel).
 *
 * Ouvrable depuis :
 *   - fiche prospect / artisan / agence (bouton "+ Visite")
 *   - drawer pin map terrain
 *   - bouton flottant page /pro/terrain (mode "logger sur place")
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateVisit } from '@/hooks/queries/field-visits'
import type { VisitType, VisitStatus, VisitTargetType } from '@/api/field-visits'

interface LogVisitModalProps {
  open: boolean
  onClose: () => void
  /** Company de l'employé courant (récupérée depuis useMyMembership). */
  companyId: string
  targetType: VisitTargetType
  targetId: string
  /** Affichage : "Mr Le Bras (29200 Brest)". */
  targetLabel: string
  /** Coords pour pré-remplir lat/lng (depuis la map). */
  defaultLat?: number | null
  defaultLng?: number | null
  /** Callback succès (refresh map / fermer drawer). */
  onSuccess?: () => void
}

const VISIT_TYPE_OPTIONS: Array<{ value: VisitType; label: string }> = [
  { value: 'door_to_door', label: 'Porte-à-porte' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'rappel', label: 'Rappel téléphonique' },
  { value: 'rdv_signe', label: 'RDV signé' },
]

const STATUS_OPTIONS: Array<{ value: VisitStatus; label: string }> = [
  { value: 'planned', label: 'Planifiée' },
  { value: 'completed', label: 'Effectuée' },
  { value: 'no_answer', label: 'Pas de réponse' },
  { value: 'refused', label: 'Refusée' },
  { value: 'interested', label: 'Intéressé(e)' },
]

export function LogVisitModal({
  open,
  onClose,
  companyId,
  targetType,
  targetId,
  targetLabel,
  defaultLat = null,
  defaultLng = null,
  onSuccess,
}: LogVisitModalProps) {
  const [visitType, setVisitType] = useState<VisitType>('door_to_door')
  const [status, setStatus] = useState<VisitStatus>('completed')
  const [notes, setNotes] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const createVisit = useCreateVisit()

  if (!open) return null

  const isPlanned = status === 'planned'
  const submitting = createVisit.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createVisit.mutateAsync({
      company_id: companyId,
      target_type: targetType,
      target_id: targetId,
      visit_type: visitType,
      status,
      notes: notes.trim() || null,
      lat: defaultLat,
      lng: defaultLng,
      scheduled_at: isPlanned && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      completed_at: !isPlanned ? new Date().toISOString() : null,
    })
    onSuccess?.()
    setNotes('')
    setVisitType('door_to_door')
    setStatus('completed')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Logger une visite</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4 bg-gray-50 px-3 py-2 rounded">
          <span className="font-medium">Cible :</span> {targetLabel}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de visite
            </label>
            <select
              value={visitType}
              onChange={(e) => setVisitType(e.target.value as VisitType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              {VISIT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VisitStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {isPlanned ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date prévue
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: pas de réponse, prévu de repasser jeudi 16h ; intéressé par la rénovation toiture..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {createVisit.isError ? (
            <p className="text-sm text-red-600">
              Erreur : {(createVisit.error as Error).message}
            </p>
          ) : null}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
