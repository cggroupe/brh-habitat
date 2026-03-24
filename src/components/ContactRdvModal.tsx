import { useState } from 'react'
import { CheckCircle2, Lock, Phone, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactRdvModalProps {
  onClose: () => void
  diagnosticId?: string
  diagnosticSummary: string
  propertyAddress?: string
  resteACharge?: string
}

type CreneauType = 'asap' | 'matin' | 'aprem'

interface FormState {
  nom: string
  telephone: string
  email: string
  creneau: CreneauType
  message: string
}

interface FormErrors {
  nom?: string
  telephone?: string
  email?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^0[0-9]{9}$/

function normalizePhone(phone: string): string {
  return phone.replace(/[\s.\-()]/g, '')
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.nom.trim()) {
    errors.nom = 'Le nom est obligatoire'
  }
  const phoneClean = normalizePhone(form.telephone)
  if (!phoneClean) {
    errors.telephone = 'Le telephone est obligatoire'
  } else if (!PHONE_REGEX.test(phoneClean)) {
    errors.telephone = 'Format invalide (ex : 06 12 34 56 78)'
  }
  if (!form.email.trim()) {
    errors.email = "L'email est obligatoire"
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Format email invalide'
  }
  return errors
}

// ---------------------------------------------------------------------------
// Creneau buttons
// ---------------------------------------------------------------------------

const CRENEAUX: { value: CreneauType; label: string }[] = [
  { value: 'asap', label: 'Des que possible' },
  { value: 'matin', label: 'En matinee (9h-12h)' },
  { value: 'aprem', label: 'En apres-midi (14h-18h)' },
]

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function ContactRdvModal({
  onClose,
  diagnosticId,
  diagnosticSummary,
  propertyAddress,
  resteACharge,
}: ContactRdvModalProps) {
  const [form, setForm] = useState<FormState>({
    nom: '',
    telephone: '',
    email: '',
    creneau: 'asap',
    message: propertyAddress ? `Adresse du bien : ${propertyAddress}` : '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const prenom = form.nom.trim().split(' ')[0] ?? form.nom.trim()

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async () => {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const phoneClean = normalizePhone(form.telephone)
      const creneauLabel = CRENEAUX.find((c) => c.value === form.creneau)?.label ?? form.creneau

      // 1. Mettre a jour ou inserer dans brh_diagnostics
      if (diagnosticId && diagnosticId !== 'local') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('brh_diagnostics')
          .update({
            contact_name: form.nom.trim(),
            contact_phone: phoneClean,
            contact_email: form.email.trim().toLowerCase(),
          })
          .eq('id', diagnosticId)
      }

      // 2. Creer un RDV dans brh_appointments
      const appointmentNotes = [
        `Creneau souhaite : ${creneauLabel}`,
        form.message.trim() ? `Message : ${form.message.trim()}` : null,
        diagnosticSummary ? `Diagnostic : ${diagnosticSummary}` : null,
        resteACharge ? `Reste a charge estime : ${resteACharge}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('brh_appointments')
        .insert({
          type: 'diagnostic',
          diagnostic_id: diagnosticId && diagnosticId !== 'local' ? diagnosticId : null,
          contact_name: form.nom.trim(),
          contact_phone: phoneClean,
          contact_email: form.email.trim().toLowerCase(),
          preferred_slot: form.creneau,
          notes: appointmentNotes,
          status: 'pending',
        })

      setIsConfirmed(true)
    } catch (err) {
      console.error('ContactRdvModal submit error:', err)
      setSubmitError('Une erreur est survenue. Veuillez reessayer ou nous appeler au 07 84 86 39 51.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Modal */}
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden">

        {/* Bouton fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        {/* ===== ECRAN DE CONFIRMATION ===== */}
        {isConfirmed ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-[#1c7b1d]" />
            </div>
            <h2 className="font-display text-2xl text-slate-900 mb-2">
              Merci {prenom} !
            </h2>
            <p className="font-body text-slate-500 mb-6 leading-relaxed">
              Un conseiller BRH Habitat vous contactera sous 24h pour donner suite a votre demande.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <p className="font-body text-xs text-slate-400 mb-1">Recapitulatif</p>
              <p className="font-display text-sm text-slate-700">{form.nom.trim()}</p>
              <p className="font-body text-xs text-slate-500">{form.telephone} — {form.email}</p>
              <p className="font-body text-xs text-slate-500 mt-1">
                Creneau : {CRENEAUX.find((c) => c.value === form.creneau)?.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1c7b1d] text-white font-display text-sm hover:bg-[#1c7b1d]/90 transition-colors"
            >
              Revenir a mes resultats
            </button>
          </div>
        ) : (
          <>
            {/* ===== HEADER ===== */}
            <div className="bg-gradient-to-br from-[#1c7b1d] to-[#359932] px-7 pt-7 pb-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h2 className="font-display text-xl leading-tight">
                    Un expert vous rappelle sous 24h
                  </h2>
                  <p className="font-body text-green-200 text-xs mt-0.5">
                    Gratuit et sans engagement
                  </p>
                </div>
              </div>

              {/* Resume diagnostic */}
              <div className="bg-white/15 rounded-xl px-4 py-3 mt-2">
                <p className="font-body text-green-100 text-xs leading-relaxed">
                  {diagnosticSummary}
                  {resteACharge && (
                    <span className="font-bold text-white"> — Reste a charge estime : {resteACharge}</span>
                  )}
                </p>
              </div>
            </div>

            {/* ===== FORMULAIRE ===== */}
            <div className="px-7 py-6 space-y-5">

              {/* Nom */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={form.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${
                    errors.nom
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/30'
                      : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10 bg-white'
                  }`}
                />
                {errors.nom && (
                  <p className="mt-1 text-xs text-red-500 font-body">{errors.nom}</p>
                )}
              </div>

              {/* Telephone */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">
                  Telephone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="06 XX XX XX XX"
                  value={form.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${
                    errors.telephone
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/30'
                      : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10 bg-white'
                  }`}
                />
                {errors.telephone && (
                  <p className="mt-1 text-xs text-red-500 font-body">{errors.telephone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/30'
                      : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10 bg-white'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500 font-body">{errors.email}</p>
                )}
              </div>

              {/* Creneau */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-2">
                  Quand pouvons-nous vous rappeler ?
                </label>
                <div className="flex flex-wrap gap-2">
                  {CRENEAUX.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleChange('creneau', c.value)}
                      className={`flex-1 min-w-[130px] px-3 py-2.5 rounded-xl border font-body text-xs text-center transition-all ${
                        form.creneau === c.value
                          ? 'bg-[#1c7b1d] border-[#1c7b1d] text-white shadow-sm shadow-[#1c7b1d]/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#1c7b1d]/40 hover:bg-[#1c7b1d]/5'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">
                  Message <span className="font-body text-slate-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Precisions sur votre projet, adresse du bien..."
                  value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:border-[#1c7b1d] focus:ring-2 focus:ring-[#1c7b1d]/10 transition-all resize-none"
                />
              </div>

              {/* Erreur globale */}
              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 font-body">
                  {submitError}
                </p>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#1c7b1d] text-white font-display text-base flex items-center justify-center gap-2 hover:bg-[#1c7b1d]/90 transition-colors shadow-lg shadow-[#1c7b1d]/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Phone size={16} />
                    Etre recontacte
                  </>
                )}
              </button>

              {/* Footer securite */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-body pb-1">
                <Lock size={12} className="shrink-0" />
                <span>Vos donnees sont protegees et ne seront jamais vendues.</span>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
