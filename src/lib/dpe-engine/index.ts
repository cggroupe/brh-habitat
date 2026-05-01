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

import type { AuditInputs, DpeResult } from './types'
import { MOTEUR_VERSION, COEF_EP, CO2_KG_PER_KWH } from './constants'
import { departementFromInsee, getZoneClimatique, altitudeBucket } from './geo/zones-climatiques'
import { resetCache } from './helpers/memoization'
import { calcGV } from './bati/calc-gv-ubat'
import { calcNadeq } from './bati/apports'
import { calcChauffage } from './equipements/chauffage'

/**
 * Calcul DPE 3CL principal.
 *
 * ⚠️ Phase 2.1+2.2 — bâti + chauffage calculés. ECS, éclairage, aux, clim,
 * étiquettes DPE en Phase 2.3-2.4.
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

  // Estimations forfaitaires V1 pour ECS, éclairage, auxiliaires (Phase 2.3 implémentation détaillée)
  // ECS : ~25-35 kWh EP/m²/an pour ECS électrique, ~20 kWh pour ECS gaz
  const ecsEcEfKwh = 25 * inputs.bati.surfaceHabitable
  const ecsEcEpKwh = ecsEcEfKwh * COEF_EP[inputs.equipements.ecs.energie ?? 'electricite']
  const ecsGesKg = ecsEcEfKwh * CO2_KG_PER_KWH[inputs.equipements.ecs.energie ?? 'electricite']

  // Éclairage forfaitaire : ~1.4 kWh/m²/an EP
  const eclEpKwh = 1.4 * inputs.bati.surfaceHabitable
  // Auxiliaires (pompes, ventilateurs) : ~3 kWh/m²/an EP
  const auxEpKwh = 3 * inputs.bati.surfaceHabitable

  // Total
  const cepKwhEpAn = ch.cchEpKwhAn + ecsEcEpKwh + eclEpKwh + auxEpKwh
  const cepKwhEpM2An = cepKwhEpAn / inputs.bati.surfaceHabitable
  const gesKgAn = ch.cchGesKgAn + ecsGesKg
  const gesKgCo2M2An = gesKgAn / inputs.bati.surfaceHabitable

  return {
    cepKwhEpM2An,
    gesKgCo2M2An,
    etiquetteEnergie: 'G', // Phase 2.4 (lookup brh_dpe_seuils + interpolation surface)
    etiquetteClimat: 'G',
    etiquetteDpe: 'G',
    consoEfTotaleKwhAn: ch.cchEfKwhAn + ecsEcEfKwh,
    parPoste: {
      chauffage: ch.cchEpKwhAn,
      ecs: ecsEcEpKwh,
      eclairage: eclEpKwh,
      auxiliaires: auxEpKwh,
      refroidissement: 0,
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
