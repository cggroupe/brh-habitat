/**
 * Phase 11.4 — API tableau Foncier Prospects (paginé + filtré).
 *
 * Backend RPC `brh_foncier_prospects_table` qui joint brh_dpe_prospects + brh_ext_commune + brh_ext_iris.
 * Renvoie les prospects DPE F/G classés par score_v2 DESC, paginés (50 par page max 200).
 */
import { supabase } from '@/lib/supabase'

export type ScoreV2Segment = 'ultra_chaud' | 'mpr_bleu_prio' | 'premium' | 'standard' | 'cold'
export type CouleurMpr = 'bleu' | 'jaune' | 'violet' | 'rose'

export interface FoncierProspectRow {
  id: number
  adresse: string | null
  commune: string | null
  code_postal: string | null
  departement: string | null
  surface: number | null
  etiquette_dpe: string | null
  annee_construction: number | null
  conso_m2_ep: number | null
  type_batiment: string | null
  score_v2: number | null
  score_v2_segment: ScoreV2Segment | null
  iris_code: string | null
  code_insee_commune: string | null
  couleur_mpr: CouleurMpr | null
  decile_estime: number | null
  opah_active: boolean | null
  opah_type: string | null
  rga_alea: 'faible' | 'moyen' | 'fort' | null
  radon_categorie: number | null
  tlv_tendue: boolean | null
  tlv_zonage: string | null
  audits_ademe_count: number | null
  dvf_mutation_24m: boolean | null
  dvf_prix_m2: number | null
  total_count: number
}

export interface FoncierTableFilters {
  dept?: string
  scoreV2Min?: number
  segmentV2?: ScoreV2Segment
  opahOnly?: boolean
  rgaFortOnly?: boolean
  tlvTendueOnly?: boolean
  auditsDynaOnly?: boolean
  couleurMpr?: CouleurMpr
  search?: string
  limit?: number
  offset?: number
}

export const foncierProspectsTableApi = {
  async list(filters: FoncierTableFilters = {}): Promise<FoncierProspectRow[]> {
    const { data, error } = await supabase.rpc('brh_foncier_prospects_table', {
      p_dept: filters.dept ?? null,
      p_score_v2_min: filters.scoreV2Min ?? 0,
      p_segment_v2: filters.segmentV2 ?? null,
      p_opah_only: filters.opahOnly ?? false,
      p_rga_fort_only: filters.rgaFortOnly ?? false,
      p_tlv_tendue_only: filters.tlvTendueOnly ?? false,
      p_audits_dyna_only: filters.auditsDynaOnly ?? false,
      p_couleur_mpr: filters.couleurMpr ?? null,
      p_search: filters.search ?? null,
      p_limit: Math.min(filters.limit ?? 50, 200),
      p_offset: Math.max(0, filters.offset ?? 0),
    })
    if (error) throw error
    return (data ?? []) as FoncierProspectRow[]
  },
}
