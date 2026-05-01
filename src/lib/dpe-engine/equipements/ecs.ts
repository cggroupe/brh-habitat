/**
 * ECS — Eau Chaude Sanitaire (Becs, Cecs).
 *
 * Source : CapRénov+ `fra/CalcEcs.as` + DataEcs.json.
 * Wikis :
 *   - 03-moteur-equipements/ecs-besoins.md
 *   - 03-moteur-equipements/ecs-pertes-stockage.md
 *
 * Formule :
 *   Becs = 1.163 × Nadeq × 56L × ΔT40        (kWh/an, ΔT40 = 40°C de chauffe eau)
 *   Cecs_EF = (Becs + Pertes_stockage) / Rg_ecs
 */

import type { AuditInputs, EcsInput } from '../types'
import type { Energie } from '../constants'
import { COEF_EP, CO2_KG_PER_KWH, ECS_CP_EAU, ECS_DELTA_T, ECS_VOLUME_L_PAR_ADEQ } from '../constants'
import { calcNadeq } from '../bati/apports'

/**
 * Besoins ECS annuels (kWh/an).
 * Becs = 1.163 × Nadeq × 56 × 40 × 365 / 1000
 */
export function calcBecsKwhAn(inputs: AuditInputs): number {
  const nadeq = calcNadeq(inputs.bati)
  // Wh/jour → kWh/an
  const wattsParJour = ECS_CP_EAU * nadeq * ECS_VOLUME_L_PAR_ADEQ * ECS_DELTA_T
  return (wattsParJour * 365) / 1000
}

/**
 * Rendement génération ECS (Rg_ecs).
 * V1 simplifié.
 */
function calcRgEcs(generateur: EcsInput['generateur'], anneeInstallation?: number): number {
  const annee = anneeInstallation ?? 2010
  switch (generateur) {
    case 'electrique': // ballon électrique
      return 0.95
    case 'gaz':
      return annee < 2000 ? 0.7 : 0.78
    case 'fioul':
      return annee < 1990 ? 0.6 : 0.7
    case 'bois':
      return 0.7
    case 'cet': // chauffe-eau thermodynamique
      // COP CET typique : 2.5-3.5
      return annee < 2014 ? 2.5 : 3.0
    case 'reseau_chaleur':
      return 1.0
    case 'solaire_thermique':
      // Couplé typiquement avec un appoint élec/gaz, on prend un mix
      return 1.5
    default:
      return 0.85
  }
}

/**
 * Pertes de stockage du ballon (kWh/an).
 * V1 simplifié : forfait 5-15% du Becs selon volume + isolation.
 */
function calcPertesStockageKwhAn(ecs: EcsInput, becsKwhAn: number): number {
  const stockageL = ecs.stockageL ?? 0
  if (stockageL === 0) return 0 // chauffe-eau instantané

  // Pertes typiques : 0.05-0.15 × Becs
  // Plus le ballon est grand → plus de pertes (mais aussi mieux isolé)
  const tauxPertes = stockageL > 200 ? 0.08 : 0.10
  return becsKwhAn * tauxPertes
}

/**
 * Détermine l'énergie ECS.
 */
function getEnergieEcs(generateur: EcsInput['generateur'], renseignee?: Energie): Energie {
  if (renseignee) return renseignee
  switch (generateur) {
    case 'electrique':
    case 'cet':
      return 'electricite'
    case 'gaz':
      return 'gaz_naturel'
    case 'fioul':
      return 'fioul'
    case 'bois':
      return 'bois_buche'
    case 'reseau_chaleur':
      return 'reseau_chaleur'
    case 'solaire_thermique':
      return 'electricite' // appoint élec par défaut
    default:
      return 'electricite'
  }
}

export interface EcsResult {
  becsKwhAn: number
  pertesStockageKwhAn: number
  cecsEfKwhAn: number
  cecsEpKwhAn: number
  cecsGesKgAn: number
  energie: Energie
  rgEcs: number
}

export function calcEcs(inputs: AuditInputs): EcsResult {
  const ecs = inputs.equipements.ecs
  const becsKwhAn = calcBecsKwhAn(inputs)
  const pertesStockage = calcPertesStockageKwhAn(ecs, becsKwhAn)
  const rgEcs = calcRgEcs(ecs.generateur, ecs.anneeInstallation)
  const cecsEfKwhAn = (becsKwhAn + pertesStockage) / rgEcs
  const energie = getEnergieEcs(ecs.generateur, ecs.energie)
  const cecsEpKwhAn = cecsEfKwhAn * COEF_EP[energie]
  const cecsGesKgAn = cecsEfKwhAn * CO2_KG_PER_KWH[energie]

  return {
    becsKwhAn,
    pertesStockageKwhAn: pertesStockage,
    cecsEfKwhAn,
    cecsEpKwhAn,
    cecsGesKgAn,
    energie,
    rgEcs,
  }
}
