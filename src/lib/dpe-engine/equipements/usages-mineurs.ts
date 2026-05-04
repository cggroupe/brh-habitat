/**
 * Usages mineurs — éclairage, auxiliaires, climatisation, photovoltaïque.
 *
 * V1 simplifié — formules forfaitaires conventionnelles.
 * Phase 3+ : tables détaillées (DataEclairage, DataPhotovoltaique, etc.).
 */

import type { AuditInputs } from '../types'
import { COEF_EP, CO2_KG_PER_KWH } from '../constants'
import { getNrefRa, getERa } from './climat'
import { getZoneClimatique } from '../geo/zones-climatiques'

/**
 * Cecl — Consommation éclairage (kWh EP/an).
 *
 * Source : CapRénov+ `fra/CalcEclairage.as` (formule : C × Pecl × Nh / 1000).
 * V1 simplifié : forfait 1.4 kWh EP/m²/an conformément aux conventions DPE 2021.
 */
export function calcEclairageKwhEpAn(inputs: AuditInputs): number {
  return 1.4 * inputs.bati.surfaceHabitable
}

/**
 * Caux — Consommation auxiliaires (pompes, ventilateurs, etc.).
 *
 * V1 forfaitaire selon présence VMC + chauffage central.
 */
export function calcAuxiliairesKwhEpAn(inputs: AuditInputs): number {
  let total = 0
  // Auxiliaires VMC (~30 kWh/an pour SF, ~80 pour double flux)
  const v = inputs.equipements.ventilation
  if (v === 'naturelle') total += 0
  else if (v.includes('double_flux')) total += 80
  else total += 30

  // Pompes circulateur chauffage central (~50-150 kWh/an selon surface)
  const cg = inputs.equipements.chauffage.generateur
  if (
    cg.includes('chaudiere') ||
    cg === 'pac_air_eau' ||
    cg === 'pac_eau_eau' ||
    cg === 'reseau_chaleur'
  ) {
    total += 50 + inputs.bati.surfaceHabitable * 0.5
  }

  // Conversion EF → EP (auxiliaires sont électriques)
  return total * COEF_EP.electricite
}

/**
 * Cclim — Consommation climatisation (kWh EP/an).
 *
 * Source : CapRénov+ `fra/CalcClimatisation.as` (craEF = 0.9 × bra/EER × poids).
 * V1 simplifié : forfait selon surface clim + zone climatique.
 */
export function calcClimatisationKwhEpAn(inputs: AuditInputs): number {
  const clim = inputs.equipements.climatisation
  if (!clim) return 0

  const surface = clim.surfaceClim ?? 0
  const seer = clim.seer ?? 4.5 // SEER moyen split moderne
  if (surface <= 0) return 0

  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const altitude = inputs.geo.altitude ?? 0
  const inertie = String(inputs.bati.inertie)

  // Approche simplifiée : besoins de froid annuels = surfaceClim × kWh/m²/an
  // qui dépend du DH refroidissement + ensoleillement annuel
  const dhRaAnnuel = (() => {
    let total = 0
    for (let m = 1; m <= 12; m++) {
      total += getNrefRa({ inertie, altitude, zone, mois: m }) +
        getERa({ inertie, altitude, zone, mois: m })
    }
    return total
  })()

  // Forfait : kWh EF / m² / an = dh / 1000 × ratio inertie
  // V1 conservateur : 5-15 kWh EF/m²/an selon zone (H1 << H3)
  const kwhParM2 = zone.startsWith('H3') ? 15 : zone.startsWith('H2') ? 8 : 5
  const cclimEf = (surface * kwhParM2) / Math.max(seer / 4.5, 0.5)
  void dhRaAnnuel // pour future utilisation Phase 3+

  return cclimEf * COEF_EP.electricite
}

/**
 * Cpv — Production photovoltaïque (kWh/an).
 *
 * Source : CapRénov+ `fra/CalcPhotovoltaique.as`
 * (P_pv = k × surf × E_pv × 0.17 × 0.86 / Sh + autoconso).
 *
 * V1 simplifié : 1100 kWh/an/kWc en France (moyenne) × puissance.
 * Retourne la **production** (à soustraire de la conso EP totale).
 */
export function calcPhotovoltaiqueKwhEpAn(inputs: AuditInputs): number {
  const pv = inputs.equipements.photovoltaique
  if (!pv) return 0

  let puissanceKwc = pv.puissance ?? 0
  if (puissanceKwc === 0 && pv.surface) {
    // Estimation : 1 kWc ≈ 5-7 m² de panneaux
    puissanceKwc = pv.surface / 6
  }
  if (puissanceKwc <= 0) return 0

  // Productible moyen France : 1000-1300 kWh/kWc/an
  const zone = inputs.geo.zone ?? getZoneClimatique(inputs.geo.codeInsee)
  const productible = zone.startsWith('H3')
    ? 1300
    : zone.startsWith('H2')
      ? 1100
      : 950

  // Bonus inclinaison/orientation (V1 forfait : 0.95 si paramètres définis, 0.85 sinon)
  const facteur =
    pv.orientation === 'sud' || pv.inclinaison === 30 ? 1.0 : 0.9

  // Le PV produit de l'EF électrique → EP via coef 2.3
  return puissanceKwc * productible * facteur * COEF_EP.electricite
}

/**
 * GES auxiliaires + clim (électricité = 0.064 kg CO₂/kWh EF).
 */
export function calcGesAnnexesKgAn(inputs: AuditInputs): number {
  // Auxiliaires + clim sont en EP, on remonte à EF en divisant par coef EP
  const auxEp = calcAuxiliairesKwhEpAn(inputs)
  const climEp = calcClimatisationKwhEpAn(inputs)
  const auxEf = auxEp / COEF_EP.electricite
  const climEf = climEp / COEF_EP.electricite
  return (auxEf + climEf) * CO2_KG_PER_KWH.electricite
}
