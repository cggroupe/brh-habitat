import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, ArrowRight, CheckCircle, Send, Shield, Star } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Contact info items ───────────────────────────────────────────────────────

const contactItems = [
  {
    icon: MapPin,
    label: 'Adresse',
    value: '35 rue de Kervao\n29490 Guipavas',
    href: 'https://maps.google.com/?q=35+rue+de+Kervao+29490+Guipavas',
    isLink: true,
  },
  {
    icon: Phone,
    label: 'Telephone',
    value: '07 84 86 39 51',
    href: 'tel:0784863951',
    isLink: true,
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@contact-brh.fr',
    href: 'mailto:contact@contact-brh.fr',
    isLink: true,
  },
] as const

const hoursItems = [
  { days: 'Lundi - Vendredi', hours: '8h00 - 18h00' },
  { days: 'Samedi', hours: '9h00 - 12h00' },
  { days: 'Dimanche', hours: 'Ferme' },
]

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase =
  'w-full px-4 py-3.5 border border-slate-200 rounded-xl font-body text-sm text-slate-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-slate-400'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // Simulate async send
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      setForm(INITIAL_FORM)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-primary-dark overflow-hidden">
        {/* Subtle dot pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="font-body text-primary-light text-sm font-semibold uppercase tracking-widest mb-4">
              BRH — Bretagne Renovation Habitat
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight leading-none mb-6">
              Contactez-nous
            </h1>
            <p className="font-body text-lg text-slate-300 leading-relaxed">
              Notre equipe est a votre ecoute. Reponse sous 24h, devis gratuit sous 48h.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6 mt-10">
            <div className="flex items-center gap-2 text-white/70">
              <Shield size={16} className="text-primary-light" />
              <span className="font-body text-sm">Artisans certifies RGE</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Star size={16} className="text-primary-light" />
              <span className="font-body text-sm">4.8/5 satisfaction client</span>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock size={16} className="text-primary-light" />
              <span className="font-body text-sm">Devis sous 48h</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">

            {/* ── Left : Contact form (3/5) ─────────────────────────── */}
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
                        <label
                          htmlFor="nom"
                          className="block text-sm font-semibold text-slate-700 mb-2 font-body"
                        >
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
                        <label
                          htmlFor="email"
                          className="block text-sm font-semibold text-slate-700 mb-2 font-body"
                        >
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
                        <label
                          htmlFor="telephone"
                          className="block text-sm font-semibold text-slate-700 mb-2 font-body"
                        >
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
                        <label
                          htmlFor="sujet"
                          className="block text-sm font-semibold text-slate-700 mb-2 font-body"
                        >
                          Sujet <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="sujet"
                          name="sujet"
                          required
                          value={form.sujet}
                          onChange={handleChange}
                          className={[
                            inputBase,
                            form.sujet === '' ? 'text-slate-400' : '',
                          ].join(' ')}
                        >
                          <option value="" disabled>
                            Choisir un sujet
                          </option>
                          <option value="Demande de devis">Demande de devis</option>
                          <option value="Question technique">Question technique</option>
                          <option value="Prise de rendez-vous">Prise de rendez-vous</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-semibold text-slate-700 mb-2 font-body"
                      >
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

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-display font-bold text-base rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wide"
                    >
                      {submitting ? (
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

            {/* ── Right : Contact info (2/5) ────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Company card */}
              <div className="bg-primary-dark rounded-xl p-8 text-white">
                <span className="font-display text-4xl font-bold tracking-widest text-white block mb-1 uppercase">
                  BRH
                </span>
                <p className="font-body text-primary-light text-xs font-semibold uppercase tracking-widest">
                  Bretagne Renovation Habitat
                </p>
                <div className="h-px w-12 bg-primary-light/40 my-5" />
                <p className="font-body text-slate-300 text-sm leading-relaxed">
                  Expert en renovation et diagnostic habitat en Finistere.
                  Artisans certifies RGE, devis gratuit sous 48h.
                </p>
              </div>

              {/* Contact details */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary mb-1">
                  Nos coordonnees
                </h3>
                <div className="h-0.5 w-10 bg-primary mb-6" />

                <div className="space-y-5">
                  {contactItems.map(({ icon: Icon, label, value, href }) => (
                    <a
                      key={label}
                      href={href}
                      target={label === 'Adresse' ? '_blank' : undefined}
                      rel={label === 'Adresse' ? 'noopener noreferrer' : undefined}
                      className="group flex items-start gap-4 hover:opacity-75 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                        <Icon size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-body text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                          {label}
                        </p>
                        <p className="font-body text-sm text-slate-800 leading-snug whitespace-pre-line font-medium">
                          {value}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Opening hours */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-primary" />
                  </div>
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
                    Horaires d'ouverture
                  </h3>
                </div>
                <ul className="space-y-3">
                  {hoursItems.map(({ days, hours }) => (
                    <li
                      key={days}
                      className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-3 last:pb-0"
                    >
                      <span className="font-body text-sm text-slate-500">{days}</span>
                      <span
                        className={[
                          'font-body text-sm font-semibold',
                          hours === 'Ferme' ? 'text-slate-400' : 'text-slate-800',
                        ].join(' ')}
                      >
                        {hours}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick CTA */}
              <div className="bg-background rounded-xl border border-slate-200 p-8">
                <p className="font-display text-base font-bold text-slate-900 uppercase tracking-wide mb-2">
                  Besoin d'un devis rapide ?
                </p>
                <p className="font-body text-sm text-slate-500 mb-6 leading-relaxed">
                  Lancez notre diagnostic en ligne et recevez une estimation
                  personnalisee sous 48h.
                </p>
                <Link
                  to="/diagnostic"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-display text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors shadow-md shadow-primary/20 uppercase tracking-wide"
                >
                  Faire mon diagnostic gratuit
                  <ArrowRight size={14} />
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
