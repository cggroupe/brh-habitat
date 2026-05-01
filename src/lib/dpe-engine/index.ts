/**
 * Moteur DPE 3CL-DPE 2021 — Phase 1 (Fondation)
 *
 * Source : portage CapRénov+ 26.0.2 (reverse-engineered).
 * Décisions architecturales : voir caprenov-reverse/decisions/ADR-*.md
 *
 * Phase 1 livre :
 * - Structure complète + 29 JSON statiques bundlés
 * - Constantes physiques + types publics
 * - Helpers (memoization, lookup Supabase)
 * - Géo (mapping département → zone climatique)
 *
 * Phase 2 livrera :
 * - Tous les modules de calcul bati + équipements
 * - Tests Vitest contre Open Data ADEME (tolérance ±5 %)
 *
 * NE PAS UTILISER computeDpe en prod tant que Phase 2 n'est pas validée.
 */

export * from './constants'
export * from './types'
export * from './geo/zones-climatiques'
export { memoize, resetCache, cacheSize } from './helpers/memoization'
export { resetLookupCaches, preloadSeuils } from './helpers/supabase-lookup'

// Bâti — modules de calcul (Phase 2.1)
export { calcBParoi, calcBParoiFromInput } from './bati/coef-reduction-b'
export { calcUp, calcUepb, calcRp, calcRIsolant, U_PLAFOND } from './bati/calc-up'
export { calcUw, calcUjn, calcSw, calcDeperOuverture } from './bati/ouvertures'
export {
  deperParoiOpaque,
  deperTotalParoisOpaques,
  deperTotalOuvertures,
  deperTotaleEnveloppe,
  surfaceEnveloppe,
} from './bati/deperditions'
export {
  calcQ4paSurf,
  calcQ4pa,
  calcQ4paEnv,
  calcN50,
  calcSmea,
} from './bati/permeabilite'
export {
  calcQvarep,
  calcQvinf,
  calcHvent,
  calcHperm,
  calcDR,
  calcGvVentilRecup,
  RHO_CP,
} from './bati/renouvellement-air'
export { calcPontsThermiquesForfait } from './bati/ponts-thermiques'
export {
  calcNadeq,
  calcApportsInternesAnnuelsKwh,
  calcApportsSolairesAnnuelsKwh,
  calcApportsGratuitsAnnuelsKwh,
  AI_EQUIPEMENTS_W_M2,
  AI_ECLAIRAGE_W_M2,
  AI_OCCUPANT_W,
} from './bati/apports'
export { calcGV } from './bati/calc-gv-ubat'
export type { GvDecomposition } from './bati/calc-gv-ubat'

// Climat — DH, Nref, ECh
export {
  getDHCh,
  getNrefCh,
  getECh,
  getDHRa,
  getNrefRa,
  getERa,
  getDHChAnnuel,
  getNrefChAnnuel,
  getEChAnnuel,
  getTbase,
} from './equipements/climat'
export type { ClimatLookupOpts } from './equipements/climat'

// Chauffage — Phase 2.2
export {
  calcChauffage,
  calcBchAnnuel,
  calcBchMensuel,
  calcFj,
  calcRe,
  calcRd,
  calcRr,
  calcRg,
  calcIch,
  calcSCOP,
  calcSCOPFromInput,
  isPAC,
  calcI0,
} from './equipements/chauffage'
export type { ChauffageResult, BchResult, PacInputs } from './equipements/chauffage'

// ECS + usages mineurs — Phase 2.3
export { calcEcs, calcBecsKwhAn } from './equipements/ecs'
export type { EcsResult } from './equipements/ecs'
export {
  calcEclairageKwhEpAn,
  calcAuxiliairesKwhEpAn,
  calcClimatisationKwhEpAn,
  calcPhotovoltaiqueKwhEpAn,
  calcGesAnnexesKgAn,
} from './equipements/usages-mineurs'

// Étiquettes DPE — Phase 2.4
export {
  classifyDpe,
  classifyValue,
  getSeuils,
  dpeFinal,
  ORDER_DPE,
  calcSautClasses,
  isPassoireThermique,
} from './dpe/etiquettes'
export type { DpeClassification, SeuilsClassifies } from './dpe/etiquettes'

// Variantes / scénarios — Phase 7
export {
  applyDeltaToInputs,
  recomputeVariante,
  calcCoutGeste,
  calcCoutTotal,
  calcAidesGeste,
  calcAidesTotal,
  calcPayback,
  computeScenario,
  computeAllScenarios,
  calcAidesDetaillees,
  gesteToMprId,
  gesteToEcoPtzCategory,
  SCENARIOS_TEMPLATES,
  PRIX_GESTES,
} from './variantes'
export type {
  GesteDelta,
  GesteId,
  PaybackInput,
  PaybackResult as VariantePaybackResult,
  ScenarioTemplate,
  ScenarioComputed,
  AidesContext,
} from './variantes'

// Moteur Aides détaillé — Phase 8 + 9
export {
  calcCouleurMpr,
  calcCouleurFromAudit,
  isIdf,
  calcMprGeste,
  calcMprTotal,
  MPR_MONO_GESTE,
  calcCeeGeste,
  calcCeeTotal,
  categorieFromCouleur,
  calcEcoPtz,
  calcCumulPlafond,
  PLAFOND_GLOBAL_HT_PCT,
  calcAidesScenario,
  zoneClimatToCEE,
  // Phase 9 : MPR Ampleur + bonus
  calcMprAmpleur,
  eligibleMprAmpleur,
  isSortiePassoire,
  isBbcAtteint,
  TABLE_MPR_AMPLEUR,
  // Phase 10 : Aides locales
  fetchAidesLocales,
  calcAidesLocales,
  regionFromInsee,
  epciFromInsee,
} from './aides'
export type {
  CouleurMPR,
  ZoneGeo,
  DecileResult,
  GesteMprMonoId,
  MprGesteInput,
  MprGesteResult,
  ZoneClimaCEE,
  CategorieCEE,
  CeeGesteInput,
  CeeGesteResult,
  EcoPtzMode,
  CategorieTravaux,
  EcoPtzInput,
  EcoPtzResult,
  CumulInput,
  CumulResult,
  AidesGesteInput,
  AidesScenarioInput,
  AidesScenarioResult,
  // Phase 9
  ParamMprAmpleur,
  MprAmpleurInput,
  MprAmpleurResult,
  // Phase 10
  AideLocale,
  NiveauAide,
  AideLocaleApplied,
  CalcAidesLocalesInput,
  CalcAidesLocalesResult,
} from './aides'

import type { AuditInputs, DpeResult } from './types'
import { MOTEUR_VERSION } from './constants'
import { departementFromInsee, getZoneClimatique, altitudeBucket } from './geo/zones-climatiques'
import { resetCache } from './helpers/memoization'
import { calcGV } from './bati/calc-gv-ubat'
import { calcNadeq } from './bati/apports'
import { calcChauffage } from './equipements/chauffage'
import { calcEcs } from './equipements/ecs'
import {
  calcEclairageKwhEpAn,
  calcAuxiliairesKwhEpAn,
  calcClimatisationKwhEpAn,
  calcPhotovoltaiqueKwhEpAn,
  calcGesAnnexesKgAn,
} from './equipements/usages-mineurs'
import { classifyDpe } from './dpe/etiquettes'

/**
 * Calcul DPE 3CL principal — Phase 2.1+2.2+2.3+2.4 implémentées.
 *
 * Calcule complet :
 * - Bâti : déperditions parois + ouvertures + ponts + ventilation (GV, Ubat)
 * - Chauffage : Bch + rendements + PAC SCOP + intermittence → Cch
 * - ECS : Becs + pertes + rendement → Cecs
 * - Usages mineurs : éclairage forfait, auxiliaires (VMC + circulateur), clim, PV
 * - Étiquettes : classification CEP + GES + double seuil → DPE final
 *
 * Phase 2.5 : tests Open Data ADEME (tolérance ±5 % cible).
 */
export function computeDpe(inputs: AuditInputs): DpeResult {
  resetCache()

  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = altitudeBucket(inputs.geo.altitude ?? 0)
  void departementFromInsee(inputs.geo.codeInsee)

  // Bâti — Phase 2.1
  const gv = calcGV(inputs.bati, inputs.equipements.ventilation)
  const nadeq = calcNadeq(inputs.bati)

  // Chauffage — Phase 2.2
  const ch = calcChauffage(inputs)

  // ECS — Phase 2.3
  const ecs = calcEcs(inputs)

  // Usages mineurs — Phase 2.3
  const eclEpKwh = calcEclairageKwhEpAn(inputs)
  const auxEpKwh = calcAuxiliairesKwhEpAn(inputs)
  const climEpKwh = calcClimatisationKwhEpAn(inputs)
  const pvEpKwh = calcPhotovoltaiqueKwhEpAn(inputs)
  const gesAnnexesKg = calcGesAnnexesKgAn(inputs)

  // Total CEP (kWh EP/m²/an) — PV soustrait de la conso
  const cepKwhEpAn = Math.max(
    0,
    ch.cchEpKwhAn + ecs.cecsEpKwhAn + eclEpKwh + auxEpKwh + climEpKwh - pvEpKwh,
  )
  const cepKwhEpM2An = cepKwhEpAn / inputs.bati.surfaceHabitable

  // Total GES (kg CO₂/m²/an)
  const gesKgAn = ch.cchGesKgAn + ecs.cecsGesKgAn + gesAnnexesKg
  const gesKgCo2M2An = gesKgAn / inputs.bati.surfaceHabitable

  // Étiquettes DPE — Phase 2.4
  const dpe = classifyDpe(
    cepKwhEpM2An,
    gesKgCo2M2An,
    inputs.bati.surfaceHabitable,
    inputs.geo.altitude ?? 0,
    zone,
  )

  return {
    cepKwhEpM2An,
    gesKgCo2M2An,
    etiquetteEnergie: dpe.etiquetteEnergie,
    etiquetteClimat: dpe.etiquetteClimat,
    etiquetteDpe: dpe.etiquetteDpe,
    consoEfTotaleKwhAn: ch.cchEfKwhAn + ecs.cecsEfKwhAn,
    parPoste: {
      chauffage: ch.cchEpKwhAn,
      ecs: ecs.cecsEpKwhAn,
      eclairage: eclEpKwh,
      auxiliaires: auxEpKwh,
      refroidissement: climEpKwh,
    },
    deperditions: {
      parois: gv.parois,
      ouvertures: gv.ouvertures,
      pontsThermiques: gv.pontsThermiques,
      renouvellementAir: gv.renouvellementAir,
      total: gv.total,
      ubat: gv.ubat,
    },
    hypotheses: {
      zoneClimatique: zone,
      altitude,
      nadeq,
      moteurVersion: MOTEUR_VERSION,
    },
  }
}
