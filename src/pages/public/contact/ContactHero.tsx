import { Shield, Star, Clock } from 'lucide-react'

export function ContactHero() {
  return (
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
  )
}
