import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Phone, Clock, FileText } from 'lucide-react'
import type { ArticleData } from '@/data/articles'
import { ArticleTocDesktop } from './ArticleToc'
import { getCategoryGradient, getCategoryLabel } from './articleHelpers'

interface TocItem {
  id: string
  text: string
}

interface ArticleSeoData {
  slug: string
  coverImage?: string
  secondaryKeywords: string[]
}

interface ArticleSidebarProps {
  toc: TocItem[]
  related: ArticleData[]
  articlesSEO: ArticleSeoData[]
}

export function ArticleSidebar({ toc, related, articlesSEO }: ArticleSidebarProps) {
  return (
    <aside className="w-full lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-8">

      {/* Table of contents — desktop */}
      <ArticleTocDesktop toc={toc} />

      {/* CTA Diagnostic — hero card */}
      <div
        className="relative rounded-2xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-deep) 0%, var(--color-primary) 60%, var(--color-primary-green) 100%)' }}
      >
        {/* Background texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative p-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
            <span className="font-body text-xs font-bold text-white/90 uppercase tracking-widest">
              Gratuit — sans engagement
            </span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-4">
            <BookOpen size={20} className="text-white" strokeWidth={2} />
          </div>

          <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-white mb-2 leading-tight">
            Diagnostic offert
          </h3>
          <p className="font-body text-sm text-white/75 leading-relaxed mb-6">
            Nos experts se deplacent et analysent votre logement gratuitement.
            Solutions concretes adaptees a votre budget.
          </p>

          <Link
            to="/diagnostic"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-primary-dark font-display font-bold rounded-xl hover:bg-green-50 transition-colors shadow-lg shadow-black/20 uppercase tracking-wide text-sm"
          >
            Lancer mon diagnostic
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Contact rapide */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary mb-1">
          Une question ?
        </h3>
        <div className="h-0.5 w-8 bg-primary mb-5" />

        {/* Phone — prominent */}
        <a
          href="tel:0219005305"
          className="flex items-center gap-3.5 mb-5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Phone size={17} className="text-primary" />
          </div>
          <div>
            <span className="font-display text-lg font-bold text-slate-800 tracking-wide group-hover:text-primary transition-colors">
              02 19 00 53 05
            </span>
            <p className="font-body text-xs text-slate-400 mt-0.5">
              Lun – Ven, 8h – 18h
            </p>
          </div>
        </a>

        <p className="font-body text-sm text-slate-500 leading-relaxed mb-5">
          Ou envoyez-nous un message, nous repondons sous 24h.
        </p>
        <Link
          to="/contact"
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary font-display font-bold rounded-xl hover:bg-primary/5 transition-colors text-sm uppercase tracking-wide"
        >
          Envoyer un message
        </Link>
      </div>

      {/* Articles similaires — avec thumbnails */}
      {related.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-primary mb-1">
            Articles similaires
          </h3>
          <div className="h-0.5 w-8 bg-primary mb-5" />
          <div className="space-y-4">
            {related.map((rel) => {
              const relSeo = articlesSEO.find((s) => s.slug === rel.slug)
              return (
                <Link
                  key={rel.slug}
                  to={`/articles/${rel.slug}`}
                  className="group flex items-start gap-3.5 hover:opacity-90 transition-opacity"
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-100">
                    {relSeo?.coverImage ? (
                      <img
                        src={relSeo.coverImage}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(rel.category)} flex items-center justify-center`}
                      >
                        <FileText size={16} className="text-white/50" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-body text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                      {getCategoryLabel(rel.category)}
                    </span>
                    <p className="font-body text-sm text-slate-700 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {rel.title}
                    </p>
                    <span className="font-body text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={11} />
                      {rel.readTime} min
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

    </aside>
  )
}
