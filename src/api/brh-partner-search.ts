/**
 * brh-partner-search — recherche destinataires depuis la base partenaires.
 *
 * Wrappe le RPC `brh_partner_search` (artisan: brh_ext_rge_companies 14k,
 * agence_immo: brh_ext_immo_companies 6.9k).
 */
import { supabase } from '@/lib/supabase'

export type PartnerAudience = 'artisan' | 'agence_immo' | 'architecte' | 'maitre_oeuvre'

export interface PartnerHit {
  id: string
  full_name: string | null
  societe: string | null
  telephone: string | null
  email: string | null
  ville: string | null
  code_postal: string | null
  metier: string | null
  departement: string | null
}

export const brhPartnerSearchApi = {
  async search(audience: PartnerAudience, query: string, limit = 30): Promise<PartnerHit[]> {
    const { data, error } = await supabase.rpc('brh_partner_search', {
      p_audience: audience,
      p_query: query.trim() || null,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as PartnerHit[]
  },
}
