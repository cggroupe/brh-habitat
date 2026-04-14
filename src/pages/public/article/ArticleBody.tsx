import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'

interface ArticleBodyProps {
  markdown: string
  loading: boolean
  markdownComponents: Record<string, unknown>
}

export function ArticleBody({ markdown, loading, markdownComponents }: ArticleBodyProps) {
  return (
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
  )
}
