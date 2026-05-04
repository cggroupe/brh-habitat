/**
 * Fixtures Phase 11.1 — prospects Bretagne pour tests score-v2.
 */

import type { ScoreV2Input } from '../score-v2'
import type { BrhExtIrisRow, BrhExtCommuneRow } from '../types'

export const irisRennesBleu: BrhExtIrisRow = {
  iris_code: '352380101',
  commune_insee: '35238',
  med21: 11_500,
  d121: 6_200,
  d921: 22_000,
  decile_estime: 1,
  couleur_mpr: 'bleu',
  tx_proprio: 0.45,
  tx_avant_1975: 0.55,
  thermosens_kwh_dj: 9_500,
  conso_resid_kwh_an: 8_200_000,
  conso_gaz_mwh_an: 4_100,
  pdl_gaz_resid: 230,
  fetched_at: '2026-05-07T10:00:00Z',
}

export const irisCessonRose: BrhExtIrisRow = {
  iris_code: '350550101',
  commune_insee: '35055',
  med21: 52_000,
  d121: 22_000,
  d921: 95_000,
  decile_estime: 9,
  couleur_mpr: 'rose',
  tx_proprio: 0.82,
  tx_avant_1975: 0.18,
  thermosens_kwh_dj: 5_400,
  conso_resid_kwh_an: 4_500_000,
  conso_gaz_mwh_an: 2_800,
  pdl_gaz_resid: 180,
  fetched_at: '2026-05-07T10:00:00Z',
}

export const irisRuralVioletAncien: BrhExtIrisRow = {
  iris_code: '290220000',
  commune_insee: '29022',
  med21: 27_500,
  d121: 14_000,
  d921: 48_000,
  decile_estime: 6,
  couleur_mpr: 'violet',
  tx_proprio: 0.78,
  tx_avant_1975: 0.71,
  thermosens_kwh_dj: 6_200,
  conso_resid_kwh_an: 1_200_000,
  conso_gaz_mwh_an: 0,
  pdl_gaz_resid: 0,
  fetched_at: '2026-05-07T10:00:00Z',
}

export const communeBrest: BrhExtCommuneRow = {
  insee: '29019',
  radon_categorie: 3,
  rga_alea: 'faible',
  ppri_present: false,
  sismique_zone: 2,
  opah_active: true,
  opah_type: 'OPAH-RU',
  opah_operateur: 'Citémétrie',
  opah_fin_validite: '2027-12-31',
  tx_vacance_struct: 0.082,
  nb_rge_isolation: 12,
  nb_rge_pac: 8,
  nb_dp_logements_existants_12m: 145,
  station_dju_id: 'BREST-GUIPAVAS',
  dju_18_normal: 2380,
  delta_dju_2050: -180,
  fetched_at: '2026-05-07T10:00:00Z',
}

export const communeRural22: BrhExtCommuneRow = {
  insee: '22155',
  radon_categorie: 1,
  rga_alea: 'fort',
  ppri_present: false,
  sismique_zone: 2,
  opah_active: false,
  opah_type: null,
  opah_operateur: null,
  opah_fin_validite: null,
  tx_vacance_struct: 0.105,
  nb_rge_isolation: 2,
  nb_rge_pac: 1,
  nb_dp_logements_existants_12m: 18,
  station_dju_id: 'SAINT-BRIEUC',
  dju_18_normal: 2510,
  delta_dju_2050: -150,
  fetched_at: '2026-05-07T10:00:00Z',
}

export const prospectUltraChaud: ScoreV2Input = {
  prospect: { id: 'p-001', etiquette_dpe: 'F', has_pv_36kw: false },
  iris: irisRennesBleu,
  commune: communeBrest,
  risques: { rga_local: 'fort', inondation_zone: null, cavites_proches: 0, abf_zone: false, abf_type: null },
  dvf: { mutation_24m: true, prix_m2_growth_3y: 0.18 },
  enedisAddr: { kwh_par_logt: 320 },
}

export const prospectStandard: ScoreV2Input = {
  prospect: { id: 'p-002', etiquette_dpe: 'D', has_pv_36kw: false },
  iris: irisCessonRose,
  commune: communeBrest,
  risques: null,
  dvf: null,
  enedisAddr: null,
}

export const prospectPrecariteMax: ScoreV2Input = {
  prospect: { id: 'p-003', etiquette_dpe: 'G', has_pv_36kw: false },
  iris: irisRennesBleu,
  commune: communeRural22,
  risques: { rga_local: 'fort', inondation_zone: null, cavites_proches: 0, abf_zone: false, abf_type: null },
  dvf: null,
  enedisAddr: { kwh_par_logt: 290 },
}

export const prospectPvExistant: ScoreV2Input = {
  prospect: { id: 'p-004', etiquette_dpe: 'F', has_pv_36kw: true },
  iris: irisRuralVioletAncien,
  commune: communeRural22,
  risques: null,
  dvf: null,
  enedisAddr: null,
}

export const prospectColdRose: ScoreV2Input = {
  prospect: { id: 'p-005', etiquette_dpe: 'C', has_pv_36kw: false },
  iris: irisCessonRose,
  commune: communeBrest,
  risques: null,
  dvf: null,
  enedisAddr: null,
}
