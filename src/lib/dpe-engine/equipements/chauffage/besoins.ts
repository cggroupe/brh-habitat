/**
 * Besoins de chauffage Bch (kWh/an).
 *
 * Source : CapRénov+ `fra/CalcChauffage.as:265-291` + `fra/CalcClimat.as:209-234`.
 * Wiki : caprenov-reverse/wiki/03-moteur-equipements/besoins-chauffage.md
 *
 * Formule :
 *   Bch_j   = BV_j × DHCh_j / 1000 - récupérations / 1000
 *   BV_j    = GV × (1 - F_j)
 *   F_j     = (X_j - X_j^pow) / (1 - X_j^pow)
 *   X_j     = (Apports_solaires_j + Apports_internes_j) / (GV × DHCh_j)
 *   pow     = 3.6 (LOURDE/TRES_LOURDE) | 2.9 (MOYENNE) | 2.5 (LEGERE)
 *
 *   Bch_annuel = Σ Bch_j (mois 1-12)
 *   bchHp_j    = BV_j × DHCh_j / 1000  (sans récupérations, pour Dper)
 */

import type { AuditInputs, ZoneClimatique } from '../../types'
import type { GvDecomposition } from '../../bati/calc-gv-ubat'
import { calcGV } from '../../bati/calc-gv-ubat'
import { calcApportsInternesAnnuelsKwh, calcApportsSolairesAnnuelsKwh } from '../../bati/apports'
import { getDHCh, getDHChAnnuel } from '../climat'
import { getZoneClimatique } from '../../geo/zones-climatiques'

/** Exposant `pow` pour le calcul de F_j selon inertie. */
function powInertie(inertie: string): number {
  const u = inertie.toUpperCase()
  if (u === 'LOURDE' || u === 'TRES_LOURDE') return 3.6
  if (u === 'MOYENNE') return 2.9
  return 2.5 // LEGERE par défaut
}

/**
 * Facteur d'utilisation des apports gratuits F_j ∈ [0, 1].
 *
 * Edge cases :
 * - X = 0 → F = 0 (pas d'apport)
 * - X = 1 → F = pow / (pow + 1) (limite L'Hôpital)
 * - X très grand → F ≈ 1 (apports >> besoins)
 */
export function calcFj(x: number, inertie: string): number {
  if (x <= 0) return 0
  const pow = powInertie(inertie)
  // Cas limite X = 1 (formule indéterminée)
  if (Math.abs(x - 1) < 1e-9) return pow / (pow + 1)
  const xPow = Math.pow(x, pow)
  return (x - xPow) / (1 - xPow)
}

/**
 * Calcul Bch annuel (kWh/an).
 *
 * Approche annuelle simplifiée V1 (somme directe, sans détail mois par mois).
 * Phase 3+ : décomposition mensuelle pour précision accrue.
 */
export interface BchResult {
  bchKwhAn: number // besoins chauffage annuel (kWh)
  gv: GvDecomposition
  dhChAnnuel: number
  apportsInternesKwh: number
  apportsSolairesKwh: number
  fJAnnuel: number
  bvKwhPerHj: number
  zone: ZoneClimatique
}

export function calcBchAnnuel(inputs: AuditInputs): BchResult {
  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = inputs.geo.altitude ?? 0
  const inertie = String(inputs.bati.inertie)
  const comportement = inputs.comportement ?? 'conventionnel'

  const gv = calcGV(inputs.bati, inputs.equipements.ventilation)
  const dhChAnnuel = getDHChAnnuel({ inertie, comportement, altitude, zone })

  const apportsInternesKwh = calcApportsInternesAnnuelsKwh(inputs.bati)
  const apportsSolairesKwh = calcApportsSolairesAnnuelsKwh(inputs.bati, zone)

  // X_annuel = apports / (GV × DH / 1000)
  // Le besoin avant apports = GV × DH / 1000 (en kWh)
  const besoinAvantApportsKwh = (gv.total * dhChAnnuel) / 1000
  if (besoinAvantApportsKwh <= 0) {
    return {
      bchKwhAn: 0,
      gv,
      dhChAnnuel,
      apportsInternesKwh,
      apportsSolairesKwh,
      fJAnnuel: 0,
      bvKwhPerHj: 0,
      zone,
    }
  }

  const x = (apportsInternesKwh + apportsSolairesKwh) / besoinAvantApportsKwh
  const f = calcFj(x, inertie)
  const bvKwhPerHj = gv.total * (1 - f)
  const bchKwhAn = (bvKwhPerHj * dhChAnnuel) / 1000

  return {
    bchKwhAn: Math.max(0, bchKwhAn), // clamp à 0 (ADR-003 : on corrige le bug CapRénov+ Bch négatif)
    gv,
    dhChAnnuel,
    apportsInternesKwh,
    apportsSolairesKwh,
    fJAnnuel: f,
    bvKwhPerHj,
    zone,
  }
}

/**
 * Bch mensuel détaillé (pour debug / variantes mensuelles).
 */
export function calcBchMensuel(inputs: AuditInputs, mois: number): number {
  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = inputs.geo.altitude ?? 0
  const inertie = String(inputs.bati.inertie)
  const comportement = inputs.comportement ?? 'conventionnel'

  const gv = calcGV(inputs.bati, inputs.equipements.ventilation).total
  const dhJ = getDHCh({ inertie, comportement, altitude, zone, mois })

  if (dhJ <= 0 || gv <= 0) return 0

  // Approximation mensuelle : on prend 1/12 des apports annuels en V1
  const apI = calcApportsInternesAnnuelsKwh(inputs.bati) / 12
  const apS = calcApportsSolairesAnnuelsKwh(inputs.bati, zone) / 12

  const besoinAvant = (gv * dhJ) / 1000
  if (besoinAvant <= 0) return 0
  const x = (apI + apS) / besoinAvant
  const f = calcFj(x, inertie)
  return Math.max(0, (gv * (1 - f) * dhJ) / 1000)
}
