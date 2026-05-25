/**
 * brh-personne-360 — fiche personne enrichie 360° via le graphe brh_entity_links.
 *
 * Une seule RPC retourne identité + SCI dirigées + adresses habitées + mutations DVF
 * transitives + BODACC + décès matchs + résumé compteurs liens.
 */
import { supabase } from '@/lib/supabase'

export interface Personne360Identity {
  id: string
  full_name: string | null
  nom: string | null
  prenom: string | null
  societe: string | null
  is_pro: boolean | null
  telephone: string | null
  email: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  ca_total_eur: number | null
  nb_rdv: number | null
  enfants: string | null
  statut: string | null
  categorie: string | null
  enrichment_score: number | null
  enrichment_tier: string | null
  psy_profile: Record<string, unknown> | null
  osint_linkedin: string | null
  osint_facebook: string | null
  osint_other: Record<string, unknown> | null
  linked_dpe_id: number | null
  employee_notes: string | null
  travaux_terrain_status: 'aucun' | 'partiel' | 'total' | 'inconnu' | null
  dpe_terrain_estime: string | null
  interet_brh: 'chaud' | 'tiede' | 'froid' | 'a_recontacter' | 'refus' | 'inconnu' | null
  contact_disponibilite: 'matin' | 'apres_midi' | 'soir' | 'weekend' | 'inconnu' | null
  derniere_visite_terrain: string | null
  employee_updated_at: string | null
}

export interface Personne360SciLink {
  siren: string
  denomination: string | null
  forme_juridique: string | null
  date_creation: string | null
  date_radiation: string | null
  is_active: boolean | null
  adresse_complete: string | null
  commune: string | null
  departement: string | null
  activite_libelle: string | null
  capital_social_cents: number | null
  has_deceased_dirigeant: boolean | null
  confidence: number
  evidence: Record<string, unknown>
}

export type DpeRole = 'proprietaire' | 'dirigeant' | 'occupant'

export interface Personne360AdresseLink {
  dpe_id: number
  adresse: string | null
  code_postal: string | null
  commune: string | null
  etiquette_dpe: string | null
  surface_habitable: number | null
  annee_construction: number | null
  score_v2: number | null
  owner_name: string | null
  owner_siren: string | null
  owner_type: string | null
  dpe_role: DpeRole | null
  employee_overrides: Record<string, unknown> | null
  confidence: number
  evidence: Record<string, unknown>
}

export interface Personne360Mutation {
  id: string
  date_mutation: string
  nature_mutation: string
  valeur_fonciere_cents: number | null
  surface_reelle_bati: number | null
  type_local: string | null
  adresse: string | null
  commune: string | null
  prix_m2_calc: number | null
  is_groupee: boolean
  usable_for_brh: boolean
  via_dpe_id: string
}

export interface Personne360Bodacc {
  id_bodacc: string
  siren: string | null
  date_publication: string | null
  type_avis: string | null
  famille_avis: string | null
  denomination: string | null
  prix_cession_cents: number | null
  date_cession: string | null
  bodacc_url: string | null
}

export interface Personne360Deces {
  siren: string | null
  nom: string
  prenom: string
  date_naissance: string | null
  deces_date: string | null
  deces_commune: string | null
  match_confidence: number | null
}

export interface Personne360 {
  identity: Personne360Identity | null
  sci_dirigees: Personne360SciLink[]
  adresses_liees: Personne360AdresseLink[]
  mutations_dvf: Personne360Mutation[]
  bodacc_alerts: Personne360Bodacc[]
  sci_deces_pairs: Personne360Deces[]
  links_summary: Record<string, number>
}

export const brhPersonne360Api = {
  async get(personneId: string): Promise<Personne360> {
    const { data, error } = await supabase.rpc('brh_personne_360', {
      p_personne_id: personneId,
    })
    if (error) throw error
    const row = (data as unknown as Personne360[] | null)?.[0]
    return (
      row ?? {
        identity: null,
        sci_dirigees: [],
        adresses_liees: [],
        mutations_dvf: [],
        bodacc_alerts: [],
        sci_deces_pairs: [],
        links_summary: {},
      }
    )
  },
}
