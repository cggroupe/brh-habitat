/**
 * API publique — annuaire des partenaires BRH actifs.
 *
 * Lit `brh_companies` avec policy SELECT publique (migration 20260706600000).
 * Limite explicite des colonnes : pas de owner_id, siret, recruited_by, etc.
 */
import { supabase } from '@/lib/supabase'

export type CompanyProfession =
  | 'architecte'
  | 'agent_immobilier'
  | 'maitre_oeuvre'
  | 'courtier'
  | 'autre'

export type CompanyLevel = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface PublicPartner {
  id: string
  name: string
  city: string | null
  postal_code: string | null
  logo_url: string | null
  website: string | null
  profession: CompanyProfession | null
  level: CompanyLevel | null
}

export const partenairesPublicApi = {
  async list(filters?: { departement?: string; profession?: CompanyProfession; limit?: number }): Promise<PublicPartner[]> {
    let q = supabase
      .from('brh_companies')
      .select('id, name, city, postal_code, logo_url, website, profession, level')
      .eq('is_active', true)
      .order('level', { ascending: false }) // platinum > gold > silver > bronze
      .order('total_ca_apporte', { ascending: false })

    if (filters?.profession) q = q.eq('profession', filters.profession)
    if (filters?.departement) {
      // Bretagne dept 22/29/35/56 + 44 → code postal commence par ces chiffres
      q = q.like('postal_code', `${filters.departement}%`)
    }
    q = q.limit(filters?.limit ?? 100)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as PublicPartner[]
  },
}
