import { Link } from 'react-router-dom'
import { ArrowRight, Phone, FileText, Clock } from 'lucide-react'
import type { ArticleData } from '@/data/articles'
import { getCategoryGradient, getCategoryLabel } from './articleHelpers'

interface ArticleSeoData {
  slug: string
  coverImage?: string
  secondaryKeywords: string[]
}

interface ArticleKeywordsProps {
  keywords: string[]
}

export function ArticleKeywords({ keywords }: ArticleKeywordsProps) {
  if (keywords.length === 0) return null

  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {keywords.slice(0, 6).map((kw) => (
        <span
          key={kw}
          className="font-body text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-1.5 hover:border-primary hover:text-primary transition-colors cursor-default"
        >
          {kw}
        </span>
      ))}
    </div>
  )
}

export function ArticleAuthorBio() {
  return (
    <div className="mt-10 flex items-start gap-5 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
        <span className="font-display text-white text-lg font-bold uppercase">BRH</span>
      </div>
      <div>
        <p className="font-display text-sm uppercase tracking-widest text-primary-dark mb-1">
          BRH — Bretagne Renovation Habitat
        </p>
        <p className="font-body text-sm text-slate-500 leading-relaxed">
          Artisans RGE certifies en Finistere. Depuis plus de 10 ans, nos equipes accompagnent
          les proprietaires bretons dans leurs projets de renovation energetique.
        </p>
      </div>
    </div>
  )
}

export function ArticleCtaBanner() {
  return (
    <div className="mt-16 relative overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #f0faf0 0%, #e8f5e9 50%, #f0fdf0 100%)' }}
      />
      <div className="absolute inset-0 border border-primary/15 rounded-2xl" />
      {/* Decorative circles */}
      <div aria-hidden="true" className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5" />
      <div aria-hidden="true" className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-primary/5" />
      <div className="relative p-10 lg:p-14 text-center">
        <span className="inline-flex items-center gap-2 font-body text-primary text-xs font-bold uppercase tracking-widest mb-4">
          <span className="w-6 h-px bg-primary/50" />
          BRH — Artisans certifies RGE
          <span className="w-6 h-px bg-primary/50" />
        </span>
        <h3 className="font-display text-3xl lg:text-4xl font-bold text-slate-900 uppercase tracking-tight mb-4 leading-tight">
          Besoin d'un diagnostic pour votre habitat ?
        </h3>
        <p className="font-body text-slate-500 leading-relaxed max-w-xl mx-auto mb-8">
          Nos experts BRH analysent gratuitement l'etat de votre logement
          et vous proposent des solutions adaptees a votre budget et vos aides disponibles.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/diagnostic"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-white font-display font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 uppercase tracking-wide"
          >
            Lancer mon diagnostic gratuit
            <ArrowRight size={18} />
          </Link>
          <a
            href="tel:0219005305"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-300 text-slate-700 font-display font-bold rounded-xl hover:border-primary hover:text-primary transition-colors uppercase tracking-wide"
          >
            <Phone size={16} />
            02 19 00 53 05
          </a>
        </div>
      </div>
    </div>
  )
}

interface ArticleRelatedSectionProps {
  related: ArticleData[]
  articlesSEO: ArticleSeoData[]
}

export function ArticleRelatedSection({ related, articlesSEO }: ArticleRelatedSectionProps) {
  if (related.length === 0) return null

  return (
    <section className="py-16 lg:py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end gap-6 mb-10">
          <div className="flex items-start border-l-4 border-primary pl-5">
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-slate-900 leading-none">
              A lire egalement
            </h2>
          </div>
          <div className="hidden sm:block h-px flex-1 bg-slate-100 mb-1" />
          <Link
            to="/articles"
            className="hidden sm:inline-flex items-center gap-1.5 font-body text-sm text-primary font-semibold hover:underline underline-offset-2 mb-1 shrink-0"
          >
            Tous les articles
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {related.map((rel) => {
            const relSeo = articlesSEO.find((s) => s.slug === rel.slug)
            return (
              <Link
                key={rel.slug}
                to={`/articles/${rel.slug}`}
                className="group bg-background rounded-2xl border border-slate-100 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col"
              >
                {/* Cover image or gradient */}
                <div className="relative h-44 overflow-hidden">
                  {relSeo?.coverImage ? (
                    <img
                      src={relSeo.coverImage}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(rel.category)} flex items-center justify-center`}
                    >
                      <FileText size={36} className="text-white/25" strokeWidth={1} />
                    </div>
                  )}
                  {/* Category badge over image */}
                  <div className="absolute top-3 left-3">
                    <span className="font-body text-xs font-bold uppercase tracking-widest text-white bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                      {getCategoryLabel(rel.category)}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 text-slate-400">
                    <Clock size={12} />
                    <span className="font-body text-xs">{rel.readTime} min de lecture</span>
                  </div>
                  <h3 className="font-display text-slate-900 font-bold text-base leading-snug group-hover:text-primary transition-colors uppercase tracking-wide line-clamp-2 flex-1">
                    {rel.title}
                  </h3>
                  <div className="mt-4 flex items-center gap-1.5 text-primary font-body text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Lire l'article
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
