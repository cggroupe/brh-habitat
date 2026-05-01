/**
 * Calcul Up — coefficient de transmission thermique d'une paroi (W/m²·K).
 *
 * Source : CapRénov+ `fra/CalcParois.as:317-466`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/calc-up-resistance.md
 *
 * Formule : `Up = min(2.5, 1 / Rp)` avec `Rp = Σ R(isolants) + R(gros œuvre)`
 *
 * Plafond U = 2.5 W/(m²·K) appliqué à toutes les parois (valeur réglementaire
 * "non isolé / inconnu" de la méthode 3CL-DPE 2021).
 */

import type { ParoiInput } from '../types'

/** Plafond U réglementaire (W/m²·K). */
export const U_PLAFOND = 2.5

/**
 * Résistance thermique du gros œuvre par défaut (V1 simplifié).
 *
 * Ces valeurs représentent des matériaux courants par typeParoi/matériau.
 * Phase 3+ : utiliser les lookups DataMur, DataPlancherBas, DataPlancherHaut
 * pour avoir les valeurs exactes selon période + matériau + épaisseur.
 *
 * Sources : tables réglementaires 3CL + corpus CapRénov+ (Umur0, Upb0, Uph0).
 */
const R_GROS_OEUVRE_DEFAUT: Record<string, Record<string, number>> = {
  mur: {
    pierre: 0.55, // mur pierre 50 cm sans isolation : Umur ~ 1.8 → R ~ 0.55
    brique_creuse: 0.4,
    brique_pleine: 0.3,
    parpaing: 0.2,
    beton: 0.15,
    bois: 0.5,
    pise: 0.5,
    paille: 4.5, // bonne perf de base
    monomur: 1.0,
    bbc: 1.5,
    default: 0.4,
  },
  plancher_bas: {
    beton: 0.2,
    bois: 0.5,
    default: 0.25,
  },
  plancher_haut: {
    beton: 0.2,
    bois: 0.5,
    default: 0.3,
  },
  toiture: {
    bois: 0.5,
    default: 0.3,
  },
}

/**
 * Calcul de R pour un isolant donné (rapporté).
 * `R = épaisseur (m) / lambda (W/m·K)`.
 */
export function calcRIsolant(epaisseur_mm?: number, lambda?: number): number {
  if (!epaisseur_mm || !lambda || lambda <= 0) return 0
  return (epaisseur_mm / 1000) / lambda
}

/**
 * Calcul de R total d'une paroi (Rp).
 * `Rp = R(isolation) + R(gros œuvre)`
 */
export function calcRp(paroi: ParoiInput): number {
  const grosOeuvreTable = R_GROS_OEUVRE_DEFAUT[paroi.type] ?? R_GROS_OEUVRE_DEFAUT.mur
  const rGrosOeuvre = grosOeuvreTable[paroi.materiau ?? 'default'] ?? grosOeuvreTable.default

  let rIsolation = 0
  if (paroi.isolation && paroi.isolation.type !== 'sans') {
    rIsolation = calcRIsolant(paroi.isolation.epaisseur, paroi.isolation.lambda)
  }

  // Résistance superficielle (Rsi + Rse) ajoutée forfaitairement
  // Mur extérieur : 0.17, Plancher bas : 0.14, Plancher haut/Toiture : 0.10
  let rSurfacique = 0.17
  if (paroi.type === 'plancher_bas') rSurfacique = 0.14
  else if (paroi.type === 'plancher_haut' || paroi.type === 'toiture') rSurfacique = 0.10

  return rIsolation + rGrosOeuvre + rSurfacique
}

/**
 * Calcul Up — coefficient de transmission thermique.
 * `Up = min(2.5, 1 / Rp)`
 */
export function calcUp(paroi: ParoiInput): number {
  const rp = calcRp(paroi)
  if (rp <= 0) return U_PLAFOND
  return Math.min(U_PLAFOND, 1 / rp)
}

/**
 * Uepb — calcul U pour plancher bas en contact sol (terre-plein, VS, sous-sol).
 *
 * V1 simplifié : applique un facteur réducteur 0.6 sur Up
 * (correspond à la perte thermique typique via 2S/P moyen).
 *
 * Phase 3+ : implémenter le lookup FactoUpParois.get_UepbTP/UepbVS avec
 * interpolation 2S/P selon CapRénov+.
 */
export function calcUepb(paroi: ParoiInput): number {
  const up = calcUp(paroi)
  // Adjacences nécessitant Uepb
  const adj = paroi.adjacence?.toLowerCase().replace(/[\s-]+/g, '_')
  if (adj === 'terre_plein' || adj === 'vide_sanitaire' || adj === 'sous_sol_non_chauffe') {
    return Math.min(U_PLAFOND, up * 0.6)
  }
  return up
}
