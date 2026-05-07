/**
 * Phase 19 Sprint D — Hooks React Query pour PLU IA + Vision IA toiture.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { foncierPluApi, foncierSatelliteApi } from '@/api/foncier-ia'

export const FONCIER_PLU_KEY = ['foncier-plu'] as const
export const FONCIER_SATELLITE_KEY = ['foncier-satellite'] as const

/* =========================== PLU ============================ */

/** Lit le cache local (pas d'appel IA). */
export function useCachedPlu(codeInsee: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_PLU_KEY, 'cached', codeInsee] as const,
    queryFn: () => foncierPluApi.getCached(codeInsee!),
    enabled: !!codeInsee && codeInsee.length === 5,
    staleTime: 5 * 60_000,
  })
}

/** Lance l'analyse IA — appel coûteux, opt-in via bouton. */
export function useSummarizePlu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ codeInsee, forceRefresh }: { codeInsee: string; forceRefresh?: boolean }) =>
      foncierPluApi.summarize(codeInsee, forceRefresh),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_PLU_KEY })
    },
  })
}

/* =========================== SATELLITE ============================ */

export function useCachedSatellite(parcelleIdu: string | null | undefined) {
  return useQuery({
    queryKey: [...FONCIER_SATELLITE_KEY, 'cached', parcelleIdu] as const,
    queryFn: () => foncierSatelliteApi.getCached(parcelleIdu!),
    enabled: !!parcelleIdu && parcelleIdu.length === 14,
    staleTime: 5 * 60_000,
  })
}

export function useAnalyzeSatellite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ parcelleIdu, forceRefresh }: { parcelleIdu: string; forceRefresh?: boolean }) =>
      foncierSatelliteApi.analyze(parcelleIdu, forceRefresh),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FONCIER_SATELLITE_KEY })
    },
  })
}
