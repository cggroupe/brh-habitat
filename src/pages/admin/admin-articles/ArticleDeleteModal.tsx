import { Trash2 } from 'lucide-react'

interface ArticleDeleteModalProps {
  deleteId: string
  deleting: boolean
  onConfirm: (id: string) => void
  onCancel: () => void
}

export function ArticleDeleteModal({ deleteId, deleting, onConfirm, onCancel }: ArticleDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface rounded-2xl border border-gray-light p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 size={18} className="text-danger" />
          </div>
          <h3 className="font-display text-base text-text-primary">Supprimer l'article</h3>
        </div>
        <p className="font-body text-sm text-text-secondary mb-5">
          Cette action est irréversible. L'article sera définitivement supprimé.
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-body text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(deleteId)}
            disabled={deleting}
            className="px-4 py-2 bg-danger text-white font-display text-sm rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
