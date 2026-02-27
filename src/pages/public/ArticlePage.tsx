import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  User,
  CalendarDays,
  ArrowRight,
  BookOpen,
  FileText,
  Tag,
  Phone,
  ChevronRight,
  List,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getArticleBySlug, articles, type ArticleData } from '@/data/articles'
import { articlesSEO } from '@/data/seo-strategy'

// ── Markdown file imports map ────────────────────────────────────────────────

const markdownModules = import.meta.glob('/src/data/articles/*.md', {
  query: '?raw',
  import: 'default',
})

// ── Strip YAML frontmatter ───────────────────────────────────────────────────

function stripFrontmatter(md: string): string {
  const match = md.match(/^---\n[\s\S]*?\n---\n/)
  return match ? md.slice(match[0].length) : md
}

// ── Strip the leading H1 from markdown (already shown in hero) ───────────────

function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+[^\n]+\n?/, '')
}

// ── Extract H2 headings for table of contents ────────────────────────────────

function extractH2s(md: string): { id: string; text: string }[] {
  const matches = [...md.matchAll(/^##\s+(.+)$/gm)]
  return matches.map((m) => {
    const text = m[1].trim()
    const id = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return { id, text }
  })
}

// ── Generate a slug-safe id from heading text ────────────────────────────────

function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Category gradient helper ─────────────────────────────────────────────────

function getCategoryGradient(category: string): string {
  switch (category) {
    case 'humidite':
      return 'from-emerald-800 via-emerald-700 to-emerald-600'
    case 'isolation':
      return 'from-green-800 via-green-700 to-green-600'
    case 'ventilation':
      return 'from-teal-800 via-teal-700 to-teal-600'
    case 'toiture':
      return 'from-green-900 via-green-800 to-green-700'
    case 'electricite':
      return 'from-emerald-700 via-emerald-600 to-emerald-500'
    case 'renovation':
      return 'from-primary-dark via-primary to-primary'
    case 'menuiseries':
      return 'from-green-800 via-green-700 to-green-600'
    case 'aides':
      return 'from-emerald-800 via-emerald-700 to-emerald-600'
    default:
      return 'from-primary-dark via-primary to-primary'
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'humidite':
      return 'Humidite'
    case 'isolation':
      return 'Isolation'
    case 'ventilation':
      return 'Ventilation'
    case 'toiture':
      return 'Toiture'
    case 'electricite':
      return 'Electricite'
    case 'renovation':
      return 'Renovation'
    case 'menuiseries':
      return 'Menuiseries'
    case 'aides':
      return 'Aides'
    default:
      return category
  }
}

// ── Related articles ─────────────────────────────────────────────────────────

function getRelatedArticles(current: ArticleData): ArticleData[] {
  const sameCategory = articles.filter(
    (a) => a.category === current.category && a.slug !== current.slug
  )
  const others = articles.filter(
    (a) => a.category !== current.category && a.slug !== current.slug
  )
  return [...sameCategory, ...others].slice(0, 3)
}

// ── Markdown components ──────────────────────────────────────────────────────

// Tracks whether the first paragraph has been rendered (for drop cap)
let isFirstParagraph = true

function buildMarkdownComponents() {
  isFirstParagraph = true

  return {
    // H1 from markdown — hidden, shown in hero
    h1: () => null,

    // H2 — magazine-style with left accent bar
    h2: ({ children }: { children?: React.ReactNode }) => {
      const text = String(children ?? '')
      const id = headingId(text)
      return (
        <h2
          id={id}
          className="flex items-start gap-4 mt-14 mb-6 scroll-mt-24"
        >
          <span
            className="shrink-0 w-1 rounded-full bg-primary mt-1"
            style={{ minHeight: '2.5rem' }}
            aria-hidden="true"
          />
          <span className="font-display text-2xl sm:text-3xl text-primary-dark uppercase tracking-wide leading-tight">
            {children}
          </span>
        </h2>
      )
    },

    // H3
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="font-display text-xl text-slate-800 uppercase tracking-wide mt-10 mb-4 leading-tight">
        {children}
      </h3>
    ),

    // H4
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="font-display text-lg text-slate-700 uppercase tracking-wide mt-8 mb-3">
        {children}
      </h4>
    ),

    // Paragraph — first one gets drop cap
    p: ({ children }: { children?: React.ReactNode }) => {
      if (isFirstParagraph) {
        isFirstParagraph = false
        return (
          <p className="font-body text-slate-600 leading-[1.85] mb-6 text-lg [&::first-letter]:text-6xl [&::first-letter]:font-display [&::first-letter]:text-primary-dark [&::first-letter]:float-left [&::first-letter]:mr-3 [&::first-letter]:mt-1 [&::first-letter]:leading-none">
            {children}
          </p>
        )
      }
      return (
        <p className="font-body text-slate-600 leading-[1.85] mb-6">
          {children}
        </p>
      )
    },

    // Strong
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),

    // Em
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-slate-600">{children}</em>
    ),

    // Links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        className="text-primary font-semibold underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),

    // Unordered list — with green bullet dots
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="my-6 space-y-3 font-body text-slate-600 leading-relaxed">
        {children}
      </ul>
    ),

    // Ordered list
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="my-6 space-y-3 font-body text-slate-600 leading-relaxed list-none counter-reset-[item]">
        {children}
      </ol>
    ),

    // List item
    li: ({ children, ordered }: { children?: React.ReactNode; ordered?: boolean }) => {
      if (ordered) {
        return (
          <li className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-display font-bold flex items-center justify-center mt-0.5">
              •
            </span>
            <span>{children}</span>
          </li>
        )
      }
      return (
        <li className="flex items-start gap-3">
          <span
            className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2.5"
            aria-hidden="true"
          />
          <span>{children}</span>
        </li>
      )
    },

    // Blockquote — magazine pull quote style
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="relative my-10 pl-8 pr-6 py-6 bg-primary/5 border-l-4 border-primary rounded-r-2xl">
        <span
          className="absolute top-3 left-4 font-accent text-6xl text-primary/20 leading-none select-none"
          aria-hidden="true"
        >
          "
        </span>
        <div className="font-body text-slate-700 text-lg leading-relaxed italic relative z-10">
          {children}
        </div>
      </blockquote>
    ),

    // HR — decorative separator
    hr: () => (
      <div className="flex items-center justify-center gap-4 my-14" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
          <div className="w-1.5 h-1.5 bg-primary/70 rounded-full" />
          <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    ),

    // Images — full-bleed magazine style with caption
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <figure className="my-12 -mx-4 sm:-mx-8 lg:-mx-14">
        <div className="overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10">
          <img
            src={src}
            alt={alt ?? ''}
            className="w-full object-cover max-h-[480px]"
            loading="lazy"
          />
        </div>
        {alt && (
          <figcaption className="text-center text-sm text-slate-400 mt-4 italic font-body px-4">
            {alt}
          </figcaption>
        )}
      </figure>
    ),

    // Tables
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-8 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse font-body text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-primary/8">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-5 py-3.5 text-left font-display text-xs uppercase tracking-widest text-primary-dark border-b border-slate-200">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-5 py-3.5 text-slate-600 leading-relaxed">{children}</td>
    ),

    // Code inline
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return (
          <code className="block bg-slate-900 text-green-300 rounded-xl p-6 font-mono text-sm leading-relaxed overflow-x-auto my-6">
            {children}
          </code>
        )
      }
      return (
        <code className="bg-slate-100 text-primary-dark rounded px-1.5 py-0.5 font-mono text-sm">
          {children}
        </code>
      )
    },

    // Pre (code block wrapper)
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="my-6 rounded-xl overflow-hidden">{children}</pre>
    ),
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [markdown, setMarkdown] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)

  const article = slug ? getArticleBySlug(slug) : undefined

  // Load markdown content
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setMarkdown('')

    const path = `/src/data/articles/${slug}.md`
    const loader = markdownModules[path]

    if (loader) {
      loader().then((content) => {
        const stripped = stripLeadingH1(stripFrontmatter(content as string))
        setMarkdown(stripped)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [slug])

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // Set document title for SEO
  useEffect(() => {
    if (article) {
      document.title = article.seoTitle
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', article.seoDescription)
      }
    }
    return () => {
      document.title = 'BRH - Bretagne Renovation Habitat'
    }
  }, [article])

  // Extract table of contents from markdown
  const toc = useMemo(() => (markdown ? extractH2s(markdown) : []), [markdown])

  // Build markdown components (memoized to reset isFirstParagraph on content change)
  const markdownComponents = useMemo(() => buildMarkdownComponents(), [markdown])

  // ── 404 ──────────────────────────────────────────────────────────────────

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <FileText size={36} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-5xl text-primary-dark font-bold uppercase mb-4">404</h1>
          <p className="font-display text-2xl text-slate-900 uppercase tracking-wide mb-3">
            Article introuvable
          </p>
          <p className="font-body text-slate-500 leading-relaxed mb-8">
            L'article que vous recherchez n'existe pas ou a ete deplace.
          </p>
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-display font-bold rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 uppercase tracking-wide"
          >
            <ArrowLeft size={16} />
            Voir tous les articles
          </Link>
        </div>
      </div>
    )
  }

  const gradient = getCategoryGradient(article.category)
  const categoryLabel = getCategoryLabel(article.category)
  const related = getRelatedArticles(article)

  // Get SEO data for structured data and cover images
  const seoData = articlesSEO.find((a) => a.slug === slug)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className={`relative overflow-hidden ${seoData?.coverImage ? '' : `bg-gradient-to-br ${gradient}`}`}
        style={{ minHeight: '420px' }}
      >
        {/* Cover image background */}
        {seoData?.coverImage && (
          <>
            <img
              src={seoData.coverImage}
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
            backgroundImage:
              'radial-gradient(circle, #fff 1px, transparent 1px)',
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

      {/* ── Article content + Sidebar ──────────────────────────────────────── */}
      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

            {/* ── Main article ───────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Table of contents — mobile collapsible */}
              {toc.length > 2 && (
                <div className="mb-8 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setTocOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                    aria-expanded={tocOpen}
                  >
                    <span className="flex items-center gap-2.5 font-display text-sm uppercase tracking-widest text-primary-dark">
                      <List size={16} className="text-primary" />
                      Sommaire
                    </span>
                    <ChevronRight
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 ${tocOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {tocOpen && (
                    <nav className="px-6 pb-5 border-t border-slate-100" aria-label="Sommaire">
                      <ol className="mt-4 space-y-2">
                        {toc.map((item, i) => (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              onClick={() => setTocOpen(false)}
                              className="flex items-start gap-3 group font-body text-sm text-slate-500 hover:text-primary transition-colors py-1"
                            >
                              <span className="shrink-0 font-display text-xs text-primary/60 mt-0.5 w-5">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="group-hover:underline underline-offset-2">
                                {item.text}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  )}
                </div>
              )}

              {/* Article card */}
              <div className="bg-white rounded-2xl px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 shadow-sm border border-slate-100">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-4">
                    <span className="inline-block w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="font-body text-slate-400 text-sm">Chargement de l'article...</span>
                  </div>
                ) : markdown ? (
                  <article>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents as never}
                    >
                      {markdown}
                    </ReactMarkdown>
                  </article>
                ) : (
                  <div className="text-center py-24">
                    <FileText size={40} className="text-slate-300 mx-auto mb-4" strokeWidth={1} />
                    <p className="font-body text-slate-400 text-lg">
                      Le contenu de cet article n'est pas encore disponible.
                    </p>
                  </div>
                )}
              </div>

              {/* Tags / mots-cles */}
              {seoData && seoData.secondaryKeywords.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {seoData.secondaryKeywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="font-body text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-4 py-1.5 hover:border-primary hover:text-primary transition-colors cursor-default"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Author bio strip */}
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
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className="w-full lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-8">

              {/* Table of contents — desktop */}
              {toc.length > 2 && (
                <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <List size={15} className="text-primary" />
                    <span className="font-display text-sm uppercase tracking-widest text-primary-dark">
                      Sommaire
                    </span>
                  </div>
                  <nav aria-label="Sommaire de l'article">
                    <ol className="space-y-1">
                      {toc.map((item, i) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className="flex items-start gap-3 group py-1.5 font-body text-sm text-slate-500 hover:text-primary transition-colors rounded-lg"
                          >
                            <span className="shrink-0 font-display text-xs text-primary/50 mt-0.5 w-5">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="group-hover:underline underline-offset-2 leading-snug">
                              {item.text}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </div>
              )}

              {/* CTA Diagnostic — hero card */}
              <div
                className="relative rounded-2xl overflow-hidden text-white"
                style={{ background: 'linear-gradient(135deg, #094114 0%, #1c7d1e 60%, #359932 100%)' }}
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
                  href="tel:0784863951"
                  className="flex items-center gap-3.5 mb-5 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Phone size={17} className="text-primary" />
                  </div>
                  <div>
                    <span className="font-display text-lg font-bold text-slate-800 tracking-wide group-hover:text-primary transition-colors">
                      07 84 86 39 51
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
          </div>

          {/* ── CTA bas de page ────────────────────────────────────────────── */}
          <div className="mt-16 relative overflow-hidden rounded-2xl">
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #f0faf0 0%, #e8f5e9 50%, #f0fdf0 100%)' }}
            />
            <div className="absolute inset-0 border border-primary/15 rounded-2xl" />
            {/* Decorative circle */}
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5"
            />
            <div
              aria-hidden="true"
              className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-primary/5"
            />
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
                  href="tel:0784863951"
                  className="inline-flex items-center gap-2 px-8 py-4 border-2 border-slate-300 text-slate-700 font-display font-bold rounded-xl hover:border-primary hover:text-primary transition-colors uppercase tracking-wide"
                >
                  <Phone size={16} />
                  07 84 86 39 51
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Related articles section ─────────────────────────────────────────── */}
      {related.length > 0 && (
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
      )}

      {/* ── JSON-LD Structured Data ───────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.seoDescription,
            image: seoData?.coverImage,
            author: {
              '@type': 'Organization',
              name: 'BRH - Bretagne Renovation Habitat',
            },
            publisher: {
              '@type': 'Organization',
              name: 'BRH - Bretagne Renovation Habitat',
            },
            datePublished: article.date,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://renovation-brh.fr/articles/${article.slug}`,
            },
          }),
        }}
      />
    </div>
  )
}
