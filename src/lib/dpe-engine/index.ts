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

import type { AuditInputs, DpeResult } from './types'
import { MOTEUR_VERSION } from './constants'
import { departementFromInsee, getZoneClimatique, altitudeBucket } from './geo/zones-climatiques'
import { resetCache } from './helpers/memoization'

/**
 * Calcul DPE 3CL principal.
 *
 * ⚠️ STUB Phase 1 — implémentation complète en Phase 2.
 *
 * Pour l'instant, ne renvoie que les hypothèses normalisées (zone, altitude).
 * Les calculs réels (déperditions, besoins, conso, étiquettes) seront ajoutés
 * module par module en Phase 2.
 */
export function computeDpe(inputs: AuditInputs): DpeResult {
  resetCache()

  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = altitudeBucket(inputs.geo.altitude ?? 0)
  // Département peut servir à des lookups futurs (réseau de chaleur, aides locales)
  void departementFromInsee(inputs.geo.codeInsee)

  // TODO Phase 2 : implémenter calculs réels
  return {
    cepKwhEpM2An: 0,
    gesKgCo2M2An: 0,
    etiquetteEnergie: 'G',
    etiquetteClimat: 'G',
    etiquetteDpe: 'G',
    consoEfTotaleKwhAn: 0,
    parPoste: { chauffage: 0, ecs: 0, eclairage: 0, auxiliaires: 0, refroidissement: 0 },
    deperditions: { parois: 0, ouvertures: 0, pontsThermiques: 0, renouvellementAir: 0, total: 0, ubat: 0 },
    hypotheses: {
      zoneClimatique: zone,
      altitude,
      nadeq: 0,
      moteurVersion: MOTEUR_VERSION,
    },
  }
}
