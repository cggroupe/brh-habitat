/**
 * Hooks React Query — external-data (sources externes prospection).
 * Pair volontaire avec src/api/external-data.ts.
 *
 * Phase 11.1 — Tier 1 socle scoring.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { externalDataApi } from '@/api/external-data'

export const EXT_DATA_KEY = ['external-data'] as const

/**
 * Enrichit 1 prospect (calcul score_v2 + persistance).
 *
 * Invalide les caches `prospects` après succès (la liste reflète le nouveau score).
 */
export function useEnrichProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prospectId: string) => externalDataApi.enrichProspect(prospectId),
    onSuccess: (_, prospectId) => {
      qc.invalidateQueries({ queryKey: ['prospects', prospectId] })
      qc.invalidateQueries({ queryKey: ['prospects', 'list'] })
      qc.invalidateQueries({ queryKey: ['brh_dpe_prospects'] })
    },
  })
}

/**
 * Lookup Géorisques d'une commune (cache 90j Supabase).
 */
export function useGeorisquesLookup(opts: {
  codeInsee: string | null | undefined
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [...EXT_DATA_KEY, 'georisques', opts.codeInsee] as const,
    queryFn: () =>
      externalDataApi.georisquesLookup({
        codeInsee: opts.codeInsee!,
      }),
    enabled: !!opts.codeInsee && (opts.enabled ?? true),
    staleTime: 7_776_000_000, // 90j (cohérent avec cache EF)
  })
}
