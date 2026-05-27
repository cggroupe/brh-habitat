/**
 * Hook React Query pour récupérer les vrais counts par segment (Ultra chauds,
 * MPR Bleu prio, Standard, Cold) sur l'ensemble de la base avec filtres
 * appliqués. Sépare ces stats du fetch paginé pour les KPI cards top.
 *
 * Mig : 20260527190000_rpc_foncier_prospects_segment_counts.sql
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ScoreV2Segment } from '@/api/foncier-prospects-table'

export interface SegmentCountsFilters {
  dept?: string
  scoreV2Min?: number
  filterFioul?: boolean
  filterAvecSci?: boolean
  filterParticulier?: boolean
  filterSuccession?: boolean
  search?: string
}

export interface SegmentCounts {
  ultra_chaud: number
  mpr_bleu_prio: number
  standard: number
  cold: number
  total: number
}

export const FONCIER_SEGMENT_COUNTS_KEY = ['foncier-segment-counts'] as const

export function useFoncierSegmentCounts(
  filters: SegmentCountsFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: [...FONCIER_SEGMENT_COUNTS_KEY, filters] as const,
    queryFn: async (): Promise<SegmentCounts> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        'brh_foncier_prospects_segment_counts',
        {
          p_dept: filters.dept ?? null,
          p_score_v2_min: filters.scoreV2Min ?? 0,
          p_filter_fioul: filters.filterFioul ?? false,
          p_filter_avec_sci: filters.filterAvecSci ?? false,
          p_filter_particulier: filters.filterParticulier ?? false,
          p_filter_succession: filters.filterSuccession ?? false,
          p_search: filters.search ?? null,
        },
      )
      if (error) throw error
      const counts: SegmentCounts = {
        ultra_chaud: 0,
        mpr_bleu_prio: 0,
        standard: 0,
        cold: 0,
        total: 0,
      }
      for (const row of (data ?? []) as Array<{ segment: string; count: number }>) {
        const n = Number(row.count)
        counts.total += n
        const seg = row.segment as ScoreV2Segment
        if (seg === 'ultra_chaud') counts.ultra_chaud = n
        else if (seg === 'mpr_bleu_prio') counts.mpr_bleu_prio = n
        else if (seg === 'standard') counts.standard = n
        else if (seg === 'cold') counts.cold = n
      }
      return counts
    },
    enabled,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
