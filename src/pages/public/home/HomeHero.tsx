import { Link } from 'react-router-dom'

export function HomeHero() {
  return (
    <section className="relative pt-12 pb-20 lg:pt-24 lg:pb-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wide">Expert en Bretagne</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-slate-900">
            Votre habitat mérite le meilleur.
          </h1>
          <p className="font-display text-2xl lg:text-3xl font-bold text-primary leading-tight -mt-2">
            Bretagne Rénovation Habitat, Les Artisans Bretons.
          </p>

          {/* Subtext */}
          <p className="text-lg text-slate-600 font-medium max-w-lg">
            Rénovez votre maison avec des experts certifiés RGE. Obtenez un diagnostic
            énergétique complet et gratuit pour valoriser votre patrimoine.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
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
          <p className="mt-6 text-sm text-slate-500">
            Déjà <span className="font-bold text-slate-900">900+</span> foyers accompagnés
          </p>
        </div>
      </div>
    </section>
  )
}
