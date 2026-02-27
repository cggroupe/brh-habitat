import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ArrowRight, FileText, BookOpen } from 'lucide-react'
import { articlesSEO, type ArticleSEO } from '@/data/seo-strategy'

// ─── Category configuration ──────────────────────────────────────────────────

type FilterCategory =
  | 'Tous'
  | 'Isolation'
  | 'Ventilation'
  | 'Toiture'
  | 'Electricite'
  | 'Renovation'
  | 'Aides'

const FILTER_TABS: FilterCategory[] = [
  'Tous',
  'Isolation',
  'Ventilation',
  'Toiture',
  'Electricite',
  'Renovation',
  'Aides',
]

// Map each filter tab to the category strings used in seo-strategy.ts
const CATEGORY_MAP: Record<FilterCategory, string[]> = {
  Tous: [],
  Isolation: ['Isolation'],
  Ventilation: ['Ventilation & Humidite'],
  Toiture: ['Toiture'],
  Electricite: ['Electricite'],
  Renovation: ['Renovation Energetique'],
  Aides: ['Aides & Financement'],
}

// ─── Gradient palettes per category — all GREEN to match BRH colors ──────────

function getCategoryGradient(category: string): string {
  switch (category) {
    case 'Isolation':
      return 'from-green-800 to-green-600'
    case 'Ventilation & Humidite':
      return 'from-teal-800 to-teal-600'
    case 'Toiture':
      return 'from-green-900 to-green-700'
    case 'Electricite':
      return 'from-emerald-700 to-emerald-500'
    case 'Renovation Energetique':
      return 'from-primary-dark to-primary'
    case 'Aides & Financement':
      return 'from-emerald-800 to-emerald-600'
    case 'Menuiseries':
      return 'from-green-800 to-green-600'
    default:
      return 'from-primary-dark to-primary'
  }
}

// Short label shown on the badge
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'Ventilation & Humidite':
      return 'Ventilation'
    case 'Renovation Energetique':
      return 'Renovation'
    case 'Aides & Financement':
      return 'Aides'
    default:
      return category
  }
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: ArticleSEO }) {
  const gradient = getCategoryGradient(article.category)
  const label = getCategoryLabel(article.category)

  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Cover image or gradient fallback */}
      <div className={`relative h-48 shrink-0 overflow-hidden ${article.coverImage ? '' : `bg-gradient-to-br ${gradient} flex items-center justify-center`}`}>
        {article.coverImage ? (
          <>
            <img
              src={article.coverImage}
              alt={`Illustration article : ${article.seoTitle}`}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Subtle overlay for depth */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"
            />
          </>
        ) : (
          <>
            {/* Fallback texture overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25% 75%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 25%, #fff 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            <FileText size={48} className="text-white/30 relative z-10" strokeWidth={1} />
          </>
        )}
      </div>

      {/* Card content */}
      <div className="flex flex-col flex-1 p-6">
        {/* Meta row */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-body text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1">
            {label}
          </span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={13} strokeWidth={2} />
            <span className="font-body text-xs font-medium">{article.readTime} min</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-slate-900 font-bold text-xl leading-snug mb-3 group-hover:text-primary transition-colors uppercase tracking-wide line-clamp-2">
          {article.seoTitle}
        </h2>

        {/* Excerpt */}
        <p className="font-body text-sm text-slate-600 leading-relaxed flex-1 line-clamp-3 mb-5">
          {article.metaDescription}
        </p>

        {/* Read more */}
        <div className="flex items-center gap-2 font-body text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200">
          Lire l'article
          <ArrowRight size={14} strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArticlesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Tous')

  const filteredArticles: ArticleSEO[] =
    activeFilter === 'Tous'
      ? articlesSEO
      : articlesSEO.filter((a) =>
          CATEGORY_MAP[activeFilter].includes(a.category)
        )

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
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen size={20} className="text-primary-light" strokeWidth={2} />
              <span className="font-body text-primary-light text-sm font-semibold uppercase tracking-widest">
                Conseils &amp; Guides
              </span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight leading-none mb-6">
              Nos guides renovation
            </h1>
            <p className="font-body text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
              Retrouvez les conseils d'experts BRH pour isoler, ventiler, renover
              et optimiser votre habitat breton.
            </p>
          </div>
        </div>
      </section>

      {/* ── Filter tabs + Grid ────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="flex items-start border-l-4 border-primary pl-6 mb-10">
            <div>
              <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-slate-900 leading-none mb-2">
                Tous nos articles
              </h2>
              <p className="font-body text-slate-500 text-base">
                {articlesSEO.length} guides et conseils pour votre renovation
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-3 mb-10">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={[
                  'px-6 py-2.5 rounded-full font-body text-sm font-semibold transition-all duration-200',
                  activeFilter === tab
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary',
                ].join(' ')}
              >
                {tab === 'Electricite' ? 'Electricite' : tab}
              </button>
            ))}
          </div>

          {/* Article count */}
          <p className="font-body text-sm text-slate-400 mb-8">
            {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''} trouv{filteredArticles.length > 1 ? 'es' : 'e'}
          </p>

          {/* Grid */}
          {filteredArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
              <FileText size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
              <p className="font-display text-lg text-slate-500 uppercase tracking-wide">
                Aucun article dans cette categorie pour le moment.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="bg-primary-dark py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-body text-primary-light text-sm font-semibold uppercase tracking-widest mb-4">
              Artisans certifies RGE — Finistere
            </p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-white uppercase tracking-tight leading-none mb-6">
              Un projet de renovation en Bretagne ?
            </h2>
            <p className="font-body text-slate-300 text-lg lg:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Nos experts BRH sont disponibles pour un diagnostic gratuit dans tout le Finistere.
              Devis sous 48h, sans engagement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-10 py-4 bg-white text-primary-dark font-display font-bold text-lg rounded-lg shadow-xl uppercase tracking-wide hover:bg-green-50 transition-colors"
              >
                Demander un devis gratuit
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/diagnostic"
                className="inline-flex items-center gap-2 px-10 py-4 border-2 border-white/60 text-white font-display font-bold text-lg rounded-lg hover:bg-white/10 hover:border-white transition-colors uppercase tracking-wide"
              >
                Faire mon diagnostic
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
