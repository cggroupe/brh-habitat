import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ArticlesPaginationProps {
  page: number
  totalPages: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export function ArticlesPagination({ page, totalPages, total, onPrev, onNext }: ArticlesPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-light">
      <p className="font-body text-sm text-text-light">
        Page {page + 1} sur {totalPages} — {total} résultats
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="p-1.5 rounded-lg border border-gray-light hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
