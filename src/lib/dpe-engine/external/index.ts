/**
 * Sources de données externes — Tier 1 (Phase 11.1).
 *
 * Référence : docs/wiki/external-data-sources.md
 *
 * Modules livrés Phase 11.1 :
 * - score-v2 : score composite (orchestre tous les signaux)
 * - filosofi : décile MPR auto IRIS
 * - enedis : conso résidentielle adresse + thermosens IRIS
 * - grdf : conso gaz IRIS
 * - georisques : RGA/radon/inondation/cavités
 *
 * Modules Phase 11.2+ : insee-recensement, dvf, sitadel2, anil-aides, etc.
 */

export * from './types'
export { computeScoreV2 } from './score-v2'
export type { ScoreV2Input } from './score-v2'

export {
  estimateDecile,
  decileToCouleurMpr,
  medianeToCouleurMpr,
} from './filosofi'

export {
  parseEnedisAddrSignal,
  buildEnedisAddrUrl,
  buildEnedisIrisUrl,
} from './enedis'

export {
  parseGrdfIrisSignal,
  buildGrdfIrisUrl,
  isGazDominantIris,
} from './grdf'
export type { GrdfIrisSignal } from './grdf'

export {
  buildGeorisquesUrls,
  aggregateGeorisques,
  extractRadonCategorie,
} from './georisques'

// Phase 11.2 — DVF
export {
  buildDvfUrl,
  parseDvfRow,
  isMutationRecent,
  haversineMeters,
  aggregatePriceMedian3y,
  findRecentMutationAtCoords,
} from './dvf'
export type { DvfMutation } from './dvf'
