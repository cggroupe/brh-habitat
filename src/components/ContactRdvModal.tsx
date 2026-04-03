import { useState } from 'react'
import { CalendarDays, CheckCircle2, Lock, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CalendarPicker, type TimeSlot } from './CalendarPicker'

// ---------------------------------------------------------------------------
// Config API CRM
// ---------------------------------------------------------------------------

const BOOKING_API_URL = 'https://woicuzcxfdknxqdjuamj.supabase.co/functions/v1/public-booking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactRdvModalProps {
  onClose: () => void
  diagnosticId?: string
  diagnosticSummary: string
  propertyAddress?: string
  resteACharge?: string
  referralCode?: string | null
}

interface FormState {
  nom: string
  telephone: string
  email: string
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
// Helpers
// ---------------------------------------------------------------------------

function extractDepartement(address?: string): string | undefined {
  if (!address) return undefined
  const match = address.match(/\b(\d{5})\b/)
  return match ? match[1].slice(0, 2) : undefined
}

function formatSlotLabel(slot: TimeSlot): string {
  const [y, m, d] = slot.date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${dateStr} de ${slot.heure_debut} a ${slot.heure_fin}`
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function ContactRdvModal({
  onClose,
  diagnosticId,
  diagnosticSummary,
  propertyAddress,
  resteACharge,
  referralCode,
}: ContactRdvModalProps) {
  const [form, setForm] = useState<FormState>({
    nom: '',
    telephone: '',
    email: '',
    message: propertyAddress ? `Adresse du bien : ${propertyAddress}` : '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string>('')

  const prenom = form.nom.trim().split(' ')[0] ?? form.nom.trim()
  const departement = extractDepartement(propertyAddress)

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

    if (!selectedSlot) {
      setSubmitError('Veuillez selectionner un creneau dans le calendrier.')
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const phoneClean = normalizePhone(form.telephone)

      // 1. Mettre a jour le diagnostic avec les coordonnees de contact
      if (diagnosticId && diagnosticId !== 'local') {
        const { error: diagError } = await supabase
          .from('brh_diagnostics')
          .update({
            contact_name: form.nom.trim(),
            contact_phone: phoneClean,
            contact_email: form.email.trim().toLowerCase(),
          })
          .eq('id', diagnosticId)

        if (diagError) {
          console.error('Erreur mise a jour diagnostic:', diagError)
          // Non bloquant : on continue
        }
      }

      // 2. Appeler l'API de reservation du CRM
      const crmResponse = await fetch(BOOKING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_BRHCRM_ANON_KEY ?? '',
          Authorization: `Bearer ${import.meta.env.VITE_BRHCRM_ANON_KEY ?? ''}`,
        },
        body: JSON.stringify({
          date: selectedSlot.date,
          heure_debut: selectedSlot.heure_debut,
          heure_fin: selectedSlot.heure_fin,
          contact_name: form.nom.trim(),
          contact_phone: phoneClean,
          contact_email: form.email.trim().toLowerCase(),
          lieu: propertyAddress,
          notes: form.message.trim() || undefined,
          diagnostic_id: diagnosticId && diagnosticId !== 'local' ? diagnosticId : undefined,
          diagnostic_summary: diagnosticSummary || undefined,
          departement,
          referral_code: referralCode || undefined,
        }),
      })

      // Creneau deja pris
      if (crmResponse.status === 409) {
        setSubmitError('Ce creneau vient d\'etre pris. Veuillez en choisir un autre.')
        setSelectedSlot(null)
        setIsLoading(false)
        return
      }

      if (!crmResponse.ok) {
        throw new Error(`CRM API error ${crmResponse.status}`)
      }

      // 3. Conserver une trace locale dans brh_appointments (non bloquant)
      const { error: apptError } = await supabase
        .from('brh_appointments')
        .insert({
          type: 'diagnostic',
          diagnostic_id: diagnosticId && diagnosticId !== 'local' ? diagnosticId : null,
          contact_name: form.nom.trim(),
          contact_phone: phoneClean,
          contact_email: form.email.trim().toLowerCase(),
          preferred_slot: `${selectedSlot.date} ${selectedSlot.heure_debut}`,
          notes: [
            `Creneau confirme : ${formatSlotLabel(selectedSlot)}`,
            form.message.trim() ? `Message : ${form.message.trim()}` : null,
            diagnosticSummary ? `Diagnostic : ${diagnosticSummary}` : null,
            resteACharge ? `Reste a charge estime : ${resteACharge}` : null,
            referralCode ? `Source affilie : ${referralCode}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          status: 'confirme',
          referral_code: referralCode || null,
        })

      if (apptError) {
        console.error('Erreur trace locale RDV:', apptError)
        // Non bloquant — le vrai RDV est dans le CRM
      }

      setConfirmedSlotLabel(formatSlotLabel(selectedSlot))
      setIsConfirmed(true)
    } catch (err) {
      console.error('ContactRdvModal submit error:', err)
      setSubmitError('Une erreur inattendue est survenue. Veuillez reessayer ou nous appeler au 02 19 00 53 05.')
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
      <div className="relative w-full max-w-[520px] max-h-[92vh] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-y-auto">

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
              Votre rendez-vous est confirme.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <p className="font-body text-xs text-slate-400 mb-1">Recapitulatif</p>
              <p className="font-display text-sm text-slate-700">{form.nom.trim()}</p>
              <p className="font-body text-xs text-slate-500">{form.telephone} — {form.email}</p>
              {confirmedSlotLabel && (
                <div className="mt-2 flex items-start gap-2">
                  <CalendarDays size={14} className="text-[#1c7b1d] shrink-0 mt-0.5" />
                  <p className="font-body text-xs text-slate-700 capitalize">
                    Rendez-vous le {confirmedSlotLabel}
                  </p>
                </div>
              )}
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
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="font-display text-xl leading-tight">
                    Choisissez votre creneau
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

              {/* Calendrier */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-2">
                  Choisissez un creneau <span className="text-red-500">*</span>
                </label>
                <CalendarPicker
                  departement={departement}
                  onSlotSelected={(slot) => {
                    setSelectedSlot(slot)
                    setSubmitError(null)
                  }}
                  selectedSlot={selectedSlot}
                />
                {/* Creneau selectionne */}
                {selectedSlot && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                    <CalendarDays size={14} className="text-[#1c7b1d] shrink-0" />
                    <p className="font-body text-xs text-[#1c7b1d] font-medium capitalize">
                      Rendez-vous le {formatSlotLabel(selectedSlot)}
                    </p>
                  </div>
                )}
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
                disabled={isLoading || !selectedSlot}
                className="w-full py-3.5 rounded-xl bg-[#1c7b1d] text-white font-display text-base flex items-center justify-center gap-2 hover:bg-[#1c7b1d]/90 transition-colors shadow-lg shadow-[#1c7b1d]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Confirmation en cours...
                  </>
                ) : (
                  <>
                    <CalendarDays size={16} />
                    {selectedSlot ? 'Confirmer le rendez-vous' : 'Choisissez un creneau'}
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
