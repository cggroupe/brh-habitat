/**
 * 2026-05-17 — API v2 unifiée pour UnifiedLeadsView.
 *
 * Wrappe le RPC `brh_foncier_prospects_unified` qui étend l'ancien
 * `brh_foncier_prospects_table` avec coords + détails techniques + filtres
 * fioul/SCI/succession.
 *
 * Retourne `LeadRow[]` directement utilisable par UnifiedLeadsView/Map/Modal.
 */
import { supabase } from '@/lib/supabase'
import type { LeadRow } from '@/types/lead'
import type { ScoreV2Segment } from '@/api/foncier-prospects-table'

export interface FoncierUnifiedFilters {
  dept?: string
  scoreV2Min?: number
  segmentV2?: ScoreV2Segment
  filterFioul?: boolean
  filterAvecSci?: boolean
  filterParticulier?: boolean
  filterSuccession?: boolean
  search?: string
  limit?: number
  offset?: number
}

export const foncierProspectsUnifiedApi = {
  async list(filters: FoncierUnifiedFilters = {}): Promise<LeadRow[]> {
    const { data, error } = await supabase.rpc('brh_foncier_prospects_unified', {
      p_dept: filters.dept ?? null,
      p_score_v2_min: filters.scoreV2Min ?? 0,
      p_segment_v2: filters.segmentV2 ?? null,
      p_filter_fioul: filters.filterFioul ?? false,
      p_filter_avec_sci: filters.filterAvecSci ?? false,
      p_filter_succession: filters.filterSuccession ?? false,
      p_search: filters.search ?? null,
      p_limit: Math.min(filters.limit ?? 50, 200),
      p_offset: Math.max(0, filters.offset ?? 0),
      p_filter_particulier: filters.filterParticulier ?? false,
    })
    if (error) throw error
    return (data ?? []) as LeadRow[]
  },
}
