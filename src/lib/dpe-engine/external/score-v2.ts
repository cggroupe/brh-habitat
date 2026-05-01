/**
 * Score composite v2 — règle pivot Phase 11.1.
 *
 * Référence : docs/wiki/external-data-sources.md § score-v2.
 *
 * Orchestre les signaux de tous les modules `external/*` :
 * - Filosofi (décile MPR auto)
 * - Enedis (sur-conso adresse / IRIS thermosensibilité)
 * - Géorisques (RGA, radon, ABF)
 * - DVF (mutation 24m)
 * - Recensement (tx propriétaires / avant 1975)
 * - Annuaire RGE (concurrence locale)
 *
 * Sortie : score 0-100 + breakdown détaillé + segment actionnable.
 */

import type {
  ProspectScoreInput,
  BrhExtIrisRow,
  BrhExtCommuneRow,
  RisquesAdresse,
  DvfSignal,
  EnedisAddrSignal,
  ScoreBreakdown,
  ScoreRule,
  ScoreV2Segment,
} from './types'

export interface ScoreV2Input {
  prospect: ProspectScoreInput
  iris: BrhExtIrisRow | null
  commune: BrhExtCommuneRow | null
  risques: RisquesAdresse | null
  dvf: DvfSignal | null
  enedisAddr: EnedisAddrSignal | null
}

/**
 * Borne le total entre 0 et 100.
 */
function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n))
}

/**
 * Détermine le segment actionnable depuis (total, couleur MPR).
 */
function deriveSegment(total: number, couleur: BrhExtIrisRow['couleur_mpr']): ScoreV2Segment {
  if (total >= 80) return 'ultra_chaud'
  if (couleur === 'bleu' && total >= 50) return 'mpr_bleu_prio'
  if (couleur === 'rose' && total >= 60) return 'premium'
  if (total >= 40) return 'standard'
  return 'cold'
}

/**
 * Calcul du score composite v2 (0-100).
 *
 * 9 règles + 1 bonus précarité (cf. wiki § score-v2).
 * Toutes les règles sont additives ; règle #9 (PV existant) est négative.
 */
export function computeScoreV2(input: ScoreV2Input): ScoreBreakdown {
  const rules: ScoreRule[] = []
  let total = 0
  const fg = input.prospect.etiquette_dpe === 'F' || input.prospect.etiquette_dpe === 'G'

  // Règle #1 — DVF mutation 24m + F/G (signal achat fort)
  if (input.dvf?.mutation_24m && fg) {
    total += 35
    rules.push({
      rule: 'mutation_24m_FG',
      points: 35,
      trigger: 'DVF mutation < 24m + DPE F/G',
    })
  }

  // Règle #2 — Décile MPR auto (Filosofi)
  if (input.iris?.couleur_mpr === 'bleu') {
    total += 20
    rules.push({
      rule: 'mpr_bleu',
      points: 20,
      trigger: `IRIS ${input.iris.iris_code} couleur Bleu (D1-D3)`,
    })
  } else if (input.iris?.couleur_mpr === 'jaune') {
    total += 15
    rules.push({
      rule: 'mpr_jaune',
      points: 15,
      trigger: `IRIS ${input.iris.iris_code} couleur Jaune (D4-D5)`,
    })
  }

  // Règle #3 — Sur-conso Enedis adresse (>250 kWh/logt/an = passoire confirmée)
  if (input.enedisAddr?.kwh_par_logt && input.enedisAddr.kwh_par_logt > 250) {
    total += 15
    rules.push({
      rule: 'enedis_overuse',
      points: 15,
      trigger: `Enedis ${input.enedisAddr.kwh_par_logt} kWh/logt > 250`,
    })
  }

  // Règle #4 — IRIS propriétaires occupants ancien
  if ((input.iris?.tx_proprio ?? 0) > 0.7 && (input.iris?.tx_avant_1975 ?? 0) > 0.6) {
    total += 10
    rules.push({
      rule: 'iris_proprio_ancien',
      points: 10,
      trigger: `IRIS tx_proprio>70% & avant_1975>60%`,
    })
  }

  // Règle #5 — Géorisques RGA fort = entrée ITE (fissures fréquentes)
  if (input.risques?.rga_local === 'fort') {
    total += 10
    rules.push({
      rule: 'rga_fort',
      points: 10,
      trigger: 'Géorisques RGA fort (argileux retrait-gonflement)',
    })
  }

  // Règle #6 — Radon zone 3 = upsell VMC double-flux
  if (input.commune?.radon_categorie === 3) {
    total += 10
    rules.push({
      rule: 'radon_z3',
      points: 10,
      trigger: 'Radon catégorie 3 (commune)',
    })
  }

  // Règle #7 — Faible concurrence locale (<5 RGE isolation commune)
  const nbRgeIso = input.commune?.nb_rge_isolation
  if (nbRgeIso !== null && nbRgeIso !== undefined && nbRgeIso < 5) {
    total += 5
    rules.push({
      rule: 'low_concurrence',
      points: 5,
      trigger: `${nbRgeIso} RGE isolation < 5`,
    })
  }

  // Règle #8 — Gentrification commune (+15% prix m² 3y)
  if ((input.dvf?.prix_m2_growth_3y ?? 0) > 0.15) {
    total += 7
    rules.push({
      rule: 'gentrif',
      points: 7,
      trigger: `Prix m² +${Math.round((input.dvf!.prix_m2_growth_3y ?? 0) * 100)}% sur 3 ans`,
    })
  }

  // Règle #9 — Exclusion PV existant ≥36kW (déjà optimisé énergétiquement)
  if (input.prospect.has_pv_36kw) {
    total -= 10
    rules.push({
      rule: 'pv_existing',
      points: -10,
      trigger: 'PV ≥36kW déjà installé',
    })
  }

  // Bonus précarité — Décile 1 + thermosensibilité élevée IRIS
  // Cible MPR Bleu prioritaire ANAH (chauffage électrique passoire)
  if (
    input.iris?.decile_estime === 1 &&
    (input.iris?.thermosens_kwh_dj ?? 0) > 8000
  ) {
    total += 15
    rules.push({
      rule: 'precarite_max',
      points: 15,
      trigger: 'Décile 1 + thermosens IRIS > 8000 kWh/DJ → MPR Bleu prio',
    })
  }

  total = clampScore(total)
  const segment = deriveSegment(total, input.iris?.couleur_mpr ?? null)

  return { total, rules, segment }
}
