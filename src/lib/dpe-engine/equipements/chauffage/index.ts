/**
 * Chauffage — module agrégé.
 *
 * Calcule la consommation finale de chauffage Cch (kWh EF/an).
 *
 * Formule générale (CapRénov+ + 3CL 2021) :
 *   Cch_EF = Bch / (i0 × Re × Rd × Rr × Rg)
 *
 * où :
 *   Bch = besoins de chauffage (kWh/an)
 *   i0  = coefficient d'intermittence
 *   Re  = rendement émission
 *   Rd  = rendement distribution
 *   Rr  = rendement régulation
 *   Rg  = rendement génération (chaudière) ou SCOP/COP (PAC)
 */

import type { AuditInputs } from '../../types'
import type { Energie } from '../../constants'
import { COEF_EP, CO2_KG_PER_KWH } from '../../constants'
import { calcBchAnnuel } from './besoins'
import { calcRe, calcRd, calcRr, calcRg } from './rendements'
import { calcSCOPFromInput, isPAC } from './pac'
import { calcI0 } from './intermittence'

export interface ChauffageResult {
  /** Besoins kWh/an */
  bchKwhAn: number
  /** Conso énergie finale chauffage kWh/an */
  cchEfKwhAn: number
  /** Conso énergie primaire chauffage kWh/an */
  cchEpKwhAn: number
  /** Émissions CO₂ kg/an */
  cchGesKgAn: number
  /** Énergie utilisée */
  energie: Energie
  /** Décomposition rendements pour debug */
  rendements: {
    re: number
    rd: number
    rr: number
    rg: number
    scop?: number
    i0: number
    /** Rendement total = i0 × Re × Rd × Rr × (Rg ou SCOP) */
    total: number
  }
}

/**
 * Détermine l'énergie associée au générateur de chauffage.
 */
function getEnergie(generateur: string, energieRenseignee?: Energie): Energie {
  if (energieRenseignee) return energieRenseignee
  if (generateur.includes('gaz')) return 'gaz_naturel'
  if (generateur.includes('fioul')) return 'fioul'
  if (generateur.includes('granules')) return 'granules_bois'
  if (generateur.includes('bois')) return 'bois_buche'
  if (generateur.includes('reseau_chaleur')) return 'reseau_chaleur'
  if (generateur === 'propane') return 'propane'
  // PAC, effet Joule, inertie électrique → électricité
  return 'electricite'
}

export function calcChauffage(inputs: AuditInputs): ChauffageResult {
  const { chauffage } = inputs.equipements

  // 1) Besoins Bch
  const bch = calcBchAnnuel(inputs)

  // 2) Rendements chaîne
  const re = calcRe(chauffage.emetteur)
  const rd = calcRd(chauffage.generateur, chauffage.emetteur)
  const rr = calcRr(chauffage.regulation ?? false)
  const i0 = calcI0(chauffage, String(inputs.bati.inertie))

  // 3) Rg ou SCOP selon type
  let rg = calcRg(chauffage.generateur, chauffage.anneeInstallation)
  let scop: number | undefined
  if (isPAC(chauffage.generateur)) {
    scop = calcSCOPFromInput(chauffage, bch.zone)
    rg = scop // pour le calcul final, on remplace Rg par SCOP
  }

  // 4) Rendement total et conso EF
  const rendementTotal = i0 * re * rd * rr * rg
  const cchEfKwhAn = rendementTotal > 0 ? bch.bchKwhAn / rendementTotal : bch.bchKwhAn

  // 5) Énergie + EP + CO2
  const energie = getEnergie(chauffage.generateur, chauffage.energie)
  const cchEpKwhAn = cchEfKwhAn * COEF_EP[energie]
  const cchGesKgAn = cchEfKwhAn * CO2_KG_PER_KWH[energie]

  return {
    bchKwhAn: bch.bchKwhAn,
    cchEfKwhAn,
    cchEpKwhAn,
    cchGesKgAn,
    energie,
    rendements: { re, rd, rr, rg, scop, i0, total: rendementTotal },
  }
}

export { calcBchAnnuel, calcBchMensuel, calcFj } from './besoins'
export { calcRe, calcRd, calcRr, calcRg, calcIch } from './rendements'
export { calcSCOP, calcSCOPFromInput, isPAC } from './pac'
export { calcI0 } from './intermittence'
export type { BchResult } from './besoins'
export type { PacInputs } from './pac'
