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
 * - Commune enrichie 24/05 (OPAH, TLV, LOVAC, ABF, catnat, BASIAS, SRU, audits…)
 * - BDNB (25/05 Phase 3 : typologie bâti via ban_id — vitrage, matériaux, surface)
 *
 * Sortie : score 0-100 + breakdown détaillé + segment actionnable.
 *
 * Aligné avec la fonction SQL `brh_recalc_score_v2_full(dept)` (migration
 * 20260525140000) — 25 règles totales.
 */

import type {
  ProspectScoreInput,
  BrhExtIrisRow,
  BrhExtCommuneRow,
  BdnbSignal,
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
  /** Phase 3 (25/05) — signal BDNB optionnel (null si pas matched via ban_id). */
  bdnb?: BdnbSignal | null
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
 * 25 règles totales (aligné SQL brh_recalc_score_v2_full) :
 *   - 9 règles core (#1-#9) + 1 bonus précarité — Phase 11.1
 *   - 10 règles commune Phase C1+C4 (OPAH, TLV, LOVAC, ABF, catnat, etc.) — 24/05
 *   - 3 règles BDNB typologie bâti (vitrage, pierre, surface) — 25/05 Phase 3
 *
 * Toutes additives sauf : pv_existing (-10), abf_lourd (-5), catnat_lourd (-3),
 * basias_lourd (-3). Clampé à [0, 100].
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

  // Règle #7 — Faible concurrence locale (1 ≤ RGE isolation < 5 commune)
  // Note : 0 RGE traité comme "donnée non enrichie" (l'API ADEME RGE peut échouer
  // silencieusement). Le seuil minimum 1 évite les faux positifs.
  const nbRgeIso = input.commune?.nb_rge_isolation
  if (nbRgeIso !== null && nbRgeIso !== undefined && nbRgeIso >= 1 && nbRgeIso < 5) {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Alignement SQL Phase 3 (25/05) — 10 règles transposées depuis migration
  // 20260524140000_recalc_score_v2_after_iris_and_commune44.sql (22 → 25 règles)
  // ═══════════════════════════════════════════════════════════════════════════

  // r_fg — Étiquette DPE F/G (independent additif au mut_fg)
  if (fg) {
    total += 10
    rules.push({
      rule: 'fg',
      points: 10,
      trigger: `Étiquette DPE ${input.prospect.etiquette_dpe} (passoire thermique)`,
    })
  }

  // r_opah — Commune en OPAH active (aides cumulables MPR)
  if (input.commune?.opah_active) {
    total += 8
    rules.push({
      rule: 'opah',
      points: 8,
      trigger: `OPAH active${input.commune.opah_type ? ` (${input.commune.opah_type})` : ''}`,
    })
  }

  // r_sitadel — Activité travaux logements existants 12m (commune dynamique)
  if ((input.commune?.nb_dp_logements_existants_12m ?? 0) > 50) {
    total += 5
    rules.push({
      rule: 'sitadel_active',
      points: 5,
      trigger: `${input.commune!.nb_dp_logements_existants_12m} DP logements existants 12m`,
    })
  }

  // r_vacance — Vacance structurelle IRIS > 10% (signal renouvellement parc)
  if ((input.iris?.tx_vacance_log ?? 0) > 0.10) {
    total += 5
    rules.push({
      rule: 'vacance',
      points: 5,
      trigger: `Tx vacance IRIS ${Math.round((input.iris!.tx_vacance_log ?? 0) * 100)}% > 10%`,
    })
  }

  // r_dju_eleve — DJU élevés (commune froide)
  if ((input.commune?.dju_18_normal ?? 0) > 2700) {
    total += 5
    rules.push({
      rule: 'dju_eleve',
      points: 5,
      trigger: `DJU ${input.commune!.dju_18_normal} > 2700 (commune froide)`,
    })
  }

  // r_tlv_tendue — Taxe Logement Vacant zone tendue (décret 22/12/2025)
  if (input.commune?.tlv_tendue) {
    total += 8
    rules.push({
      rule: 'tlv_tendue',
      points: 8,
      trigger: 'Commune classée TLV zone tendue',
    })
  }

  // r_lovac — Vacance longue durée LOVAC > 5%
  if ((input.commune?.lovac_tx_vacance_long ?? 0) > 0.05) {
    total += 5
    rules.push({
      rule: 'lovac',
      points: 5,
      trigger: `LOVAC vacance longue ${Math.round((input.commune!.lovac_tx_vacance_long ?? 0) * 100)}% > 5%`,
    })
  }

  // r_audits_dyna — Commune dynamique audits ADEME > 100
  if ((input.commune?.audits_ademe_count ?? 0) > 100) {
    total += 5
    rules.push({
      rule: 'audits_dynamiques',
      points: 5,
      trigger: `${input.commune!.audits_ademe_count} audits ADEME ingérés`,
    })
  }

  // r_abf_lourd — Contraintes ABF lourdes (>=5 MH ou ABF AC1 actif)
  if (
    (input.commune?.merimee_count ?? 0) >= 5 ||
    (input.commune?.abf_ac1_count ?? 0) > 0
  ) {
    total -= 5
    rules.push({
      rule: 'abf_lourd',
      points: -5,
      trigger: `Contraintes ABF (${input.commune?.merimee_count ?? 0} MH, ${input.commune?.abf_ac1_count ?? 0} AC1)`,
    })
  }

  // r_pop_growth — Croissance population 16-22 > 5% (commune attractive)
  if ((input.commune?.evolution_pop_16_22 ?? 0) > 0.05) {
    total += 5
    rules.push({
      rule: 'pop_growth',
      points: 5,
      trigger: `Pop +${Math.round((input.commune!.evolution_pop_16_22 ?? 0) * 100)}% 2016-2022`,
    })
  }

  // r_catnat_lourd — Arrêtés catastrophes nat répétés (réticence assurance)
  if (
    (input.commune?.catnat_total ?? 0) >= 5 ||
    (input.commune?.catnat_inondation ?? 0) >= 3
  ) {
    total -= 3
    rules.push({
      rule: 'catnat_lourd',
      points: -3,
      trigger: `Catnat ${input.commune?.catnat_total ?? 0} dont ${input.commune?.catnat_inondation ?? 0} inondations`,
    })
  }

  // r_basias_lourd — Sites pollués BASIAS > 50 (réticence acheteur)
  if ((input.commune?.basias_count ?? 0) > 50) {
    total -= 3
    rules.push({
      rule: 'basias_lourd',
      points: -3,
      trigger: `${input.commune!.basias_count} sites BASIAS`,
    })
  }

  // r_sru_carencee — Commune SRU carencée (logements sociaux insuffisants)
  if (input.commune?.sru_carencee) {
    total += 5
    rules.push({
      rule: 'sru_carencee',
      points: 5,
      trigger: 'Commune carencée SRU (déficit LLS)',
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3 BDNB (25/05) — 3 règles typologie bâti via brh_ext_bdnb_batiments
  // ═══════════════════════════════════════════════════════════════════════════

  // r_vitrage_simple — Vitrage simple sur bâti ancien (entrée fenêtres prio)
  if (
    input.bdnb?.type_vitrage === 'simple vitrage' &&
    (input.bdnb?.annee_construction ?? 9999) < 1990
  ) {
    total += 5
    rules.push({
      rule: 'vitrage_simple',
      points: 5,
      trigger: `BDNB vitrage simple + construit ${input.bdnb!.annee_construction} (< 1990)`,
    })
  }

  // r_pierre_ancienne — Mur pierre + bâtiment d'avant 1900 (rénovation lourde)
  if (
    input.bdnb?.mat_mur_txt?.toUpperCase().includes('PIERRE') &&
    (input.bdnb?.annee_construction ?? 9999) < 1900
  ) {
    total += 3
    rules.push({
      rule: 'pierre_ancienne',
      points: 3,
      trigger: `BDNB ${input.bdnb!.mat_mur_txt} + construit ${input.bdnb!.annee_construction} (< 1900)`,
    })
  }

  // r_grand_logement — Surface >= 150 m² + DPE E/F/G (gros volume de travaux)
  const fge = fg || input.prospect.etiquette_dpe === 'E'
  if ((input.bdnb?.surface_habitable_logement ?? 0) >= 150 && fge) {
    total += 3
    rules.push({
      rule: 'grand_logement',
      points: 3,
      trigger: `BDNB ${input.bdnb!.surface_habitable_logement} m² + DPE ${input.prospect.etiquette_dpe}`,
    })
  }

  total = clampScore(total)
  const segment = deriveSegment(total, input.iris?.couleur_mpr ?? null)

  return { total, rules, segment }
}
