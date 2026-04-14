import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react'

const contactItems = [
  {
    icon: MapPin,
    label: 'Adresse',
    value: '35 rue de Kervao\n29490 Guipavas',
    href: 'https://maps.google.com/?q=35+rue+de+Kervao+29490+Guipavas',
  },
  {
    icon: Phone,
    label: 'Telephone',
    value: '02 19 00 53 05',
    href: 'tel:0219005305',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'relationsclients@contact-brh.fr',
    href: 'mailto:relationsclients@contact-brh.fr',
  },
] as const

const hoursItems = [
  { days: 'Lundi - Vendredi', hours: '8h00 - 18h00' },
  { days: 'Samedi', hours: '9h00 - 12h00' },
  { days: 'Dimanche', hours: 'Ferme' },
]

export function ContactInfoPanel() {
  return (
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
  )
}
