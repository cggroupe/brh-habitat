/**
 * Renouvellement d'air — Hvent, Hperm, DR.
 *
 * Source : CapRénov+ `fra/CalcVentilation.as:158-337`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/renouvellement-air.md
 *
 * Formules :
 *   Hvent = 0.34 × Qvarep × Sh           (déperdition ventilation)
 *   Hperm = 0.34 × Qvinf                 (déperdition infiltration)
 *   DR    = Hvent + Hperm                (renouvellement total, W/K)
 *
 * Constante 0.34 ≈ ρ·c_p / 3600 (chaleur volumique de l'air).
 */

import type { BatiInputs, Ventilation } from '../types'
import { calcN50 } from './permeabilite'

/** Constante chaleur volumique air (W·h/m³·K). */
export const RHO_CP = 0.34

/**
 * Année de référence depuis la période de construction.
 * Utilisé pour choisir la colonne du tableau Qvarep.
 */
function yearFromPeriode(periode: string): number {
  const map: Record<string, number> = {
    avant_1948: 1900,
    '1948-1974': 1960,
    '1975-1977': 1976,
    '1978-1982': 1980,
    '1983-1988': 1985,
    '1989-2000': 1995,
    '2001-2005': 2003,
    '2006-2012': 2009,
    apres_2013: 2018,
  }
  return map[periode] ?? 2000
}

/**
 * Qvarep (m³/h/m²) — débit ventilation extrait pondéré.
 * Source : table CapRénov+ `CalcVentilation.as:223-337`.
 */
export function calcQvarep(ventilation: Ventilation, anneeRef: number): number {
  // Sans ventilation
  if (ventilation === 'naturelle') return 1.2

  const isAvant1982 = anneeRef < 1982
  const is1982_2000 = anneeRef >= 1982 && anneeRef < 2001
  const is2001_2012 = anneeRef >= 2001 && anneeRef < 2013

  // VMC simple flux auto
  if (ventilation === 'vmc_sf_auto_avant_1982') return 1.97
  if (ventilation === 'vmc_sf_auto_1982_2000') return 1.65
  if (ventilation === 'vmc_sf_auto_apres_2000') {
    return is2001_2012 ? 1.5 : 1.32
  }

  // Hygro A
  if (ventilation === 'vmc_sf_hygro_a') {
    if (isAvant1982) return 1.46
    if (is1982_2000) return 1.3
    if (is2001_2012) return 1.12
    return 1.0
  }

  // Hygro B
  if (ventilation === 'vmc_sf_hygro_b_avant_2012') {
    if (isAvant1982) return 1.36
    if (is1982_2000) return 1.24
    return 1.09
  }
  if (ventilation === 'vmc_sf_hygro_b_apres_2012') return 1.0

  // Double flux
  if (ventilation === 'vmc_double_flux_sans_recup') return 0.6
  if (ventilation === 'vmc_double_flux_avec_recup') {
    return anneeRef >= 2013 ? 0.26 : 0.6
  }

  // VMC gaz
  if (ventilation === 'vmc_gaz') return 1.65

  return 1.2 // safe default
}

/**
 * Qvasouf_conv (m³/h/m²) — débit soufflé conventionnel.
 * Non nul uniquement pour double flux.
 */
export function calcQvasoufConv(ventilation: Ventilation, anneeRef: number): number {
  if (ventilation === 'vmc_double_flux_sans_recup') {
    return anneeRef >= 2001 ? 0.6 : 0.5
  }
  if (ventilation === 'vmc_double_flux_avec_recup') {
    return anneeRef >= 2013 ? 0.26 : 0.5
  }
  return 0
}

/**
 * Qvinf (m³/h) — débit d'infiltration.
 * Formule complexe selon nbMurExposes (V1 : on prend nbMurExposes != 1 par défaut).
 */
export function calcQvinf(bati: BatiInputs, ventilation: Ventilation): number {
  const e = 0.07
  const f = 15
  const hsp = bati.hauteurSousPlafond ?? bati.volume / bati.surfaceHabitable
  const sh = bati.surfaceHabitable
  const n50 = calcN50(bati, ventilation)

  const anneeRef = yearFromPeriode(bati.periodeConstruction)
  const qvarep = calcQvarep(ventilation, anneeRef)
  const qvasouf = calcQvasoufConv(ventilation, anneeRef)

  if (n50 <= 0 || hsp <= 0) return 0

  const v1 = hsp * sh * n50 * e
  const ratio = (qvasouf - qvarep) / (hsp * n50)
  const v2 = 1 + (f / e) * ratio * ratio
  return v1 / v2
}

/**
 * Hvent — déperdition par ventilation extrait (W/K).
 */
export function calcHvent(bati: BatiInputs, ventilation: Ventilation): number {
  const anneeRef = yearFromPeriode(bati.periodeConstruction)
  const qvarep = calcQvarep(ventilation, anneeRef)
  return RHO_CP * qvarep * bati.surfaceHabitable
}

/**
 * Hperm — déperdition par infiltrations (W/K).
 */
export function calcHperm(bati: BatiInputs, ventilation: Ventilation): number {
  return RHO_CP * calcQvinf(bati, ventilation)
}

/**
 * DR — déperdition totale renouvellement d'air (W/K).
 */
export function calcDR(bati: BatiInputs, ventilation: Ventilation): number {
  return calcHvent(bati, ventilation) + calcHperm(bati, ventilation)
}

/**
 * Récupération double-flux (W/K).
 * `GV_ventil_recup = 0.34 × Sh × Qvarep × R_ventil_net`
 * où `R_ventil_net = max(0, R_échangeur - 0.12)`.
 *
 * V1 : forfait R_échangeur = 0.85 pour double flux avec récupération.
 */
export function calcGvVentilRecup(bati: BatiInputs, ventilation: Ventilation): number {
  if (ventilation !== 'vmc_double_flux_avec_recup') return 0
  const rEchangeur = 0.85
  const rNet = Math.max(0, rEchangeur - 0.12)
  if (rNet <= 0) return 0

  const anneeRef = yearFromPeriode(bati.periodeConstruction)
  const qvarep = calcQvarep(ventilation, anneeRef)
  return RHO_CP * bati.surfaceHabitable * qvarep * rNet
}
