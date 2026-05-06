/**
 * Phase 18.5 — Hooks React Query pour endorsements réseau social.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauEndorsementsApi } from '@/api/reseau-endorsements'

export const RESEAU_ENDORSEMENTS_KEY = ['reseau-endorsements'] as const

export function useEndorsementsForPro(proId: string | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_ENDORSEMENTS_KEY, 'for-pro', proId] as const,
    queryFn: () => reseauEndorsementsApi.forPro(proId!),
    enabled: !!proId,
    staleTime: 60_000,
  })
}

export function useMyEndorsements() {
  return useQuery({
    queryKey: [...RESEAU_ENDORSEMENTS_KEY, 'mine'] as const,
    queryFn: () => reseauEndorsementsApi.mine(),
    staleTime: 60_000,
  })
}

export function useCreateEndorsement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      endorsedProId: string
      metierTag: string
      body?: string
      chantierOfferId?: string
    }) => reseauEndorsementsApi.create(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_ENDORSEMENTS_KEY })
    },
  })
}

export function useDeleteEndorsement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (endorsementId: string) => reseauEndorsementsApi.remove(endorsementId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESEAU_ENDORSEMENTS_KEY })
    },
  })
}
