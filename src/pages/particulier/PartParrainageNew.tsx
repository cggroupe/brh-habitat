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
      <div className="p-8 lg:p-10 flex flex-col items-center justify-center min-h-64">
        <div className="bg-white rounded-2xl p-12 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center max-w-sm">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <p className="font-display text-xl font-bold uppercase tracking-[0.05em] text-[#1b1c1c] mb-3">
            Parrainage envoyé !
          </p>
          <p className="text-sm text-[#707a6a]">
            Votre parrainage a bien été transmis à l'équipe BRH. Redirection en cours...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">
      <Link
        to="/particulier/parrainages"
        className="inline-flex items-center gap-2 text-sm text-[#707a6a] hover:text-[#1c7b1d] mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux parrainages
      </Link>

      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Partenariat</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-[#1b1c1c]">
          Nouveau parrainage
        </h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Informations contact */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-5">
            Informations du contact
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_first_name"
                value={form.client_first_name}
                onChange={handleChange}
                placeholder="Jean"
                className={`w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white ${errors.client_first_name ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
              />
              {errors.client_first_name && (
                <p className="text-xs text-red-500 mt-1.5">{errors.client_first_name}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="client_last_name"
                value={form.client_last_name}
                onChange={handleChange}
                placeholder="Dupont"
                className={`w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white ${errors.client_last_name ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
              />
              {errors.client_last_name && (
                <p className="text-xs text-red-500 mt-1.5">{errors.client_last_name}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="client_phone"
                value={form.client_phone}
                onChange={handleChange}
                placeholder="06 12 34 56 78"
                className={`w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white ${errors.client_phone ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
              />
              {errors.client_phone && (
                <p className="text-xs text-red-500 mt-1.5">{errors.client_phone}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Ville
              </label>
              <input
                type="text"
                name="client_city"
                value={form.client_city}
                onChange={handleChange}
                placeholder="Brest"
                className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-2 block">
                Adresse
              </label>
              <input
                type="text"
                name="client_address"
                value={form.client_address}
                onChange={handleChange}
                placeholder="12 rue des Lilas"
                className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Type de travaux */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-5">
            Type de travaux <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WORK_TYPES.map(wt => (
              <button
                key={wt.value}
                type="button"
                onClick={() => toggleWorkType(wt.value)}
                className={`text-sm px-4 py-3 rounded-xl font-medium transition-all ${
                  form.work_type.includes(wt.value)
                    ? 'bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white shadow-[0_4px_12px_rgba(28,123,29,0.3)]'
                    : 'bg-[#f5f3f2] text-[#404a3c] hover:bg-[#e8e5e2]'
                }`}
              >
                {wt.label}
              </button>
            ))}
          </div>
          {errors.work_type && (
            <p className="text-xs text-red-500 mt-3">{errors.work_type}</p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-5">
            Notes complémentaires
          </p>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Informations supplémentaires utiles pour l'équipe BRH (optionnel)..."
            className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all bg-[#f5f3f2] placeholder:text-[#707a6a]/50 text-[#1b1c1c] focus:ring-2 focus:ring-[#1c7b1d]/30 focus:bg-white resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Link
            to="/particulier/parrainages"
            className="px-6 py-3 text-sm font-medium text-[#404a3c] bg-[#f5f3f2] rounded-xl hover:bg-[#e8e5e2] transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={createProspect.isPending}
            className="flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createProspect.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Envoyer le parrainage
          </button>
        </div>

        {createProspect.isError && (
          <p className="text-sm text-red-500 text-right mt-3">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}
      </form>
    </div>
  )
}
