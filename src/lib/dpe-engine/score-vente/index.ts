/**
 * Phase 16.0.2 — Score Vente v1 (algo heuristique 13 règles).
 *
 * Estime la probabilité qu'un propriétaire de bien DPE F/G en Bretagne
 * mette en vente sous 6 mois. Sortie : score 0-100 + segment + breakdown.
 *
 * Modèle Hoguet "A" : on produit un score d'opportunité, pas une mise en
 * relation directe. L'agence consomme le score via portail /agence (Phase
 * 16.0.6) après signature charte (Phase 16.0.1 brh_partner_contracts).
 *
 * Pas de ML, pas de XGBoost — c'est une **heuristique pondérée** validée
 * empiriquement. Phase 16.11 (T+12 mois, conditionné ≥5 agences) basculera
 * en prédictif XGBoost avec retours réels.
 *
 * Mirroir SQL : `brh_score_vente_v1` (algo_version='v1.0').
 */

export type ScoreVenteSegment = 'tres_chaud' | 'chaud' | 'tiede' | 'froid'

/**
 * Données d'entrée — un sous-ensemble unifié des sources Tier 1+2 (Phase 11).
 * Toutes les clés sont nullables pour gérer les prospects partiellement enrichis.
 */
export interface ScoreVenteInput {
  // DPE
  /** Étiquette DPE actuelle. */
  etiquette_dpe?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | null
  /** Année du DPE. */
  date_dpe?: number | null
  /** Consommation énergie primaire (kWh/m²/an). */
  cep?: number | null
  /** Année construction du logement. */
  date_construction?: number | null
  /** Surface habitable (m²). */
  surface_habitable?: number | null

  // Mutation DVF (acheté récemment ?)
  /** Vrai si mutation DVF dans les 24 derniers mois. */
  dvf_mutation_24m?: boolean | null
  /** Nombre de mutations DVF dans la commune sur 12 derniers mois (proxy zone active). */
  dvf_mutations_commune_12m?: number | null

  // Propriétaire estimé
  /** Âge estimé propriétaire (recensement IRIS médian + heuristique). */
  age_proprietaire_estime?: number | null

  // IRIS / Filosofi
  /** Revenu médian IRIS (€). */
  filosofi_revenu_median?: number | null
  /** Durée détention moyenne IRIS (années). */
  iris_duree_detention_moy?: number | null

  // Système de chauffage
  /** Type de chauffage. */
  type_chauffage?: 'individuel' | 'collectif' | 'mixte' | null

  // Géo
  /** Code département. */
  departement?: string | null
  /** Logement individuel (vs collectif/lotissement). */
  type_batiment?: 'maison' | 'appartement' | null
}

export interface ScoreVenteResult {
  score: number
  segment: ScoreVenteSegment
  proba_6m: number
  rules_breakdown: Record<string, number>
  algo_version: 'v1.0'
}

/** Borne un nombre dans [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Détermine le segment depuis le score. */
export function segmentFromScore(score: number): ScoreVenteSegment {
  if (score >= 80) return 'tres_chaud'
  if (score >= 60) return 'chaud'
  if (score >= 40) return 'tiede'
  return 'froid'
}

/** Probabilité estimée de vente sous 6 mois selon segment (calibrage v1.0). */
export function probaFromSegment(segment: ScoreVenteSegment): number {
  switch (segment) {
    case 'tres_chaud':
      return 0.65
    case 'chaud':
      return 0.4
    case 'tiede':
      return 0.2
    case 'froid':
      return 0.05
  }
}

/**
 * Calcule le Score Vente v1 pour un prospect.
 *
 * Pondérations validées empiriquement sur signaux marché Bretagne :
 *   1. DPE F/G base (+10) — filtre déjà appliqué en amont mais on confirme
 *   2. DPE date >= 5 ans (+15) — propriétaire passif sur la rénovation
 *   3. Mutation DVF 24m (+25) — acheteur récent qui revend
 *   4. Âge propriétaire ≥ 65 (+20) — succession / downsizing imminent
 *   5. Revenu médian IRIS ≥ 30k (+5) — mobilité socio-pro plus élevée
 *   6. Surface ≥ 120m² (+10) — bien lourd à entretenir
 *   7. Construction ≥ 1980 (+5) — rénovation lourde imminente
 *   8. CEP ≥ 450 kWh/m²/an (+10) — passoire évidente, déclencheur travaux/vente
 *   9. Chauffage collectif (-5) — moins de levier vente directe
 *   10. Maison individuelle (+5) — turnover plus rapide qu'appart
 *   11. Mutations commune ≥ 50 sur 12m (+15) — zone active immobilière
 *   12. Durée détention IRIS courte < 8 ans (+10) — quartier à fort cycle
 *   13. Bretagne (+5) — zone H2A spécifique, bonus pour BRH
 */
export function computeScoreVente(input: ScoreVenteInput): ScoreVenteResult {
  const breakdown: Record<string, number> = {}
  let score = 0

  // Règle 1 : DPE F/G (filtre amont, mais on documente)
  if (input.etiquette_dpe === 'F' || input.etiquette_dpe === 'G') {
    breakdown.r1_dpe_fg_base = 10
    score += 10
  }

  // Règle 2 : DPE ancien (>= 5 ans)
  if (input.date_dpe != null) {
    const currentYear = new Date().getFullYear()
    if (currentYear - input.date_dpe >= 5) {
      breakdown.r2_dpe_ancien = 15
      score += 15
    }
  }

  // Règle 3 : Mutation 24 mois (acheteur récent)
  if (input.dvf_mutation_24m === true) {
    breakdown.r3_mutation_24m = 25
    score += 25
  }

  // Règle 4 : Âge propriétaire ≥ 65
  if (input.age_proprietaire_estime != null && input.age_proprietaire_estime >= 65) {
    breakdown.r4_proprio_senior = 20
    score += 20
  }

  // Règle 5 : Revenu médian IRIS ≥ 30k
  if (input.filosofi_revenu_median != null && input.filosofi_revenu_median >= 30_000) {
    breakdown.r5_revenu_eleve = 5
    score += 5
  }

  // Règle 6 : Surface ≥ 120m²
  if (input.surface_habitable != null && input.surface_habitable >= 120) {
    breakdown.r6_grand_logement = 10
    score += 10
  }

  // Règle 7 : Construction ≥ 1980
  if (input.date_construction != null && input.date_construction >= 1980) {
    breakdown.r7_post_1980 = 5
    score += 5
  }

  // Règle 8 : CEP ≥ 450 (passoire critique)
  if (input.cep != null && input.cep >= 450) {
    breakdown.r8_passoire_critique = 10
    score += 10
  }

  // Règle 9 : Chauffage collectif (pénalité)
  if (input.type_chauffage === 'collectif') {
    breakdown.r9_chauffage_collectif = -5
    score -= 5
  }

  // Règle 10 : Maison individuelle (vs appart)
  if (input.type_batiment === 'maison') {
    breakdown.r10_maison_individuelle = 5
    score += 5
  }

  // Règle 11 : Mutations commune actives
  if (input.dvf_mutations_commune_12m != null && input.dvf_mutations_commune_12m >= 50) {
    breakdown.r11_zone_active = 15
    score += 15
  }

  // Règle 12 : Cycle vente IRIS court
  if (input.iris_duree_detention_moy != null && input.iris_duree_detention_moy < 8) {
    breakdown.r12_cycle_vente_court = 10
    score += 10
  }

  // Règle 13 : Bonus Bretagne (spécificité géo BRH)
  if (input.departement && ['22', '29', '35', '56'].includes(input.departement)) {
    breakdown.r13_bretagne_bonus = 5
    score += 5
  }

  const finalScore = clamp(Math.round(score), 0, 100)
  const segment = segmentFromScore(finalScore)

  return {
    score: finalScore,
    segment,
    proba_6m: probaFromSegment(segment),
    rules_breakdown: breakdown,
    algo_version: 'v1.0',
  }
}

/**
 * Liste des règles documentée (pour UI tooltips, debug, audit).
 */
export const SCORE_VENTE_RULES_DOC = [
  { id: 'r1_dpe_fg_base', label: 'DPE F ou G', max_points: 10 },
  { id: 'r2_dpe_ancien', label: 'DPE ≥ 5 ans (passif rénovation)', max_points: 15 },
  { id: 'r3_mutation_24m', label: 'Mutation DVF dans les 24 derniers mois', max_points: 25 },
  { id: 'r4_proprio_senior', label: 'Propriétaire ≥ 65 ans (succession/downsizing)', max_points: 20 },
  { id: 'r5_revenu_eleve', label: 'Revenu médian IRIS ≥ 30 000 €', max_points: 5 },
  { id: 'r6_grand_logement', label: 'Surface ≥ 120 m²', max_points: 10 },
  { id: 'r7_post_1980', label: 'Construction ≥ 1980 (rénovation lourde)', max_points: 5 },
  { id: 'r8_passoire_critique', label: 'CEP ≥ 450 kWh/m²/an (passoire critique)', max_points: 10 },
  { id: 'r9_chauffage_collectif', label: 'Chauffage collectif (pénalité)', max_points: -5 },
  { id: 'r10_maison_individuelle', label: 'Maison individuelle', max_points: 5 },
  { id: 'r11_zone_active', label: 'Commune ≥ 50 mutations / 12 mois', max_points: 15 },
  { id: 'r12_cycle_vente_court', label: 'IRIS détention moyenne < 8 ans', max_points: 10 },
  { id: 'r13_bretagne_bonus', label: 'Département breton (22/29/35/56)', max_points: 5 },
] as const
