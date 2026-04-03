import { useState } from 'react'
import { Building2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useUpdateCompany } from '@/hooks/queries'
import type { CompanyLevel } from '@/types/partner'

const LEVEL_COLORS: Record<CompanyLevel, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

const PROFESSION_LABELS: Record<string, string> = {
  architecte: 'Architecte',
  agent_immobilier: 'Agent immobilier',
  maitre_oeuvre: 'Maitre d\'oeuvre',
  courtier: 'Courtier',
  autre: 'Autre',
}

const PROFESSION_OPTIONS = [
  { value: 'architecte', label: 'Architecte' },
  { value: 'agent_immobilier', label: 'Agent immobilier' },
  { value: 'maitre_oeuvre', label: 'Maitre d\'oeuvre' },
  { value: 'courtier', label: 'Courtier' },
  { value: 'autre', label: 'Autre' },
]

interface EditForm {
  name: string
  siret: string
  address: string
  city: string
  postal_code: string
  website: string
  profession: string
}

export default function ProProfil() {
  const { user } = useAuth()
  const { data: company, isLoading } = useMyCompany(user?.id)
  const updateCompany = useUpdateCompany()

  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<EditForm>({
    name: '',
    siret: '',
    address: '',
    city: '',
    postal_code: '',
    website: '',
    profession: '',
  })

  function startEdit() {
    if (!company) return
    setForm({
      name: company.name ?? '',
      siret: company.siret ?? '',
      address: company.address ?? '',
      city: company.city ?? '',
      postal_code: company.postal_code ?? '',
      website: company.website ?? '',
      profession: company.profession ?? '',
    })
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
  }

  async function handleSave() {
    if (!company) return
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        payload: {
          name: form.name.trim() || company.name,
          siret: form.siret.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          postal_code: form.postal_code.trim() || null,
          website: form.website.trim() || null,
          profession: (form.profession as typeof company.profession) || null,
        },
      })
      setEditMode(false)
    } catch {
      // error displayed via updateCompany.error
    }
  }

  function handleChange(field: keyof EditForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 font-body text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[300px]">
        <p className="font-body text-slate-400">Chargement...</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6 lg:p-10">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="font-body text-slate-500">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const levelClass = LEVEL_COLORS[company.level]

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mon entreprise
          </h1>
        </div>
        {!editMode ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-display text-sm rounded-lg hover:border-primary hover:text-primary transition-colors uppercase tracking-wide"
          >
            <Pencil size={15} />
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateCompany.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark disabled:opacity-60 transition-colors uppercase tracking-wide"
            >
              {updateCompany.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Sauvegarder
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 font-display text-sm rounded-lg hover:border-slate-300 transition-colors uppercase tracking-wide"
            >
              <X size={14} />
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Level & rate — read-only */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide ${levelClass}`}>
          {company.level}
        </span>
        <span className="font-body text-sm text-slate-500">
          Taux de commission : <strong className="text-slate-800">{company.commission_rate_percent}%</strong>
        </span>
      </div>

      {/* Error */}
      {updateCompany.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="font-body text-sm text-red-600">
            {updateCompany.error instanceof Error ? updateCompany.error.message : 'Erreur lors de la sauvegarde'}
          </p>
        </div>
      )}

      {/* Info cards */}
      {!editMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: 'Nom de l\'entreprise', value: company.name },
            { label: 'SIRET', value: company.siret ?? '—' },
            { label: 'Adresse', value: company.address ?? '—' },
            { label: 'Ville', value: company.city ? `${company.city}${company.postal_code ? ` (${company.postal_code})` : ''}` : '—' },
            { label: 'Site web', value: company.website ?? '—' },
            { label: 'Profession', value: company.profession ? (PROFESSION_LABELS[company.profession] ?? company.profession) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <p className="font-body text-xs text-slate-400 mb-1">{label}</p>
              <p className="font-body text-sm text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 max-w-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Nom de l'entreprise *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">SIRET</label>
              <input
                type="text"
                value={form.siret}
                onChange={(e) => handleChange('siret', e.target.value)}
                className={inputClass}
                placeholder="12345678901234"
              />
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-slate-500 mb-1">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Code postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block font-body text-xs text-slate-500 mb-1">Site web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className={inputClass}
              placeholder="https://www.monentreprise.fr"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-slate-500 mb-1">Profession</label>
            <select
              value={form.profession}
              onChange={(e) => handleChange('profession', e.target.value)}
              className={inputClass}
            >
              <option value="">Selectionnez...</option>
              {PROFESSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
