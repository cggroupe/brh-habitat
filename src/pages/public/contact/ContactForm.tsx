import { logError } from '@/lib/error'
import { useState } from 'react'
import { Send, CheckCircle } from 'lucide-react'
import { useCreateContact } from '@/hooks/queries'

type Sujet =
  | ''
  | 'Demande de devis'
  | 'Question technique'
  | 'Prise de rendez-vous'
  | 'Autre'

interface FormState {
  nom: string
  email: string
  telephone: string
  sujet: Sujet
  message: string
}

const INITIAL_FORM: FormState = {
  nom: '',
  email: '',
  telephone: '',
  sujet: '',
  message: '',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputBase =
  'w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400'

export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const createContact = useCreateContact()

  const isOnCooldown = cooldownUntil !== null && Date.now() < cooldownUntil

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (form.nom.trim().length < 2) {
      setSubmitError('Le nom doit contenir au moins 2 caracteres.')
      return
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setSubmitError('Veuillez saisir une adresse email valide.')
      return
    }
    if (form.message.trim().length < 10) {
      setSubmitError('Le message doit contenir au moins 10 caracteres.')
      return
    }

    try {
      await createContact.mutateAsync({
        nom: form.nom.trim(),
        email: form.email.trim().toLowerCase(),
        telephone: form.telephone.trim() || null,
        sujet: form.sujet || null,
        message: form.message.trim(),
        status: 'nouveau',
        admin_notes: null,
      })

      setCooldownUntil(Date.now() + 30_000)
      setSubmitted(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      logError('Erreur envoi contact', err)
      setSubmitError(
        'Une erreur est survenue lors de l\'envoi. Veuillez reessayer ou nous appeler directement au 02 19 00 53 05.'
      )
    }
  }

  return (
    <div className="lg:col-span-3">
      <div className="bg-white rounded-xl p-8 sm:p-10 shadow-sm border border-slate-100">
        {/* Form header */}
        <div className="border-l-4 border-primary pl-6 mb-8">
          <h2 className="font-display text-3xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-2">
            Envoyez-nous un message
          </h2>
          <p className="font-body text-slate-500 text-sm mt-3">
            Remplissez le formulaire ci-dessous, nous vous repondons sous 24h.
          </p>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="flex flex-col items-center text-center py-14 gap-5">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle size={36} className="text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-slate-900 uppercase tracking-wide mb-2">
                Message envoye !
              </h3>
              <p className="font-body text-slate-500 max-w-sm leading-relaxed">
                Merci pour votre message. Notre equipe vous recontactera
                dans les plus brefs delais.
              </p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 font-body text-sm font-semibold text-primary hover:text-primary-dark transition-colors underline underline-offset-4"
            >
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Row: Nom + Email */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nom" className="block text-sm font-semibold text-slate-700 mb-2 font-body">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  id="nom"
                  name="nom"
                  type="text"
                  required
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 font-body">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="vous@exemple.com"
                  className={inputBase}
                />
              </div>
            </div>

            {/* Row: Telephone + Sujet */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="telephone" className="block text-sm font-semibold text-slate-700 mb-2 font-body">
                  Telephone
                </label>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="07 00 00 00 00"
                  className={inputBase}
                />
              </div>
              <div>
                <label htmlFor="sujet" className="block text-sm font-semibold text-slate-700 mb-2 font-body">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <select
                  id="sujet"
                  name="sujet"
                  required
                  value={form.sujet}
                  onChange={handleChange}
                  className={[inputBase, form.sujet === '' ? 'text-slate-400' : ''].join(' ')}
                >
                  <option value="" disabled>Choisir un sujet</option>
                  <option value="Demande de devis">Demande de devis</option>
                  <option value="Question technique">Question technique</option>
                  <option value="Prise de rendez-vous">Prise de rendez-vous</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2 font-body">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={form.message}
                onChange={handleChange}
                placeholder="Decrivez votre projet ou votre question..."
                className={[inputBase, 'resize-none'].join(' ')}
              />
            </div>

            {/* Erreur globale */}
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100 font-body">
                {submitError}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={createContact.isPending || isOnCooldown}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wide"
            >
              {createContact.isPending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Envoyer le message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
