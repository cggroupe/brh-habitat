/**
 * MaPrimeRénov' mono-geste — forfaits détaillés par geste × couleur.
 *
 * Source : aidesfi.db CapRénov+ (programmes 2375 Bleu / 2388 Jaune / 2382 Violet)
 * + barèmes officiels publics France-Rénov 2026.
 *
 * Couleurs :
 * - Bleu (très modeste) : forfait max
 * - Jaune (modeste) : forfait moyen
 * - Violet (intermédiaire) : forfait réduit
 * - Rose (non modeste) : EXCLU du mono-geste (accès Ampleur uniquement)
 *
 * Conditions : RGE obligatoire, RP ≥ 15 ans, statut occupant ou bailleur.
 */

import type { CouleurMPR } from './decile'

/**
 * Identifiants des gestes pour MPR mono-geste.
 * Aligné avec PRIX_GESTES de variantes/index.ts.
 */
export type GesteMprMonoId =
  | 'isolation_murs_iti'
  | 'isolation_murs_ite'
  | 'isolation_combles_perdus'
  | 'isolation_toiture'
  | 'isolation_plancher_bas'
  | 'fenetres_pvc_double_vir'
  | 'fenetres_pvc_triple'
  | 'pac_air_eau'
  | 'pac_eau_eau'
  | 'chaudiere_granules_bois'
  | 'cet_thermodynamique'
  | 'vmc_double_flux_recup'
  | 'cesi_solaire_thermique'
  | 'depose_cuve_fioul'

/**
 * Forfait MPR par geste × couleur (€).
 * Source publique France-Rénov 2026 (mise à jour janvier 2026).
 *
 * Format :
 *   - { unit: 'euro_par_m2', tarifs: { bleu, jaune, violet } } : € par m² travaillé
 *   - { unit: 'forfait', tarifs: { bleu, jaune, violet } } : forfait fixe (équipement)
 *
 * Rose (non modeste) : 0 € en mono-geste.
 */
export const MPR_MONO_GESTE: Record<
  GesteMprMonoId,
  | { unit: 'euro_par_m2'; tarifs: Record<'bleu' | 'jaune' | 'violet', number>; plafondHt?: number }
  | { unit: 'forfait'; tarifs: Record<'bleu' | 'jaune' | 'violet', number>; plafondHt?: number }
> = {
  // Isolation
  isolation_murs_iti: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 25, jaune: 20, violet: 15 },
    plafondHt: 100, // €/m² max travaux éligibles
  },
  isolation_murs_ite: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 75, jaune: 60, violet: 40 },
    plafondHt: 150,
  },
  isolation_combles_perdus: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 25, jaune: 20, violet: 15 },
    plafondHt: 35,
  },
  isolation_toiture: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 75, jaune: 60, violet: 40 },
    plafondHt: 180,
  },
  isolation_plancher_bas: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 30, jaune: 25, violet: 20 },
    plafondHt: 60,
  },
  // Menuiseries
  fenetres_pvc_double_vir: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 100, jaune: 80, violet: 40 },
    plafondHt: 1000,
  },
  fenetres_pvc_triple: {
    unit: 'euro_par_m2',
    tarifs: { bleu: 100, jaune: 80, violet: 40 },
    plafondHt: 1200,
  },
  // Chauffage / ECS
  pac_air_eau: {
    unit: 'forfait',
    tarifs: { bleu: 5000, jaune: 4000, violet: 3000 },
  },
  pac_eau_eau: {
    unit: 'forfait',
    tarifs: { bleu: 11000, jaune: 9000, violet: 6000 },
  },
  chaudiere_granules_bois: {
    unit: 'forfait',
    tarifs: { bleu: 8000, jaune: 6500, violet: 4000 },
  },
  cet_thermodynamique: {
    unit: 'forfait',
    tarifs: { bleu: 1200, jaune: 800, violet: 400 },
  },
  cesi_solaire_thermique: {
    unit: 'forfait',
    tarifs: { bleu: 4000, jaune: 3000, violet: 2000 },
  },
  // Ventilation
  vmc_double_flux_recup: {
    unit: 'forfait',
    tarifs: { bleu: 2500, jaune: 2000, violet: 1500 },
  },
  // Bonus dépose cuve fioul (cumulable)
  depose_cuve_fioul: {
    unit: 'forfait',
    tarifs: { bleu: 1200, jaune: 800, violet: 400 },
  },
}

export interface MprGesteInput {
  geste: GesteMprMonoId
  couleur: CouleurMPR
  /** Surface m² (si unit='euro_par_m2'). */
  surface?: number
  /** Coût HT du geste (pour appliquer plafond éligible). */
  coutHtEuros?: number
}

export interface MprGesteResult {
  geste: GesteMprMonoId
  forfaitParUnite: number
  surfaceOuQte: number
  montantBrut: number
  montantPlafonne: number
  /** Raison si écrêté : 'plafond_ht' / 'rose_exclu' / 'forfait_zero' */
  motifPlafonnage?: string
}

/**
 * Calcule le montant MPR pour un geste donné selon la couleur du foyer.
 * Retourne 0 € pour Rose (non-modeste).
 */
export function calcMprGeste(input: MprGesteInput): MprGesteResult {
  const tarif = MPR_MONO_GESTE[input.geste]

  // Rose (non-modeste) → 0 € en mono-geste
  if (input.couleur === 'rose') {
    return {
      geste: input.geste,
      forfaitParUnite: 0,
      surfaceOuQte: input.surface ?? 0,
      montantBrut: 0,
      montantPlafonne: 0,
      motifPlafonnage: 'rose_exclu_mono_geste',
    }
  }

  if (!tarif) {
    return {
      geste: input.geste,
      forfaitParUnite: 0,
      surfaceOuQte: 0,
      montantBrut: 0,
      montantPlafonne: 0,
      motifPlafonnage: 'geste_inconnu',
    }
  }

  const colorKey = input.couleur as 'bleu' | 'jaune' | 'violet'
  const forfaitParUnite = tarif.tarifs[colorKey] ?? 0

  let montantBrut = 0
  let surfaceOuQte = 1
  if (tarif.unit === 'forfait') {
    montantBrut = forfaitParUnite
  } else {
    surfaceOuQte = input.surface ?? 0
    montantBrut = forfaitParUnite * surfaceOuQte
  }

  // Plafonnage : MPR ne dépasse jamais 90% (Bleu) / 75% (Jaune) / 60% (Violet) du coût HT
  // V1 : on plafonne à 100% pour ne pas double-comptabiliser (le cumul global est géré par cumul.ts)
  let montantPlafonne = montantBrut
  let motif: string | undefined

  if (input.coutHtEuros && montantBrut > input.coutHtEuros) {
    montantPlafonne = input.coutHtEuros
    motif = 'plafond_cout_ht'
  }

  return {
    geste: input.geste,
    forfaitParUnite,
    surfaceOuQte,
    montantBrut,
    montantPlafonne,
    motifPlafonnage: motif,
  }
}

/**
 * Calcule MPR sur un ensemble de gestes (sommation simple, sans cumul plafond global).
 */
export function calcMprTotal(
  gestes: MprGesteInput[],
): { detail: MprGesteResult[]; totalEuros: number } {
  const detail = gestes.map(calcMprGeste)
  const totalEuros = detail.reduce((s, g) => s + g.montantPlafonne, 0)
  return { detail, totalEuros }
}
