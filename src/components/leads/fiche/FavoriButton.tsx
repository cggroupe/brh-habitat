/**
 * Bouton "Ajouter aux favoris" / "Retiré des favoris" — toggle.
 * À placer sur chaque header de fiche drill-down (adresse / entreprise / personne).
 */
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { useIsFavorite, useToggleFavorite } from '@/hooks/queries/useFavoris'
import type { FavoriEntityType } from '@/api/brh-favoris'

interface Props {
  entity_type: FavoriEntityType
  entity_id: string
  label: string
  sublabel?: string | null
  size?: 'sm' | 'md'
}

export default function FavoriButton({ entity_type, entity_id, label, sublabel, size = 'md' }: Props) {
  const { data: isFav } = useIsFavorite(entity_type, entity_id)
  const toggle = useToggleFavorite()

  const isActive = isFav ?? false
  const isLoading = toggle.isPending
  const Icon = isLoading ? Loader2 : isActive ? BookmarkCheck : Bookmark

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={() =>
        toggle.mutate({
          entity_type,
          entity_id,
          label,
          sublabel: sublabel ?? null,
        })
      }
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition ${sizeClasses} ${
        isActive
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50'
      } ${isLoading ? 'cursor-wait opacity-70' : ''}`}
      aria-label={isActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={isActive}
    >
      <Icon className={`${iconClass} ${isLoading ? 'animate-spin' : ''}`} />
      {isActive ? 'En favori' : 'Ajouter aux favoris'}
    </button>
  )
}
