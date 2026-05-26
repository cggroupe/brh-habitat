/**
 * Types pour les fiches drill-down (adresse / entreprise / personne).
 *
 * Pattern Karpathy graph navigable : chaque fiche est self-contained et
 * référence ses voisins du graphe via des "FicheLink" cliquables.
 */
import type { LeadRow } from '@/types/lead'

export interface Dirigeant {
  nom?: string | null
  prenom?: string | null
  qualite?: string | null
  date_naissance?: string | null
  est_decede?: boolean | null
  deces_date?: string | null
  deces_match_score?: number | null
}

export interface SciInfo {
  siren: string
  denomination: string
  forme_juridique?: string | null
  date_creation?: string | null
  date_radiation?: string | null
  is_active: boolean
  adresse_complete?: string | null
  code_postal?: string | null
  commune?: string | null
  departement?: string | null
  lat?: number | null
  lng?: number | null
  activite_principale?: string | null
  activite_libelle?: string | null
  capital_social_cents?: number | null
  effectif?: string | null
  dirigeants: Dirigeant[]
  has_deceased_dirigeant: boolean
  succession_probable_score: number
}

export interface FicheAdresse {
  /** Identité DPE */
  dpe: LeadRow
  /** SCI propriétaire si owner_siren présent */
  sci: SciInfo | null
  /** Voisinage : autres DPE même CP+rue (~10 max) cliquables vers d'autres fiches */
  voisinage: Array<{
    id: number
    adresse: string | null
    etiquette_dpe: string | null
    surface_habitable: number | null
    score_v2: number | null
  }>
}

export interface FicheEntreprise {
  /** Identité SCI/société */
  sci: SciInfo
  /** Adresses détenues par cette société (DPE) */
  adresses: Array<{
    id: number
    adresse: string | null
    code_postal: string | null
    commune: string | null
    etiquette_dpe: string | null
    surface_habitable: number | null
    annee_construction: number | null
    score_v2: number | null
  }>
  /** Alertes BODACC (procédure collective, cession, etc.) */
  bodacc: Array<{
    id: number | string
    type_avis: string | null
    date_parution: string | null
    description: string | null
  }>
}

export interface FichePersonne {
  /** Identité (entity-hub canonique si trouvé, sinon synthèse depuis SCI dirigeants/BRH clients) */
  identity: {
    entity_id?: string | null
    full_name: string
    first_name?: string | null
    last_name?: string | null
    birth_date?: string | null
    death_date?: string | null
    city?: string | null
  }
  /** Rôles entreprises connues (SCI gérées + autres sociétés) */
  roles: Array<{
    siren: string
    denomination: string
    qualite: string | null
    is_active: boolean
    has_deceased_dirigeant?: boolean
    /** Nombre de DPE détenus par cette SCI (count `brh_dpe_prospects.owner_siren = siren`). */
    nb_dpe?: number
  }>
  /** Adresses détenues directement (propriétaire particulier dans brh_dpe_prospects) */
  patrimoine_direct: Array<{
    id: number
    adresse: string | null
    code_postal: string | null
    commune: string | null
    etiquette_dpe: string | null
  }>
  /** Adresses détenues via les SCI dont la personne est dirigeante (owner_siren matches). */
  patrimoine_via_sci?: Array<{
    id: number
    adresse: string | null
    code_postal: string | null
    commune: string | null
    etiquette_dpe: string | null
    surface_habitable: number | null
    annee_construction: number | null
    via_sci_siren: string
    via_sci_denomination: string
  }>
  /** Historique BRH si la personne est cliente/prospect */
  brh_historique: {
    is_client: boolean
    is_prospect: boolean
    statut?: string | null
    ca_total?: number | null
    premiere_facture?: string | null
    derniere_facture?: string | null
    rdv_count?: number
    enfants?: string | null
  } | null
}
