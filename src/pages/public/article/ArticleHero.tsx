import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Tag, User, CalendarDays, Clock } from 'lucide-react'
import type { ArticleData } from '@/data/articles'

interface ArticleHeroProps {
  article: ArticleData
  gradient: string
  categoryLabel: string
  coverImage?: string
}

export function ArticleHero({ article, gradient, categoryLabel, coverImage }: ArticleHeroProps) {
  return (
    <section
      className={`relative overflow-hidden ${coverImage ? '' : `bg-gradient-to-br ${gradient}`}`}
      style={{ minHeight: '420px' }}
    >
      {/* Cover image background */}
      {coverImage && (
        <>
          <img
            src={coverImage}
            alt={`Photo de couverture : ${article.title}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-85`}
          />
        </>
      )}

      {/* Dot pattern texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Bottom fade for smooth transition */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/60 to-transparent"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-white/60" aria-label="Fil d'ariane">
          <Link
            to="/articles"
            className="inline-flex items-center gap-1.5 font-body text-sm hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Articles
          </Link>
          <ChevronRight size={13} className="text-white/30" />
          <span className="font-body text-sm text-white/80 truncate max-w-[200px] sm:max-w-none">
            {categoryLabel}
          </span>
          <ChevronRight size={13} className="text-white/30" />
          <span className="font-body text-sm text-white/50 hidden sm:block truncate max-w-[260px]">
            {article.title}
          </span>
        </nav>

        <div className="max-w-3xl">
          {/* Category badge */}
          <span className="inline-flex items-center gap-1.5 font-body text-xs font-bold uppercase tracking-widest bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-6 text-white">
            <Tag size={11} />
            {categoryLabel}
          </span>

          {/* Title */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-tight uppercase tracking-tight mb-5">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="font-body text-lg text-white/80 leading-relaxed mb-8 max-w-2xl">
            {article.excerpt}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-5 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <User size={14} />
              <span className="font-body font-semibold text-white/90">{article.author}</span>
            </div>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <CalendarDays size={14} />
              <span className="font-body">
                {new Date(article.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span className="font-body">{article.readTime} min de lecture</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
