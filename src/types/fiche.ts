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

/**
 * Classification métier d'une entité juridique pour différencier visuellement
 * un patrimoine immobilier ciblable BRH (sci_patrimoniale) d'une utility ou
 * collectivité qui ne porte pas de patrimoine prospectable.
 *
 * Migration : 20260527110000_brh_entity_class.sql
 */
export type EntityClass =
  | 'sci_patrimoniale'
  | 'utility'
  | 'bailleur_social'
  | 'collectivite'
  | 'autre'

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
  /** Classification métier (migration 20260527110000). Optional pendant la transition. */
  entity_class?: EntityClass | null
  /** Solvabilité estimée (migration 20260527140000 — Sprint E). */
  solvabilite_estimee?: string | null
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
  /** true si l'entité est un utility (ENEDIS, ORANGE, SNCF...). Affiche un banner :
   *  les DPE listés correspondent au titulaire du compteur, pas au propriétaire foncier. */
  is_utility: boolean
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
  /** Total DPE détenus en DB (peut dépasser `adresses.length` plafonné à 500 pour l'UI). */
  adresses_total: number
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
    /** true si l'entité est un utility (ENEDIS, ORANGE, SNCF...). Le rôle reste affiché
     *  (info publique vraie) mais le patrimoine via SCI est exclu (faux match owner_siren). */
    is_utility?: boolean
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
  /** Total DPE via SCI en DB (somme par SIREN, non plafonné par PostgREST max-rows=1000). */
  patrimoine_via_sci_total?: number
  /** Sprint 1.4 (27/05) — Agrégat Score Vente Phase 16 sur le patrimoine. Calcul
   *  côté API depuis `brh_score_vente_v1` joint sur les `prospect_id` du
   *  patrimoine_via_sci + patrimoine_direct. Null si zéro biens scorés. */
  score_vente_aggregate?: {
    /** Score max parmi les biens du dirigeant (0-100). */
    max: number
    /** Score moyen (0-100). */
    avg: number
    /** Compteur par segment Phase 16. */
    by_segment: {
      tres_chaud: number
      chaud: number
      tiede: number
      froid: number
    }
    /** Nombre total de biens avec score Phase 16. */
    n: number
  } | null
  /** Contacts pro enrichis (Phase 2C/8.4 + OSINT). */
  contacts_pro?: {
    tel_pro_via_entreprise?: string | null
    email_pro_via_entreprise?: string | null
    osint_telephone?: string | null
    osint_email?: string | null
    osint_linkedin?: string | null
  } | null
  /** Autres entreprises dirigées (commerce/artisanat/cabinet — pas SCI déjà connue). */
  autres_entreprises?: Array<{
    siren: string
    denomination: string
    nature_juridique?: string | null
    activite_principale?: string | null
    etat_administratif?: string | null
    siege_adresse?: string | null
    siege_code_postal?: string | null
    siege_commune?: string | null
    telephone_found?: string | null
    email_found?: string | null
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
