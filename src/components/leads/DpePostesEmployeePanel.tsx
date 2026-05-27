/**
 * Panneau employé BRH : modifier les postes techniques du DPE.
 *
 * 7 postes whitelistés (cf brh_dpe_employee_update RPC) :
 *   isolation murs / menuiseries / plancher bas / plancher haut /
 *   toiture-combles / ventilation / chauffage / ECS.
 *
 * Pour chaque poste : on affiche l'état initial du DPE (lecture seule) et
 * l'état terrain BRH (status + commentaire libre, éditables inline).
 *
 * Le DPE certifié ne change pas — on ajoute une couche "ce que BRH sait du
 * bien après visite / chantier" sans toucher aux données ADEME.
 */
import { useMemo, useState } from 'react'
import { Hammer, Check, Loader2 } from 'lucide-react'
import {
  DPE_POSTES,
  type DpePosteKey,
  type DpePosteStatus,
  type DpePosteOverride,
  type DpePosteOverrideInput,
} from '@/api/brh-employee-edit'

const STATUS_OPTIONS: { value: DpePosteStatus; label: string; className: string }[] = [
  { value: 'a_realiser', label: 'À réaliser', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { value: 'en_cours', label: 'En cours', className: 'bg-sky-100 text-sky-800 ring-sky-200' },
  { value: 'realise', label: 'Réalisé', className: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  { value: 'na', label: 'Non applicable', className: 'bg-stone-100 text-stone-700 ring-stone-200' },
]

function statusMeta(status: DpePosteStatus | null | undefined) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? null
}

interface PosteRowState {
  status: DpePosteStatus | ''
  comment: string
}

interface Props {
  dpe: Record<string, unknown> & {
    employee_overrides?: Record<string, DpePosteOverride> | null
  }
  onSave: (overrides: Record<string, DpePosteOverrideInput>) => Promise<unknown>
  isSaving?: boolean
}

export function DpePostesEmployeePanel({ dpe, onSave, isSaving = false }: Props) {
  const initialState = useMemo<Record<DpePosteKey, PosteRowState>>(() => {
    const overrides = (dpe.employee_overrides ?? {}) as Record<string, DpePosteOverride>
    const out = {} as Record<DpePosteKey, PosteRowState>
    for (const poste of DPE_POSTES) {
      const ov = overrides[poste.key]
      out[poste.key] = {
        status: (ov?.status ?? '') as DpePosteStatus | '',
        comment: ov?.comment ?? '',
      }
    }
    return out
  }, [dpe.employee_overrides])

  const [state, setState] = useState<Record<DpePosteKey, PosteRowState>>(initialState)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const dirty = useMemo(() => {
    return DPE_POSTES.some((p) => {
      const init = initialState[p.key]
      const cur = state[p.key]
      return init.status !== cur.status || init.comment !== cur.comment
    })
  }, [initialState, state])

  function update(key: DpePosteKey, patch: Partial<PosteRowState>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }))
  }

  async function handleSave() {
    const payload: Record<string, DpePosteOverrideInput> = {}
    for (const poste of DPE_POSTES) {
      const cur = state[poste.key]
      const init = initialState[poste.key]
      if (cur.status === '' || cur.status == null) continue
      if (init.status === cur.status && init.comment === cur.comment) continue
      payload[poste.key] = {
        status: cur.status as DpePosteStatus,
        comment: cur.comment || undefined,
      }
    }
    if (Object.keys(payload).length === 0) return
    await onSave(payload)
    setSavedAt(Date.now())
    setTimeout(() => setSavedAt(null), 2000)
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Hammer className="h-4 w-4 text-orange-600" />
          Postes techniques · état terrain BRH
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Enregistré
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-stone-500">
        Le DPE certifié ADEME reste inchangé. Ces champs reflètent l'état observé par BRH
        (visites terrain, devis, travaux réalisés).
      </p>

      <div className="overflow-hidden rounded-md border border-stone-200">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Poste</th>
              <th className="px-3 py-2 font-medium">État DPE</th>
              <th className="px-3 py-2 font-medium">État BRH</th>
              <th className="px-3 py-2 font-medium">Commentaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {DPE_POSTES.map((poste) => {
              const dpeValue = (dpe as Record<string, unknown>)[poste.key] as string | null | undefined
              const cur = state[poste.key]
              const meta = statusMeta(cur.status as DpePosteStatus)
              return (
                <tr key={poste.key} className="hover:bg-stone-50/60">
                  <td className="px-3 py-2 align-top text-xs font-medium text-stone-700">
                    {poste.label}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-stone-600">
                    {dpeValue ? <span className="font-mono">{dpeValue}</span> : <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      value={cur.status}
                      onChange={(e) => update(poste.key, { status: e.target.value as DpePosteStatus | '' })}
                      className={`w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs ring-1 ${
                        meta?.className ?? 'ring-transparent'
                      }`}
                    >
                      <option value="">—</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={cur.comment}
                      onChange={(e) => update(poste.key, { comment: e.target.value })}
                      placeholder="Ex : ITE polyuréthane 2024"
                      className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-xs"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
