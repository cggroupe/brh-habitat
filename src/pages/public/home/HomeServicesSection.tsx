import { Link } from 'react-router-dom'
import {
  Home, Thermometer, Zap, DoorOpen, Wind, Droplets, ArrowRight,
} from 'lucide-react'

const services = [
  {
    icon: Home,
    title: 'Toiture',
    description: 'Entretien, rénovation et démoussage de toitures pour protéger votre maison durablement.',
    href: '/services#toiture',
  },
  {
    icon: Thermometer,
    title: 'Isolation',
    description: "Isolation des combles, murs et sols. Réduisez votre facture énergétique jusqu'à 30%.",
    href: '/services#isolation',
  },
  {
    icon: Zap,
    title: 'Électricité',
    description: 'Mise aux normes, installation de tableaux électriques et domotique connectée.',
    href: '/services#electricite',
  },
  {
    icon: DoorOpen,
    title: 'Menuiseries',
    description: "Installation de fenêtres double vitrage, portes d'entrée et volets roulants sur mesure.",
    href: '/services#menuiseries',
  },
  {
    icon: Wind,
    title: 'Ventilation',
    description: 'Installation de VMC simple et double flux pour un air sain dans toute la maison.',
    href: '/services#ventilation',
  },
  {
    icon: Droplets,
    title: "Traitement de l'eau",
    description: "Adoucisseurs et purificateurs d'eau pour protéger vos canalisations du calcaire.",
    href: '/services#traitement-eau',
  },
]

export function HomeServicesSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="border-l-4 border-primary pl-6">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-2">NOS SERVICES</h2>
            <p className="text-lg text-slate-600 max-w-xl">
              Une expertise complète pour tous vos projets de rénovation énergétique et
              d'amélioration de l'habitat.
            </p>
          </div>
          <Link
            to="/services"
            className="hidden md:flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all"
          >
            Voir tous les services
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(({ icon: Icon, title, description, href }) => (
            <div
              key={title}
              className="group bg-background rounded-xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
            >
              <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center text-primary mb-6 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon size={28} />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-slate-600 mb-6">{description}</p>
              <Link
                to={href}
                className="inline-flex items-center text-sm font-bold text-primary group-hover:underline"
              >
                En savoir plus
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile "see all" link */}
        <div className="mt-8 text-center md:hidden">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all"
          >
            Voir tous les services
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  )
}
