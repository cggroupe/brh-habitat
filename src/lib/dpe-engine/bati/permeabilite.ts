/**
 * Perméabilité à l'air — Q4Pa, Q4Pa_env, n50.
 *
 * Source : CapRénov+ `fra/CalcVentilation.as:367-526`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/permeabilite-air.md
 *
 * Formules :
 * - Q4paSurf = perméabilité par m² (table selon type × année × isolation)
 * - Q4pa_env = Q4paSurf × surfaceEnveloppe
 * - Q4pa = Q4pa_env + 0.45 × Smea × Sh
 * - n50 = Q4pa / ((4/50)^(2/3) × Hsp × Sh)
 */

import type { BatiInputs, Ventilation } from '../types'

/**
 * Q4paSurf (m³/h/m²) selon type habitation × période × isolation.
 *
 * Table maison individuelle (CapRénov+ AS3:455-462).
 */
function q4paSurfMaison(periode: string, hasIso: boolean, hasReno: boolean, joints: boolean): number {
  // Avant 1948
  if (periode === 'avant_1948') {
    if (joints && hasIso) return 2.0
    if (hasIso) return 2.0
    if (joints || hasReno) return 2.5
    return 3.3
  }
  // 1948-1974
  if (periode === '1948-1974') {
    return hasIso ? 1.9 : 2.2
  }
  // 1975-2005
  if (periode === '1975-1977' || periode === '1978-1982' || periode === '1983-1988' || periode === '1989-2000' || periode === '2001-2005') {
    return 1.9
  }
  // 2006-2011
  if (periode === '2006-2012') {
    return 1.3
  }
  // ≥ 2012 (RT2012)
  return 0.6
}

/**
 * Q4paSurf appartement — table symétrique simplifiée V1.
 * Phase 3+ : table complète DataPermeabilite.json appart.
 */
function q4paSurfAppart(periode: string, hasIso: boolean): number {
  if (periode === 'avant_1948') return hasIso ? 2.5 : 3.0
  if (periode === '1948-1974') return hasIso ? 2.0 : 2.5
  if (periode === '2006-2012') return 1.7
  if (periode === 'apres_2013') return 1.0
  return 2.0
}

/**
 * Détecte si le bâti a une isolation murs ou plancher haut significative
 * (règle des 50% : au moins une zone isolée représentant ≥50% de la surface).
 *
 * V1 simplifié : on regarde si AU MOINS UNE paroi a une isolation.
 */
function hasIsolation(bati: BatiInputs): boolean {
  return bati.parois.some(
    (p) =>
      (p.type === 'mur' || p.type === 'plancher_haut' || p.type === 'toiture') &&
      p.isolation?.type &&
      p.isolation.type !== 'sans',
  )
}

/**
 * Q4paSurf (m³/h/m²) — perméabilité surfacique.
 */
export function calcQ4paSurf(bati: BatiInputs): number {
  const hasIso = hasIsolation(bati)
  // hasReno : si une fenêtre récente est présente
  const hasReno = bati.ouvertures.some(
    (o) => o.menuiserie === 'pvc' && o.vitrage === 'double',
  )
  // joints : V1 forfait selon période (avant 1975 = pas de joints, après = joints)
  const joints = bati.periodeConstruction !== 'avant_1948' && bati.periodeConstruction !== '1948-1974'

  if (bati.typeBatiment === 'maison') {
    return q4paSurfMaison(bati.periodeConstruction, hasIso, hasReno, joints)
  }
  return q4paSurfAppart(bati.periodeConstruction, hasIso)
}

/**
 * Smea — surface équivalente entrées d'air (m²) selon ventilation.
 * Source : DataPermeabilite + `CalcVentilation.as:339-365`.
 */
export const SMEA: Record<string, number> = {
  naturelle: 4, // grilles
  vmc_sf_auto_avant_1982: 2,
  vmc_sf_auto_1982_2000: 2,
  vmc_sf_auto_apres_2000: 2,
  vmc_sf_hygro_a: 2,
  vmc_sf_hygro_b_avant_2012: 1.5,
  vmc_sf_hygro_b_apres_2012: 1.5,
  vmc_double_flux_sans_recup: 0,
  vmc_double_flux_avec_recup: 0,
  vmc_gaz: 2,
}

export function calcSmea(ventilation: Ventilation): number {
  return SMEA[ventilation] ?? 2
}

/**
 * Surface enveloppe (parois + ouvertures) en m².
 */
function surfaceEnveloppe(bati: BatiInputs): number {
  return (
    bati.parois.reduce((s, p) => s + p.surface, 0) +
    bati.ouvertures.reduce((s, o) => s + o.surface, 0)
  )
}

/**
 * Q4pa_env = Q4paSurf × surfaceEnveloppe (m³/h sous 4 Pa, hors entrées d'air).
 */
export function calcQ4paEnv(bati: BatiInputs): number {
  return calcQ4paSurf(bati) * surfaceEnveloppe(bati)
}

/**
 * Q4pa (m³/h sous 4 Pa) = Q4pa_env + 0.45 × Smea × Sh
 */
export function calcQ4pa(bati: BatiInputs, ventilation: Ventilation): number {
  return calcQ4paEnv(bati) + 0.45 * calcSmea(ventilation) * bati.surfaceHabitable
}

/**
 * n50 — taux de renouvellement d'air à 50 Pa (vol/h).
 * `n50 = Q4pa / ((4/50)^(2/3) × Hsp × Sh)`
 */
export function calcN50(bati: BatiInputs, ventilation: Ventilation): number {
  const hsp = bati.hauteurSousPlafond ?? bati.volume / bati.surfaceHabitable
  const denom = Math.pow(4 / 50, 2 / 3) * hsp * bati.surfaceHabitable
  if (denom <= 0) return 0
  return calcQ4pa(bati, ventilation) / denom
}
