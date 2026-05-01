/**
 * Rendements de la chaîne chauffage : Re × Rd × Rr × Rg.
 *
 * Source : CapRénov+ `fra/CalcChauffage.as` + tables `tv.db.rendement_*`.
 * Wikis :
 *   - rendement-emission-re.md
 *   - rendement-distribution-rd.md
 *   - rendement-regulation-rr.md
 *   - rendement-generation-rg.md
 *   - pertes-generateur.md
 *
 * V1 simplifié : tables hardcodées par typeGenerateur × emetteur.
 * Phase 3+ : lookups Supabase brh_dpe_rendement_* pour précision millimétrique.
 */

import type { ChauffageInput, GenerateurChauffage } from '../../types'

/**
 * Re — Rendement d'émission (selon type d'émetteur).
 *
 * Source : CapRénov+ tv.db.rendement_emission (50 lignes).
 * V1 : valeurs moyennes typiques.
 */
export function calcRe(emetteur?: string): number {
  if (!emetteur) return 0.95 // défaut
  const e = emetteur.toLowerCase()
  if (e.includes('plancher_chauffant')) return 0.99
  if (e.includes('mural_chauffant')) return 0.97
  if (e.includes('radiateur')) return 0.95
  if (e.includes('convecteur')) return 0.93
  if (e.includes('panneau_rayonnant')) return 0.94
  if (e.includes('air_souffle') || e.includes('split')) return 0.92
  return 0.95
}

/**
 * Rd — Rendement de distribution.
 *
 * Source : CapRénov+ tv.db.rendement_distribution_ch (90 lignes).
 * V1 : selon type de réseau (chauffage central vs chauffage divisé).
 */
export function calcRd(generateur: GenerateurChauffage, emetteur?: string): number {
  // Chauffage divisé (effet Joule individuel) : Rd = 1 (pas de distribution)
  if (
    generateur === 'effet_joule_direct' ||
    generateur === 'inertie_electrique' ||
    emetteur === 'convecteur_electrique' ||
    emetteur === 'panneau_rayonnant' ||
    emetteur === 'split_air_air'
  ) {
    return 1.0
  }
  // Plancher chauffant eau : Rd élevé (réseau enterré bien isolé typiquement)
  if (emetteur === 'plancher_chauffant') return 0.95
  // Réseau eau classique radiateur : Rd ~ 0.90
  if (emetteur === 'radiateur_eau') return 0.9
  // Air soufflé centralisé : pertes plus élevées
  if (emetteur === 'air_souffle') return 0.85
  return 0.9
}

/**
 * Rr — Rendement de régulation.
 *
 * Source : CapRénov+ tv.db.rendement_regulation (50 lignes).
 * V1 : selon présence régulation pièce par pièce.
 */
export function calcRr(regulationPiece: boolean): number {
  return regulationPiece ? 1.0 : 0.95
}

/**
 * Rg — Rendement de génération (chaudière, PAC, etc.).
 *
 * Pour les PAC : Rg = SCOP/COP (gérés ailleurs dans pac.ts, on retourne 1 ici).
 * Pour les chaudières : selon type + année.
 *
 * Source : CapRénov+ tv.db.rendement_generation + chaudière condensation
 * formule `Rg_PCS = Pmfou / (Pmcons + 0.45·Qp0_PCS + Pveil_PCS)`.
 *
 * V1 : tables simplifiées par type + année.
 */
export function calcRg(generateur: GenerateurChauffage, anneeInstallation?: number): number {
  const annee = anneeInstallation ?? 2000

  // Effet Joule : Rg = 1 (l'électricité devient directement chaleur)
  if (generateur === 'effet_joule_direct' || generateur === 'inertie_electrique') {
    return 1.0
  }

  // PAC : retourné séparément via pac.ts. Ici on met 1 pour ne pas double-compter.
  if (
    generateur === 'pac_air_air' ||
    generateur === 'pac_air_eau' ||
    generateur === 'pac_eau_eau'
  ) {
    return 1.0
  }

  // Chaudière gaz
  if (generateur === 'chaudiere_gaz_standard') return annee < 2000 ? 0.7 : 0.78
  if (generateur === 'chaudiere_gaz_basse_temp') return 0.85
  if (generateur === 'chaudiere_gaz_condensation') return annee < 2010 ? 0.95 : 1.05 // PCS

  // Chaudière fioul
  if (generateur === 'chaudiere_fioul') {
    if (annee < 1980) return 0.65
    if (annee < 2000) return 0.72
    return 0.78
  }
  if (generateur === 'chaudiere_fioul_condensation') return 0.95

  // Chaudière bois
  if (generateur === 'chaudiere_bois_buche') {
    if (annee < 1990) return 0.55 // chaudière ancienne
    return 0.7 // chaudière récente
  }
  if (generateur === 'chaudiere_granules_bois') return 0.85 // chaudière granulés moderne

  // Réseau de chaleur : rendement = 1 (les pertes sont côté réseau)
  if (generateur === 'reseau_chaleur') return 1.0

  return 0.8 // défaut
}

/**
 * ich (rendement chaîne complet) = Re × Rd × Rr × Rg.
 * Pour le chauffage, conso = Bch / ich.
 */
export function calcIch(chauffage: ChauffageInput): number {
  const re = calcRe(chauffage.emetteur)
  const rd = calcRd(chauffage.generateur, chauffage.emetteur)
  const rr = calcRr(chauffage.regulation ?? false)
  const rg = calcRg(chauffage.generateur, chauffage.anneeInstallation)
  return re * rd * rr * rg
}
