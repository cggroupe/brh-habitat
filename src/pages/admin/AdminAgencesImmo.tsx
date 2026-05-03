/**
 * Phase R9 — Page admin `/admin/agences-immo` : CRUD agences immobilières.
 *
 * Permet à l'équipe BRH de saisir manuellement le catalogue d'agences avant
 * Phase 16 (algo Score Vente + portail dédié post-Hoguet/DPIA). Sans ce
 * remplissage, la page `/pro/terrain` (Phase R2) n'a aucune agence à
 * afficher pour les commerciaux.
 */
import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, Building2, Loader, MapPin } from 'lucide-react'
import {
  useAgencesImmo,
  useCreateAgenceImmo,
  useUpdateAgenceImmo,
  useDeleteAgenceImmo,
} from '@/hooks/queries/agences-immo'
import type { AgenceImmo, AgenceImmoStatus } from '@/api/agences-immo'

const STATUS_LABELS: Record<AgenceImmoStatus, string> = {
  prospect: 'Prospect',
  contacted: 'Contactée',
  partenaire: 'Partenaire',
  refused: 'Refusée',
}

const STATUS_COLORS: Record<AgenceImmoStatus, string> = {
  prospect: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  partenaire: 'bg-emerald-100 text-emerald-800',
  refused: 'bg-red-100 text-red-800',
}

type FormState = Omit<AgenceImmo, 'id' | 'created_at' | 'updated_at'>

const EMPTY_FORM: FormState = {
  siret: null,
  raison_sociale: '',
  representant: null,
  email: null,
  telephone: null,
  site_web: null,
  adresse: null,
  code_postal: null,
  commune: null,
  code_insee: null,
  departement: null,
  latitude: null,
  longitude: null,
  carte_t_numero: null,
  carte_t_validite: null,
  status: 'prospect',
  notes: null,
}

export default function AdminAgencesImmo() {
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState<AgenceImmoStatus | ''>('')
  const [editing, setEditing] = useState<AgenceImmo | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: agences = [], isLoading } = useAgencesImmo({
    search: search || undefined,
    departement: filterDept || undefined,
    status: filterStatus || undefined,
  })

  const createMut = useCreateAgenceImmo()
  const updateMut = useUpdateAgenceImmo()
  const deleteMut = useDeleteAgenceImmo()

  return (
    <div className="p-6 lg:p-10">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <Building2 className="text-primary" size={24} />
            Agences immobilières
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Catalogue MVP saisi manuellement avant Phase 16 (Score Vente + portail dédié).
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> Nouvelle agence
        </button>
      </header>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4 bg-white p-4 rounded-xl border border-slate-100">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Raison sociale ou commune…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <input
          type="text"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          placeholder="Dept (29, 35…)"
          maxLength={2}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AgenceImmoStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <Loader className="animate-spin text-primary" />
        </div>
      ) : agences.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-100 text-center">
          <Building2 className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-600">Aucune agence trouvée. Cliquez "Nouvelle agence" pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Raison sociale</th>
                <th className="px-4 py-3">Localisation</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agences.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.raison_sociale}</p>
                    {a.representant ? <p className="text-xs text-gray-500">{a.representant}</p> : null}
                    {a.siret ? <p className="text-xs text-gray-400 font-mono">{a.siret}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {a.commune ? (
                      <p className="flex items-center gap-1 text-sm">
                        <MapPin size={12} className="text-gray-400" />
                        {a.code_postal} {a.commune}
                      </p>
                    ) : <span className="text-gray-400">—</span>}
                    {a.departement ? <p className="text-xs text-gray-500">Dept. {a.departement}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-xs space-y-1">
                    {a.email ? <p>{a.email}</p> : null}
                    {a.telephone ? <p>{a.telephone}</p> : null}
                    {!a.email && !a.telephone ? <span className="text-gray-400">—</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => setEditing(a)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                      aria-label="Éditer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer ${a.raison_sociale} ?`)) {
                          deleteMut.mutate(a.id)
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showCreate || editing) && (
        <AgenceFormModal
          initial={editing ?? EMPTY_FORM}
          isEdit={!!editing}
          onClose={() => {
            setShowCreate(false)
            setEditing(null)
          }}
          onSubmit={async (data) => {
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, patch: data })
            } else {
              await createMut.mutateAsync(data)
            }
            setShowCreate(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function AgenceFormModal({
  initial,
  isEdit,
  onClose,
  onSubmit,
}: {
  initial: FormState
  isEdit: boolean
  onClose: () => void
  onSubmit: (data: FormState) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.raison_sociale.trim()) {
      setError('La raison sociale est obligatoire')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? 'Éditer agence' : 'Nouvelle agence'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Raison sociale *" required>
              <input
                type="text"
                value={form.raison_sociale}
                onChange={(e) => update('raison_sociale', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="SIRET">
              <input
                type="text"
                value={form.siret ?? ''}
                onChange={(e) => update('siret', e.target.value || null)}
                maxLength={14}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </Field>
            <Field label="Représentant">
              <input
                type="text"
                value={form.representant ?? ''}
                onChange={(e) => update('representant', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => update('email', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={form.telephone ?? ''}
                onChange={(e) => update('telephone', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Site web">
              <input
                type="url"
                value={form.site_web ?? ''}
                onChange={(e) => update('site_web', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Adresse" className="sm:col-span-3">
              <input
                type="text"
                value={form.adresse ?? ''}
                onChange={(e) => update('adresse', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="CP">
              <input
                type="text"
                value={form.code_postal ?? ''}
                onChange={(e) => update('code_postal', e.target.value || null)}
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Commune">
              <input
                type="text"
                value={form.commune ?? ''}
                onChange={(e) => update('commune', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Dept">
              <input
                type="text"
                value={form.departement ?? ''}
                onChange={(e) => update('departement', e.target.value || null)}
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                type="number"
                step="0.00001"
                value={form.latitude ?? ''}
                onChange={(e) => update('latitude', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.00001"
                value={form.longitude ?? ''}
                onChange={(e) => update('longitude', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Carte T n°">
              <input
                type="text"
                value={form.carte_t_numero ?? ''}
                onChange={(e) => update('carte_t_numero', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Carte T validité">
              <input
                type="date"
                value={form.carte_t_validite ?? ''}
                onChange={(e) => update('carte_t_validite', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Statut">
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as AgenceImmoStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value || null)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
              {submitting ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  )
}
