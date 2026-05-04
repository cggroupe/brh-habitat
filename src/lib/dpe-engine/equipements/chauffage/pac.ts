/**
 * Pompes à chaleur — SCOP / COP.
 *
 * Source : CapRénov+ `fra/CalcChauffage.as` + `tv.db.scop_ch` (3 192 lignes).
 * Wiki : caprenov-reverse/wiki/03-moteur-equipements/pompes-chaleur.md
 *
 * Pour les PAC, le "rendement" effectif est SCOP (Coefficient de Performance
 * Saisonnier) ou COP. Cela remplace Rg dans la chaîne ich.
 *
 * V1 : tables hardcodées par type × zone × année.
 * Phase 3+ : lookup Supabase brh_dpe_scop_ch (3192 rows) pour précision.
 */

import type { ChauffageInput, GenerateurChauffage, ZoneClimatique } from '../../types'

/**
 * SCOP par défaut selon type PAC × année installation.
 *
 * Sources moyennes :
 * - PAC air/air avant 2008 : COP 2.2
 * - PAC air/air 2008-2014  : SCOP 3.0
 * - PAC air/air après 2014 : SCOP 3.5
 * - PAC air/eau avant 2008 : COP 2.5
 * - PAC air/eau 2008-2014  : SCOP 3.0
 * - PAC air/eau après 2014 : SCOP 3.5
 * - PAC eau/eau (géothermie) : SCOP 4.0
 */
const SCOP_DEFAULTS: Record<string, Record<string, number>> = {
  pac_air_air: {
    avant_2008: 2.2,
    '2008-2014': 3.0,
    apres_2014: 3.5,
  },
  pac_air_eau: {
    avant_2008: 2.5,
    '2008-2014': 3.0,
    apres_2014: 3.5,
  },
  pac_eau_eau: {
    avant_2008: 3.0,
    '2008-2014': 3.5,
    apres_2014: 4.0,
  },
}

/**
 * Bonus SCOP zone climatique :
 *  - H1 (froid) : -0.2 (PAC air moins efficace)
 *  - H2 (tempéré) : +0
 *  - H3 (méditerranéen) : +0.3 (PAC air très efficace)
 */
function bonusZoneSCOP(zone: ZoneClimatique, type: GenerateurChauffage): number {
  // Pour PAC eau/eau (géothermique) : pas d'impact zone (terre stable)
  if (type === 'pac_eau_eau') return 0
  if (zone.startsWith('H1')) return -0.2
  if (zone.startsWith('H3')) return 0.3
  return 0
}

/**
 * Bonus SCOP émetteur basse température (plancher chauffant).
 * Le PAC sur PCBT est plus efficace que sur radiateurs HT.
 */
function bonusEmetteur(emetteur?: string): number {
  if (emetteur === 'plancher_chauffant' || emetteur === 'mural_chauffant') return 0.4
  return 0
}

function trancheAnnee(annee: number): string {
  if (annee < 2008) return 'avant_2008'
  if (annee < 2014) return '2008-2014'
  return 'apres_2014'
}

export interface PacInputs {
  type: GenerateurChauffage // pac_air_air | pac_air_eau | pac_eau_eau
  emetteur?: string
  zone: ZoneClimatique
  anneeInstallation?: number
  scopRenseigne?: number // SCOP fourni par l'utilisateur (override)
}

/**
 * Calcule SCOP (chauffage) pour une PAC.
 * Si l'utilisateur a renseigné un SCOP, on l'utilise tel quel.
 * Sinon : table par défaut + bonus zone + bonus émetteur.
 */
export function calcSCOP(opts: PacInputs): number {
  if (opts.scopRenseigne && opts.scopRenseigne > 0) {
    return opts.scopRenseigne
  }

  const annee = opts.anneeInstallation ?? 2010
  const tranche = trancheAnnee(annee)
  const baseTable = SCOP_DEFAULTS[opts.type]
  if (!baseTable) return 2.5 // défaut conservateur

  const base = baseTable[tranche] ?? 3.0
  const scop = base + bonusZoneSCOP(opts.zone, opts.type) + bonusEmetteur(opts.emetteur)

  // Plafond minimum : SCOP ≥ 1 (sinon problème)
  return Math.max(1.5, scop)
}

/**
 * Détermine si un générateur de chauffage est une PAC.
 */
export function isPAC(generateur: GenerateurChauffage): boolean {
  return (
    generateur === 'pac_air_air' ||
    generateur === 'pac_air_eau' ||
    generateur === 'pac_eau_eau'
  )
}

/**
 * Wrapper depuis ChauffageInput : retourne SCOP si PAC, sinon 0 (pas applicable).
 */
export function calcSCOPFromInput(
  chauffage: ChauffageInput,
  zone: ZoneClimatique,
): number {
  if (!isPAC(chauffage.generateur)) return 0
  return calcSCOP({
    type: chauffage.generateur,
    emetteur: chauffage.emetteur,
    zone,
    anneeInstallation: chauffage.anneeInstallation,
    scopRenseigne: chauffage.scopRenseigne,
  })
}
