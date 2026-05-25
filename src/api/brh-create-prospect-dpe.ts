/**
 * brh-create-prospect-dpe — API pour créer un prospect depuis un DPE anonyme.
 *
 * Demande Philippe 21/05 : "Pour les DPE où les personnes n'ont pas de nom,
 * nos employés peuvent enregistrer une personne / un prospect avec nom prénom."
 *
 * Source : RPC brh_create_prospect_from_dpe (migration 20260521270000).
 */
import { supabase } from '@/lib/supabase'

export interface CreateProspectFromDpeInput {
  dpe_id: number
  nom: string
  prenom: string
  telephone?: string | null
  email?: string | null
}

export const brhCreateProspectDpeApi = {
  async create(input: CreateProspectFromDpeInput): Promise<string> {
    const { data, error } = await supabase.rpc('brh_create_prospect_from_dpe', {
      p_dpe_id: input.dpe_id,
      p_nom: input.nom,
      p_prenom: input.prenom,
      p_telephone: input.telephone ?? undefined,
      p_email: input.email ?? undefined,
    })
    if (error) throw error
    return data as string
  },
}
