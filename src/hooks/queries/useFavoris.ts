/**
 * Hooks tanstack query pour les favoris polymorphes BRH.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { brhFavorisApi, type FavoriEntityType } from '@/api/brh-favoris'

export function useFavorisList() {
  return useQuery({
    queryKey: ['brh', 'favoris', 'list'],
    queryFn: () => brhFavorisApi.list(),
    staleTime: 30_000,
  })
}

export function useIsFavorite(entity_type: FavoriEntityType | null | undefined, entity_id: string | null | undefined) {
  return useQuery({
    queryKey: ['brh', 'favoris', 'is', entity_type, entity_id],
    queryFn: () => brhFavorisApi.isFavorite(entity_type as FavoriEntityType, entity_id as string),
    enabled: !!entity_type && !!entity_id,
    staleTime: 10_000,
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: brhFavorisApi.toggle,
    onSuccess: (_isAdded, vars) => {
      qc.invalidateQueries({ queryKey: ['brh', 'favoris', 'list'] })
      qc.invalidateQueries({ queryKey: ['brh', 'favoris', 'is', vars.entity_type, vars.entity_id] })
    },
  })
}
