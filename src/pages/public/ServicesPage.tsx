import { Link } from 'react-router-dom'
import {
  Home,
  Thermometer,
  Zap,
  DoorOpen,
  Wind,
  Droplets,
  Hammer,
  Check,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  Clock,
  Wrench,
  Leaf,
  Euro,
  Phone,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: string
  icon: React.ElementType
  title: string
  subtitle: string
  description: string
  prestations: string[]
  note?: string
  bgAlt?: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const services: Service[] = [
  {
    id: 'toiture',
    icon: Home,
    title: 'Toiture / Couverture',
    subtitle: 'Protection durable contre le climat breton',
    description:
      "Spécialistes de la toiture en Bretagne, nous intervenons sur tous types de couvertures avec une expertise particulière pour les ardoises et tuiles adaptées au climat finistérien. Humidité, vent, embruns : nous protégeons votre maison durablement.",
    prestations: [
      'Couverture ardoise et tuiles (spécialiste climat breton)',
      'Traitement hydrofuge — imperméabilisation complète',
      'Traitement ignifuge — protection incendie',
      'Traitement contre les insectes — charpente protégée',
      'Démoussage et lessivage professionnel',
      'Réparation et rénovation complète',
      'Gouttières et zinguerie sur mesure',
    ],
    bgAlt: false,
  },
  {
    id: 'isolation',
    icon: Thermometer,
    title: 'Isolation Thermique',
    subtitle: 'Économies d\'énergie et confort toute l\'année',
    description:
      "L'isolation est le meilleur investissement pour réduire vos factures et améliorer votre confort. Certifiés RGE, nous vous accompagnons de A à Z : diagnostic, travaux et montage des dossiers d'aides financières pour alléger votre reste à charge.",
    prestations: [
      'Isolation des combles perdus et sous-rampants',
      'Isolation des murs par l\'extérieur (ITE) et par l\'intérieur (ITI)',
      'Isolation du garage et des espaces non chauffés',
      'Isolation du plancher bas',
      'TVA réduite à 5,5% sur les travaux d\'isolation',
      'Accompagnement MaPrimeRénov\' et CEE',
      'Montage des dossiers aides financières inclus',
    ],
    note: 'Artisans certifiés RGE — éligibilité aux aides garantie.',
    bgAlt: true,
  },
  {
    id: 'electricite',
    icon: Zap,
    title: 'Électricité',
    subtitle: 'Mise en conformité et installation connectée',
    description:
      "Sécurité et modernité : nos électriciens qualifiés mettent votre installation aux normes NF C 15-100 et vous proposent des solutions domotiques pour piloter votre maison intelligemment. Intervention rapide et devis gratuit sous 48h.",
    prestations: [
      'Changement et mise à jour du tableau électrique',
      'Mise en conformité NF C 15-100',
      'Installation de prises, interrupteurs et nouveaux circuits',
      'Domotique connectée (pilotage smartphone)',
      'Diagnostic électrique complet',
      'Câblage réseau et points de recharge véhicule électrique',
    ],
    bgAlt: false,
  },
  {
    id: 'menuiseries',
    icon: DoorOpen,
    title: 'Menuiseries',
    subtitle: 'Confort acoustique, thermique et sécurité',
    description:
      "Fenêtres, portes, volets : des menuiseries performantes réduisent jusqu'à 15% de vos pertes de chaleur. Nous proposons des solutions sur mesure adaptées au style de votre maison bretonne, avec pose et finitions incluses.",
    prestations: [
      'Fenêtres double et triple vitrage performantes',
      'Portes d\'entrée sur mesure — sécurité renforcée',
      'Volets roulants (électriques ou manuels) et battants',
      'Portes intérieures et placards',
      'Baies vitrées et vérandas',
      'Remplacement de vitrage seul (soufflage)',
    ],
    bgAlt: true,
  },
  {
    id: 'ventilation',
    icon: Wind,
    title: 'Ventilation',
    subtitle: 'Air sain et maîtrise de l\'humidité',
    description:
      "En Bretagne, l'humidité est l'ennemi numéro un de votre maison. Une ventilation bien dimensionnée élimine les condensations, prévient les moisissures et assure un air intérieur sain. Nous installons et entretenons tous types de VMC.",
    prestations: [
      'VMC simple flux hygroréglable — solution économique',
      'VMC double flux avec récupération de chaleur',
      'VMI — Ventilation Mécanique par Insufflation',
      'Entretien et nettoyage des systèmes existants',
      'Diagnostic ventilation de votre logement',
      'Remplacement des bouches et gaines',
    ],
    bgAlt: false,
  },
  {
    id: 'traitement-eau',
    icon: Droplets,
    title: "Traitement de l'Eau",
    subtitle: 'Protection des canalisations et eau de qualité',
    description:
      "Le calcaire détruit silencieusement vos canalisations, appareils électroménagers et chauffe-eau. Nos solutions de traitement de l'eau protègent votre installation et améliorent la qualité de l'eau au quotidien.",
    prestations: [
      'Adoucisseurs d\'eau — protection anticalcaire complète',
      'Purificateurs et systèmes de filtration',
      'Osmoseurs sous évier — eau pure au robinet',
      'Protection des canalisations contre le tartre',
      'Entretien et régénération des équipements',
      'Analyse de la dureté de l\'eau incluse',
    ],
    bgAlt: true,
  },
  {
    id: 'second-oeuvre',
    icon: Hammer,
    title: 'Second Œuvre',
    subtitle: 'Finitions, façade et aménagements intérieurs',
    description:
      "Du ravalement de façade à la peinture intérieure, notre équipe de second œuvre prend en charge l'ensemble des finitions pour sublimer votre habitat. Un interlocuteur unique pour tous vos travaux.",
    prestations: [
      'Plâtrerie, cloisons et doublages',
      'Ravalement de façade — nettoyage et traitement',
      'Peinture intérieure et extérieure',
      'Enduits décoratifs et projections',
      'Faux plafonds et isolation phonique',
      'Carrelage et revêtements de sol',
    ],
    bgAlt: false,
  },
]

// ─── Trust badges ──────────────────────────────────────────────────────────────

const trustBadges = [
  { icon: ShieldCheck, label: 'Assurance décennale' },
  { icon: BadgeCheck, label: 'Artisans certifiés RGE' },
  { icon: Clock, label: 'Devis gratuit sous 48h' },
  { icon: Wrench, label: '20+ ans d\'expérience' },
  { icon: Leaf, label: 'Contrôle qualité indépendant' },
  { icon: Euro, label: 'Accompagnement aides financières' },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <div className="min-h-screen">

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-primary-dark overflow-hidden">
        {/* Dot pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Right gradient accent */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="font-body text-primary-light text-sm font-semibold uppercase tracking-widest mb-4">
              BRH — Bretagne Renovation Habitat
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight leading-none mb-6">
              Nos Services
            </h1>
            <p className="font-body text-lg text-slate-300 leading-relaxed max-w-2xl">
              Une expertise complète pour tous vos projets de rénovation en Bretagne.
              Artisans certifiés RGE, devis gratuit sous 48h, accompagnement des aides financières inclus.
            </p>
          </div>

          {/* Trust badges strip */}
          <div className="flex flex-wrap gap-6 mt-10">
            {trustBadges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/70">
                <Icon size={16} className="text-primary-light shrink-0" />
                <span className="font-body text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. INTRO ANCHORS ─────────────────────────────────────────────────── */}
      <nav
        aria-label="Navigation des services"
        className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
            {services.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap shrink-0"
              >
                <s.icon size={15} />
                {s.title.split(' /')[0].split(' Œ')[0]}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── 3. SERVICES ──────────────────────────────────────────────────────── */}
      {services.map((service) => (
        <ServiceSection key={service.id} service={service} />
      ))}

      {/* ── 4. FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-primary-dark py-20 lg:py-28 relative overflow-hidden">
        {/* Dot pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">

            {/* Left block */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
                Commençons ensemble
              </div>
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Un projet de rénovation ?<br />Parlons-en.
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                Diagnostic gratuit, devis personnalisé sous 48h et accompagnement pour
                toutes les aides financières disponibles (MaPrimeRénov', CEE, éco-PTZ, TVA 5,5%).
              </p>
              <ul className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start text-white/80 text-sm font-medium">
                {[
                  'Sans engagement',
                  'Réponse sous 24h',
                  'Artisans certifiés RGE',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white shrink-0">
                      <Check size={12} className="text-primary" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0">
              <Link
                to="/diagnostic"
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-5 text-base font-bold text-primary-dark transition-all duration-200 bg-white rounded-xl hover:bg-neutral-gray hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              >
                <span>Démarrer mon diagnostic gratuit</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 text-base font-bold text-white border-2 border-white/30 rounded-xl hover:border-white hover:bg-white/10 transition-all duration-200"
              >
                <Phone size={18} />
                <span>Demander un devis</span>
              </Link>
            </div>

          </div>
        </div>
      </section>

    </div>
  )
}

// ─── ServiceSection sub-component ────────────────────────────────────────────

function ServiceSection({ service }: { service: Service }) {
  const { id, icon: Icon, title, subtitle, description, prestations, note, bgAlt } = service

  return (
    <section
      id={id}
      className={[
        'py-20 lg:py-28 scroll-mt-16',
        bgAlt ? 'bg-background' : 'bg-white',
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* ── Left: Title + description + CTA ───────────────────────────── */}
          <div>
            {/* Section header */}
            <div className="border-l-4 border-primary pl-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon size={22} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {subtitle}
                </span>
              </div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-slate-900 uppercase tracking-tight leading-tight">
                {title}
              </h2>
            </div>

            {/* Description */}
            <p className="text-slate-600 leading-relaxed mb-8 text-base">
              {description}
            </p>

            {/* Note badge if present */}
            {note && (
              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-8">
                <BadgeCheck size={18} className="text-primary shrink-0" />
                <p className="text-sm font-semibold text-primary">{note}</p>
              </div>
            )}

            {/* CTA */}
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-white font-display font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 uppercase tracking-wide group"
            >
              Demander un devis gratuit
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* ── Right: Prestations card ────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary mb-1">
              Nos prestations
            </h3>
            <div className="h-0.5 w-10 bg-primary mb-6" />
            <ul className="space-y-4">
              {prestations.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 shrink-0 mt-0.5">
                    <Check size={12} className="text-primary" strokeWidth={3} />
                  </span>
                  <span className="text-slate-700 text-sm leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  )
}
