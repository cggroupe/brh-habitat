import { useState } from 'react'
import { Building2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useUpdateCompany } from '@/hooks/queries'
import type { CompanyLevel } from '@/types/partner'

const LEVEL_COLORS: Record<CompanyLevel, { bg: string; text: string; label: string }> = {
  bronze: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bronze' },
  silver: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Silver' },
  gold: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Gold' },
  platinum: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Platinum' },
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

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-[#f5f3f2] hover:border-[#707a6a]/30 text-sm text-[#1b1c1c] bg-white focus:outline-none focus:ring-2 focus:ring-[#1c7b1d]/20 focus:border-[#1c7b1d]/40 transition-colors'

  if (isLoading) {
    return (
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-8 lg:p-10">
        <div className="bg-white rounded-2xl p-12 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <p className="text-[#707a6a]">Aucune entreprise associee a votre compte.</p>
        </div>
      </div>
    )
  }

  const levelConfig = LEVEL_COLORS[company.level]

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Compte partenaire</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">
            Mon entreprise
          </h1>
        </div>
        {!editMode ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white rounded-xl font-bold uppercase text-xs tracking-widest text-[#707a6a] hover:text-[#1b1c1c] shadow-[0_2px_8px_rgba(27,28,28,0.06)] hover:-translate-y-0.5 transition-all"
          >
            <Pencil size={13} />
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateCompany.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all disabled:opacity-60"
            >
              {updateCompany.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Sauvegarder
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#f5f3f2] text-[#707a6a] font-bold uppercase text-xs tracking-widest rounded-xl hover:text-[#1b1c1c] transition-colors"
            >
              <X size={13} />
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Level & rate badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${levelConfig.bg} ${levelConfig.text}`}>
          {levelConfig.label}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-[#707a6a]">
          Taux de commission :
          <strong className="text-[#1b1c1c] font-bold">{company.commission_rate_percent}%</strong>
        </span>
      </div>

      {/* Error */}
      {updateCompany.error && (
        <div className="mb-6 bg-red-50 rounded-2xl px-5 py-4">
          <p className="text-sm text-red-600 font-medium">
            {updateCompany.error instanceof Error ? updateCompany.error.message : 'Erreur lors de la sauvegarde'}
          </p>
        </div>
      )}

      {/* Info cards */}
      {!editMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: 'Nom de l\'entreprise', value: company.name, icon: Building2 },
            { label: 'SIRET', value: company.siret ?? '—', icon: null },
            { label: 'Adresse', value: company.address ?? '—', icon: null },
            { label: 'Ville', value: company.city ? `${company.city}${company.postal_code ? ` (${company.postal_code})` : ''}` : '—', icon: null },
            { label: 'Site web', value: company.website ?? '—', icon: null },
            { label: 'Profession', value: company.profession ? (PROFESSION_LABELS[company.profession] ?? company.profession) : '—', icon: null },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2">{label}</p>
              <p className="text-sm font-semibold text-[#1b1c1c]">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] max-w-2xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Nom de l'entreprise *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404a3c] mb-1.5">SIRET</label>
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
            <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Code postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Site web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              className={inputClass}
              placeholder="https://www.monentreprise.fr"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#404a3c] mb-1.5">Profession</label>
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
