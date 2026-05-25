/**
 * brh-client-foncier — Phase 3 : foncier à l'adresse d'un client BRH.
 *
 * Cross DPE + DVF + permis + détection locataire SCI.
 * Matching élargi v3 (25/05) : legacy strict (cp+num_norm+voie_norm)
 * UNION match adresse_ban_id (clé exacte BAN).
 *
 * Source : RPC brh_client_foncier_at_address_v3 (migration 20260525110000).
 */
import { supabase } from '@/lib/supabase'

export interface ClientFoncierAddress {
  adresse: string | null
  code_postal: string | null
  ville: string | null
  numero_norm: string | null
  voie_norm: string | null
  adresse_ban_id: string | null
}

export type ClientFoncierDpeRole =
  | 'proprietaire_particulier'
  | 'dirigeant_sci'
  | 'locataire_sci'

export interface ClientFoncierDpe {
  dpe_id: number
  numero_dpe: string | null
  adresse: string | null
  code_postal: string | null
  commune: string | null
  etiquette_dpe: string | null
  surface_habitable: number | null
  annee_construction: number | null
  date_dpe: string | null
  owner_siren: string | null
  owner_name: string | null
  owner_type: string | null
  role: ClientFoncierDpeRole
}

export interface ClientFoncierDvf {
  id: string
  date_mutation: string | null
  nature_mutation: string | null
  valeur_fonciere: number | null
  prix_m2_calc: number | null
  is_groupee: boolean | null
  adresse_complete: string | null
  commune: string | null
  type_local: string | null
  surface_bati: number | null
}

export interface ClientFoncierSciProprio {
  name: string | null
  siren: string | null
}

export interface ClientFoncierPermis {
  id_permis: string
  type_permis: string | null
  nature_travaux: string | null
  date_depot: string | null
  date_decision: string | null
  decision: string | null
  surface_plancher_m2: number | null
  nombre_logements_crees: number | null
  adresse_complete: string | null
  commune: string | null
  lat: number | null
  lng: number | null
}

export interface ClientFoncierAtAddress {
  client_address: ClientFoncierAddress
  dpe_matches: ClientFoncierDpe[]
  dvf_matches: ClientFoncierDvf[]
  permis_matches: ClientFoncierPermis[]
  is_tenant_of_sci: boolean
  sci_proprietaire: ClientFoncierSciProprio | null
}

export const brhClientFoncierApi = {
  async getFoncier(personneId: string): Promise<ClientFoncierAtAddress | null> {
    const { data, error } = await supabase.rpc('brh_client_foncier_at_address_v3', {
      p_personne_id: personneId,
    })
    if (error) throw error
    const row = (data as unknown as ClientFoncierAtAddress[] | null)?.[0]
    return row ?? null
  },
}
