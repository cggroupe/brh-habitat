import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

export function HomeDiagCta() {
  return (
    <section className="bg-primary-dark py-16 lg:py-24 relative overflow-hidden">
      {/* Background dot pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
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
              {['Sans engagement', 'Résultat immédiat', '100% Gratuit'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white">
                    <Check size={12} className="text-primary" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
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
  )
}
