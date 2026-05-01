/**
 * Coefficient `b` — réduction des déperditions par adjacence.
 *
 * Source : CapRénov+ `fra/CalcParois.as:234-315` + `DataB._B/_BVer`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/coef-reduction-b.md
 *
 * Formule : `b ∈ [0, 1]` pondère la déperdition selon l'adjacence (côté chaud
 * opposé au logement). `b = 1` pour extérieur, `0` pour autre logement, etc.
 */

import type { ParoiInput } from '../types'

export type Adjacence =
  | 'exterieur'
  | 'autre_logement'
  | 'commerce_bureaux'
  | 'couloir'
  | 'sous_sol_chauffe'
  | 'sous_sol_non_chauffe'
  | 'terre_plein'
  | 'vide_sanitaire'
  | 'toiture_terrasse'
  | 'toiture_rampants'
  | 'combles_perdus'
  | 'combles_perdus_accessibles'
  | 'lnc_non_accessible'
  | 'lnc_accessible'
  | 'veranda_non_chauffee'

/**
 * Coefficient b simple selon adjacence.
 *
 * Pour les cas LNC accessible / véranda, V1 utilise des valeurs forfaitaires.
 * Phase 3+ : intégrer les lookups DataB._B (4D) et _BVer (3D).
 */
export function calcBParoi(adjacence: string | undefined): number {
  if (!adjacence) return 1 // par défaut extérieur

  const a = adjacence.toLowerCase().replace(/[\s-]+/g, '_') as Adjacence

  switch (a) {
    // b = 1 (déperdition complète)
    case 'exterieur':
    case 'terre_plein':
    case 'vide_sanitaire':
    case 'toiture_terrasse':
    case 'toiture_rampants':
    case 'sous_sol_chauffe':
      return 1.0

    // b = 0 (pas de déperdition)
    case 'autre_logement':
      return 0.0

    // b = 0.2 (commerce, couloir)
    case 'commerce_bureaux':
    case 'couloir':
      return 0.2

    // b = 0.95 (LNC non accessible / combles perdus)
    case 'lnc_non_accessible':
    case 'combles_perdus':
      return 0.95

    // b = 0.95 par défaut sans plus d'info (Phase 3 : lookup DataB)
    case 'lnc_accessible':
    case 'combles_perdus_accessibles':
      return 0.85 // valeur moyenne

    // b sous-sol non chauffé (forfait V1, Phase 3 : selon dimension)
    case 'sous_sol_non_chauffe':
      return 0.95

    // b véranda (forfait V1 : moyenne nord/est-ouest/sud isolée H2A)
    // Phase 3 : lookup DataB._BVer par zone × orientation × isolé
    case 'veranda_non_chauffee':
      return 0.7

    default:
      return 1.0 // safe default
  }
}

/**
 * Wrapper pour ParoiInput.
 */
export function calcBParoiFromInput(paroi: ParoiInput): number {
  return calcBParoi(paroi.adjacence)
}
