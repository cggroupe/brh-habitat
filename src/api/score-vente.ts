/**
 * Phase 16.0.3 — API Score Vente.
 *
 * Lecture du cache `brh_score_vente_v1`. Les calculs/recalculs en batch
 * sont gérés par un script ops séparé (à venir : `scripts/score-vente/batch.ts`).
 */
import { supabase } from '@/lib/supabase'
import type { ScoreVenteSegment } from '@/lib/dpe-engine/score-vente'

export interface ScoreVenteRow {
  prospect_id: number
  score: number | null
  segment: ScoreVenteSegment | null
  rules_breakdown: Record<string, number>
  proba_6m: number | null
  algo_version: string
  computed_at: string
  /** Joint depuis brh_dpe_prospects — données DPE complètes pour la fiche */
  prospect: {
    id: number
    iris_code: string | null
    adresse: string | null
    adresse_ban: string | null
    commune: string | null
    code_postal: string | null
    departement: string | null
    latitude: number | null
    longitude: number | null
    type_batiment: string | null
    periode_construction: string | null
    annee_construction: number | null
    surface_habitable: number | null
    etiquette_dpe: string | null
    etiquette_ges: string | null
    conso_m2_ep: number | null
    cout_energie_annuel: number | null
    cout_chauffage: number | null
    cout_ecs: number | null
    energie_chauffage: string | null
    energie_ecs: string | null
    isolation_enveloppe: string | null
    isolation_murs: string | null
    isolation_toiture_detail: string | null
    type_ventilation: string | null
    date_dpe: string | null
  } | null
}

export interface ListScoreVenteFilters {
  segment?: ScoreVenteSegment
  departement?: string
  minScore?: number
  search?: string
  limit?: number
}

export const scoreVenteApi = {
  async list(filters: ListScoreVenteFilters = {}): Promise<ScoreVenteRow[]> {
    const limit = Math.min(filters.limit ?? 200, 1000)
    let q = supabase
      .from('brh_score_vente_v1')
      .select(
        `prospect_id, score, segment, rules_breakdown, proba_6m, algo_version, computed_at,
         prospect:brh_dpe_prospects!inner(
           id, adresse, adresse_ban, commune, code_postal, departement, latitude, longitude,
           iris_code,
           type_batiment, periode_construction, annee_construction, surface_habitable,
           etiquette_dpe, etiquette_ges, conso_m2_ep,
           cout_energie_annuel, cout_chauffage, cout_ecs,
           energie_chauffage, energie_ecs,
           isolation_enveloppe, isolation_murs, isolation_toiture_detail,
           type_ventilation, date_dpe
         )`,
      )
      .order('score', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (filters.segment) q = q.eq('segment', filters.segment)
    if (filters.minScore != null) q = q.gte('score', filters.minScore)
    if (filters.departement) {
      q = q.eq('prospect.departement', filters.departement)
    }
    if (filters.search) {
      const safe = filters.search.replace(/[%_]/g, '\\$&')
      q = q.ilike('prospect.commune', `%${safe}%`)
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as unknown as ScoreVenteRow[]
  },

  /** Charge l'étude complète d'un prospect depuis le cache brh_prospect_studies.
   *  Le cache est alimenté par scripts/cache-prospect-studies.ts (cron VPS).
   *  Pas d'EF nécessaire — la table est protégée par RLS pour pro/admin/agence active. */
  async fetchProspectStudy(prospectId: number): Promise<unknown> {
    const { data, error } = await supabase
      .from('brh_prospect_studies')
      .select('study_json, fetched_at')
      .eq('prospect_id', prospectId)
      .maybeSingle()
    if (error) throw error
    if (!data?.study_json) {
      throw new Error('Étude indisponible pour ce prospect (cache non encore alimenté)')
    }
    return data.study_json
  },

  /** Stats agrégées : nombre par segment. */
  async stats(): Promise<Record<ScoreVenteSegment, number>> {
    const segments: ScoreVenteSegment[] = ['tres_chaud', 'chaud', 'tiede', 'froid']
    const counts = await Promise.all(
      segments.map((seg) =>
        supabase
          .from('brh_score_vente_v1')
          .select('prospect_id', { count: 'exact', head: true })
          .eq('segment', seg)
          .then((res) => res.count ?? 0),
      ),
    )
    return Object.fromEntries(segments.map((s, i) => [s, counts[i]])) as Record<
      ScoreVenteSegment,
      number
    >
  },
}
