/**
 * API prospects-bretagne — Phase 11.2.
 *
 * Lecture des 59 306 prospects DPE F/G Bretagne avec filtres
 * (segment scoring v2, département, IRIS couleur MPR, etc.).
 *
 * Pair volontaire avec hooks/queries/prospects-bretagne.ts (pattern API ↔ Hooks).
 */

import { supabase } from '@/lib/supabase'
import type { ScoreV2Segment, CouleurMpr } from '@/lib/dpe-engine/external/types'

export interface ProspectBretagneRow {
  id: number
  numero_dpe: string | null
  date_dpe: string | null
  etiquette_dpe: string | null
  etiquette_ges: string | null
  adresse_ban: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  latitude: number | null
  longitude: number | null
  type_batiment: string | null
  surface_habitable: number | null
  conso_m2_ep: number | null
  energie_chauffage: string | null
  // Scoring v2
  iris_code: string | null
  score_v2: number | null
  score_v2_segment: ScoreV2Segment | null
  score_v2_calculated_at: string | null
  enedis_kwh_logt: number | null
  dvf_mutation_24m: boolean
  abf_required: boolean
  // Aides existantes
  mpr_bleu_total: number | null
  mpr_jaune_total: number | null
  mpr_violet_total: number | null
  cee_total: number | null
}

export interface ListProspectsFilters {
  /** Filtres scoring */
  segment?: ScoreV2Segment | null
  scoreMin?: number | null
  scoreMax?: number | null
  /** Filtres géo */
  departement?: '22' | '29' | '35' | '56' | null
  codePostal?: string | null
  /** Filtres DPE */
  etiquettes?: string[] | null  // ['F', 'G']
  /** Filtres IRIS (jointure brh_ext_iris) */
  couleurMpr?: CouleurMpr | null
  /** Filtres aides */
  hasMprBleu?: boolean | null
  /** Pagination */
  limit?: number
  offset?: number
  /** Order */
  orderBy?: 'score_v2' | 'date_dpe' | 'mpr_bleu_total'
  orderDir?: 'asc' | 'desc'
}

export interface ListProspectsResult {
  rows: ProspectBretagneRow[]
  total: number
}

export const prospectsBretagneApi = {
  /**
   * Liste paginée des prospects DPE Bretagne avec filtres.
   */
  async list(filters: ListProspectsFilters = {}): Promise<ListProspectsResult> {
    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0

    let q = supabase
      .from('brh_dpe_prospects')
      .select(
        `id, numero_dpe, date_dpe, etiquette_dpe, etiquette_ges, adresse_ban,
         code_postal, commune, departement, latitude, longitude,
         type_batiment, surface_habitable, conso_m2_ep, energie_chauffage,
         iris_code, score_v2, score_v2_segment, score_v2_calculated_at,
         enedis_kwh_logt, dvf_mutation_24m, abf_required,
         mpr_bleu_total, mpr_jaune_total, mpr_violet_total, cee_total`,
        { count: 'exact' },
      )

    if (filters.segment) q = q.eq('score_v2_segment', filters.segment)
    if (filters.scoreMin != null) q = q.gte('score_v2', filters.scoreMin)
    if (filters.scoreMax != null) q = q.lte('score_v2', filters.scoreMax)
    if (filters.departement) q = q.eq('departement', filters.departement)
    if (filters.codePostal) q = q.eq('code_postal', filters.codePostal)
    if (filters.etiquettes && filters.etiquettes.length > 0) {
      q = q.in('etiquette_dpe', filters.etiquettes)
    }
    if (filters.hasMprBleu) q = q.gt('mpr_bleu_total', 0)

    const orderBy = filters.orderBy ?? 'score_v2'
    const ascending = (filters.orderDir ?? 'desc') === 'asc'
    q = q.order(orderBy, { ascending, nullsFirst: false })

    q = q.range(offset, offset + limit - 1)

    const { data, error, count } = await q
    if (error) throw error
    return {
      rows: (data ?? []) as ProspectBretagneRow[],
      total: count ?? 0,
    }
  },

  /**
   * Détail 1 prospect (avec joints IRIS + commune externes).
   */
  async detail(id: number): Promise<ProspectBretagneRow | null> {
    const { data, error } = await supabase
      .from('brh_dpe_prospects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return (data as ProspectBretagneRow) ?? null
  },

  /**
   * Liste légère lat/lng + segment pour la carte (Phase 13.5).
   * Limite 5000 points pour les perf de Leaflet/heat.
   */
  async listForMap(filters: {
    segment?: ScoreV2Segment | null
    departement?: '22' | '29' | '35' | '56' | null
    scoreMin?: number | null
    limit?: number
  } = {}): Promise<Array<{
    id: number
    lat: number
    lng: number
    score: number | null
    segment: ScoreV2Segment | null
    etiquette: string | null
    commune: string | null
  }>> {
    let q = supabase
      .from('brh_dpe_prospects')
      .select('id, latitude, longitude, score_v2, score_v2_segment, etiquette_dpe, commune')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (filters.segment) q = q.eq('score_v2_segment', filters.segment)
    if (filters.departement) q = q.eq('departement', filters.departement)
    if (filters.scoreMin != null) q = q.gte('score_v2', filters.scoreMin)

    q = q.order('score_v2', { ascending: false, nullsFirst: false }).limit(filters.limit ?? 5000)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id as number,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      score: (r.score_v2 as number | null) ?? null,
      segment: (r.score_v2_segment as ScoreV2Segment | null) ?? null,
      etiquette: (r.etiquette_dpe as string | null) ?? null,
      commune: (r.commune as string | null) ?? null,
    }))
  },

  /**
   * Compteur par segment (pour cards résumé).
   */
  async countBySegment(filters: Pick<ListProspectsFilters, 'departement'> = {}): Promise<
    Record<ScoreV2Segment, number>
  > {
    const segments: ScoreV2Segment[] = ['ultra_chaud', 'mpr_bleu_prio', 'premium', 'standard', 'cold']
    const counts: Record<ScoreV2Segment, number> = {
      ultra_chaud: 0,
      mpr_bleu_prio: 0,
      premium: 0,
      standard: 0,
      cold: 0,
    }
    await Promise.all(
      segments.map(async (seg) => {
        let q = supabase
          .from('brh_dpe_prospects')
          .select('id', { count: 'exact', head: true })
          .eq('score_v2_segment', seg)
        if (filters.departement) q = q.eq('departement', filters.departement)
        const { count } = await q
        counts[seg] = count ?? 0
      }),
    )
    return counts
  },
}
