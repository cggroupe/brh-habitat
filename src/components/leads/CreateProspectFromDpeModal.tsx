/**
 * CreateProspectFromDpeModal — modal pour créer un prospect depuis un DPE anonyme.
 *
 * Affiché depuis FicheAdresseView quand owner_name est NULL et profile=employe.
 * Au submit : appelle RPC brh_create_prospect_from_dpe, invalide les caches,
 * redirige vers la fiche personne créée.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserPlus, X, Loader2, Save } from 'lucide-react'
import { brhCreateProspectDpeApi } from '@/api/brh-create-prospect-dpe'

interface Props {
  dpeId: number
  open: boolean
  onClose: () => void
}

export default function CreateProspectFromDpeModal({ dpeId, open, onClose }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      brhCreateProspectDpeApi.create({
        dpe_id: dpeId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim() || null,
        email: email.trim() || null,
      }),
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: ['brh', 'fiche-adresse', dpeId] })
      qc.invalidateQueries({ queryKey: ['brh', 'personnes'] })
      onClose()
      navigate(`/employe/clients-brh/${newId}`)
    },
  })

  if (!open) return null

  const canSubmit = nom.trim().length >= 2 && prenom.trim().length >= 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-stone-900">
              <UserPlus className="h-4 w-4 text-emerald-700" />
              Créer un prospect à cette adresse
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Le DPE est anonyme — ajoute le nom du propriétaire/occupant identifié sur le terrain.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *">
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
                minLength={2}
                className="input"
                autoFocus
              />
            </Field>
            <Field label="Nom *">
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                minLength={2}
                className="input"
              />
            </Field>
          </div>
          <Field label="Téléphone">
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@exemple.fr"
              className="input"
            />
          </Field>

          {mutation.isError && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              Erreur : {(mutation.error as Error).message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Créer le prospect
            </button>
          </div>
        </form>

        <style>{`
          .input { width: 100%; border: 1px solid rgb(214 211 209); border-radius: 0.375rem; background: white; padding: 0.5rem 0.625rem; font-size: 0.875rem; }
          .input:focus { outline: 2px solid rgb(4 120 87); outline-offset: -1px; }
        `}</style>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-stone-600">{label}</span>
      {children}
    </label>
  )
}
