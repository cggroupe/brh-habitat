/**
 * MaPrimeRénov' Rénovation d'Ampleur (Parcours Accompagné).
 *
 * Source : caprenov-reverse/wiki/06-aides-financieres/mpr-renovation-ampleur.md
 * Programmes aidesfi.db : 2363 (Bleu), 2367 (Jaune), 2368 (Violet), 2369 (Rose)
 *
 * Conditions cumulatives :
 * 1. Logement ≥ 15 ans
 * 2. Résidence principale (occupant ou bailleur, pas personne morale)
 * 3. Étiquette DPE avant ∈ {E, F, G}
 * 4. Émissions GES diminuent
 * 5. Saut DPE ≥ 2 classes (≥ 3 si départ G)
 * 6. Au moins 2 gestes d'isolation sur ≥ 25 % de surface
 * 7. Réduction empreinte carbone (BAR-TH-1458)
 *
 * Formule :
 *   montant = MIN(forfait_max, travauxHT × taux_max, plafond_travaux × taux_max)
 *   bonus +10% si Sortie de Passoire (avant F/G → après ≤ D)
 *
 * Non cumulable avec :
 * - MPR mono-geste (on prend MAX(mono, ampleur))
 * - MPR Sérénité ANAH
 * - CDP coup de pouce CEE
 *
 * Cumulable avec :
 * - Éco-PTZ
 * - TVA 5,5 %
 * - CEE classique (avec bonus précaire)
 */

import type { CouleurMPR } from './decile'
import type { EtiquetteDpe } from '../constants'
import { ORDER_DPE } from '../dpe/etiquettes'

export interface ParamMprAmpleur {
  couleur: CouleurMPR
  nbSauts: 2 | 3 | 4 // 4 = "≥ 4 classes"
  forfaitMaxEuros: number
  plafondTravauxHt: number
  tauxMaxHt: number // 0..1
}

/**
 * Paliers officiels MaPrimeRénov' Ampleur 2024-2026 (Parcours Accompagné).
 */
export const TABLE_MPR_AMPLEUR: ParamMprAmpleur[] = [
  // Saut 2 classes
  { couleur: 'bleu', nbSauts: 2, forfaitMaxEuros: 40000, plafondTravauxHt: 40000, tauxMaxHt: 0.8 },
  { couleur: 'jaune', nbSauts: 2, forfaitMaxEuros: 35000, plafondTravauxHt: 40000, tauxMaxHt: 0.65 },
  { couleur: 'violet', nbSauts: 2, forfaitMaxEuros: 30000, plafondTravauxHt: 40000, tauxMaxHt: 0.45 },
  { couleur: 'rose', nbSauts: 2, forfaitMaxEuros: 25000, plafondTravauxHt: 40000, tauxMaxHt: 0.25 },
  // Saut 3 classes
  { couleur: 'bleu', nbSauts: 3, forfaitMaxEuros: 55000, plafondTravauxHt: 55000, tauxMaxHt: 0.8 },
  { couleur: 'jaune', nbSauts: 3, forfaitMaxEuros: 50000, plafondTravauxHt: 55000, tauxMaxHt: 0.65 },
  { couleur: 'violet', nbSauts: 3, forfaitMaxEuros: 45000, plafondTravauxHt: 55000, tauxMaxHt: 0.45 },
  { couleur: 'rose', nbSauts: 3, forfaitMaxEuros: 40000, plafondTravauxHt: 55000, tauxMaxHt: 0.25 },
  // Saut ≥ 4 classes
  { couleur: 'bleu', nbSauts: 4, forfaitMaxEuros: 70000, plafondTravauxHt: 70000, tauxMaxHt: 0.8 },
  { couleur: 'jaune', nbSauts: 4, forfaitMaxEuros: 60000, plafondTravauxHt: 70000, tauxMaxHt: 0.65 },
  { couleur: 'violet', nbSauts: 4, forfaitMaxEuros: 55000, plafondTravauxHt: 70000, tauxMaxHt: 0.45 },
  { couleur: 'rose', nbSauts: 4, forfaitMaxEuros: 50000, plafondTravauxHt: 70000, tauxMaxHt: 0.25 },
]

export interface MprAmpleurInput {
  couleur: CouleurMPR
  classeAvant: EtiquetteDpe
  classeApres: EtiquetteDpe
  gesAvant?: number
  gesApres?: number
  travauxHt: number
  nbGestesIso: number
  ratioSurfIsolee?: number // 0..1, V1 = optionnel (true par défaut)
  anneeLogement?: number // V1 : si non fourni, on suppose ≥ 15 ans
  estRP?: boolean // par défaut true
  isPersonneMorale?: boolean // par défaut false
}

export interface MprAmpleurResult {
  eligible: boolean
  motif?: string
  saut: number
  nbSautsCalcules?: 2 | 3 | 4
  montantEuros: number
  montantSansBonus: number
  bonusSortiePassoire: boolean
  bonusBbc: boolean
  parametres?: ParamMprAmpleur
}

/**
 * Test d'éligibilité MPR Ampleur (les 7 conditions cumulatives).
 */
export function eligibleMprAmpleur(input: MprAmpleurInput): { ok: boolean; motif?: string; saut: number } {
  const saut = ORDER_DPE[input.classeAvant] - ORDER_DPE[input.classeApres]

  // C1 : logement ≥ 15 ans
  const annees = input.anneeLogement
    ? new Date().getFullYear() - input.anneeLogement
    : 999
  if (annees < 15) return { ok: false, motif: 'logement < 15 ans', saut }

  // C2 : RP + pas personne morale
  if (input.estRP === false) return { ok: false, motif: 'pas résidence principale', saut }
  if (input.isPersonneMorale) return { ok: false, motif: 'personne morale exclue', saut }

  // C3 : étiquette avant E/F/G
  const avantInt = ORDER_DPE[input.classeAvant]
  if (avantInt < 5) return { ok: false, motif: 'étiquette avant doit être E/F/G', saut }

  // C4 : GES diminue (si fourni)
  if (input.gesAvant != null && input.gesApres != null && input.gesApres >= input.gesAvant) {
    return { ok: false, motif: 'GES ne diminue pas', saut }
  }

  // C5 : saut ≥ 2 (≥ 3 si départ G)
  if (saut < 2) return { ok: false, motif: `saut DPE = ${saut} < 2`, saut }
  if (input.classeAvant === 'G' && saut < 3) {
    return { ok: false, motif: 'départ G nécessite saut ≥ 3', saut }
  }

  // C6 : ≥ 2 gestes d'isolation sur ≥ 25% surface
  if (input.nbGestesIso < 2) return { ok: false, motif: `nbGestesIso = ${input.nbGestesIso} < 2`, saut }
  if (input.ratioSurfIsolee != null && input.ratioSurfIsolee < 0.25) {
    return { ok: false, motif: `ratio surface isolée < 25%`, saut }
  }

  // C7 : carbone (V1 : implicite via GES diminue, OK)

  return { ok: true, saut }
}

/**
 * Détecte le bonus "Sortie de Passoire" : avant F/G → après ≤ D.
 */
export function isSortiePassoire(avant: EtiquetteDpe, apres: EtiquetteDpe): boolean {
  const avantPassoire = avant === 'F' || avant === 'G'
  const apresOk = ORDER_DPE[apres] <= ORDER_DPE.D // A, B, C, D
  return avantPassoire && apresOk
}

/**
 * Détecte le bonus BBC : étiquette finale = A ou B.
 */
export function isBbcAtteint(apres: EtiquetteDpe): boolean {
  return apres === 'A' || apres === 'B'
}

/**
 * Calcul MPR Ampleur. Retourne 0 € si non-éligible.
 *
 * Bonus :
 * - +10% Sortie de Passoire (avant F/G → après A/B/C/D)
 * - +10% additionnel BBC (après A/B) — V1 simplifié, à confirmer barème
 */
export function calcMprAmpleur(input: MprAmpleurInput): MprAmpleurResult {
  const elig = eligibleMprAmpleur(input)
  if (!elig.ok) {
    return {
      eligible: false,
      motif: elig.motif,
      saut: elig.saut,
      montantEuros: 0,
      montantSansBonus: 0,
      bonusSortiePassoire: false,
      bonusBbc: false,
    }
  }

  const nbSautsCalcules: 2 | 3 | 4 = (elig.saut >= 4 ? 4 : elig.saut === 3 ? 3 : 2)

  const params = TABLE_MPR_AMPLEUR.find(
    (r) => r.couleur === input.couleur && r.nbSauts === nbSautsCalcules,
  )
  if (!params) {
    return {
      eligible: false,
      motif: `paramètres non trouvés pour ${input.couleur} × ${nbSautsCalcules} sauts`,
      saut: elig.saut,
      montantEuros: 0,
      montantSansBonus: 0,
      bonusSortiePassoire: false,
      bonusBbc: false,
    }
  }

  // Calcul de base : MIN(forfait, travauxHT × taux, plafond × taux)
  const montantSansBonus = Math.min(
    params.forfaitMaxEuros,
    input.travauxHt * params.tauxMaxHt,
    params.plafondTravauxHt * params.tauxMaxHt,
  )

  // Bonus Sortie de Passoire (+10%)
  const sortiePassoire = isSortiePassoire(input.classeAvant, input.classeApres)
  // Bonus BBC (+10% additionnel)
  const bbc = isBbcAtteint(input.classeApres)

  let multiplicateur = 1
  if (sortiePassoire) multiplicateur += 0.1
  if (bbc) multiplicateur += 0.1

  const montantEuros = Math.round(montantSansBonus * multiplicateur)

  return {
    eligible: true,
    saut: elig.saut,
    nbSautsCalcules,
    montantEuros,
    montantSansBonus,
    bonusSortiePassoire: sortiePassoire,
    bonusBbc: bbc,
    parametres: params,
  }
}
