/**
 * Phase R2 / R1-prep — API agences immobilières.
 *
 * Pair volontaire avec hooks/queries/agences-immo.ts.
 *
 * RLS :
 *   - SELECT : tout pro authentifié + admin
 *   - INSERT/UPDATE/DELETE : admin uniquement (MVP)
 *
 * Phase 16 (post-DPIA + Hoguet) ajoutera des policies pro pour CRUD limité +
 * portail /agence dédié + algo Score Vente.
 */
import { supabase } from '@/lib/supabase'

export type AgenceImmoStatus = 'prospect' | 'contacted' | 'partenaire' | 'refused'

export interface AgenceImmo {
  id: string
  siret: string | null
  raison_sociale: string
  representant: string | null
  email: string | null
  telephone: string | null
  site_web: string | null
  adresse: string | null
  code_postal: string | null
  commune: string | null
  code_insee: string | null
  departement: string | null
  latitude: number | null
  longitude: number | null
  carte_t_numero: string | null
  carte_t_validite: string | null
  status: AgenceImmoStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ListAgencesFilters {
  departement?: string
  status?: AgenceImmoStatus
  /** Recherche full-text simple sur raison_sociale + commune. */
  search?: string
  limit?: number
}

export const agencesImmoApi = {
  async list(filters: ListAgencesFilters = {}): Promise<AgenceImmo[]> {
    const limit = Math.min(filters.limit ?? 500, 2000)
    let q = supabase
      .from('brh_agences_immo')
      .select('*')
      .order('raison_sociale', { ascending: true })
      .limit(limit)

    if (filters.departement) q = q.eq('departement', filters.departement)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.search) {
      const safe = filters.search.replace(/[%_]/g, '\\$&')
      q = q.or(`raison_sociale.ilike.%${safe}%,commune.ilike.%${safe}%`)
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as AgenceImmo[]
  },

  async getById(id: string): Promise<AgenceImmo | null> {
    const { data, error } = await supabase
      .from('brh_agences_immo')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AgenceImmo | null
  },

  /** Admin uniquement (RLS l'enforce). */
  async create(
    payload: Omit<AgenceImmo, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<AgenceImmo> {
    const { data, error } = await supabase
      .from('brh_agences_immo')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as AgenceImmo
  },

  /** Admin uniquement. */
  async update(
    id: string,
    patch: Partial<Omit<AgenceImmo, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<AgenceImmo> {
    const { data, error } = await supabase
      .from('brh_agences_immo')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AgenceImmo
  },

  /** Admin uniquement. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('brh_agences_immo').delete().eq('id', id)
    if (error) throw error
  },
}
