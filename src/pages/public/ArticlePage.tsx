import { useState, useEffect, useMemo } from 'react'
import { SEOHead } from '@/components/shared/SEOHead'
import { useParams, Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { getArticleBySlug } from '@/data/articles'
import { articlesSEO } from '@/data/seo-strategy'
import {
  markdownModules,
  stripFrontmatter,
  stripLeadingH1,
  extractH2s,
  getCategoryGradient,
  getCategoryLabel,
  getRelatedArticles,
} from './article/articleHelpers'
import { buildMarkdownComponents } from './article/ArticleMarkdownComponents'
import { ArticleHero } from './article/ArticleHero'
import { ArticleTocMobile } from './article/ArticleToc'
import { ArticleBody } from './article/ArticleBody'
import { ArticleSidebar } from './article/ArticleSidebar'
import {
  ArticleKeywords,
  ArticleAuthorBio,
  ArticleCtaBanner,
  ArticleRelatedSection,
} from './article/ArticleFooter'

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [markdown, setMarkdown] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)

  const article = slug ? getArticleBySlug(slug) : undefined

  // Load markdown content
  useEffect(() => {
    if (!slug) return
     
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

  const toc = useMemo(() => (markdown ? extractH2s(markdown) : []), [markdown])
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when markdown changes
  const markdownComponents = useMemo(() => buildMarkdownComponents(), [markdown])

  // 404
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
            Voir tous les articles
          </Link>
        </div>
      </div>
    )
  }

  const gradient = getCategoryGradient(article.category)
  const categoryLabel = getCategoryLabel(article.category)
  const related = getRelatedArticles(article)
  const seoData = articlesSEO.find((a) => a.slug === slug)

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={article.seoTitle}
        description={article.seoDescription}
        ogImage={seoData?.coverImage}
        ogUrl={`https://renovation-brh.fr/articles/${article.slug}`}
      />

      <ArticleHero
        article={article}
        gradient={gradient}
        categoryLabel={categoryLabel}
        coverImage={seoData?.coverImage}
      />

      <section className="py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

            {/* Main article */}
            <div className="flex-1 min-w-0">
              <ArticleTocMobile toc={toc} open={tocOpen} onToggle={() => setTocOpen(o => !o)} />
              <ArticleBody markdown={markdown} loading={loading} markdownComponents={markdownComponents} />
              {seoData && <ArticleKeywords keywords={seoData.secondaryKeywords} />}
              <ArticleAuthorBio />
            </div>

            <ArticleSidebar
              toc={toc}
              related={related}
              articlesSEO={articlesSEO}
            />
          </div>

          <ArticleCtaBanner />
        </div>
      </section>

      <ArticleRelatedSection related={related} articlesSEO={articlesSEO} />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.seoDescription,
            image: seoData?.coverImage,
            author: { '@type': 'Organization', name: 'BRH - Bretagne Renovation Habitat' },
            publisher: { '@type': 'Organization', name: 'BRH - Bretagne Renovation Habitat' },
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
