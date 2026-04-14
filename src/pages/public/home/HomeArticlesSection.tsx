import { Link } from 'react-router-dom'
import { ArrowRight, Clock, FileText } from 'lucide-react'

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

export function HomeArticlesSection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="border-l-4 border-primary pl-6">
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-2">NOS GUIDES</h2>
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

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(({ slug, category, title, excerpt, readTime, coverImage }) => (
            <Link
              key={slug}
              to={`/articles/${slug}`}
              className="group bg-white rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col"
            >
              {/* Cover image */}
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
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1">
                    {category}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} />
                    <span className="text-xs">{readTime}</span>
                  </div>
                </div>

                <h3 className="font-display text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-slate-600 mb-6 flex-1">{excerpt}</p>
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
  )
}
