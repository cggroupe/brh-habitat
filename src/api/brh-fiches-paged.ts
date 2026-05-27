import { supabase } from '@/lib/supabase'

/**
 * API wrapper pour la pagination + filtres serveur des DPE détenus par une SCI
 * (utilisée par PatrimoineMassif pour les SCI > 100 DPE).
 *
 * Migration : 20260527130000_rpc_brh_dpe_by_siren_paged.sql
 */

export interface PagedDpe {
  id: number
  adresse: string | null
  code_postal: string | null
  commune: string | null
  etiquette_dpe: string | null
  surface_habitable: number | null
  annee_construction: number | null
  score_v2: number | null
  score_segment: string | null
}

export interface PagedDpeResult {
  rows: PagedDpe[]
  total: number
}

export interface PagedDpeFilters {
  commune?: string
  etiquette_dpe?: string[]
  score_min?: number
  score_max?: number
  limit?: number
  offset?: number
}

export interface DpeSummary {
  total: number
  by_commune: Record<string, number>
  by_dpe_class: Record<string, number>
  by_segment: Record<string, number>
}

export const brhFichesPagedApi = {
  async getDpeBySiren(siren: string, filters: PagedDpeFilters = {}): Promise<PagedDpeResult> {
    const { data, error } = await supabase.rpc('brh_dpe_by_siren_paged', {
      p_siren: siren,
      p_commune: filters.commune ?? undefined,
      p_etiquette_dpe: filters.etiquette_dpe ?? undefined,
      p_score_min: filters.score_min ?? undefined,
      p_score_max: filters.score_max ?? undefined,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    })
    if (error) throw error
    const rows = (data ?? []) as Array<PagedDpe & { total_count: number }>
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    return {
      rows: rows.map((r) => {
        const { total_count, ...rest } = r
        void total_count
        return rest
      }),
      total,
    }
  },

  async getDpeSummary(siren: string): Promise<DpeSummary> {
    const { data, error } = await supabase.rpc('brh_dpe_summary_by_siren', { p_siren: siren })
    if (error) throw error
    const first = Array.isArray(data) ? data[0] : data
    if (!first) {
      return { total: 0, by_commune: {}, by_dpe_class: {}, by_segment: {} }
    }
    return {
      total: Number(first.total ?? 0),
      by_commune: (first.by_commune ?? {}) as Record<string, number>,
      by_dpe_class: (first.by_dpe_class ?? {}) as Record<string, number>,
      by_segment: (first.by_segment ?? {}) as Record<string, number>,
    }
  },
}
