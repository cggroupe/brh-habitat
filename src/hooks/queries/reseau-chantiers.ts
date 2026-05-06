/**
 * Phase 18.7 — Hooks React Query pour marketplace chantiers.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  reseauChantiersApi,
  type ListChantiersFilters,
  type ChantierOffer,
} from '@/api/reseau-chantiers'

export const RESEAU_CHANTIERS_KEY = ['reseau-chantiers'] as const

export function useChantiers(filters: ListChantiersFilters = {}) {
  return useQuery({
    queryKey: [...RESEAU_CHANTIERS_KEY, 'list', filters] as const,
    queryFn: () => reseauChantiersApi.list(filters),
    staleTime: 60_000,
  })
}

export function useChantier(id: string | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_CHANTIERS_KEY, 'detail', id] as const,
    queryFn: () => reseauChantiersApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useCreateChantier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof reseauChantiersApi.create>[0]) =>
      reseauChantiersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_CHANTIERS_KEY })
    },
  })
}

export function useUpdateChantier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: Parameters<typeof reseauChantiersApi.update>[1]
    }) => reseauChantiersApi.update(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: RESEAU_CHANTIERS_KEY })
      qc.setQueryData([...RESEAU_CHANTIERS_KEY, 'detail', data.id], data)
    },
  })
}

export function useCloseChantier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reseauChantiersApi.close(id),
    onSuccess: (data: ChantierOffer) => {
      qc.invalidateQueries({ queryKey: RESEAU_CHANTIERS_KEY })
      qc.setQueryData([...RESEAU_CHANTIERS_KEY, 'detail', data.id], data)
    },
  })
}

export function useCancelChantier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      reseauChantiersApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_CHANTIERS_KEY })
    },
  })
}
