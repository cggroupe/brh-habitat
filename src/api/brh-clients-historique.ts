/**
 * brh-clients-historique — recherche + filtrage des 16 607 contacts BRH historiques.
 */
import { supabase } from '@/lib/supabase'

export interface ClientBrhHit {
  id: string
  fingerprint_hash: string
  full_name: string | null
  nom: string | null
  prenom: string | null
  societe: string | null
  is_pro: boolean
  telephone: string | null
  email: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  ca_total_eur: number | null
  premiere_facture: string | null
  derniere_facture: string | null
  nb_rdv: number
  enfants: string | null
  statut: string | null
  categorie: string | null
  source_primaire: string
  sources_secondaires: string[]
  linked_dpe_id: number | null
  link_confidence: number | null
  osint_linkedin: string | null
  osint_facebook: string | null
  total_count: number
  psy_profile?: {
    personality_traits?: string[]
    digital_footprint?: 'faible' | 'moyen' | 'élevé'
    communication_style?: 'formel' | 'direct' | 'chaleureux' | 'technique'
    best_contact_channel?: string
    renovation_motivators?: string[]
    renovation_barriers?: string[]
    estimated_segment?: string
    approach_advice?: string
    confidence?: 'low' | 'medium' | 'high'
  } | null
}

export interface ClientsBrhFilters {
  query?: string
  statut?: 'Client' | 'Prospect' | null
  dept?: string | null
  with_tel?: boolean
  with_email?: boolean
  with_ca?: boolean
  with_rdv?: boolean
  with_dpe_link?: boolean
  limit?: number
  offset?: number
}

export const brhClientsHistoriqueApi = {
  async search(filters: ClientsBrhFilters = {}): Promise<ClientBrhHit[]> {
    const { data, error } = await supabase.rpc('brh_personnes_search', {
      p_query: filters.query ?? null,
      p_statut: filters.statut ?? null,
      p_dept: filters.dept ?? null,
      p_with_tel: filters.with_tel ?? false,
      p_with_email: filters.with_email ?? false,
      p_with_ca: filters.with_ca ?? false,
      p_with_rdv: filters.with_rdv ?? false,
      p_with_dpe_link: filters.with_dpe_link ?? false,
      p_limit: Math.min(filters.limit ?? 50, 200),
      p_offset: Math.max(0, filters.offset ?? 0),
    })
    if (error) throw error
    return (data ?? []) as ClientBrhHit[]
  },
}
