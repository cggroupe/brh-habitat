/**
 * Phase 18.7 — Formulaire candidature à une offre de chantier.
 */
import { useState } from 'react'
import { Send, AlertCircle } from 'lucide-react'
import { useApplyToChantier } from '@/hooks/queries/reseau-chantier-applications'

interface ApplicationFormProps {
  offerId: string
  onSuccess?: () => void
}

export default function ApplicationForm({ offerId, onSuccess }: ApplicationFormProps) {
  const apply = useApplyToChantier()
  const [message, setMessage] = useState('')
  const [devisAmount, setDevisAmount] = useState('')
  const [devisUrl, setDevisUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!message.trim()) {
      setError('Un message de motivation est requis.')
      return
    }
    try {
      await apply.mutateAsync({
        offerId,
        message: message.trim(),
        devisAmountCents: devisAmount ? Math.round(parseFloat(devisAmount) * 100) : undefined,
        devisUrl: devisUrl.trim() || undefined,
      })
      setMessage('')
      setDevisAmount('')
      setDevisUrl('')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la candidature.'
      // Détection de la contrainte UNIQUE (offer, applicant)
      setError(msg.includes('duplicate') ? 'Vous avez déjà candidaté à cette offre.' : msg)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-cyan-50/30 border border-cyan-200/60 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-cyan-900">Postuler sur ce chantier</h3>

      <div>
        <label htmlFor="app-msg" className="block text-xs font-semibold text-slate-700 mb-1">
          Message de motivation <span className="text-red-500">*</span>
        </label>
        <textarea
          id="app-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Ex: « Disponible mi-juin, équipe de 3, expérience couverture ardoise sur 5 chantiers similaires Finistère. »"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="app-amount" className="block text-xs font-semibold text-slate-700 mb-1">
            Devis € HT (optionnel)
          </label>
          <input
            id="app-amount"
            type="number"
            min="0"
            step="100"
            value={devisAmount}
            onChange={(e) => setDevisAmount(e.target.value)}
            placeholder="9500"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div>
          <label htmlFor="app-url" className="block text-xs font-semibold text-slate-700 mb-1">
            URL devis (optionnel)
          </label>
          <input
            id="app-url"
            type="url"
            value={devisUrl}
            onChange={(e) => setDevisUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={apply.isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-sm font-semibold transition"
      >
        <Send size={14} />
        {apply.isPending ? 'Envoi…' : 'Envoyer ma candidature'}
      </button>
    </form>
  )
}
