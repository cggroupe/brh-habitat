/**
 * Filosofi 2021 — décile MPR auto par IRIS.
 *
 * Source : INSEE Filosofi 2021 (https://www.insee.fr/fr/statistiques/7233950)
 * - MED21 : médiane revenu disponible UC IRIS
 * - D121 / D921 : 1er et 9e déciles
 *
 * Le décile estimé est calculé en mappant MED21 vs barème national INSEE 2024-2026.
 * Le mapping vers couleur MPR suit la grille MaPrimeRénov' officielle.
 */

import type { CouleurMpr } from './types'

/**
 * Barème national INSEE — médianes par décile revenu disponible UC (€/an).
 * Source : INSEE 2024 (Filosofi national).
 *
 * Approximation : on prend les valeurs centrales des classes pour mapper MED21 → décile.
 */
const BAREME_DECILES_NATIONAL: Array<{ decile: number; med_max: number }> = [
  { decile: 1, med_max: 12_500 },
  { decile: 2, med_max: 15_900 },
  { decile: 3, med_max: 18_600 },
  { decile: 4, med_max: 21_200 },
  { decile: 5, med_max: 23_900 },
  { decile: 6, med_max: 27_000 },
  { decile: 7, med_max: 30_900 },
  { decile: 8, med_max: 36_400 },
  { decile: 9, med_max: 47_000 },
  { decile: 10, med_max: Number.POSITIVE_INFINITY },
]

/**
 * Estime le décile (1-10) depuis la médiane revenu UC IRIS.
 * Retourne `null` si MED21 invalide.
 */
export function estimateDecile(med21: number | null | undefined): number | null {
  if (med21 == null || !Number.isFinite(med21) || med21 <= 0) return null
  for (const palier of BAREME_DECILES_NATIONAL) {
    if (med21 <= palier.med_max) return palier.decile
  }
  return 10
}

/**
 * Mapping décile (1-10) → couleur MaPrimeRénov'.
 *
 * Convention 2024-2026 :
 * - Bleu (très modeste) : D1-D3
 * - Jaune (modeste) : D4-D5
 * - Violet (intermédiaire) : D6-D8
 * - Rose (supérieur) : D9-D10
 */
export function decileToCouleurMpr(decile: number | null | undefined): CouleurMpr | null {
  if (decile == null) return null
  if (decile >= 1 && decile <= 3) return 'bleu'
  if (decile >= 4 && decile <= 5) return 'jaune'
  if (decile >= 6 && decile <= 8) return 'violet'
  if (decile >= 9 && decile <= 10) return 'rose'
  return null
}

/**
 * Helper combiné : médiane revenu UC → couleur MPR directement.
 */
export function medianeToCouleurMpr(med21: number | null | undefined): CouleurMpr | null {
  return decileToCouleurMpr(estimateDecile(med21))
}
