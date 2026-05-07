/**
 * Phase 19 Sprint B — Hooks React Query pour SCI enrichi.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foncierSciApi, type SearchSciFilters } from '@/api/foncier-sci'

export const FONCIER_SCI_KEY = ['foncier-sci'] as const

/** Recherche SCI (avec mode cacheOnly pour la liste rapide). */
export function useSearchSci(filters: SearchSciFilters) {
  // Désactivé par défaut : on attend une action user pour ne pas spammer l'API
  const enabled = (filters.q && filters.q.length >= 3) || filters.cacheOnly === true
  return useQuery({
    queryKey: [...FONCIER_SCI_KEY, 'search', filters] as const,
    queryFn: () => foncierSciApi.search(filters),
    enabled,
    staleTime: 60_000,
  })
}

export function useSciBySiren(siren: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_SCI_KEY, 'detail', siren] as const,
    queryFn: () => foncierSciApi.getBySiren(siren!),
    enabled: !!siren && /^\d{9}$/.test(siren),
    staleTime: 60_000,
  })
}

export function useCheckDeces() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (siren: string) => foncierSciApi.checkDeces(siren),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_SCI_KEY })
    },
  })
}

export function useRefreshSci() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (siren: string) => foncierSciApi.getBySiren(siren, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_SCI_KEY })
    },
  })
}
