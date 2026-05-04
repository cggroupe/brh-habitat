/**
 * Apports internes (équipements + éclairage + occupants) et solaires.
 *
 * Source : CapRénov+ `fra/CalcClimat.as:182-186` + `fra/CalcSpecifique.as:192-202`.
 * Wiki :
 *   - caprenov-reverse/wiki/02-moteur-bati/apports-internes.md
 *   - caprenov-reverse/wiki/02-moteur-bati/apports-solaires.md
 *
 * Formules :
 *   Aint = ((3.18 + 0.34) W/m² × Sh + 70.71 W × Nadeq) × NrefCh_j
 *   Asol = Σ_baies (Sw × A × Fe1 × Fe2 × ensoleillement_j)
 */

import type { BatiInputs, ZoneClimatique } from '../types'
import { calcSw } from './ouvertures'

/** Apports équipements (W/m²). Source CalcSpecifique.as:192. */
export const AI_EQUIPEMENTS_W_M2 = 3.18

/** Apports éclairage (W/m²). Source CalcSpecifique.as:198. */
export const AI_ECLAIRAGE_W_M2 = 0.34

/** Apport métabolique par occupant (W). 90 × 132/168 ≈ 70.71. */
export const AI_OCCUPANT_W = 90 * (132 / 168)

/**
 * Nadeq — nombre d'occupants équivalents conventionnel selon Sh et type bâtiment.
 *
 * Source : CapRénov+ `fra/CalcOccupation.as` + DataOccupation.json.
 *
 * V1 simplifié :
 *  - maison : Nadeq = 1.75 + Sh/100 (max 6)
 *  - appart : Nadeq = 1.5 + Sh/100 (max 5)
 */
export function calcNadeq(bati: BatiInputs): number {
  const sh = bati.surfaceHabitable
  const isMaison = bati.typeBatiment === 'maison'
  const base = isMaison ? 1.75 : 1.5
  const max = isMaison ? 6 : 5
  return Math.min(max, base + sh / 100)
}

/**
 * Apports internes annuels (kWh/an).
 *
 * Saison de chauffe ≈ 5904 heures (table NrefCh moyennée sur 8 mois).
 * Phase 3+ : utiliser les vraies tables NrefCh par zone climatique × mois.
 */
export function calcApportsInternesAnnuelsKwh(bati: BatiInputs): number {
  const sh = bati.surfaceHabitable
  const nadeq = calcNadeq(bati)
  const heuresChauffeAnnuelles = 5904 // moyenne France

  const puissanceW = (AI_EQUIPEMENTS_W_M2 + AI_ECLAIRAGE_W_M2) * sh + AI_OCCUPANT_W * nadeq
  return (puissanceW * heuresChauffeAnnuelles) / 1000
}

/**
 * Ensoleillement annuel saison de chauffe par orientation et zone (kWh/m²).
 *
 * V1 simplifié — moyennes France saison de chauffe.
 * Phase 3+ : tables DataClimatReglementaire_ECh.json par zone × mois × orientation.
 */
const ENSOLEILLEMENT_SAISON_KWH_M2: Record<string, Record<string, number>> = {
  H1A: { sud: 280, est: 200, ouest: 200, nord: 130, horizontal: 320 },
  H1B: { sud: 290, est: 210, ouest: 210, nord: 135, horizontal: 330 },
  H1C: { sud: 320, est: 230, ouest: 230, nord: 145, horizontal: 360 },
  H2A: { sud: 300, est: 215, ouest: 215, nord: 140, horizontal: 340 },
  H2B: { sud: 310, est: 225, ouest: 225, nord: 145, horizontal: 350 },
  H2C: { sud: 330, est: 235, ouest: 235, nord: 150, horizontal: 370 },
  H2D: { sud: 360, est: 260, ouest: 260, nord: 165, horizontal: 410 },
  H3: { sud: 410, est: 290, ouest: 290, nord: 180, horizontal: 470 },
}

/**
 * Apports solaires annuels (kWh/an).
 *
 * `Asol = Σ_baies (Sw × A × ensoleillement)` — Fe1 et Fe2 (masques) à 1 par défaut V1.
 */
export function calcApportsSolairesAnnuelsKwh(
  bati: BatiInputs,
  zone: ZoneClimatique,
): number {
  const ensoleillement = ENSOLEILLEMENT_SAISON_KWH_M2[zone] ?? ENSOLEILLEMENT_SAISON_KWH_M2.H2A

  return bati.ouvertures.reduce((sum, o) => {
    if (o.type === 'porte') return sum
    const sw = calcSw(o)
    const orient = o.orientation ?? 'sud'
    const e = ensoleillement[orient] ?? ensoleillement.sud
    return sum + sw * o.surface * e
  }, 0)
}

/**
 * Apports gratuits totaux annuels (kWh/an) = internes + solaires.
 */
export function calcApportsGratuitsAnnuelsKwh(
  bati: BatiInputs,
  zone: ZoneClimatique,
): number {
  return (
    calcApportsInternesAnnuelsKwh(bati) + calcApportsSolairesAnnuelsKwh(bati, zone)
  )
}
