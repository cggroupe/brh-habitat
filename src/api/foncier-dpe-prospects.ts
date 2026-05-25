/**
 * Phase 19 Sprint F — API DPE prospects pour layer carte foncier.
 *
 * Réutilise la table existante `brh_dpe_prospects` (59k DPE F/G migrés Phase 6.2).
 * Filtre par BBOX géo + DPE rating pour afficher les pings colorés sur la carte.
 */
import { supabase } from '@/lib/supabase'
import type { DpeRating } from '@/components/foncier/DpeMarker'

export interface DpeProspectMarker {
  id: string
  lat: number
  lng: number
  dpe_rating: DpeRating
  adresse: string | null
  commune: string | null
  surface: number | null
  code_insee_commune: string | null
  /** Phase 11.1 — score composite v2 (0-100) basé sur Filosofi + Enedis + Géorisques + ANAH + Sit@del2 + Recensement */
  score_v2: number | null
  /** Phase 11.1 — segment commercial calculé depuis score_v2 */
  score_v2_segment: 'ultra_chaud' | 'mpr_bleu_prio' | 'premium' | 'standard' | 'cold' | null
  iris_code: string | null
  /** Phase 11.3 — flags commune enrichi via brh_ext_commune */
  opah_active?: boolean | null
  rga_alea?: 'faible' | 'moyen' | 'fort' | null
  tlv_tendue?: boolean | null
  audits_ademe_count?: number | null
  delta_dju_2050?: number | null
}

export interface DpeBbox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface DpeProspectFilters {
  bbox?: DpeBbox
  ratings?: DpeRating[]
  limit?: number
  departement?: string
  /** Phase 11.1 — score composite v2 minimum (0-100) */
  scoreV2Min?: number
  /** Phase 11.1 — filtre par segment composite */
  segmentV2?: 'ultra_chaud' | 'mpr_bleu_prio' | 'premium' | 'standard' | 'cold'
  /** Phase 11.3 — restreint aux communes avec OPAH/PIG actif */
  opahOnly?: boolean
  /** Phase 11.3 — restreint aux communes RGA fort (Géorisques) */
  rgaFortOnly?: boolean
  /** Phase 11.3 — restreint aux communes en zone tendue TLV */
  tlvTendueOnly?: boolean
  /** Phase 11.3 — restreint aux communes avec > 100 audits ADEME 2023+ */
  auditsDynaOnly?: boolean
}

export const foncierDpeProspectsApi = {
  /**
   * Liste des prospects DPE dans un BBOX géo + filtres par rating.
   * Phase 11.3 : utilise la RPC `brh_foncier_prospects_filtered` qui joint brh_ext_commune
   * pour permettre le filtrage par flags commune (OPAH/RGA/TLV/audits).
   */
  async listByBbox(filters: DpeProspectFilters): Promise<DpeProspectMarker[]> {
    if (!filters.bbox) return []
    const ratings = filters.ratings ?? ['F', 'G']

    const { data, error } = await supabase.rpc('brh_foncier_prospects_filtered', {
      p_min_lat: filters.bbox.minLat,
      p_max_lat: filters.bbox.maxLat,
      p_min_lng: filters.bbox.minLng,
      p_max_lng: filters.bbox.maxLng,
      p_ratings: ratings,
      p_score_v2_min: filters.scoreV2Min ?? 0,
      p_segment_v2: filters.segmentV2 ?? undefined,
      p_opah_only: filters.opahOnly ?? false,
      p_rga_fort_only: filters.rgaFortOnly ?? false,
      p_tlv_tendue_only: filters.tlvTendueOnly ?? false,
      p_audits_dyna_only: filters.auditsDynaOnly ?? false,
      p_dept: filters.departement ?? undefined,
      p_limit: Math.min(filters.limit ?? 500, 2000),
    })
    if (error) throw error

    type RawRow = {
      id: number
      lat: number
      lng: number
      dpe_rating: string | null
      adresse: string | null
      commune: string | null
      surface: number | null
      code_insee_commune: string | null
      score_v2: number | null
      score_v2_segment: string | null
      iris_code: string | null
      opah_active: boolean | null
      rga_alea: string | null
      tlv_tendue: boolean | null
      audits_ademe_count: number | null
      delta_dju_2050: number | null
    }

    return ((data ?? []) as RawRow[])
      .filter(
        (r): r is RawRow & { dpe_rating: DpeRating } =>
          !!r.dpe_rating && ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(r.dpe_rating),
      )
      .map((r) => ({
        id: String(r.id),
        lat: r.lat,
        lng: r.lng,
        dpe_rating: r.dpe_rating as DpeRating,
        adresse: r.adresse,
        commune: r.commune,
        surface: r.surface,
        code_insee_commune: r.code_insee_commune,
        score_v2: r.score_v2,
        score_v2_segment: (r.score_v2_segment as DpeProspectMarker['score_v2_segment']) ?? null,
        iris_code: r.iris_code,
        opah_active: r.opah_active,
        rga_alea: (r.rga_alea as DpeProspectMarker['rga_alea']) ?? null,
        tlv_tendue: r.tlv_tendue,
        audits_ademe_count: r.audits_ademe_count,
        delta_dju_2050: r.delta_dju_2050,
      }))
  },
}
