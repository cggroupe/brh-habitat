import { BookOpen, Pencil, Trash2 } from 'lucide-react'
import type { BrhArticleRow } from '@/types/database'

interface ArticlesTableProps {
  articles: BrhArticleRow[]
  isLoading: boolean
  isError: boolean
  togglePendingId: string | undefined
  onEdit: (article: BrhArticleRow) => void
  onDeleteRequest: (id: string) => void
  onTogglePublished: (article: BrhArticleRow) => void
  onCreateFirst: () => void
}

export function ArticlesTable({
  articles,
  isLoading,
  isError,
  togglePendingId,
  onEdit,
  onDeleteRequest,
  onTogglePublished,
  onCreateFirst,
}: ArticlesTableProps) {
  if (isError) {
    return (
      <div className="flex items-center gap-2 p-4 text-danger font-body text-sm">
        Erreur lors du chargement des articles.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="p-12 text-center">
        <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="font-display text-base text-text-primary mb-1">Aucun article pour le moment</p>
        <button onClick={onCreateFirst} className="text-primary font-body text-sm hover:underline mt-1">
          Créer le premier article
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-background border-b border-gray-light">
          <tr>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Titre</th>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Catégorie</th>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Auteur</th>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Lecture</th>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left font-display text-xs text-text-light uppercase tracking-wider">Publié</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id} className="border-b border-gray-light last:border-0 hover:bg-background transition-colors">
              <td className="px-6 py-3">
                <p className="font-body text-sm text-text-primary font-medium max-w-[240px] truncate">{article.title}</p>
                <p className="font-body text-xs text-text-light">{article.slug}</p>
              </td>
              <td className="px-6 py-3">
                <span className="inline-block px-2.5 py-0.5 bg-green-50 text-primary text-xs rounded-full font-body">
                  {article.category}
                </span>
              </td>
              <td className="px-6 py-3 font-body text-sm text-text-secondary">{article.author}</td>
              <td className="px-6 py-3 font-body text-sm text-text-secondary">
                {article.read_time ? `${article.read_time} min` : '—'}
              </td>
              <td className="px-6 py-3 font-body text-sm text-text-secondary whitespace-nowrap">
                {new Date(article.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-6 py-3">
                <button
                  onClick={() => onTogglePublished(article)}
                  disabled={togglePendingId === article.id}
                  aria-label={article.published ? 'Dépublier' : 'Publier'}
                  className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                    article.published ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mt-0.5 ${
                      article.published ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => onEdit(article)}
                    className="p-1.5 rounded-lg text-text-light hover:text-primary hover:bg-green-50 transition-colors"
                    aria-label="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteRequest(article.id)}
                    className="p-1.5 rounded-lg text-text-light hover:text-danger hover:bg-red-50 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
