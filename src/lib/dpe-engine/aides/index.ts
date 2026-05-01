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
export * from './mpr-ampleur'

import type { CouleurMPR } from './decile'
import type { ZoneClimaCEE } from './cee-detaille'
import { calcMprTotal, type MprGesteInput, type GesteMprMonoId } from './mpr-detaille'
import { calcCeeTotal, type CeeGesteInput } from './cee-detaille'
import { calcEcoPtz, type CategorieTravaux, type EcoPtzResult } from './eco-ptz'
import { calcCumulPlafond, type CumulResult } from './cumul-plafonds'
import { calcMprAmpleur, type MprAmpleurResult } from './mpr-ampleur'
import type { EtiquetteDpe } from '../constants'

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
  /** Inputs pour MPR Ampleur — si fournis, le moteur calculera MAX(mono, ampleur). */
  ampleurContext?: {
    classeAvant: EtiquetteDpe
    classeApres: EtiquetteDpe
    gesAvant?: number
    gesApres?: number
    nbGestesIso: number
    ratioSurfIsolee?: number
    anneeLogement?: number
  }
}

export interface AidesScenarioResult {
  mpr: { detail: ReturnType<typeof calcMprTotal>['detail']; totalEuros: number }
  /** MPR Ampleur si éligible. */
  mprAmpleur?: MprAmpleurResult
  /** True si l'ampleur est plus avantageuse que mono-geste (le moteur a choisi MAX). */
  ampleurChosen?: boolean
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

  // MPR Ampleur (si contexte fourni)
  let mprAmpleur: MprAmpleurResult | undefined
  if (input.ampleurContext) {
    mprAmpleur = calcMprAmpleur({
      couleur: input.couleur,
      classeAvant: input.ampleurContext.classeAvant,
      classeApres: input.ampleurContext.classeApres,
      gesAvant: input.ampleurContext.gesAvant,
      gesApres: input.ampleurContext.gesApres,
      travauxHt: coutHtTotal,
      nbGestesIso: input.ampleurContext.nbGestesIso,
      ratioSurfIsolee: input.ampleurContext.ratioSurfIsolee,
      anneeLogement: input.ampleurContext.anneeLogement,
    })
  }

  // Choix MAX(mono, ampleur) — non cumulables
  const ampleurChosen = !!(mprAmpleur?.eligible && mprAmpleur.montantEuros > mpr.totalEuros)
  const mprEffectiveEuros = ampleurChosen ? mprAmpleur!.montantEuros : mpr.totalEuros

  // CEE (cumulable avec MPR mono OU MPR Ampleur, mais pas avec CDP coup de pouce qui est exclusif Ampleur)
  // V1 : on garde le CEE classique dans tous les cas
  const ceeInputs: CeeGesteInput[] = input.gestes.map((g) => ({
    geste: g.geste,
    couleur: input.couleur,
    zoneClimat: input.zoneClimat,
    surface: g.surface,
  }))
  const cee = calcCeeTotal(ceeInputs)

  // ÉcoPTZ — si MPR Ampleur éligible, mode 6 automatique (50k €)
  const ecoPtz = calcEcoPtz({
    categories: input.gestes.map((g) => g.categorieEcoPtz),
    sautClassesDpe: input.sautClassesDpe,
    coutHtEuros: coutHtTotal,
    isGlobalAmpleur: input.isGlobalAmpleur ?? ampleurChosen,
  })

  // Cumul + plafond global (utilise mprEffectiveEuros, pas mpr.totalEuros)
  const cumul = calcCumulPlafond({
    couleur: input.couleur,
    coutHtEuros: coutHtTotal,
    mprEuros: mprEffectiveEuros,
    ceeEuros: cee.totalEuros,
    autresAidesEuros: 0,
  })

  return {
    mpr,
    mprAmpleur,
    ampleurChosen,
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
