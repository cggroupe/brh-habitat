/**
 * EmployeeEditPanel — formulaire d'édition pour employés BRH terrain.
 *
 * Utilisable sur fiche client BRH (personne_brh) ou fiche adresse DPE.
 * Champs : contact (tel/email), travaux confirmés, DPE estimé, intérêt,
 * dispo, notes libres.
 *
 * Mutation via RPC SECURITY DEFINER avec audit log.
 */
import { useState } from 'react'
import { Loader2, Save, Pencil, X, CheckCircle2 } from 'lucide-react'
import type { EmployeeEditPatch } from '@/api/brh-employee-edit'

interface PersonneInitial {
  telephone?: string | null
  email?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville?: string | null
  employee_notes?: string | null
  travaux_terrain_status?: string | null
  dpe_terrain_estime?: string | null
  interet_brh?: string | null
  contact_disponibilite?: string | null
  derniere_visite_terrain?: string | null
}

interface Props {
  initial: PersonneInitial
  showContactFields?: boolean
  onSave: (patch: EmployeeEditPatch) => Promise<unknown>
}

const INTERET_OPTIONS = [
  { v: 'chaud', label: 'Chaud', cls: 'bg-red-100 text-red-900 border-red-300' },
  { v: 'tiede', label: 'Tiède', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  { v: 'froid', label: 'Froid', cls: 'bg-sky-100 text-sky-900 border-sky-300' },
  { v: 'a_recontacter', label: 'À recontacter', cls: 'bg-violet-100 text-violet-900 border-violet-300' },
  { v: 'refus', label: 'Refus', cls: 'bg-slate-200 text-slate-700 border-slate-400' },
  { v: 'inconnu', label: 'Inconnu', cls: 'bg-white text-slate-500 border-slate-200' },
] as const

const TRAVAUX_OPTIONS = [
  { v: 'aucun', label: 'Aucun travaux' },
  { v: 'partiel', label: 'Travaux partiels' },
  { v: 'total', label: 'Rénovation totale' },
  { v: 'inconnu', label: 'Non renseigné' },
] as const

const DISPO_OPTIONS = [
  { v: 'matin', label: 'Matin' },
  { v: 'apres_midi', label: 'Après-midi' },
  { v: 'soir', label: 'Soir' },
  { v: 'weekend', label: 'Week-end' },
  { v: 'inconnu', label: 'Non renseigné' },
] as const

export function EmployeeEditPanel({ initial, showContactFields = true, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<EmployeeEditPatch>({
    telephone: initial.telephone ?? '',
    email: initial.email ?? '',
    adresse: initial.adresse ?? '',
    code_postal: initial.code_postal ?? '',
    ville: initial.ville ?? '',
    employee_notes: initial.employee_notes ?? '',
    travaux_terrain_status: (initial.travaux_terrain_status as EmployeeEditPatch['travaux_terrain_status']) ?? null,
    dpe_terrain_estime: initial.dpe_terrain_estime ?? '',
    interet_brh: (initial.interet_brh as EmployeeEditPatch['interet_brh']) ?? null,
    contact_disponibilite: (initial.contact_disponibilite as EmployeeEditPatch['contact_disponibilite']) ?? null,
    derniere_visite_terrain: initial.derniere_visite_terrain ?? '',
  })

  function setField<K extends keyof EmployeeEditPatch>(k: K, v: EmployeeEditPatch[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const patch: EmployeeEditPatch = {}
      // N'envoie que les champs touchés (différents de l'initial)
      const compareKeys = [
        'telephone', 'email', 'adresse', 'code_postal', 'ville',
        'employee_notes', 'travaux_terrain_status', 'dpe_terrain_estime',
        'interet_brh', 'contact_disponibilite', 'derniere_visite_terrain',
      ] as const
      for (const k of compareKeys) {
        const before = (initial as Record<string, unknown>)[k] ?? null
        const after = (form as Record<string, unknown>)[k] ?? null
        if ((before ?? '') !== (after ?? '')) {
          ;(patch as Record<string, unknown>)[k] = after === '' ? null : after
        }
      }
      if (Object.keys(patch).length === 0) {
        setError('Aucune modification à enregistrer')
        setSaving(false)
        return
      }
      await onSave(patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setOpen(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Suivi commercial terrain</p>
            <p className="text-xs text-slate-500">
              {initial.interet_brh ? `Intérêt : ${initial.interet_brh}` : 'Pas encore qualifié'}
              {initial.derniere_visite_terrain && ` · dernière visite ${initial.derniere_visite_terrain}`}
            </p>
            {initial.employee_notes && (
              <p className="mt-1 line-clamp-2 text-xs italic text-slate-700">"{initial.employee_notes}"</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            <Pencil className="h-3 w-3" />
            Mettre à jour
          </button>
        </div>
        {saved && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Enregistré
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Mise à jour fiche (BRH interne)</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-500 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showContactFields && (
          <>
            <Field label="Téléphone">
              <input
                type="tel"
                value={form.telephone ?? ''}
                onChange={(e) => setField('telephone', e.target.value)}
                placeholder="02 98 ..."
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="contact@..."
                className="input"
              />
            </Field>
            <Field label="Adresse">
              <input
                type="text"
                value={form.adresse ?? ''}
                onChange={(e) => setField('adresse', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Code postal · Ville">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code_postal ?? ''}
                  onChange={(e) => setField('code_postal', e.target.value)}
                  className="input w-24"
                  placeholder="29200"
                />
                <input
                  type="text"
                  value={form.ville ?? ''}
                  onChange={(e) => setField('ville', e.target.value)}
                  className="input flex-1"
                />
              </div>
            </Field>
          </>
        )}

        <Field label="Intérêt commercial">
          <div className="flex flex-wrap gap-1.5">
            {INTERET_OPTIONS.map((o) => {
              const active = form.interet_brh === o.v
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setField('interet_brh', o.v)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    active ? `${o.cls} ring-2 ring-offset-1 ring-slate-400` : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Travaux constatés sur place">
          <select
            value={form.travaux_terrain_status ?? ''}
            onChange={(e) => setField('travaux_terrain_status', (e.target.value || null) as EmployeeEditPatch['travaux_terrain_status'])}
            className="input"
          >
            <option value="">— non renseigné —</option>
            {TRAVAUX_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="DPE estimé après visite">
          <input
            type="text"
            value={form.dpe_terrain_estime ?? ''}
            onChange={(e) => setField('dpe_terrain_estime', e.target.value)}
            placeholder="Ex: F → D après ITE 2024"
            className="input"
          />
        </Field>

        <Field label="Meilleur créneau contact">
          <select
            value={form.contact_disponibilite ?? ''}
            onChange={(e) => setField('contact_disponibilite', (e.target.value || null) as EmployeeEditPatch['contact_disponibilite'])}
            className="input"
          >
            <option value="">— non renseigné —</option>
            {DISPO_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Date dernière visite terrain">
          <input
            type="date"
            value={form.derniere_visite_terrain ?? ''}
            onChange={(e) => setField('derniere_visite_terrain', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Notes commerciales libres" full>
          <textarea
            value={form.employee_notes ?? ''}
            onChange={(e) => setField('employee_notes', e.target.value)}
            rows={3}
            placeholder="Ex: vu sur place le 12/05. Fenêtres changées en 2024. Hésite sur l'isolation murs. Rappeler après ses vacances en juin."
            className="input w-full"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-700">{error}</p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer
        </button>
      </div>

      <style>{`
        .input {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.375rem;
          background: white;
          padding: 0.375rem 0.625rem;
          font-size: 0.875rem;
        }
        .input:focus { outline: 2px solid rgb(100 116 139); outline-offset: -1px; }
      `}</style>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-600">{label}</span>
      {children}
    </label>
  )
}
