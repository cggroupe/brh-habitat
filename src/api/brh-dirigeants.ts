/**
 * brh-dirigeants — Fiches dirigeants SCI consolidées.
 *
 * 80 844 dirigeants uniques avec patrimoine cross-SCI matérialisé.
 * 4 470 multi-SCI, 17 403 propriétaires DPE via SCI, 515 successions ouvertes.
 */
import { supabase } from '@/lib/supabase'

export interface DirigeantSciSummary {
  siren: string
  denomination: string | null
  forme_juridique: string | null
  qualite: string | null
  is_active: boolean | null
  date_creation: string | null
}

export interface DirigeantAutreEntreprise {
  siren: string
  denomination: string | null
  nature_juridique: string | null
  activite_principale: string | null
  etat_administratif: string | null
  siege_adresse: string | null
  siege_code_postal: string | null
  siege_commune: string | null
  tranche_effectif: string | null
  date_creation: string | null
}

export interface DirigeantSearchRow {
  id: string
  nom: string
  prenom: string
  date_naissance: string | null
  nb_sci_dirigees: number
  nb_sci_actives: number
  nb_dpe_total: number
  est_decede: boolean
  succession_potentielle: boolean
  interet_brh: string | null
  sci_dirigees: DirigeantSciSummary[]
  total_count: number
}

export interface DirigeantSearchFilters {
  query?: string | null
  dept?: string | null
  multi_sci?: boolean
  proprio_dpe?: boolean
  succession?: boolean
  limit?: number
  offset?: number
}

export interface Dirigeant360 {
  identity: {
    id: string
    nom: string
    prenom: string
    date_naissance: string | null
    nb_sci_dirigees: number
    nb_sci_actives: number
    nb_dpe_total: number
    est_decede: boolean
    deces_date: string | null
    deces_commune: string | null
    succession_potentielle: boolean
    osint_adresse_perso: string | null
    osint_telephone: string | null
    osint_email: string | null
    osint_linkedin: string | null
    employee_notes: string | null
    interet_brh: string | null
    derniere_visite_terrain: string | null
    autres_entreprises: DirigeantAutreEntreprise[] | null
    autres_entreprises_match_count: number | null
    autres_entreprises_enriched_at: string | null
    tel_pro_via_entreprise: string | null
    email_pro_via_entreprise: string | null
  } | null
  sci_details: Array<{
    siren: string
    denomination: string | null
    forme_juridique: string | null
    date_creation: string | null
    date_radiation: string | null
    is_active: boolean | null
    adresse_complete: string | null
    commune: string | null
    activite_libelle: string | null
    has_deceased_dirigeant: boolean | null
    nb_dpe_owned: number
  }>
  dpe_detenus: Array<{
    dpe_id: number
    adresse: string | null
    code_postal: string | null
    commune: string | null
    etiquette_dpe: string | null
    surface_habitable: number | null
    annee_construction: number | null
    owner_siren: string | null
    owner_name: string | null
  }>
  bodacc_alerts: Array<{
    id_bodacc: string
    siren: string | null
    date_publication: string | null
    type_avis: string | null
    denomination: string | null
    bodacc_url: string | null
  }>
}

export interface DirigeantEditPatch {
  osint_adresse_perso?: string | null
  osint_telephone?: string | null
  osint_email?: string | null
  osint_linkedin?: string | null
  employee_notes?: string | null
  interet_brh?: 'chaud' | 'tiede' | 'froid' | 'a_recontacter' | 'refus' | 'inconnu' | null
  derniere_visite_terrain?: string | null
}

export const brhDirigeantsApi = {
  async search(filters: DirigeantSearchFilters = {}): Promise<DirigeantSearchRow[]> {
    const { data, error } = await supabase.rpc('brh_dirigeants_search', {
      p_query: filters.query ?? null,
      p_dept: filters.dept ?? null,
      p_multi_sci: filters.multi_sci ?? false,
      p_proprio_dpe: filters.proprio_dpe ?? false,
      p_succession: filters.succession ?? false,
      p_limit: Math.min(filters.limit ?? 50, 200),
      p_offset: Math.max(0, filters.offset ?? 0),
    })
    if (error) throw error
    return (data ?? []) as DirigeantSearchRow[]
  },

  async get360(id: string): Promise<Dirigeant360> {
    const { data, error } = await supabase.rpc('brh_dirigeant_360', { p_dirigeant_id: id })
    if (error) throw error
    const row = (data as Dirigeant360[] | null)?.[0]
    return row ?? { identity: null, sci_details: [], dpe_detenus: [], bodacc_alerts: [] }
  },

  async update(id: string, patch: DirigeantEditPatch) {
    const { data, error } = await supabase.rpc('brh_dirigeant_update_employee', {
      p_id: id,
      p_patch: patch,
    })
    if (error) throw error
    return data as { ok: boolean }
  },
}
