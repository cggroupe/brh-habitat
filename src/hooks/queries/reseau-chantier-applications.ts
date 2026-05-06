/**
 * Phase 18.7 — Hooks React Query pour candidatures chantiers.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reseauChantierApplicationsApi } from '@/api/reseau-chantier-applications'
import { RESEAU_CHANTIERS_KEY } from '@/hooks/queries/reseau-chantiers'

export const RESEAU_CHANTIER_APPLICATIONS_KEY = ['reseau-chantier-applications'] as const

export function useApplicationsForOffer(offerId: string | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_CHANTIER_APPLICATIONS_KEY, 'for-offer', offerId] as const,
    queryFn: () => reseauChantierApplicationsApi.listForOffer(offerId!),
    enabled: !!offerId,
    staleTime: 30_000,
  })
}

export function useMyApplications() {
  return useQuery({
    queryKey: [...RESEAU_CHANTIER_APPLICATIONS_KEY, 'mine'] as const,
    queryFn: () => reseauChantierApplicationsApi.mine(),
    staleTime: 60_000,
  })
}

export function useApplyToChantier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Parameters<typeof reseauChantierApplicationsApi.apply>[0]) =>
      reseauChantierApplicationsApi.apply(params),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: RESEAU_CHANTIER_APPLICATIONS_KEY })
      qc.invalidateQueries({ queryKey: [...RESEAU_CHANTIERS_KEY, 'detail', vars.offerId] })
    },
  })
}

export function useShortlistApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => reseauChantierApplicationsApi.shortlist(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_CHANTIER_APPLICATIONS_KEY }),
  })
}

export function useSelectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => reseauChantierApplicationsApi.select(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_CHANTIER_APPLICATIONS_KEY }),
  })
}

export function useRejectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => reseauChantierApplicationsApi.reject(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_CHANTIER_APPLICATIONS_KEY }),
  })
}

export function useWithdrawApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => reseauChantierApplicationsApi.withdraw(applicationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RESEAU_CHANTIER_APPLICATIONS_KEY }),
  })
}
