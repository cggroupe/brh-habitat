/**
 * CEE — Certificats d'Économie d'Énergie (BAR-TH / BAR-EN).
 *
 * Source : caprenov-reverse/wiki/06-aides-financieres/cee-classique.md
 * + ConfigCEE.as (prix 7.86 € standard / 8.21 € précaire / MWh cumac).
 *
 * Conditions :
 * - Logement ≥ 2 ans
 * - RGE obligatoire
 * - Catégorie : standard ou précaire (Bleu/Jaune = précaire/bonifié)
 * - Pas de catégorie "intermédiaire" pour CEE
 *
 * V1 : forfaits cumac H1/H2/H3 par geste (extraits du wiki).
 * Phase 9+ : lookup `aidesfi.db` exhaustif si besoin.
 */

import type { CouleurMPR } from './decile'

export type ZoneClimaCEE = 'H1' | 'H2' | 'H3'

/** Catégorie CEE : standard (rose/violet) ou précaire (bleu/jaune). */
export type CategorieCEE = 'standard' | 'precaire'

export function categorieFromCouleur(couleur: CouleurMPR): CategorieCEE {
  return couleur === 'bleu' || couleur === 'jaune' ? 'precaire' : 'standard'
}

/**
 * Prix moyen brut (€ / MWh cumac) — Source ConfigCEE.as 2026.
 * V1 : valeur fixe. Phase 9+ : modulé par opérateur (Total, EDF, etc.).
 */
const PRIX_MWH_CUMAC = {
  standard: 7.86,
  precaire: 8.21,
} as const

/**
 * Cumac kWh par m² (parois) ou par unité (équipement) selon zone climatique.
 * Source : extraits CEE.as (BAR-TH / BAR-EN officielles).
 *
 * Format : { unit: 'm2' | 'unite', cumac_par_zone: { H1, H2, H3 } }
 */
const CEE_CUMAC: Record<
  string,
  { unit: 'm2' | 'unite'; cumac: Record<ZoneClimaCEE, number> }
> = {
  // Parois
  isolation_combles_perdus: { unit: 'm2', cumac: { H1: 1700, H2: 1400, H3: 900 } },
  isolation_toiture: { unit: 'm2', cumac: { H1: 1200, H2: 1000, H3: 670 } },
  isolation_murs_iti: { unit: 'm2', cumac: { H1: 1600, H2: 1300, H3: 880 } },
  isolation_murs_ite: { unit: 'm2', cumac: { H1: 1600, H2: 1300, H3: 880 } },
  isolation_plancher_bas: { unit: 'm2', cumac: { H1: 1100, H2: 890, H3: 590 } },
  // Menuiseries
  fenetres_pvc_double_vir: { unit: 'm2', cumac: { H1: 3800, H2: 3100, H3: 2100 } },
  fenetres_pvc_triple: { unit: 'm2', cumac: { H1: 4500, H2: 3700, H3: 2500 } },
  // Équipements (forfait)
  pac_air_eau: { unit: 'unite', cumac: { H1: 88000, H2: 73000, H3: 49000 } },
  pac_eau_eau: { unit: 'unite', cumac: { H1: 132000, H2: 110000, H3: 74000 } },
  chaudiere_granules_bois: { unit: 'unite', cumac: { H1: 95000, H2: 79000, H3: 53000 } },
  cet_thermodynamique: { unit: 'unite', cumac: { H1: 22000, H2: 22000, H3: 22000 } }, // CET indép. zone
  cesi_solaire_thermique: { unit: 'unite', cumac: { H1: 55000, H2: 65000, H3: 78000 } },
  vmc_double_flux_recup: { unit: 'unite', cumac: { H1: 18000, H2: 15000, H3: 10000 } },
}

export interface CeeGesteInput {
  geste: keyof typeof CEE_CUMAC
  couleur: CouleurMPR
  zoneClimat: ZoneClimaCEE
  surface?: number // m² si unit='m2'
}

export interface CeeGesteResult {
  geste: string
  cumacKwh: number
  prixMwh: number
  montantEuros: number
  categorieCee: CategorieCEE
}

/**
 * Calcule le montant CEE pour un geste.
 *
 * Formule : `montant_€ = (cumac_kWh / 1000) × prixMoyenNet_€_par_MWh`
 * où prixMoyenNet = 8.21 € si précaire (bleu/jaune), 7.86 € sinon.
 */
export function calcCeeGeste(input: CeeGesteInput): CeeGesteResult {
  const cumacEntry = CEE_CUMAC[input.geste]
  if (!cumacEntry) {
    return {
      geste: String(input.geste),
      cumacKwh: 0,
      prixMwh: 0,
      montantEuros: 0,
      categorieCee: categorieFromCouleur(input.couleur),
    }
  }

  const cat = categorieFromCouleur(input.couleur)
  const prixMwh = PRIX_MWH_CUMAC[cat]
  const baseCumac = cumacEntry.cumac[input.zoneClimat]

  let cumacKwh = 0
  if (cumacEntry.unit === 'm2') {
    cumacKwh = baseCumac * (input.surface ?? 0)
  } else {
    cumacKwh = baseCumac
  }

  // Bonus précaire +20% (Coup de Pouce + bonus opérateur typique)
  if (cat === 'precaire') cumacKwh *= 1.2

  const montantEuros = (cumacKwh / 1000) * prixMwh

  return {
    geste: String(input.geste),
    cumacKwh,
    prixMwh,
    montantEuros,
    categorieCee: cat,
  }
}

/**
 * Calcule CEE sur un ensemble de gestes.
 */
export function calcCeeTotal(
  gestes: CeeGesteInput[],
): { detail: CeeGesteResult[]; totalEuros: number; totalCumacKwh: number } {
  const detail = gestes.map(calcCeeGeste)
  return {
    detail,
    totalEuros: detail.reduce((s, g) => s + g.montantEuros, 0),
    totalCumacKwh: detail.reduce((s, g) => s + g.cumacKwh, 0),
  }
}
