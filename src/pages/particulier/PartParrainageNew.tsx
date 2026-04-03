import { useState } from 'react'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useCreateProspect } from '@/hooks/queries'

const WORK_TYPES = [
  { value: 'toiture',     label: 'Toiture' },
  { value: 'isolation',   label: 'Isolation' },
  { value: 'fenetres',    label: 'Fenêtres' },
  { value: 'ravalement',  label: 'Ravalement' },
  { value: 'electricite', label: 'Electricité' },
  { value: 'plomberie',   label: 'Plomberie' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'autre',       label: 'Autre' },
]

interface FormData {
  client_first_name: string
  client_last_name: string
  client_phone: string
  client_address: string
  client_city: string
  work_type: string[]
  notes: string
}

interface FormErrors {
  client_first_name?: string
  client_last_name?: string
  client_phone?: string
  work_type?: string
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.client_first_name.trim()) errors.client_first_name = 'Le prénom est requis'
  if (!data.client_last_name.trim()) errors.client_last_name = 'Le nom est requis'
  if (!data.client_phone.trim()) errors.client_phone = 'Le téléphone est requis'
  if (data.work_type.length === 0) errors.work_type = 'Sélectionnez au moins un type de travaux'
  return errors
}

export default function PartParrainageNew() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: affiliate } = useMyAffiliate(user?.id)
  const createProspect = useCreateProspect()

  const [form, setForm] = useState<FormData>({
    client_first_name: '',
    client_last_name: '',
    client_phone: '',
    client_address: '',
    client_city: '',
    work_type: [],
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  function toggleWorkType(value: string) {
    setForm(prev => ({
      ...prev,
      work_type: prev.work_type.includes(value)
        ? prev.work_type.filter(v => v !== value)
        : [...prev.work_type, value],
    }))
    if (errors.work_type) setErrors(prev => ({ ...prev, work_type: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    await createProspect.mutateAsync({
      source_type: 'particulier',
      affiliate_id: affiliate?.id ?? null,
      submitted_by: user?.id ?? null,
      client_first_name: form.client_first_name.trim(),
      client_last_name: form.client_last_name.trim(),
      client_phone: form.client_phone.trim(),
      client_address: form.client_address.trim() || null,
      client_city: form.client_city.trim() || null,
      work_type: form.work_type,
      notes: form.notes.trim() || null,
    })

    setSubmitted(true)
    setTimeout(() => navigate('/particulier/parrainages'), 2000)
  }

  if (submitted) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-64">
        <div className="bg-white rounded-xl p-10 shadow-sm border border-slate-100 text-center max-w-sm">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <p className="font-display text-xl uppercase tracking-wide text-slate-900 mb-2">Parrainage envoyé !</p>
          <p className="font-body text-sm text-slate-500">Votre parrainage a bien été transmis à l'équipe BRH. Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/particulier/parrainages"
        className="flex items-center gap-2 text-sm font-body text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux parrainages
      </Link>

      <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900 mb-8">
        Nouveau parrainage
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-5">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-500 mb-5">
            Informations du contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_first_name"
                value={form.client_first_name}
                onChange={handleChange}
                placeholder="Jean"
                className={`w-full font-body text-sm px-4 py-2.5 border rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.client_first_name ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
              />
              {errors.client_first_name && (
                <p className="font-body text-xs text-red-500 mt-1">{errors.client_first_name}</p>
              )}
            </div>

            <div>
              <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_last_name"
                value={form.client_last_name}
                onChange={handleChange}
                placeholder="Dupont"
                className={`w-full font-body text-sm px-4 py-2.5 border rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.client_last_name ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
              />
              {errors.client_last_name && (
                <p className="font-body text-xs text-red-500 mt-1">{errors.client_last_name}</p>
              )}
            </div>

            <div>
              <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="client_phone"
                value={form.client_phone}
                onChange={handleChange}
                placeholder="06 12 34 56 78"
                className={`w-full font-body text-sm px-4 py-2.5 border rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${errors.client_phone ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
              />
              {errors.client_phone && (
                <p className="font-body text-xs text-red-500 mt-1">{errors.client_phone}</p>
              )}
            </div>

            <div>
              <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">Ville</label>
              <input
                type="text"
                name="client_city"
                value={form.client_city}
                onChange={handleChange}
                placeholder="Brest"
                className="w-full font-body text-sm px-4 py-2.5 border border-slate-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-body text-sm text-slate-700 font-medium mb-1.5 block">Adresse</label>
              <input
                type="text"
                name="client_address"
                value={form.client_address}
                onChange={handleChange}
                placeholder="12 rue des Lilas"
                className="w-full font-body text-sm px-4 py-2.5 border border-slate-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-5">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-500 mb-5">
            Type de travaux <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WORK_TYPES.map(wt => (
              <button
                key={wt.value}
                type="button"
                onClick={() => toggleWorkType(wt.value)}
                className={`font-body text-sm px-4 py-2.5 rounded-lg border transition-all ${
                  form.work_type.includes(wt.value)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                }`}
              >
                {wt.label}
              </button>
            ))}
          </div>
          {errors.work_type && (
            <p className="font-body text-xs text-red-500 mt-3">{errors.work_type}</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
          <h2 className="font-display text-sm uppercase tracking-wide text-slate-500 mb-5">
            Notes complémentaires
          </h2>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Informations supplémentaires utiles pour l'équipe BRH (optionnel)..."
            className="w-full font-body text-sm px-4 py-3 border border-slate-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            to="/particulier/parrainages"
            className="px-5 py-2.5 font-body text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={createProspect.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createProspect.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Envoyer le parrainage
          </button>
        </div>

        {createProspect.isError && (
          <p className="font-body text-sm text-red-500 text-right mt-3">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
      </form>
    </div>
  )
}
