/**
 * Phase 19 Sprint A — Hooks React Query pour favoris parcelles agence.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  foncierFavorisApi,
  type FavoriPriorite,
  type FavoriStatus,
} from '@/api/foncier-favoris'

export const FONCIER_FAVORIS_KEY = ['foncier-favoris'] as const

export function useMyFavoris() {
  return useQuery({
    queryKey: [...FONCIER_FAVORIS_KEY, 'mine'] as const,
    queryFn: () => foncierFavorisApi.listMine(),
    staleTime: 60_000,
  })
}

export function useFavori(id: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_FAVORIS_KEY, 'detail', id] as const,
    queryFn: () => foncierFavorisApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useIsFavori(parcelleIdu: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_FAVORIS_KEY, 'is-favori', parcelleIdu] as const,
    queryFn: () => foncierFavorisApi.isFavori(parcelleIdu!),
    enabled: !!parcelleIdu,
    staleTime: 30_000,
  })
}

export function useAddFavori() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Parameters<typeof foncierFavorisApi.add>[0]) =>
      foncierFavorisApi.add(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_FAVORIS_KEY })
    },
  })
}

export function useUpdateFavori() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<{
        tags: string[]
        notes: string | null
        priorite: FavoriPriorite
        status: FavoriStatus
      }>
    }) => foncierFavorisApi.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_FAVORIS_KEY })
    },
  })
}

export function useRemoveFavori() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => foncierFavorisApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_FAVORIS_KEY })
    },
  })
}
