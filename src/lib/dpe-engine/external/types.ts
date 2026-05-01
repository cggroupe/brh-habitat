/**
 * Types Phase 11.1 — Tier 1 socle scoring (sources externes prospection).
 *
 * Référence : docs/wiki/external-data-sources.md
 *
 * Ces types reflètent le schéma SQL (migration `20260507100000_brh_ext_tier1.sql`).
 * Ils ne sont PAS dans `database.ts` car le client Supabase reste non typé (B01).
 */

export type CouleurMpr = 'bleu' | 'jaune' | 'violet' | 'rose'

export type RgaAlea = 'faible' | 'moyen' | 'fort'

export type OpahType = 'OPAH' | 'OPAH-RU' | 'OPAH-CD' | 'PIG'

export type ScoreV2Segment =
  | 'ultra_chaud'
  | 'mpr_bleu_prio'
  | 'premium'
  | 'standard'
  | 'cold'

/**
 * Cache générique APIs externes.
 * Manipulé exclusivement par EF (service_role).
 */
export interface BrhExtCacheRow {
  id: string
  source: string
  cache_key: string
  payload: unknown
  fetched_at: string
  ttl_seconds: number
}

/**
 * Données IRIS pré-jointes (Filosofi + Recensement + Enedis + GRDF).
 */
export interface BrhExtIrisRow {
  iris_code: string
  commune_insee: string

  // Filosofi 2021
  med21: number | null
  d121: number | null
  d921: number | null
  decile_estime: number | null
  couleur_mpr: CouleurMpr | null

  // Recensement Logement 2022
  tx_proprio: number | null
  tx_avant_1975: number | null

  // Enedis IRIS
  thermosens_kwh_dj: number | null
  conso_resid_kwh_an: number | null

  // GRDF IRIS
  conso_gaz_mwh_an: number | null
  pdl_gaz_resid: number | null

  fetched_at: string
}

/**
 * Données commune-level (Géorisques + ANAH + LOVAC + RGE + Sit@del2 + Météo-France).
 */
export interface BrhExtCommuneRow {
  insee: string

  // Géorisques
  radon_categorie: 1 | 2 | 3 | null
  rga_alea: RgaAlea | null
  ppri_present: boolean
  sismique_zone: number | null

  // ANAH
  opah_active: boolean
  opah_type: OpahType | null
  opah_operateur: string | null
  opah_fin_validite: string | null

  // LOVAC
  tx_vacance_struct: number | null

  // Concurrence RGE
  nb_rge_isolation: number | null
  nb_rge_pac: number | null

  // Sit@del2 (12 mois agrégés)
  nb_dp_logements_existants_12m: number | null

  // Météo-France
  station_dju_id: string | null
  dju_18_normal: number | null

  // DRIAS
  delta_dju_2050: number | null

  fetched_at: string
}

/**
 * Sous-ensemble Prospect utilisé par score-v2 (subset de `brh_dpe_prospects`).
 * On n'importe pas la table complète pour rester découplé du client Supabase.
 */
export interface ProspectScoreInput {
  id: string
  etiquette_dpe: string | null
  has_pv_36kw: boolean | null
}

/**
 * Risques Géorisques par adresse (pré-Phase 11.2 — cache léger).
 */
export interface RisquesAdresse {
  rga_local: RgaAlea | null
  inondation_zone: string | null
  cavites_proches: number
  abf_zone: boolean
  abf_type: string | null
}

/**
 * DVF — détection mutation récente parcelle.
 */
export interface DvfSignal {
  mutation_24m: boolean
  prix_m2_growth_3y: number | null
}

/**
 * Enedis adresse (≥10 PDL/adresse — sinon fallback IRIS).
 */
export interface EnedisAddrSignal {
  kwh_par_logt: number | null
}

/**
 * Une règle déclenchée du score composite.
 */
export interface ScoreRule {
  rule: string
  points: number
  trigger: string
}

/**
 * Breakdown final score-v2.
 */
export interface ScoreBreakdown {
  total: number
  rules: ScoreRule[]
  segment: ScoreV2Segment
}
