/**
 * brh-personne-signals — signaux externes d'un contact BRH (DVF, SCI décès, BODACC).
 *
 * Une seule RPC `brh_personne_signals_externes(uuid)` retourne 3 listes.
 * Réservée BRH internes (admin/pro/employe) via SECURITY DEFINER.
 */
import { supabase } from '@/lib/supabase'

export interface DvfMutationSignal {
  id: string
  id_mutation: string
  date_mutation: string
  nature_mutation: string
  valeur_fonciere_cents: number | null
  surface_reelle_bati: number | null
  surface_terrain: number | null
  nombre_pieces_principales: number | null
  type_local: string | null
  adresse_numero: string | null
  adresse_voie: string | null
  code_postal: string | null
  commune: string | null
  prix_m2_calc: number | null
  is_groupee: boolean
  usable_for_brh: boolean
  parcelle_idu: string | null
}

export interface SciDecesSignal {
  id: string
  siren: string | null
  nom: string
  prenom: string
  dirigeant_index: number | null
  date_naissance: string | null
  deces_date: string | null
  deces_commune: string | null
  deces_departement: string | null
  match_confidence: number | null
  source: string | null
}

export interface BodaccSignal {
  id_bodacc: string
  famille_avis: string | null
  type_avis: string | null
  date_publication: string | null
  date_parution: string | null
  siren: string | null
  denomination: string | null
  forme_juridique: string | null
  commune: string | null
  code_postal: string | null
  prix_cession_cents: number | null
  date_cession: string | null
  bodacc_url: string | null
}

export interface PersonneSignalsExternes {
  dvf_mutations: DvfMutationSignal[]
  sci_deces_matches: SciDecesSignal[]
  bodacc_alerts: BodaccSignal[]
}

export const brhPersonneSignalsApi = {
  async get(personneId: string): Promise<PersonneSignalsExternes> {
    const { data, error } = await supabase.rpc('brh_personne_signals_externes', {
      p_personne_id: personneId,
    })
    if (error) throw error
    const row = (data as PersonneSignalsExternes[] | null)?.[0]
    return row ?? { dvf_mutations: [], sci_deces_matches: [], bodacc_alerts: [] }
  },
}
