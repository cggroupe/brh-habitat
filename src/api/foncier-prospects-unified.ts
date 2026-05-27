/**
 * 2026-05-17 — API v2 unifiée pour UnifiedLeadsView.
 * 2026-05-27 v5 — Ajoute filtres with_phone/email/ca/rdv + dpe_classes[].
 *
 * Wrappe le RPC `brh_foncier_prospects_unified` qui étend l'ancien
 * `brh_foncier_prospects_table` avec coords + détails techniques + filtres
 * fioul/SCI/succession + contacts/CA/RDV.
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
  // v5 (2026-05-27) — filtres pattern Stitch interne (liste-leads-v2.png)
  filterWithPhone?: boolean
  filterWithEmail?: boolean
  filterWithCa?: boolean
  filterWithRdv?: boolean
  /** Classes DPE acceptées (ex: ['F', 'G']) — défaut undefined = pas de filtre */
  dpeClasses?: string[]
}

export const foncierProspectsUnifiedApi = {
  async list(filters: FoncierUnifiedFilters = {}): Promise<LeadRow[]> {
    const { data, error } = await supabase.rpc('brh_foncier_prospects_unified', {
      p_dept: filters.dept ?? undefined,
      p_score_v2_min: filters.scoreV2Min ?? 0,
      p_segment_v2: filters.segmentV2 ?? undefined,
      p_filter_fioul: filters.filterFioul ?? false,
      p_filter_avec_sci: filters.filterAvecSci ?? false,
      p_filter_succession: filters.filterSuccession ?? false,
      p_search: filters.search ?? undefined,
      p_limit: Math.min(filters.limit ?? 50, 200),
      p_offset: Math.max(0, filters.offset ?? 0),
      p_filter_particulier: filters.filterParticulier ?? false,
      p_filter_with_phone: filters.filterWithPhone ?? false,
      p_filter_with_email: filters.filterWithEmail ?? false,
      p_filter_with_ca: filters.filterWithCa ?? false,
      p_filter_with_rdv: filters.filterWithRdv ?? false,
      p_dpe_classes:
        filters.dpeClasses && filters.dpeClasses.length > 0
          ? filters.dpeClasses
          : undefined,
    })
    if (error) throw error
    return (data ?? []) as LeadRow[]
  },
}
