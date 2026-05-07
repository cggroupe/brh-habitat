/**
 * Phase 19 Sprint F — Hook pour DPE prospects sur la carte.
 */
import { useQuery } from '@tanstack/react-query'
import { foncierDpeProspectsApi, type DpeProspectFilters } from '@/api/foncier-dpe-prospects'

export const FONCIER_DPE_PROSPECTS_KEY = ['foncier-dpe-prospects'] as const

export function useDpeProspectsInBbox(filters: DpeProspectFilters, enabled = true) {
  return useQuery({
    queryKey: [...FONCIER_DPE_PROSPECTS_KEY, 'bbox', filters] as const,
    queryFn: () => foncierDpeProspectsApi.listByBbox(filters),
    enabled,
    staleTime: 60_000,
  })
}
