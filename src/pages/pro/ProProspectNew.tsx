import { useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany, useCreateProspect } from '@/hooks/queries'

const WORK_TYPES = [
  { value: 'toiture', label: 'Toiture' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'fenetres', label: 'Fenetres' },
  { value: 'ravalement', label: 'Ravalement' },
  { value: 'electricite', label: 'Electricite' },
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'autre', label: 'Autre' },
]

const BUDGET_OPTIONS = [
  { value: '<5000', label: 'Moins de 5 000 EUR' },
  { value: '5000-15000', label: '5 000 – 15 000 EUR' },
  { value: '15000-30000', label: '15 000 – 30 000 EUR' },
  { value: '30000-50000', label: '30 000 – 50 000 EUR' },
  { value: '>50000', label: 'Plus de 50 000 EUR' },
]

const URGENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: '3mois', label: 'Dans 3 mois' },
  { value: '6mois', label: 'Dans 6 mois' },
  { value: 'plus', label: 'Plus de 6 mois' },
]

interface FormData {
  client_first_name: string
  client_last_name: string
  client_phone: string
  client_email: string
  client_address: string
  client_city: string
  client_postal_code: string
  work_type: string[]
  estimated_budget: string
  urgency: string
  notes: string
}

const INITIAL: FormData = {
  client_first_name: '',
  client_last_name: '',
  client_phone: '',
  client_email: '',
  client_address: '',
  client_city: '',
  client_postal_code: '',
  work_type: [],
  estimated_budget: '',
  urgency: '',
  notes: '',
}

export default function ProProspectNew() {
  const { user } = useAuth()
  const { data: company } = useMyCompany(user?.id)
  const createProspect = useCreateProspect()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function toggleWorkType(value: string) {
    setForm((prev) => ({
      ...prev,
      work_type: prev.work_type.includes(value)
        ? prev.work_type.filter((t) => t !== value)
        : [...prev.work_type, value],
    }))
    setErrors((prev) => ({ ...prev, work_type: undefined }))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.client_first_name.trim()) newErrors.client_first_name = 'Prenom requis'
    if (!form.client_last_name.trim()) newErrors.client_last_name = 'Nom requis'
    if (!form.client_phone.trim()) newErrors.client_phone = 'Telephone requis'
    if (form.work_type.length === 0) newErrors.work_type = 'Selectionnez au moins un type de travaux'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !company) return

    try {
      await createProspect.mutateAsync({
        source_type: 'pro',
        company_id: company.id,
        submitted_by: user?.id ?? null,
        client_first_name: form.client_first_name.trim(),
        client_last_name: form.client_last_name.trim(),
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim() || null,
        client_address: form.client_address.trim() || null,
        client_city: form.client_city.trim() || null,
        client_postal_code: form.client_postal_code.trim() || null,
        work_type: form.work_type,
        estimated_budget: form.estimated_budget || null,
        urgency: form.urgency || null,
        notes: form.notes.trim() || null,
      })
      navigate('/pro/prospects')
    } catch {
      // error handled via createProspect.error
    }
  }

  const inputClass = (field: keyof FormData) =>
    `w-full px-3 py-2.5 rounded-lg border font-body text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
      errors[field] ? 'border-red-400' : 'border-slate-200 hover:border-slate-300'
    }`

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/pro/prospects"
        className="inline-flex items-center gap-2 text-sm font-body text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux prospects
      </Link>

      <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900 mb-8">
        Nouveau prospect
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Identite client */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">
            Identite du client
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Prenom *</label>
              <input
                type="text"
                value={form.client_first_name}
                onChange={(e) => handleChange('client_first_name', e.target.value)}
                className={inputClass('client_first_name')}
                placeholder="Jean"
              />
              {errors.client_first_name && (
                <p className="mt-1 font-body text-xs text-red-500">{errors.client_first_name}</p>
              )}
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Nom *</label>
              <input
                type="text"
                value={form.client_last_name}
                onChange={(e) => handleChange('client_last_name', e.target.value)}
                className={inputClass('client_last_name')}
                placeholder="Dupont"
              />
              {errors.client_last_name && (
                <p className="mt-1 font-body text-xs text-red-500">{errors.client_last_name}</p>
              )}
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Telephone *</label>
              <input
                type="tel"
                value={form.client_phone}
                onChange={(e) => handleChange('client_phone', e.target.value)}
                className={inputClass('client_phone')}
                placeholder="06 00 00 00 00"
              />
              {errors.client_phone && (
                <p className="mt-1 font-body text-xs text-red-500">{errors.client_phone}</p>
              )}
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={form.client_email}
                onChange={(e) => handleChange('client_email', e.target.value)}
                className={inputClass('client_email')}
                placeholder="jean.dupont@email.fr"
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">
            Adresse du chantier
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Adresse</label>
              <input
                type="text"
                value={form.client_address}
                onChange={(e) => handleChange('client_address', e.target.value)}
                className={inputClass('client_address')}
                placeholder="12 rue des Artisans"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs text-slate-500 mb-1">Code postal</label>
                <input
                  type="text"
                  value={form.client_postal_code}
                  onChange={(e) => handleChange('client_postal_code', e.target.value)}
                  className={inputClass('client_postal_code')}
                  placeholder="29000"
                />
              </div>
              <div>
                <label className="block font-body text-xs text-slate-500 mb-1">Ville</label>
                <input
                  type="text"
                  value={form.client_city}
                  onChange={(e) => handleChange('client_city', e.target.value)}
                  className={inputClass('client_city')}
                  placeholder="Quimper"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Travaux */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">
            Type de travaux *
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WORK_TYPES.map((wt) => (
              <label
                key={wt.value}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                  form.work_type.includes(wt.value)
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.work_type.includes(wt.value)}
                  onChange={() => toggleWorkType(wt.value)}
                />
                <span className="font-body text-sm">{wt.label}</span>
              </label>
            ))}
          </div>
          {errors.work_type && (
            <p className="mt-2 font-body text-xs text-red-500">{errors.work_type}</p>
          )}
        </div>

        {/* Budget & Urgence */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">
            Budget et urgence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Budget estime</label>
              <select
                value={form.estimated_budget}
                onChange={(e) => handleChange('estimated_budget', e.target.value)}
                className={inputClass('estimated_budget')}
              >
                <option value="">Selectionnez...</option>
                {BUDGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-slate-500 mb-1">Urgence</label>
              <select
                value={form.urgency}
                onChange={(e) => handleChange('urgency', e.target.value)}
                className={inputClass('urgency')}
              >
                <option value="">Selectionnez...</option>
                {URGENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-4">
            Notes
          </h2>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            placeholder="Informations complementaires sur le projet..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 font-body text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none"
          />
        </div>

        {/* Error */}
        {createProspect.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="font-body text-sm text-red-600">
              {createProspect.error instanceof Error
                ? createProspect.error.message
                : 'Une erreur est survenue. Veuillez reessayer.'}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createProspect.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors uppercase tracking-wide"
          >
            {createProspect.isPending && <Loader2 size={15} className="animate-spin" />}
            Envoyer le prospect
          </button>
          <Link
            to="/pro/prospects"
            className="px-6 py-2.5 border border-slate-200 text-slate-600 font-display text-sm rounded-lg hover:border-slate-300 transition-colors uppercase tracking-wide"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
