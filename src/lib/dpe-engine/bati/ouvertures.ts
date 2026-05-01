/**
 * Ouvertures — coefficients Uw, Ujn, Sw.
 *
 * Source : CapRénov+ `fra/CalcOuvertures.as` + DataOuvertures_*.json
 * Wiki :
 *   - caprenov-reverse/wiki/02-moteur-bati/ouvertures-uw.md
 *   - caprenov-reverse/wiki/02-moteur-bati/ouvertures-ujn.md
 *   - caprenov-reverse/wiki/02-moteur-bati/ouvertures-sw.md
 *
 * V1 : tables simplifiées par menuiserie × vitrage (couvre 90% des cas).
 * Phase 3+ : intégrer les lookups complets DataOuvertures_Uw/Ug/Sw avec
 * positions de pose, VIR, double fenêtre, survitrage, etc.
 */

import type { OuvertureInput } from '../types'

/**
 * Uw (W/m²·K) — coefficient de transmission de la fenêtre complète
 * (menuiserie + vitrage).
 *
 * Tables simplifiées V1 :
 * - Lignes : type de menuiserie
 * - Colonnes : type de vitrage
 *
 * Source : moyennes des tables DataOuvertures_Uw.json (par défaut, sans VIR).
 */
const UW_TABLE: Record<string, Record<string, number>> = {
  pvc: {
    simple: 4.5,
    double: 2.6,
    triple: 1.6,
    survitrage: 3.3,
    double_fenetre: 2.0,
  },
  bois: {
    simple: 4.4,
    double: 2.4,
    triple: 1.5,
    survitrage: 3.2,
    double_fenetre: 1.9,
  },
  alu: {
    simple: 5.6,
    double: 2.9,
    triple: 1.7,
    survitrage: 3.7,
    double_fenetre: 2.2,
  },
  metal: {
    simple: 5.6,
    double: 3.4,
    triple: 2.0,
    survitrage: 3.9,
    double_fenetre: 2.5,
  },
}

const UW_DEFAULT = 3.0
const UW_PORTE = 3.5
const UW_PORTE_BOIS_PLEINE = 2.5

/**
 * Bonus VIR (Vitrage à Isolation Renforcée) : -0.5 W/m²·K typique.
 */
const VIR_BONUS = 0.5

/**
 * Calcul Uw pour une ouverture.
 */
export function calcUw(ouverture: OuvertureInput): number {
  // Portes : table à part
  if (ouverture.type === 'porte') {
    if (ouverture.menuiserie === 'bois') return UW_PORTE_BOIS_PLEINE
    return UW_PORTE
  }

  const menuiserie = ouverture.menuiserie ?? 'pvc'
  const vitrage = ouverture.vitrage ?? 'double'

  const table = UW_TABLE[menuiserie] ?? UW_TABLE.pvc
  let uw = table[vitrage] ?? UW_DEFAULT

  if (ouverture.vir && (vitrage === 'double' || vitrage === 'triple')) {
    uw = Math.max(0.8, uw - VIR_BONUS)
  }

  return uw
}

/**
 * Ujn (W/m²·K) — coefficient nuit (volet/fermeture devant la baie).
 * `Ujn = Uw + ΔR` où ΔR vient de la fermeture.
 *
 * Tables ΔR simplifiées (résistance additionnelle apportée par le volet).
 * Source : DataOuvertures_deltaR.json moyennes.
 */
const DELTAR_VOLET: Record<string, number> = {
  sans: 0.0,
  persienne: 0.08, // volet métal/bois ajouré
  volet_battant_bois: 0.18, // volet bois plein traditionnel
  volet_ext_isolant: 0.30, // volet isolant moderne
}

export function calcUjn(ouverture: OuvertureInput): number {
  const uw = calcUw(ouverture)
  const deltaR = DELTAR_VOLET[ouverture.volet ?? 'sans'] ?? 0
  if (deltaR === 0) return uw
  // Ujn = 1 / (1/Uw + ΔR)
  return 1 / (1 / uw + deltaR)
}

/**
 * Sw — facteur solaire de la baie (transmission lumineuse × pondération).
 *
 * Source : DataOuvertures_Sw.json (selon vitrage VIR + pose).
 * V1 : table simplifiée par vitrage.
 */
const SW_TABLE: Record<string, number> = {
  simple: 0.65,
  double: 0.62,
  triple: 0.50,
  survitrage: 0.50,
  double_fenetre: 0.45,
}

export function calcSw(ouverture: OuvertureInput): number {
  if (ouverture.type === 'porte') return 0 // porte opaque
  const vitrage = ouverture.vitrage ?? 'double'
  let sw = SW_TABLE[vitrage] ?? 0.55
  // VIR réduit le facteur solaire de ~0.05 (couches métalliques)
  if (ouverture.vir) sw -= 0.05
  return Math.max(0, sw)
}

/**
 * Déperdition d'une ouverture : DP = b × A × Uw (sans volet en journée).
 * Pour le calcul DPE on prend Uw simple (les volets ne sont pas pris en
 * compte dans le calcul des étiquettes DPE selon arrêté 2021, Ujn sert
 * surtout au confort thermique d'été).
 */
export function calcDeperOuverture(
  ouverture: OuvertureInput,
  bCoef: number,
): number {
  return bCoef * ouverture.surface * calcUw(ouverture)
}
