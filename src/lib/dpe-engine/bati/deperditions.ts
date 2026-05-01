/**
 * Déperditions thermiques bâti — `DP = U × A × b`.
 *
 * Source : CapRénov+ `fra/CalcParois.as:180-232`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/deperditions-parois.md
 *
 * Calcule :
 * - Déperditions par paroi opaque (mur, plancher haut, plancher bas)
 * - Déperditions par ouverture
 * - Total parois (opaques + ouvertures)
 *
 * Les ponts thermiques et le renouvellement d'air sont calculés ailleurs
 * (ponts-thermiques.ts, permeabilite.ts) et sommés dans calc-gv-ubat.ts.
 */

import type { BatiInputs, OuvertureInput, ParoiInput } from '../types'
import { calcBParoiFromInput } from './coef-reduction-b'
import { calcUepb, calcUp } from './calc-up'
import { calcDeperOuverture } from './ouvertures'

/**
 * Déperdition d'une paroi opaque.
 * `DP = b × A × U`
 *
 * - Mur, plancher haut : utilise Up
 * - Plancher bas en contact sol : utilise Uepb (correction terre-plein/VS)
 */
export function deperParoiOpaque(paroi: ParoiInput): number {
  const b = calcBParoiFromInput(paroi)
  if (b === 0) return 0 // optimisation : pas de déperdition

  const u = paroi.type === 'plancher_bas' ? calcUepb(paroi) : calcUp(paroi)
  return b * paroi.surface * u
}

/**
 * Total déperditions parois opaques (Σ par mur + plancher_haut + plancher_bas + toiture).
 */
export function deperTotalParoisOpaques(parois: ParoiInput[]): number {
  return parois.reduce((sum, p) => sum + deperParoiOpaque(p), 0)
}

/**
 * Total déperditions ouvertures.
 *
 * Note : pour le DPE on n'utilise PAS Ujn (volets) dans les déperditions
 * réglementaires, juste Uw. Les volets entrent en jeu uniquement dans
 * les calculs de confort d'été.
 */
export function deperTotalOuvertures(ouvertures: OuvertureInput[]): number {
  return ouvertures.reduce((sum, o) => {
    // Pour ouvertures : b = 1 (toujours côté extérieur sauf cas exotiques).
    // V1 : on prend b=1. Phase 3+ : adjacence des ouvertures.
    return sum + calcDeperOuverture(o, 1.0)
  }, 0)
}

/**
 * Calcul de la surface enveloppe (parois + ouvertures) pour Ubat.
 */
export function surfaceEnveloppe(bati: BatiInputs): number {
  const aParois = bati.parois.reduce((s, p) => s + p.surface, 0)
  const aOuvertures = bati.ouvertures.reduce((s, o) => s + o.surface, 0)
  return aParois + aOuvertures
}

/**
 * Total déperditions enveloppe (parois + ouvertures, sans ponts thermiques
 * ni renouvellement d'air).
 */
export function deperTotaleEnveloppe(bati: BatiInputs): {
  parois: number
  ouvertures: number
  total: number
} {
  const parois = deperTotalParoisOpaques(bati.parois)
  const ouvertures = deperTotalOuvertures(bati.ouvertures)
  return { parois, ouvertures, total: parois + ouvertures }
}
