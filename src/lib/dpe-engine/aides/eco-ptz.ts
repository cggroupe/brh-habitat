/**
 * Éco-PTZ — Prêt à Taux Zéro pour la rénovation énergétique.
 *
 * Source : caprenov-reverse/wiki/06-aides-financieres/eco-ptz.md
 *
 * 6 modes de plafonds selon la nature/quantité de travaux :
 * - Mode 1 : 1 action seule = max 7 000 €
 * - Mode 2 : 1 action seule (sauf vitrage) = max 15 000 €
 * - Mode 3 : 2 actions = max 25 000 €
 * - Mode 4 : 3 actions ou + = max 30 000 €
 * - Mode 5 : Performance globale (saut DPE ≥ 2 classes) = max 30 000 €
 * - Mode 6 : Rénovation globale ampleur = max 50 000 €
 *
 * Conditions :
 * - Logement RP ≥ 2 ans
 * - Travaux par RGE
 * - Remboursement étalé jusqu'à 20 ans
 */

export type EcoPtzMode = 1 | 2 | 3 | 4 | 5 | 6

const PLAFONDS_ECO_PTZ: Record<EcoPtzMode, number> = {
  1: 7000,
  2: 15000,
  3: 25000,
  4: 30000,
  5: 30000,
  6: 50000,
}

/**
 * Catégorie de travaux pour comptage Éco-PTZ.
 */
export type CategorieTravaux =
  | 'isolation_toiture'
  | 'isolation_murs'
  | 'isolation_plancher_bas'
  | 'menuiseries'
  | 'chauffage_ecs' // 1 catégorie regroupée pour ÉcoPTZ
  | 'ventilation'

export interface EcoPtzInput {
  /** Nombre de catégories de travaux distinctes */
  categories: CategorieTravaux[]
  /** Saut de classes DPE (avant → après). 0 si non calculé. */
  sautClassesDpe?: number
  /** Coût HT total des travaux (pour plafond effectif). */
  coutHtEuros: number
  /** Si rénovation globale (saut ≥ 2 classes + couverture ampleur) */
  isGlobalAmpleur?: boolean
}

export interface EcoPtzResult {
  mode: EcoPtzMode
  plafondEuros: number
  montantEligibleEuros: number
  description: string
}

/**
 * Détermine le mode Éco-PTZ optimal et calcule le montant éligible.
 */
export function calcEcoPtz(input: EcoPtzInput): EcoPtzResult {
  const nbActions = new Set(input.categories).size
  const includesVitrage = input.categories.includes('menuiseries')
  const saut = input.sautClassesDpe ?? 0

  let mode: EcoPtzMode = 1
  let description = '1 action seule'

  if (input.isGlobalAmpleur) {
    mode = 6
    description = 'Rénovation globale (Ampleur, MaPrimeRénov\' Ampleur ≥ 2 gestes + saut ≥ 2 classes)'
  } else if (saut >= 2) {
    mode = 5
    description = `Performance globale (saut ${saut} classes DPE)`
  } else if (nbActions >= 3) {
    mode = 4
    description = `${nbActions} actions de rénovation`
  } else if (nbActions === 2) {
    mode = 3
    description = '2 actions de rénovation'
  } else if (nbActions === 1 && !includesVitrage) {
    mode = 2
    description = '1 action seule (hors vitrage)'
  } else {
    mode = 1
    description = '1 action seule (vitrage)'
  }

  const plafondEuros = PLAFONDS_ECO_PTZ[mode]
  const montantEligibleEuros = Math.min(plafondEuros, input.coutHtEuros)

  return {
    mode,
    plafondEuros,
    montantEligibleEuros,
    description,
  }
}
