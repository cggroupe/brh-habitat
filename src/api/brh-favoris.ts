/**
 * brh-favoris — favoris polymorphes (adresse / entreprise / personne / parcelle).
 *
 * Table `brh_favoris` avec UNIQUE (profile_id, entity_type, entity_id).
 * RPC `brh_favoris_toggle` pour add/remove en un appel.
 */
import { supabase } from '@/lib/supabase'

export type FavoriEntityType = 'adresse' | 'entreprise' | 'personne' | 'parcelle'

export interface FavoriRow {
  id: string
  profile_id: string
  agence_id: string | null
  entity_type: FavoriEntityType
  entity_id: string
  label: string
  sublabel: string | null
  notes: string | null
  tags: string[]
  priority: 'urgente' | 'haute' | 'normale' | 'basse'
  status: 'a_etudier' | 'en_cours' | 'rdv_pris' | 'gagne' | 'perdu' | 'archive'
  created_at: string
  updated_at: string
}

export const brhFavorisApi = {
  /** Retourne la liste complète des favoris du user courant, plus récents en premier. */
  async list(): Promise<FavoriRow[]> {
    const { data, error } = await supabase
      .from('brh_favoris')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as FavoriRow[]
  },

  /** Toggle on/off un favori. Retourne true si ajouté, false si retiré. */
  async toggle(params: {
    entity_type: FavoriEntityType
    entity_id: string
    label: string
    sublabel?: string | null
  }): Promise<boolean> {
    const { data, error } = await supabase.rpc('brh_favoris_toggle', {
      p_entity_type: params.entity_type,
      p_entity_id: params.entity_id,
      p_label: params.label,
      p_sublabel: params.sublabel ?? null,
    })
    if (error) throw error
    return Boolean(data)
  },

  /** Update notes / priority / status / tags d'un favori existant. */
  async update(
    id: string,
    patch: Partial<Pick<FavoriRow, 'notes' | 'tags' | 'priority' | 'status'>>,
  ): Promise<void> {
    const { error } = await supabase
      .from('brh_favoris')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  /** Check si un entity est déjà en favori (pour griser le bouton). */
  async isFavorite(entity_type: FavoriEntityType, entity_id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('brh_favoris')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
    if (error) throw error
    return (count ?? 0) > 0
  },
}
