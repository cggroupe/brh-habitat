/**
 * Hooks React Query pour la feature "Réseau Pro".
 * Voir [src/api/brh-reseau-pro.ts].
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  brhReseauApi,
  type ReseauListFilters,
  type ReseauContactMethod,
  type ReseauClaimStatus,
} from '@/api/brh-reseau-pro'

export const RESEAU_LIST_KEY = ['brh', 'reseau-pro', 'list'] as const
export const RESEAU_GET_KEY = ['brh', 'reseau-pro', 'get'] as const
export const RESEAU_STATS_KEY = ['brh', 'reseau-pro', 'stats'] as const

export function useReseauList(filters: ReseauListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: [...RESEAU_LIST_KEY, filters] as const,
    queryFn: () => brhReseauApi.list(filters),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useReseauProspect(id: number | null | undefined) {
  return useQuery({
    queryKey: [...RESEAU_GET_KEY, id] as const,
    queryFn: () => brhReseauApi.get(id as number),
    enabled: !!id && id > 0,
    staleTime: 30_000,
  })
}

export function useReseauStats(scope: 'global' | 'mine' = 'global') {
  return useQuery({
    queryKey: [...RESEAU_STATS_KEY, scope] as const,
    queryFn: () => brhReseauApi.stats(scope),
    staleTime: 60_000,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: RESEAU_LIST_KEY })
  qc.invalidateQueries({ queryKey: RESEAU_GET_KEY })
  qc.invalidateQueries({ queryKey: RESEAU_STATS_KEY })
}

export function useReseauClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: number; method?: ReseauContactMethod; notes?: string }) =>
      brhReseauApi.claim(args),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useReseauUpdateClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: number; status?: ReseauClaimStatus; notes?: string }) =>
      brhReseauApi.updateClaim(args),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useReseauUnclaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => brhReseauApi.unclaim(id),
    onSuccess: () => invalidateAll(qc),
  })
}
