/**
 * Constantes physiques et réglementaires du moteur DPE 3CL 2021.
 *
 * Décisions BRH (cf decisions/ADR-002) :
 * - Coef EP électricité = 2.3 (CapRénov+ utilise 1.9 — non conforme arrêté 2021)
 */

/**
 * Coefficients de conversion énergie finale → énergie primaire.
 * Source : arrêté du 8 octobre 2021, annexe 1.
 */
export const COEF_EP = {
  electricite: 2.3, // ⚠️ ADEME officiel — CapRénov+ utilise 1.9 (bug)
  gaz_naturel: 1.0,
  fioul: 1.0,
  propane: 1.0,
  bois_buche: 1.0,
  granules_bois: 1.0,
  reseau_chaleur: 1.0,
} as const

export type Energie = keyof typeof COEF_EP

/**
 * Contenu CO₂ par énergie (kg CO₂ / kWh EF).
 * Source : arrêté DPE 2021. Le réseau de chaleur est lookup département via
 * `brh_dpe_reseau_chaleur_2022` (ADR-002 + bug equipements-edge-cases).
 */
export const CO2_KG_PER_KWH = {
  electricite: 0.064,
  gaz_naturel: 0.227,
  fioul: 0.324,
  propane: 0.272,
  bois_buche: 0.030,
  granules_bois: 0.030,
  reseau_chaleur: 0.0, // override via lookup
} as const

/**
 * Delta T eau chaude sanitaire (°C). Standard arrêté DPE 2021.
 * Becs = 1.163 × Nadeq × 56L × ΔT40
 */
export const ECS_DELTA_T = 40

/** Volume journalier ECS par adulte équivalent (litres). */
export const ECS_VOLUME_L_PAR_ADEQ = 56

/** Capacité thermique massique de l'eau (Wh/L/°C). */
export const ECS_CP_EAU = 1.163

/** Zones climatiques de la méthode 3CL. */
export const ZONES_CLIMATIQUES = ['H1A', 'H1B', 'H1C', 'H2A', 'H2B', 'H2C', 'H2D', 'H3'] as const
export type ZoneClimatique = (typeof ZONES_CLIMATIQUES)[number]

/** Inerties simplifiées (mapping depuis MOYENNE/TRES_LOURDE/AGE_RECENT). */
export const INERTIES = ['LEGERE', 'LOURDE'] as const
export type Inertie = (typeof INERTIES)[number]

/** Types de comportement utilisateur (3CL). */
export const COMPORTEMENTS = ['conventionnel', 'depensier', 'personnalise'] as const
export type Comportement = (typeof COMPORTEMENTS)[number]

/** Postes de consommation DPE (5 usages). */
export const POSTES_DPE = ['chauffage', 'ecs', 'eclairage', 'auxiliaires', 'refroidissement'] as const
export type PosteDpe = (typeof POSTES_DPE)[number]

/** Étiquettes DPE (A=1 → G=7). */
export const ETIQUETTES_DPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type EtiquetteDpe = (typeof ETIQUETTES_DPE)[number]

/** Version du moteur (à bumper à chaque modif majeure de calcul). */
export const MOTEUR_VERSION = '1.0.0-phase1'
