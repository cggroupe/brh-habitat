/**
 * Phase 19 Sprint C — Hooks React Query pour sociodémo + DVF historique.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foncierSociodemoApi } from '@/api/foncier-sociodemo'

export const FONCIER_SOCIODEMO_KEY = ['foncier-sociodemo'] as const

export function useCommuneSociodemo(codeInsee: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_SOCIODEMO_KEY, 'commune', codeInsee] as const,
    queryFn: () => foncierSociodemoApi.fetchByInsee(codeInsee!),
    enabled: !!codeInsee && codeInsee.length === 5,
    staleTime: 5 * 60_000,
  })
}

export function useRefreshSociodemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (codeInsee: string) => foncierSociodemoApi.fetchByInsee(codeInsee, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_SOCIODEMO_KEY })
    },
  })
}

export function useDvfStats(codeInsee: string | null | undefined, yearsBack = 5) {
  return useQuery({
    queryKey: [...FONCIER_SOCIODEMO_KEY, 'dvf-stats', codeInsee, yearsBack] as const,
    queryFn: () => foncierSociodemoApi.getDvfStats(codeInsee!, yearsBack),
    enabled: !!codeInsee && codeInsee.length === 5,
    staleTime: 5 * 60_000,
  })
}

export function useDvfByParcelle(parcelleIdu: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_SOCIODEMO_KEY, 'dvf-parcelle', parcelleIdu] as const,
    queryFn: () => foncierSociodemoApi.getDvfByParcelle(parcelleIdu!),
    enabled: !!parcelleIdu && parcelleIdu.length === 14,
    staleTime: 60_000,
  })
}

export function useDvfByCommune(codeInsee: string | null | undefined, limit = 50) {
  return useQuery({
    queryKey: [...FONCIER_SOCIODEMO_KEY, 'dvf-commune', codeInsee, limit] as const,
    queryFn: () => foncierSociodemoApi.getDvfByCommune(codeInsee!, limit),
    enabled: !!codeInsee && codeInsee.length === 5,
    staleTime: 60_000,
  })
}
