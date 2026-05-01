/**
 * Types publics du moteur DPE 3CL 2021.
 *
 * Convention :
 * - Inputs en unités SI (m², m³, W, K) sauf montants en cents.
 * - Energie en kWh (final, à convertir en EP via COEF_EP).
 * - Surfaces habitables en m² (Sh dans la méthode 3CL).
 */

import type {
  Comportement,
  Energie,
  EtiquetteDpe,
  Inertie,
  PosteDpe,
  ZoneClimatique,
} from './constants'

// ============================================================================
// INPUTS
// ============================================================================

export interface AuditGeoInputs {
  /** Code INSEE de la commune (5 chiffres). */
  codeInsee: string
  /** Altitude en mètres (déduite si non fournie). */
  altitude?: number
  /** Zone climatique (déduite via brh_dpe_zones_climatiques si non fournie). */
  zone?: ZoneClimatique
}

export type TypeBatiment = 'maison' | 'appartement' | 'immeuble'
export type PeriodeConstruction =
  | 'avant_1948'
  | '1948-1974'
  | '1975-1977'
  | '1978-1982'
  | '1983-1988'
  | '1989-2000'
  | '2001-2005'
  | '2006-2012'
  | 'apres_2013'

export interface ParoiInput {
  type: 'mur' | 'plancher_bas' | 'plancher_haut' | 'toiture'
  surface: number
  orientation?: 'nord' | 'est' | 'sud' | 'ouest' | 'horizontal'
  /** Adjacence (extérieur, garage, LNC, ETS, sous-sol, etc.). */
  adjacence?: string
  materiau?: string
  isolation?: {
    type?: 'iti' | 'ite' | 'iti_ite' | 'sans'
    epaisseur?: number // mm
    lambda?: number // W/m·K
    annee?: number
  }
}

export interface OuvertureInput {
  type: 'fenetre' | 'porte' | 'baie_vitree' | 'porte_fenetre' | 'velux'
  surface: number
  orientation?: 'nord' | 'est' | 'sud' | 'ouest' | 'horizontal'
  menuiserie?: 'pvc' | 'bois' | 'alu' | 'metal'
  vitrage?: 'simple' | 'double' | 'triple' | 'survitrage' | 'double_fenetre'
  vir?: boolean // vitrage à isolation renforcée
  volet?: 'sans' | 'persienne' | 'volet_ext_isolant' | 'volet_battant_bois'
  pose?: 'tunnel' | 'nu_interieur' | 'nu_exterieur'
}

export interface BatiInputs {
  surfaceHabitable: number // Sh (m²)
  volume: number // m³
  hauteurSousPlafond?: number // m
  nombreNiveaux?: number
  periodeConstruction: PeriodeConstruction
  inertie: Inertie | 'moyenne' | 'tres_lourde' | 'age_recent'
  typeBatiment: TypeBatiment
  parois: ParoiInput[]
  ouvertures: OuvertureInput[]
  pontsThermiques?: Array<{ type: string; longueur: number }>
}

export type GenerateurChauffage =
  | 'chaudiere_gaz_standard'
  | 'chaudiere_gaz_basse_temp'
  | 'chaudiere_gaz_condensation'
  | 'chaudiere_fioul'
  | 'chaudiere_fioul_condensation'
  | 'chaudiere_bois_buche'
  | 'chaudiere_granules_bois'
  | 'pac_air_air'
  | 'pac_air_eau'
  | 'pac_eau_eau'
  | 'effet_joule_direct'
  | 'inertie_electrique'
  | 'reseau_chaleur'
  | 'autre'

export type Emetteur =
  | 'radiateur_eau'
  | 'plancher_chauffant'
  | 'mural_chauffant'
  | 'air_souffle'
  | 'convecteur_electrique'
  | 'panneau_rayonnant'
  | 'split_air_air'

export interface ChauffageInput {
  generateur: GenerateurChauffage
  emetteur?: Emetteur
  energie?: Energie
  /** Année d'installation (impacte SCOP, rendement). */
  anneeInstallation?: number
  scopRenseigne?: number
  /** Présence d'une régulation pièce par pièce. */
  regulation?: boolean
}

export interface EcsInput {
  generateur: 'electrique' | 'gaz' | 'fioul' | 'bois' | 'cet' | 'reseau_chaleur' | 'solaire_thermique'
  stockageL?: number
  energie?: Energie
  anneeInstallation?: number
}

export type Ventilation =
  | 'naturelle'
  | 'vmc_sf_auto_avant_1982'
  | 'vmc_sf_auto_1982_2000'
  | 'vmc_sf_auto_apres_2000'
  | 'vmc_sf_hygro_a'
  | 'vmc_sf_hygro_b_avant_2012'
  | 'vmc_sf_hygro_b_apres_2012'
  | 'vmc_double_flux_sans_recup'
  | 'vmc_double_flux_avec_recup'
  | 'vmc_gaz'

export interface EquipementsInputs {
  chauffage: ChauffageInput
  ecs: EcsInput
  ventilation: Ventilation
  climatisation?: {
    seer?: number
    surfaceClim?: number
  }
  photovoltaique?: {
    surface?: number // m²
    puissance?: number // kWc
    inclinaison?: number // degrés
    orientation?: string
  }
}

export interface AuditInputs {
  geo: AuditGeoInputs
  bati: BatiInputs
  equipements: EquipementsInputs
  comportement?: Comportement
  /** Composition foyer (pour calage et aides). */
  foyer?: {
    nbAdultes?: number
    nbEnfants?: number
    revenuFiscalReference?: number // €
    decileMpr?: 'bleu' | 'jaune' | 'violet' | 'rose'
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================

export interface Deperditions {
  /** Σ U×A×b sur parois opaques. */
  parois: number
  /** Σ U×A pour ouvertures. */
  ouvertures: number
  /** Σ ψ×L×b. */
  pontsThermiques: number
  /** 0.34 × Qv × Vh. */
  renouvellementAir: number
  /** Total GV (W/K). */
  total: number
  /** Ubat global (W/m²·K). */
  ubat: number
}

export interface ConsoParPoste {
  chauffage: number
  ecs: number
  eclairage: number
  auxiliaires: number
  refroidissement: number
}

export interface DpeResult {
  /** kWh EP / m² / an. */
  cepKwhEpM2An: number
  /** kg CO₂ / m² / an. */
  gesKgCo2M2An: number

  etiquetteEnergie: EtiquetteDpe
  etiquetteClimat: EtiquetteDpe
  /** Étiquette DPE finale = max(CEP, GES). */
  etiquetteDpe: EtiquetteDpe

  /** Conso totale énergie finale (kWh/an). */
  consoEfTotaleKwhAn: number

  /** Détail par poste (en énergie primaire kWh/an). */
  parPoste: ConsoParPoste

  /** Déperditions calculées au passage. */
  deperditions: Deperditions

  /** Hypothèses retenues (pour audit / debug). */
  hypotheses: {
    zoneClimatique: ZoneClimatique
    altitude: number
    nadeq: number
    moteurVersion: string
  }
}

// ============================================================================
// VARIANTES
// ============================================================================

export interface Variante {
  id: string
  label: string
  ordre: number
  /** Delta sur AuditInputs (deep merge). */
  deltaInputs: Partial<AuditInputs>
}

export interface VarianteCosting {
  coutTotalTtcCents: number
  coutMainOeuvreCents: number
  coutFournituresCents: number
}

// ============================================================================
// AIDES
// ============================================================================

export type DecileMpr = 'bleu' | 'jaune' | 'violet' | 'rose'

export interface Aide {
  type: 'mpr_geste' | 'mpr_ampleur' | 'mpr_serenite' | 'cee' | 'cee_cdp' | 'eco_ptz' | 'tva55' | 'aide_locale'
  programmeId?: number
  label: string
  montantCents: number
  exclusion?: string[]
}

export interface PaybackResult {
  paybackAnnees: number | null
  economieAnnuelleCents: number
  resteAChargeCents: number
  alerteSuperieur30Ans: boolean
}

// Re-export selected constants for convenience
export type { Comportement, Energie, EtiquetteDpe, Inertie, PosteDpe, ZoneClimatique }
