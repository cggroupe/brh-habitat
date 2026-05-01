/**
 * Intermittence (i0) — coefficient d'intermittence du chauffage.
 *
 * Source : CapRénov+ `tv.db.intermittence` (54 536 rows) ou switch AS3 hardcodé.
 * Wiki : caprenov-reverse/wiki/03-moteur-equipements/intermittence-i0.md
 *
 * `i0` ∈ [0, 1] représente la fraction de fonctionnement effectif sur la durée
 * de présence. Les radiateurs avec régulation pièce par pièce ont i0 plus
 * faible (économies). Les chauffages centralisés sans régulation = i0 ≈ 1.
 *
 * V1 simplifié : table hardcodée par typeChauffage × régulation × inertie.
 * Phase 3+ : lookup Supabase via supabase-lookup.getIntermittence().
 */

import type { ChauffageInput, GenerateurChauffage } from '../../types'

/**
 * Calcul i0 simplifié V1.
 *
 * Approche : i0 dépend de :
 * - Type de chauffage (central vs divisé)
 * - Régulation pièce par pièce (oui/non)
 * - Inertie du bâti (légère/lourde)
 * - Émetteur (radiateur, plancher, etc.)
 */
export function calcI0(chauffage: ChauffageInput, inertie: string): number {
  const inertieIsLourde = inertie.toUpperCase() === 'LOURDE' || inertie.toUpperCase() === 'TRES_LOURDE'
  const regulation = chauffage.regulation ?? false

  // Chauffage divisé électrique avec régulation pièce par pièce = i0 le plus faible
  if (
    (chauffage.generateur === 'effet_joule_direct' ||
      chauffage.generateur === 'inertie_electrique') &&
    regulation
  ) {
    return inertieIsLourde ? 0.84 : 0.78
  }

  // Chauffage divisé sans régulation
  if (chauffage.generateur === 'effet_joule_direct' || chauffage.generateur === 'inertie_electrique') {
    return inertieIsLourde ? 0.94 : 0.88
  }

  // PAC air/air = chauffage divisé
  if (chauffage.generateur === 'pac_air_air') {
    return regulation ? (inertieIsLourde ? 0.84 : 0.78) : (inertieIsLourde ? 0.94 : 0.88)
  }

  // Plancher chauffant : pas d'intermittence (inertie élevée)
  if (chauffage.emetteur === 'plancher_chauffant') {
    return 1.0
  }

  // Chauffage central (chaudière + radiateurs eau, PAC air/eau, etc.)
  if (regulation) {
    return inertieIsLourde ? 0.92 : 0.88
  }
  return inertieIsLourde ? 0.96 : 0.94
}

/**
 * Calcul i0 ASYNC via lookup Supabase brh_dpe_intermittence (Phase 3+).
 *
 * Stub V1 — appelle `calcI0` synchrone.
 * À utiliser quand le moteur tournera côté Edge Function avec accès DB.
 */
export async function calcI0FromDB(
  chauffage: ChauffageInput,
  inertie: string,
): Promise<number> {
  // TODO Phase 3+ : appeler getIntermittence() depuis helpers/supabase-lookup
  return calcI0(chauffage, inertie)
}

/**
 * Renvoie un mapping enum CapRénov+ depuis ChauffageInput pour debug.
 */
export function describeIntermittence(chauffage: ChauffageInput): {
  type: GenerateurChauffage
  regulation: boolean
  emetteur?: string
} {
  return {
    type: chauffage.generateur,
    regulation: chauffage.regulation ?? false,
    emetteur: chauffage.emetteur,
  }
}
