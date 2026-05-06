/**
 * Phase 18.5 — Bouton "Recommander" pour profil pro.
 *
 * Décision #3 (06/05) : endorsements only V1 (pas de notes 1-5).
 * Modal simple avec sélecteur métier + textarea body court.
 */
import { useState } from 'react'
import { Award, X } from 'lucide-react'
import { useCreateEndorsement } from '@/hooks/queries/reseau-endorsements'

interface EndorsementButtonProps {
  endorsedProId: string
  endorsedName?: string
  /** Métiers proposés au sélecteur (selon le pro endorsed). */
  availableMetiers?: string[]
}

const DEFAULT_METIERS = [
  'isolation_combles',
  'isolation_murs',
  'isolation_sols',
  'menuiseries',
  'pac_air_eau',
  'pac_air_air',
  'chaudiere_gaz',
  'plomberie',
  'electricite',
  'couverture',
  'zinguerie',
  'maconnerie',
  'platrerie',
  'peinture',
  'carrelage',
  'terrasse',
]

export default function EndorsementButton({
  endorsedProId,
  endorsedName,
  availableMetiers,
}: EndorsementButtonProps) {
  const [open, setOpen] = useState(false)
  const [metier, setMetier] = useState('')
  const [body, setBody] = useState('')
  const create = useCreateEndorsement()

  const metiers = availableMetiers && availableMetiers.length > 0 ? availableMetiers : DEFAULT_METIERS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!metier) return
    try {
      await create.mutateAsync({
        endorsedProId,
        metierTag: metier,
        body: body.trim() || undefined,
      })
      setOpen(false)
      setMetier('')
      setBody('')
    } catch (err) {
      // unique violation = déjà recommandé sur ce métier
      console.error('endorsement failed', err)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold transition border border-cyan-200/60"
      >
        <Award size={14} /> Recommander
      </button>

      {open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-cyan-600" />
                <h2 className="font-display text-lg">Recommander {endorsedName ?? 'ce pro'}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="endorse-metier" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pour quel métier ?
                </label>
                <select
                  id="endorse-metier"
                  value={metier}
                  onChange={(e) => setMetier(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">— Choisir un métier —</option>
                  {metiers.map((m) => (
                    <option key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="endorse-body" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mot d'accompagnement <span className="text-slate-400">(optionnel, ≤ 500 car.)</span>
                </label>
                <textarea
                  id="endorse-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Ex: « Travail soigné sur 2 chantiers, équipe ponctuelle. »"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">{body.length} / 500</p>
              </div>

              {create.isError && (
                <p className="text-xs text-red-600">
                  Erreur — peut-être que vous l'avez déjà recommandé sur ce métier ?
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!metier || create.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition"
                >
                  {create.isPending ? 'Envoi…' : 'Recommander'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
