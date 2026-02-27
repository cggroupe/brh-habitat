import { Link } from 'react-router-dom'
import {
  Home,
  Thermometer,
  Zap,
  DoorOpen,
  Wind,
  Droplets,
  Calendar,
  BadgeCheck,
  Clock,
  Star,
  ArrowRight,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react'

// ─── Hero avatar URLs (social proof) ──────────────────────────────────────────
const AVATAR_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAjhSnkxan77uZAObFjZb6a_GMtuXhmJoSYVz4ULpXwY9fWHH0wGde02zIhfoNDiOI_tC5d7mXsf9OSAGTCxrXiBkoJbVr_0AB3U5Zj5C9vsoWEpz9U-XlybulUMg_4tuWDd7LXIQUvhzqWl2fMSd4FE7SCK8E-XfuBVtuesLtmrFVxF6hea0J5RlLXb3dzsDWfXKG5kzwr5S7CFbjlkAQwWt3YGN31QERi_EEQ8WEk0tMQObPk3SNb3Keb7vAeCPIWffMTUyplEO5l'
const AVATAR_2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBazgbLp5hXd8Gm2ivh1m1Vrd1_-FoeeZGOMcyEdFW2faSsgVzrKOYywbcxa2lXAxAWuV7LELbVSLjzUJTd6I3c2FpVggN9An7TvkKj8HdLZuMo4muZNjx7gdWna4zBMShHOBcn3g5Na2T8Xgpow-gxzj2T09itfLipB7fHH2i6yjeSynscYEW_q09_QSFqCRzSuEDzO3yz6tJDEa-x4KVNn7dAxCh6SyEO1dDxzZxedI2Mvsbb7Q7WIhmgH4pI6aAYwrQcY_reijs-'
const AVATAR_3 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBIABk-jIz-HliGYn_czRW8v5LPjZVR7Qo8CisUffmrCUYkk6OlcD6Cr77mOE1szRFqMJHXCS0EnnSUi-oE54ZinZHr3dXV86Ew3N7NtLNKwdmX285EaGtm0Zwf8nddAJzjXiy6s9BGhcFrXisqSWqNy7daB8ga6WX7VMg2NwR5P-qYpg_ALz4HfMwZlOklrR8PKcgKGC0n5Tjos11Wlleabc8lwLFRmPVSB31c4Z4UwRG3la_9qy91tYjaWpbH5QTnY_mwadLlAd12'

// ─── Hero background image ─────────────────────────────────────────────────────
const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBnOHGix5wfyxqhsY199o_cjcl75ml9ACfpzcdKRWxwZta26n9D1UpbOxWcSui7lNyoSb51baF2Uwc8rRkmg2bOhtv0e0u0CtyjK7RB0LFRg1PsaRJXBbNHRn6OB5s9N9hpbMoonMCZViQEEpCCa1bJ-a7gJAJA8PXpaZgcNL3NIPn0JSTT-PJTxCHGxHFaERvIfsX2lXfjmhSDfToyDhjGQk6Tct6ZN2OwsqfaDnHBuO_nfj3Xke_Z6gcysO9pFcbYeoDSOiKmAxQK'

// ─── Data ──────────────────────────────────────────────────────────────────────

const trustStats = [
  {
    icon: Calendar,
    value: '20+ ans',
    label: "d'expérience terrain",
  },
  {
    icon: BadgeCheck,
    value: 'Certifiés',
    label: 'Label RGE Qualibat',
  },
  {
    icon: Clock,
    value: '48h',
    label: 'Devis gratuit rapide',
  },
  {
    icon: Star,
    value: '4.8/5',
    label: 'Satisfaction client',
  },
]

const services = [
  {
    icon: Home,
    title: 'Toiture',
    description:
      'Entretien, rénovation et démoussage de toitures pour protéger votre maison durablement.',
    href: '/services#toiture',
  },
  {
    icon: Thermometer,
    title: 'Isolation',
    description:
      "Isolation des combles, murs et sols. Réduisez votre facture énergétique jusqu'à 30%.",
    href: '/services#isolation',
  },
  {
    icon: Zap,
    title: 'Électricité',
    description:
      'Mise aux normes, installation de tableaux électriques et domotique connectée.',
    href: '/services#electricite',
  },
  {
    icon: DoorOpen,
    title: 'Menuiseries',
    description:
      'Installation de fenêtres double vitrage, portes d\'entrée et volets roulants sur mesure.',
    href: '/services#menuiseries',
  },
  {
    icon: Wind,
    title: 'Ventilation',
    description:
      'Installation de VMC simple et double flux pour un air sain dans toute la maison.',
    href: '/services#ventilation',
  },
  {
    icon: Droplets,
    title: "Traitement de l'eau",
    description:
      'Adoucisseurs et purificateurs d\'eau pour protéger vos canalisations du calcaire.',
    href: '/services#traitement-eau',
  },
]

const articles = [
  {
    slug: 'isolation-thermique-guide',
    category: 'Isolation',
    title: 'Isolation thermique : le guide complet pour votre maison',
    excerpt:
      "Combles, murs, planchers : tout savoir sur l'isolation thermique, les matériaux, les performances et les aides financières disponibles.",
    readTime: '10 min',
    coverImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  },
  {
    slug: 'aides-renovation-2026',
    category: 'Aides financières',
    title: "Aides à la rénovation 2026 : MaPrimeRénov', CEE et éco-PTZ",
    excerpt:
      "MaPrimeRénov', CEE, éco-PTZ, TVA 5.5% : toutes les aides financières pour la rénovation énergétique en 2026.",
    readTime: '9 min',
    coverImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
  },
  {
    slug: 'toiture-renovation-bretagne',
    category: 'Toiture',
    title: 'Entretien et rénovation de toiture en climat breton',
    excerpt:
      'Ardoises, tuiles, mousse, fuites : comment entretenir et rénover votre toiture face aux intempéries bretonnes.',
    readTime: '9 min',
    coverImage: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=800&q=80',
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left Content */}
            <div className="flex flex-col gap-6 relative z-10">
              {/* Badge pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wide">Expert en Bretagne</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-slate-900">
                Votre habitat mérite le meilleur{' '}
                <span className="text-primary">artisan breton</span>
              </h1>

              {/* Subtext */}
              <p className="text-lg text-slate-600 font-medium max-w-lg">
                Rénovez votre maison avec des experts certifiés RGE. Obtenez un diagnostic
                énergétique complet et gratuit pour valoriser votre patrimoine.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4 mt-4">
                <Link
                  to="/diagnostic"
                  className="flex items-center justify-center h-12 px-8 rounded-lg bg-primary hover:bg-primary-dark text-white text-base font-bold transition-all shadow-xl shadow-primary/30 hover:scale-105"
                >
                  Diagnostic gratuit
                </Link>
                <Link
                  to="/services"
                  className="flex items-center justify-center h-12 px-8 rounded-lg border-2 border-slate-200 text-slate-900 hover:border-primary hover:text-primary text-base font-bold transition-colors bg-white"
                >
                  En savoir plus
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 mt-6 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 bg-cover bg-center"
                    style={{ backgroundImage: `url('${AVATAR_1}')` }}
                    aria-hidden="true"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 bg-cover bg-center"
                    style={{ backgroundImage: `url('${AVATAR_2}')` }}
                    aria-hidden="true"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 bg-cover bg-center"
                    style={{ backgroundImage: `url('${AVATAR_3}')` }}
                    aria-hidden="true"
                  />
                </div>
                <p>
                  Déjà <span className="font-bold text-slate-900">2 500+</span> foyers
                  accompagnés
                </p>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative lg:h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl group">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
              {/* Image */}
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${HERO_IMG}')` }}
                role="img"
                aria-label="Maison bretonne en pierre rénovée avec grandes fenêtres et jardin"
              />
              {/* Floating badge */}
              <div className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-white/20">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-primary" size={28} />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Garantie</p>
                    <p className="text-sm font-bold text-slate-900">Travaux assurés 10 ans</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. TRUST BAR ─────────────────────────────────────────────────────── */}
      <section className="bg-neutral-gray py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustStats.map(({ icon: Icon, value, label }) => (
              <div
                key={value}
                className="flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon size={22} />
                </div>
                <h3 className="font-display text-3xl font-bold text-slate-900">{value}</h3>
                <p className="text-sm font-medium text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SERVICES ──────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="border-l-4 border-primary pl-6">
              <h2 className="font-display text-4xl font-bold text-slate-900 mb-2">
                NOS SERVICES
              </h2>
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

      {/* ── 4. DIAGNOSTIC CTA ────────────────────────────────────────────────── */}
      <section className="bg-primary-dark py-16 lg:py-24 relative overflow-hidden">
        {/* Background dot pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Right gradient accent */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">

            {/* Left text block */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-6">
                Analyse intelligente
              </div>
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Identifiez les problèmes de votre logement en 5 minutes
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto lg:mx-0">
                Notre outil de diagnostic guidé par IA analyse les spécificités de votre maison
                bretonne pour vous proposer les solutions de rénovation les plus rentables.
              </p>
              <ul className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start text-white/80 text-sm font-medium mb-8">
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white">
                    <Check size={12} className="text-primary" strokeWidth={3} />
                  </span>
                  Sans engagement
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white">
                    <Check size={12} className="text-primary" strokeWidth={3} />
                  </span>
                  Résultat immédiat
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white">
                    <Check size={12} className="text-primary" strokeWidth={3} />
                  </span>
                  100% Gratuit
                </li>
              </ul>
            </div>

            {/* Right CTA button */}
            <div className="flex-shrink-0">
              <Link
                to="/diagnostic"
                className="group relative inline-flex items-center justify-center px-8 py-5 text-lg font-bold text-primary-dark transition-all duration-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white hover:bg-neutral-gray hover:scale-105"
              >
                <span className="mr-3">Démarrer mon diagnostic</span>
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
                <div className="absolute -inset-3 rounded-2xl bg-white/20 blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. ARTICLES PREVIEW ──────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header — même style que Services */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="border-l-4 border-primary pl-6">
              <h2 className="font-display text-4xl font-bold text-slate-900 mb-2">
                NOS GUIDES
              </h2>
              <p className="text-lg text-slate-600 max-w-xl">
                Conseils d'experts, guides pratiques et actualités sur la rénovation énergétique
                en Bretagne.
              </p>
            </div>
            <Link
              to="/articles"
              className="hidden md:flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all"
            >
              Voir tous les articles
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Cards grid — même style que les service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(({ slug, category, title, excerpt, readTime, coverImage }) => (
              <Link
                key={slug}
                to={`/articles/${slug}`}
                className="group bg-white rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
              >
                {/* Cover image or gradient fallback */}
                <div className={`relative h-48 shrink-0 overflow-hidden ${coverImage ? '' : 'bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center'}`}>
                  {coverImage ? (
                    <>
                      <img
                        src={coverImage}
                        alt={`Illustration article : ${title}`}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
                      />
                    </>
                  ) : (
                    <FileText size={36} className="text-white/40" />
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-8">
                  {/* Meta */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1">
                      {category}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      <span className="text-xs">{readTime}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">
                    {title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-slate-600 mb-6 flex-1">{excerpt}</p>

                  {/* Read more */}
                  <span className="inline-flex items-center text-sm font-bold text-primary group-hover:underline">
                    Lire l'article
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile "see all" link */}
          <div className="mt-8 text-center md:hidden">
            <Link
              to="/articles"
              className="inline-flex items-center gap-2 text-primary font-bold hover:gap-4 transition-all"
            >
              Voir tous les articles
              <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>

    </div>
  )
}
