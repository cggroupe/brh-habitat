/**
 * GV, G, Ubat — Synthèse Bâti.
 *
 * Source : CapRénov+ `fra/CalcParois.as:168-881`.
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/calc-gv-ubat.md
 *
 * Formules :
 *   GV   = ΣDP_parois + ΣDP_ouvertures + DP_ponts + DR - GV_ventil_recup
 *   G    = GV / (Hsp_moy × Sh_initiale)
 *   Ubat = (ΣDP_parois + ΣDP_ouv + DP_ponts) / Σ_surfaces_déperditives
 */

import type { BatiInputs, Ventilation } from '../types'
import { deperTotaleEnveloppe } from './deperditions'
import { calcDR, calcGvVentilRecup } from './renouvellement-air'
import { calcPontsThermiquesForfait } from './ponts-thermiques'

export interface GvDecomposition {
  /** Déperditions parois opaques (W/K). */
  parois: number
  /** Déperditions ouvertures (W/K). */
  ouvertures: number
  /** Déperditions ponts thermiques (W/K). */
  pontsThermiques: number
  /** Déperdition renouvellement d'air (W/K). */
  renouvellementAir: number
  /** Récupération double flux (W/K, à soustraire). */
  recupDoubleFlux: number
  /** Total GV (W/K). */
  total: number
  /** G = GV / (Hsp × Sh) (W/m³·K). */
  g: number
  /** Ubat = (DP enveloppe sans DR) / surface enveloppe (W/m²·K). */
  ubat: number
}

/**
 * Calcule GV (déperdition globale) + G + Ubat à partir des inputs bâti.
 */
export function calcGV(bati: BatiInputs, ventilation: Ventilation): GvDecomposition {
  const { parois, ouvertures, total: deperEnveloppe } = deperTotaleEnveloppe(bati)
  const pontsThermiques = calcPontsThermiquesForfait(bati, deperEnveloppe)
  const renouvellementAir = calcDR(bati, ventilation)
  const recupDoubleFlux = calcGvVentilRecup(bati, ventilation)

  const total =
    parois + ouvertures + pontsThermiques + renouvellementAir - recupDoubleFlux

  const hsp = bati.hauteurSousPlafond ?? bati.volume / bati.surfaceHabitable
  const g = total / (hsp * bati.surfaceHabitable)

  // Ubat : surface enveloppe = parois + ouvertures
  const surfaceEnveloppe =
    bati.parois.reduce((s, p) => s + p.surface, 0) +
    bati.ouvertures.reduce((s, o) => s + o.surface, 0)
  const ubat = surfaceEnveloppe > 0
    ? (parois + ouvertures + pontsThermiques) / surfaceEnveloppe
    : 0

  return {
    parois,
    ouvertures,
    pontsThermiques,
    renouvellementAir,
    recupDoubleFlux,
    total,
    g,
    ubat,
  }
}
