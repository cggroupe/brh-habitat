/**
 * Prédiction des travaux prioritaires pour un bien F/G en Bretagne.
 *
 * Heuristique simple basée sur les attributs DPE pour proposer 2-4 gestes
 * pertinents avec montants forfaitaires Bretagne 2026 (cohérents avec
 * src/lib/dpe-engine/aides/mpr-detaille.ts).
 *
 * Retourne aussi une estimation des aides MPR + CEE selon décile présumé.
 */

export interface PredictedWork {
  geste: string
  label: string
  priorite: 'haute' | 'moyenne' | 'basse'
  cout_ttc_eur: number
  aides_estimees_eur: number
  reste_charge_eur: number
  raison: string
}

export interface WorksPrediction {
  works: PredictedWork[]
  total_cout_ttc: number
  total_aides: number
  total_reste_charge: number
  /** Saut DPE estimé (G→D, F→C, etc.) */
  saut_dpe_estime: string
}

/** Coûts forfaitaires Bretagne 2026 (sources : Batichiffrage + retours Pro) */
const COUTS = {
  pac_air_eau: { base: 14_000, par_m2: 0 },
  isolation_combles: { base: 1_500, par_m2: 35 },
  isolation_murs_ite: { base: 5_000, par_m2: 150 },
  isolation_planchers_bas: { base: 1_000, par_m2: 40 },
  fenetres_double_vitrage: { base: 0, par_m2: 700 }, // par m² fenêtre
  vmc_double_flux: { base: 6_500, par_m2: 0 },
  chaudiere_gaz_thpe: { base: 5_500, par_m2: 0 },
  poele_a_bois: { base: 4_500, par_m2: 0 },
} as const

/** Aides MPR couleur "Bleu" (revenus modestes) — % du coût TTC plafonné */
const AIDES_PCT_BLEU: Record<string, number> = {
  pac_air_eau: 0.5,
  isolation_combles: 0.6,
  isolation_murs_ite: 0.5,
  isolation_planchers_bas: 0.5,
  fenetres_double_vitrage: 0.4,
  vmc_double_flux: 0.4,
  chaudiere_gaz_thpe: 0.0, // exclue MPR depuis 2024
  poele_a_bois: 0.5,
}

export function predictWorks(p: {
  surface_habitable?: number | null
  etiquette_dpe?: string | null
  energie_chauffage?: string | null
  isolation_murs?: string | null
  isolation_toiture_detail?: string | null
  type_ventilation?: string | null
  annee_construction?: number | null
  type_batiment?: string | null
}): WorksPrediction {
  const surface = p.surface_habitable ?? 100
  const dpe = p.etiquette_dpe ?? 'G'
  const isAncien = (p.annee_construction ?? 1990) < 1975
  const isMaison =
    !!p.type_batiment &&
    (p.type_batiment.toLowerCase().includes('maison') ||
      p.type_batiment.toLowerCase().includes('individuel'))
  const energieFossile =
    !!p.energie_chauffage &&
    (p.energie_chauffage.toLowerCase().includes('fioul') ||
      p.energie_chauffage.toLowerCase().includes('gaz') ||
      p.energie_chauffage.toLowerCase().includes('charbon'))
  const isolationMursFaible =
    !p.isolation_murs ||
    p.isolation_murs.toLowerCase().includes('non isol') ||
    p.isolation_murs.toLowerCase() === 'inconnu'

  const works: PredictedWork[] = []

  // 1) PAC air/eau si chauffage fossile (gros poste)
  if (energieFossile) {
    const cout = COUTS.pac_air_eau.base
    works.push({
      geste: 'pac_air_eau',
      label: 'Pompe à chaleur air/eau',
      priorite: 'haute',
      cout_ttc_eur: cout,
      aides_estimees_eur: Math.round(cout * AIDES_PCT_BLEU.pac_air_eau),
      reste_charge_eur: Math.round(cout * (1 - AIDES_PCT_BLEU.pac_air_eau)),
      raison: `Remplacement chauffage ${p.energie_chauffage ?? 'fossile'} — gain ~50 % conso`,
    })
  }

  // 2) Isolation combles si toiture mal isolée (presque toujours sur F/G)
  if (
    !p.isolation_toiture_detail ||
    p.isolation_toiture_detail.toLowerCase().includes('non isol') ||
    isAncien
  ) {
    const m2 = surface * 0.7 // surface combles approximée
    const cout = COUTS.isolation_combles.base + m2 * COUTS.isolation_combles.par_m2
    works.push({
      geste: 'isolation_combles',
      label: 'Isolation des combles',
      priorite: 'haute',
      cout_ttc_eur: Math.round(cout),
      aides_estimees_eur: Math.round(cout * AIDES_PCT_BLEU.isolation_combles),
      reste_charge_eur: Math.round(cout * (1 - AIDES_PCT_BLEU.isolation_combles)),
      raison: 'Plus gros poste de déperdition (~30 %)',
    })
  }

  // 3) ITE si maison + murs mal isolés
  if (isMaison && isolationMursFaible) {
    const m2 = surface * 1.2 // surface murs externes approximée
    const cout = COUTS.isolation_murs_ite.base + m2 * COUTS.isolation_murs_ite.par_m2
    works.push({
      geste: 'isolation_murs_ite',
      label: 'Isolation thermique extérieure (ITE)',
      priorite: 'moyenne',
      cout_ttc_eur: Math.round(cout),
      aides_estimees_eur: Math.round(cout * AIDES_PCT_BLEU.isolation_murs_ite),
      reste_charge_eur: Math.round(cout * (1 - AIDES_PCT_BLEU.isolation_murs_ite)),
      raison: 'Murs non isolés — 25 % des déperditions',
    })
  }

  // 4) VMC double flux si pas déjà
  if (!p.type_ventilation || p.type_ventilation.toLowerCase().includes('aucun')) {
    works.push({
      geste: 'vmc_double_flux',
      label: 'VMC double flux',
      priorite: 'basse',
      cout_ttc_eur: COUTS.vmc_double_flux.base,
      aides_estimees_eur: Math.round(
        COUTS.vmc_double_flux.base * AIDES_PCT_BLEU.vmc_double_flux,
      ),
      reste_charge_eur: Math.round(
        COUTS.vmc_double_flux.base * (1 - AIDES_PCT_BLEU.vmc_double_flux),
      ),
      raison: 'Indispensable après isolation (étanchéité air)',
    })
  }

  const total_cout_ttc = works.reduce((s, w) => s + w.cout_ttc_eur, 0)
  const total_aides = works.reduce((s, w) => s + w.aides_estimees_eur, 0)
  const total_reste_charge = total_cout_ttc - total_aides

  // Saut DPE estimé (heuristique simple)
  const sauts: Record<string, string> = { G: 'D', F: 'C', E: 'B' }
  const saut_dpe_estime = sauts[dpe] ?? 'C'

  return {
    works,
    total_cout_ttc,
    total_aides,
    total_reste_charge,
    saut_dpe_estime,
  }
}

export function formatEur(n: number): string {
  return n.toLocaleString('fr-FR') + ' €'
}
