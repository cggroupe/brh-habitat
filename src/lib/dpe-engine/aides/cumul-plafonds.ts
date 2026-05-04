/**
 * Plafonds globaux d'écrêtement des aides.
 *
 * Source : caprenov-reverse/wiki/06-aides-financieres/reste-a-charge.md
 *
 * Règle : la somme MPR + CEE + autres aides ne peut dépasser un % du coût HT total
 * selon la couleur du foyer :
 * - Bleu (très modeste) : 90% HT max
 * - Jaune (modeste) : 75% HT max
 * - Violet (intermédiaire) : 60% HT max
 * - Rose (non modeste) : 40% HT max
 *
 * Dépassement → écrêtement proportionnel des aides.
 */

import type { CouleurMPR } from './decile'

export const PLAFOND_GLOBAL_HT_PCT: Record<CouleurMPR, number> = {
  bleu: 0.9,
  jaune: 0.75,
  violet: 0.6,
  rose: 0.4,
}

export interface CumulInput {
  couleur: CouleurMPR
  coutHtEuros: number
  mprEuros: number
  ceeEuros: number
  autresAidesEuros?: number // ÉcoPTZ converti en équivalent subvention V1 = 0
}

export interface CumulResult {
  totalAidesBrutes: number
  plafondGlobalEuros: number
  totalAidesPlafonnees: number
  ratioEcretement: number // 1.0 = pas écrêté, <1 = écrêté
  resteAChargeEuros: number
  /** Aides après écrêtement proportionnel. */
  mprFinal: number
  ceeFinal: number
  autresFinal: number
}

/**
 * Applique le plafond global selon la couleur du foyer.
 * Si le total des aides dépasse le plafond, écrêtement proportionnel.
 */
export function calcCumulPlafond(input: CumulInput): CumulResult {
  const totalAidesBrutes = input.mprEuros + input.ceeEuros + (input.autresAidesEuros ?? 0)
  const plafondPct = PLAFOND_GLOBAL_HT_PCT[input.couleur]
  const plafondGlobalEuros = plafondPct * input.coutHtEuros

  let ratioEcretement = 1.0
  if (totalAidesBrutes > plafondGlobalEuros && totalAidesBrutes > 0) {
    ratioEcretement = plafondGlobalEuros / totalAidesBrutes
  }

  const totalAidesPlafonnees = Math.min(totalAidesBrutes, plafondGlobalEuros)
  const resteAChargeEuros = Math.max(0, input.coutHtEuros - totalAidesPlafonnees)

  return {
    totalAidesBrutes,
    plafondGlobalEuros,
    totalAidesPlafonnees,
    ratioEcretement,
    resteAChargeEuros,
    mprFinal: input.mprEuros * ratioEcretement,
    ceeFinal: input.ceeEuros * ratioEcretement,
    autresFinal: (input.autresAidesEuros ?? 0) * ratioEcretement,
  }
}
