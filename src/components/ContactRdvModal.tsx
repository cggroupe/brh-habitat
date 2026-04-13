import { logError } from '@/lib/error'
import { useState } from 'react'
import { CalendarDays, CheckCircle2, Lock, X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatLocalDate } from '@/lib/utils'

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

interface DispoSlot {
  date: string
  periode: 'matin' | 'apres-midi'
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^0[0-9]{9}$/

function normalizePhone(phone: string): string {
  return phone.replace(/[\s.\-()]/g, '')
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.nom.trim()) errors.nom = 'Le nom est obligatoire'
  const phoneClean = normalizePhone(form.telephone)
  if (!phoneClean) errors.telephone = 'Le telephone est obligatoire'
  else if (!PHONE_REGEX.test(phoneClean)) errors.telephone = 'Format invalide (ex : 06 12 34 56 78)'
  if (!form.email.trim()) errors.email = "L'email est obligatoire"
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Format email invalide'
  return errors
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

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
  const [dispos, setDispos] = useState<DispoSlot[]>([])
  const [newDate, setNewDate] = useState('')
  const [newPeriode, setNewPeriode] = useState<'matin' | 'apres-midi'>('matin')
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const prenom = form.nom.trim().split(' ')[0] ?? form.nom.trim()
  const today = formatLocalDate()

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function addDispo() {
    if (!newDate) return
    const exists = dispos.some((d) => d.date === newDate && d.periode === newPeriode)
    if (exists) return
    setDispos((prev) => [...prev, { date: newDate, periode: newPeriode }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewDate('')
  }

  function removeDispo(index: number) {
    setDispos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (dispos.length === 0) {
      setSubmitError('Veuillez ajouter au moins un creneau de disponibilite.')
      return
    }

    setIsLoading(true)
    setSubmitError(null)

    try {
      const phoneClean = normalizePhone(form.telephone)

      // 1. Mettre a jour le diagnostic avec les coordonnees
      if (diagnosticId && diagnosticId !== 'local') {
        await supabase
          .from('brh_diagnostics')
          .update({
            contact_name: form.nom.trim(),
            contact_phone: phoneClean,
            contact_email: form.email.trim().toLowerCase(),
            status: 'contacted',
          })
          .eq('id', diagnosticId)
      }

      // 2. Creer le RDV dans brh_appointments (plus d'appel CRM)
      const dispoText = dispos
        .map((d) => `${formatDateLabel(d.date)} — ${d.periode === 'matin' ? 'Matin (8h-12h)' : 'Apres-midi (14h-18h)'}`)
        .join('\n')

      const { error: apptError } = await supabase
        .from('brh_appointments')
        .insert({
          type: 'diagnostic',
          diagnostic_id: diagnosticId && diagnosticId !== 'local' ? diagnosticId : null,
          contact_name: form.nom.trim(),
          contact_phone: phoneClean,
          contact_email: form.email.trim().toLowerCase(),
          requested_date: new Date(dispos[0].date).toISOString(),
          preferred_slot: dispoText,
          notes: [
            `Disponibilites client :\n${dispoText}`,
            form.message.trim() ? `Message : ${form.message.trim()}` : null,
            diagnosticSummary ? `Diagnostic : ${diagnosticSummary}` : null,
            resteACharge ? `Reste a charge estime : ${resteACharge}` : null,
            referralCode ? `Source affilie : ${referralCode}` : null,
          ]
            .filter(Boolean)
            .join('\n\n'),
          status: 'demande',
          referral_code: referralCode || null,
        })

      if (apptError) {
        throw new Error('Erreur lors de l\'enregistrement du rendez-vous.')
      }

      setIsConfirmed(true)
    } catch (err) {
      logError('ContactRdvModal submit error', err)
      setSubmitError('Une erreur inattendue est survenue. Veuillez reessayer ou nous appeler au 02 19 00 53 05.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-[520px] max-h-[92vh] bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-y-auto">
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Fermer">
          <X size={16} />
        </button>

        {isConfirmed ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-[#1c7b1d]" />
            </div>
            <h2 className="font-display text-2xl text-slate-900 mb-2">Merci {prenom} !</h2>
            <p className="font-body text-slate-500 mb-6 leading-relaxed">
              Votre demande de rendez-vous a ete envoyee. L'equipe BRH vous recontactera pour confirmer le creneau.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
              <p className="font-body text-xs text-slate-400 mb-1">Recapitulatif</p>
              <p className="font-display text-sm text-slate-700">{form.nom.trim()}</p>
              <p className="font-body text-xs text-slate-500">{form.telephone} — {form.email}</p>
              <div className="mt-2">
                <p className="font-body text-xs text-slate-400 mb-1">Vos disponibilites :</p>
                {dispos.map((d, i) => (
                  <p key={i} className="font-body text-xs text-slate-600 capitalize">
                    {formatDateLabel(d.date)} — {d.periode === 'matin' ? 'Matin' : 'Apres-midi'}
                  </p>
                ))}
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1c7b1d] text-white font-display text-sm hover:bg-[#1c7b1d]/90 transition-colors">
              Revenir a mes resultats
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1c7b1d] to-[#359932] px-7 pt-7 pb-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="font-display text-xl leading-tight">Demande de rendez-vous</h2>
                  <p className="font-body text-green-200 text-xs mt-0.5">Gratuit et sans engagement</p>
                </div>
              </div>
              <div className="bg-white/15 rounded-xl px-4 py-3 mt-2">
                <p className="font-body text-green-100 text-xs leading-relaxed">
                  {diagnosticSummary}
                  {resteACharge && <span className="font-bold text-white"> — Reste a charge estime : {resteACharge}</span>}
                </p>
              </div>
            </div>

            {/* Formulaire */}
            <div className="px-7 py-6 space-y-5">
              {/* Nom */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">Nom complet <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Jean Dupont" value={form.nom} onChange={(e) => handleChange('nom', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${errors.nom ? 'border-red-300 focus:ring-red-100 bg-red-50/30' : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10'}`} />
                {errors.nom && <p className="mt-1 text-xs text-red-500 font-body">{errors.nom}</p>}
              </div>

              {/* Telephone */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">Telephone <span className="text-red-500">*</span></label>
                <input type="tel" placeholder="06 XX XX XX XX" value={form.telephone} onChange={(e) => handleChange('telephone', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${errors.telephone ? 'border-red-300 focus:ring-red-100 bg-red-50/30' : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10'}`} />
                {errors.telephone && <p className="mt-1 text-xs text-red-500 font-body">{errors.telephone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input type="email" placeholder="vous@exemple.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-100 bg-red-50/30' : 'border-slate-200 focus:border-[#1c7b1d] focus:ring-[#1c7b1d]/10'}`} />
                {errors.email && <p className="mt-1 text-xs text-red-500 font-body">{errors.email}</p>}
              </div>

              {/* Disponibilites */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-2">
                  Vos disponibilites <span className="text-red-500">*</span>
                </label>
                <p className="font-body text-xs text-slate-400 mb-3">
                  Indiquez les creneaux ou vous etes disponible. L'equipe BRH vous recontactera pour confirmer.
                </p>

                {/* Sélecteur d'ajout */}
                <div className="flex gap-2 mb-3">
                  <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 font-body text-sm text-slate-900 focus:outline-none focus:border-[#1c7b1d] focus:ring-2 focus:ring-[#1c7b1d]/10" />
                  <select value={newPeriode} onChange={(e) => setNewPeriode(e.target.value as 'matin' | 'apres-midi')}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-[#1c7b1d]">
                    <option value="matin">Matin</option>
                    <option value="apres-midi">Apres-midi</option>
                  </select>
                  <button type="button" onClick={addDispo} disabled={!newDate}
                    className="px-3 py-2.5 rounded-xl bg-[#1c7b1d] text-white hover:bg-[#1c7b1d]/90 transition-colors disabled:opacity-40">
                    <Plus size={16} />
                  </button>
                </div>

                {/* Liste des dispos */}
                {dispos.length > 0 && (
                  <div className="space-y-2">
                    {dispos.map((d, i) => (
                      <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-[#1c7b1d]" />
                          <span className="font-body text-xs text-[#1c7b1d] font-medium capitalize">
                            {formatDateLabel(d.date)} — {d.periode === 'matin' ? 'Matin (8h-12h)' : 'Apres-midi (14h-18h)'}
                          </span>
                        </div>
                        <button type="button" onClick={() => removeDispo(i)} className="p-1 text-red-400 hover:text-red-600">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block font-display text-sm text-slate-800 mb-1.5">
                  Message <span className="font-body text-slate-400 font-normal">(optionnel)</span>
                </label>
                <textarea rows={3} placeholder="Precisions sur votre projet..." value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 font-body focus:outline-none focus:border-[#1c7b1d] focus:ring-2 focus:ring-[#1c7b1d]/10 transition-all resize-none" />
              </div>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 font-body">{submitError}</p>
              )}

              <button type="button" onClick={() => void handleSubmit()} disabled={isLoading || dispos.length === 0}
                className="w-full py-3.5 rounded-xl bg-[#1c7b1d] text-white font-display text-base flex items-center justify-center gap-2 hover:bg-[#1c7b1d]/90 transition-colors shadow-lg shadow-[#1c7b1d]/25 disabled:opacity-50 disabled:cursor-not-allowed">
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
                    <CalendarDays size={16} />
                    Envoyer ma demande de rendez-vous
                  </>
                )}
              </button>

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
