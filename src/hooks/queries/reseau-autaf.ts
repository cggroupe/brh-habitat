/**
 * Phase 18.8 — Hooks React Query pour bridge AUTAF.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauAutafApi } from '@/api/reseau-autaf'

export const RESEAU_AUTAF_KEY = ['reseau-autaf'] as const

export function useMyAutafLink() {
  return useQuery({
    queryKey: [...RESEAU_AUTAF_KEY, 'my-link'] as const,
    queryFn: () => reseauAutafApi.getMyLink(),
    staleTime: 5 * 60_000,
  })
}

export function useConfigureAutafLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Parameters<typeof reseauAutafApi.configureManually>[0]) =>
      reseauAutafApi.configureManually(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_AUTAF_KEY }),
  })
}

export function useDisableAutafLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => reseauAutafApi.disable(),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_AUTAF_KEY }),
  })
}

export function useDeleteAutafLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => reseauAutafApi.deleteLink(),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_AUTAF_KEY }),
  })
}

export function useAutafRecommendations(autafUserId: string | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_AUTAF_KEY, 'recommendations', autafUserId] as const,
    queryFn: () => reseauAutafApi.fetchRecommendationsFor(autafUserId!),
    enabled: !!autafUserId,
    staleTime: 10 * 60_000,
    retry: false, // pas de retry sur API externe (gracieux fallback)
  })
}
