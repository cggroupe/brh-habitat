/**
 * Phase 19 Sprint E — Hooks React Query pour BODACC + permis Sit@del2.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  foncierBodaccApi,
  foncierPermisApi,
  type BodaccFilters,
  type PermisFilters,
} from '@/api/foncier-tertiaire'

export const FONCIER_BODACC_KEY = ['foncier-bodacc'] as const
export const FONCIER_PERMIS_KEY = ['foncier-permis'] as const

/* =========================== BODACC ============================ */

export function useBodaccCached(filters: BodaccFilters) {
  return useQuery({
    queryKey: [...FONCIER_BODACC_KEY, 'cached', filters] as const,
    queryFn: () => foncierBodaccApi.listCached(filters),
    staleTime: 60_000,
  })
}

export function useRefreshBodacc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (filters: BodaccFilters) => foncierBodaccApi.refresh(filters),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_BODACC_KEY })
    },
  })
}

/* =========================== PERMIS ============================ */

export function usePermis(filters: PermisFilters) {
  const enabled =
    !!filters.parcelle_idu || !!filters.code_insee_commune || !!filters.departement
  return useQuery({
    queryKey: [...FONCIER_PERMIS_KEY, 'list', filters] as const,
    queryFn: () => foncierPermisApi.list(filters),
    enabled,
    staleTime: 5 * 60_000,
  })
}
