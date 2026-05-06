/**
 * Phase 18.6 — Modal signalement post (modération minimale embarquée).
 */
import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { useReportPost } from '@/hooks/queries/reseau-reports'
import type { ReportReason } from '@/api/reseau-reports'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'rgpd_personne', label: 'Visage / personne identifiable non floutée' },
  { value: 'rgpd_plaque', label: "Plaque d'immatriculation visible" },
  { value: 'spam', label: 'Spam / publicité non sollicitée' },
  { value: 'illegal', label: 'Contenu illégal' },
  { value: 'offensive', label: 'Contenu offensant / diffamatoire' },
  { value: 'other', label: 'Autre raison' },
]

interface ReportDialogProps {
  postId: string | null
  onClose: () => void
}

export default function ReportDialog({ postId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>('rgpd_personne')
  const [comment, setComment] = useState('')
  const [done, setDone] = useState(false)
  const report = useReportPost()

  if (!postId) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!postId) return
    try {
      await report.mutateAsync({ postId, reason, comment: comment.trim() || undefined })
      setDone(true)
      setTimeout(() => {
        onClose()
        setDone(false)
        setReason('rgpd_personne')
        setComment('')
      }, 1500)
    } catch (err) {
      console.error('report failed', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-red-600" />
            <h2 className="font-display text-lg">Signaler ce post</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        {done ? (
          <div className="p-8 text-center">
            <p className="text-emerald-600 font-semibold">✓ Signalement enregistré</p>
            <p className="text-sm text-slate-500 mt-1">L'équipe BRH va examiner ce post.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Raison du signalement</label>
              <div className="space-y-1.5">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="report-comment" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Précisions <span className="text-slate-400">(optionnel)</span>
              </label>
              <textarea
                id="report-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            {report.isError && (
              <p className="text-xs text-red-600">Erreur — peut-être déjà signalé ?</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={report.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-sm font-semibold"
              >
                {report.isPending ? 'Envoi…' : 'Signaler'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
