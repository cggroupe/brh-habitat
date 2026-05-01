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

import type { AuditInputs, DpeResult } from './types'
import { MOTEUR_VERSION } from './constants'
import { departementFromInsee, getZoneClimatique, altitudeBucket } from './geo/zones-climatiques'
import { resetCache } from './helpers/memoization'
import { calcGV } from './bati/calc-gv-ubat'
import { calcNadeq } from './bati/apports'

/**
 * Calcul DPE 3CL principal.
 *
 * ⚠️ Phase 2.1 partielle — bâti calculé, équipements en stub.
 *
 * Phase 2.2-2.5 ajoutera :
 * - Besoins chauffage Bch = GV × DH /1000 - apports
 * - Rendements générateurs (chaudière, PAC SCOP/COP)
 * - Conso ECS, éclairage, auxiliaires, climatisation
 * - Conversion EF → EP avec coef élec 2.3
 * - Étiquettes DPE (interpolation surface + double seuil)
 */
export function computeDpe(inputs: AuditInputs): DpeResult {
  resetCache()

  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = altitudeBucket(inputs.geo.altitude ?? 0)
  void departementFromInsee(inputs.geo.codeInsee)

  // Bâti — Phase 2.1 implémentée
  const gv = calcGV(inputs.bati, inputs.equipements.ventilation)
  const nadeq = calcNadeq(inputs.bati)

  // TODO Phase 2.2-2.5 : besoins, rendements, conso, étiquettes
  return {
    cepKwhEpM2An: 0,
    gesKgCo2M2An: 0,
    etiquetteEnergie: 'G',
    etiquetteClimat: 'G',
    etiquetteDpe: 'G',
    consoEfTotaleKwhAn: 0,
    parPoste: { chauffage: 0, ecs: 0, eclairage: 0, auxiliaires: 0, refroidissement: 0 },
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
