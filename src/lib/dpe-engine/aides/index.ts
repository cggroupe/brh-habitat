/**
 * Moteur Aides Financières — orchestrateur.
 *
 * Combine MPR mono-geste + CEE + Éco-PTZ + plafonds globaux.
 *
 * Phase 8.0 V1 : forfaits MPR détaillés par décile + CEE par zone climat + Éco-PTZ
 * + plafond global 90/75/60/40% HT.
 *
 * Phase 8.1+ : MPR Ampleur + CDP coup de pouce + aides locales 5 niveaux géo.
 */

export * from './decile'
export * from './mpr-detaille'
export * from './cee-detaille'
export * from './eco-ptz'
export * from './cumul-plafonds'

import type { CouleurMPR } from './decile'
import type { ZoneClimaCEE } from './cee-detaille'
import { calcMprTotal, type MprGesteInput, type GesteMprMonoId } from './mpr-detaille'
import { calcCeeTotal, type CeeGesteInput } from './cee-detaille'
import { calcEcoPtz, type CategorieTravaux, type EcoPtzResult } from './eco-ptz'
import { calcCumulPlafond, type CumulResult } from './cumul-plafonds'

export interface AidesGesteInput {
  /** ID du geste pour MPR (matche aussi CEE V1). */
  geste: GesteMprMonoId
  /** Surface m² (parois) — sinon 0 pour équipements forfait. */
  surface?: number
  /** Coût HT du geste (€). */
  coutHtEuros: number
  /** Catégorie travaux pour ÉcoPTZ. */
  categorieEcoPtz: CategorieTravaux
}

export interface AidesScenarioInput {
  couleur: CouleurMPR
  zoneClimat: ZoneClimaCEE
  gestes: AidesGesteInput[]
  /** Saut DPE classes pour mode 5/6 ÉcoPTZ. */
  sautClassesDpe?: number
  isGlobalAmpleur?: boolean
}

export interface AidesScenarioResult {
  mpr: { detail: ReturnType<typeof calcMprTotal>['detail']; totalEuros: number }
  cee: { detail: ReturnType<typeof calcCeeTotal>['detail']; totalEuros: number; totalCumacKwh: number }
  ecoPtz: EcoPtzResult
  cumul: CumulResult
  /** Sommaire pour UI : aides totales subventions (hors ÉcoPTZ qui est un prêt). */
  aidesTotalSubventionsEuros: number
  resteAChargeFinal: number
  coutHtTotal: number
}

/**
 * Calcul complet des aides pour un scénario de rénovation.
 */
export function calcAidesScenario(input: AidesScenarioInput): AidesScenarioResult {
  const coutHtTotal = input.gestes.reduce((s, g) => s + g.coutHtEuros, 0)

  // MPR mono-geste
  const mprInputs: MprGesteInput[] = input.gestes.map((g) => ({
    geste: g.geste,
    couleur: input.couleur,
    surface: g.surface,
    coutHtEuros: g.coutHtEuros,
  }))
  const mpr = calcMprTotal(mprInputs)

  // CEE
  const ceeInputs: CeeGesteInput[] = input.gestes.map((g) => ({
    geste: g.geste,
    couleur: input.couleur,
    zoneClimat: input.zoneClimat,
    surface: g.surface,
  }))
  const cee = calcCeeTotal(ceeInputs)

  // ÉcoPTZ
  const ecoPtz = calcEcoPtz({
    categories: input.gestes.map((g) => g.categorieEcoPtz),
    sautClassesDpe: input.sautClassesDpe,
    coutHtEuros: coutHtTotal,
    isGlobalAmpleur: input.isGlobalAmpleur,
  })

  // Cumul + plafond global
  const cumul = calcCumulPlafond({
    couleur: input.couleur,
    coutHtEuros: coutHtTotal,
    mprEuros: mpr.totalEuros,
    ceeEuros: cee.totalEuros,
    autresAidesEuros: 0, // ÉcoPTZ = prêt, pas subvention
  })

  return {
    mpr,
    cee,
    ecoPtz,
    cumul,
    aidesTotalSubventionsEuros: cumul.totalAidesPlafonnees,
    resteAChargeFinal: cumul.resteAChargeEuros,
    coutHtTotal,
  }
}

/**
 * Helper : zone climat depuis ZoneClimatique du moteur (H1A→H1, H2A→H2, H3→H3).
 */
export function zoneClimatToCEE(zone: string): ZoneClimaCEE {
  if (zone.startsWith('H1')) return 'H1'
  if (zone.startsWith('H2')) return 'H2'
  return 'H3'
}
