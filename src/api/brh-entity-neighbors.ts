/**
 * brh-entity-neighbors — explore les voisins d'une entité dans brh_entity_links.
 *
 * Utilisé par les 3 fiches (Adresse, SCI, Personne) via un panel commun.
 */
import { supabase } from '@/lib/supabase'

export type EntityType =
  | 'personne_brh'
  | 'sci'
  | 'adresse_dpe'
  | 'mutation_dvf'
  | 'permis_sitadel'

export interface EntityNeighbor {
  direction: 'outgoing' | 'incoming'
  other_type: EntityType
  other_id: string
  link_type: string
  confidence: number
  evidence: Record<string, unknown>
  display: Record<string, unknown> | null
}

export const brhEntityNeighborsApi = {
  async get(type: EntityType, id: string): Promise<EntityNeighbor[]> {
    const { data, error } = await supabase.rpc('brh_entity_neighbors', {
      p_type: type,
      p_id: id,
    })
    if (error) throw error
    return (data ?? []) as EntityNeighbor[]
  },
}
