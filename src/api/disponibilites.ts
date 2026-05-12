/**
 * API brh_disponibilites — Phase 18 v2 (pivot Réseau, audit-ux-2026-05-12 #4).
 *
 * Un pro signale qu'il est dispo telle période + zone + métiers. Remplace le
 * fil d'actu libre par une UX structurée.
 */
import { supabase } from '@/lib/supabase'

export type DisponibiliteVisibility = 'public' | 'reseau' | 'prive'
export type DisponibiliteStatus = 'draft' | 'active' | 'archived' | 'expired'
export type ContractModePref = 'sous_traitance' | 'co_traitance' | 'apport' | 'tous'

export interface Disponibilite {
  id: string
  tenant_id: string
  pro_id: string
  periode_debut: string // YYYY-MM-DD
  periode_fin: string // YYYY-MM-DD
  metiers_proposes: string[]
  departements: string[]
  description: string | null
  capacite_chantiers: number | null
  contract_mode_pref: ContractModePref
  visibility: DisponibiliteVisibility
  status: DisponibiliteStatus
  expires_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface DisponibiliteWithPublisher extends Disponibilite {
  publisher_name?: string | null
  publisher_partner_type?: string | null
}

export interface DisponibiliteInput {
  periode_debut: string
  periode_fin: string
  metiers_proposes: string[]
  departements: string[]
  description?: string | null
  capacite_chantiers?: number | null
  contract_mode_pref?: ContractModePref
  visibility?: DisponibiliteVisibility
  status?: DisponibiliteStatus
  expires_at?: string | null
}

export interface DisponibiliteFilters {
  visibility?: DisponibiliteVisibility | 'all'
  departement?: string
  metier?: string
  contractMode?: ContractModePref | 'all'
  /** Filtre période : disponibilités actives qui chevauchent ce range */
  periodeStart?: string
  periodeEnd?: string
  /** Limit pagination */
  limit?: number
}

export const disponibilitesApi = {
  /** Liste publique/réseau selon RLS, avec filtres. */
  async list(filters: DisponibiliteFilters = {}): Promise<DisponibiliteWithPublisher[]> {
    let query = supabase
      .from('brh_disponibilites')
      .select(`
        *,
        brh_partner_contracts!inner(partner_type, profiles!inner(full_name))
      `)
      .eq('status', 'active')
      .order('periode_debut', { ascending: true })
      .limit(filters.limit ?? 100)

    if (filters.visibility && filters.visibility !== 'all') {
      query = query.eq('visibility', filters.visibility)
    }
    if (filters.departement) {
      query = query.contains('departements', [filters.departement])
    }
    if (filters.metier) {
      query = query.contains('metiers_proposes', [filters.metier])
    }
    if (filters.contractMode && filters.contractMode !== 'all') {
      query = query.eq('contract_mode_pref', filters.contractMode)
    }
    if (filters.periodeStart) {
      query = query.lte('periode_debut', filters.periodeEnd ?? filters.periodeStart)
    }
    if (filters.periodeEnd) {
      query = query.gte('periode_fin', filters.periodeStart ?? filters.periodeEnd)
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row) => {
      const publisher = (row as { brh_partner_contracts: { partner_type: string; profiles: { full_name: string } } }).brh_partner_contracts
      return {
        ...(row as unknown as Disponibilite),
        publisher_name: publisher?.profiles?.full_name ?? null,
        publisher_partner_type: publisher?.partner_type ?? null,
      }
    })
  },

  /** Mes propres disponibilités (toutes statuts). */
  async listMine(proId: string): Promise<Disponibilite[]> {
    const { data, error } = await supabase
      .from('brh_disponibilites')
      .select('*')
      .eq('pro_id', proId)
      .order('periode_debut', { ascending: false })
    if (error) throw error
    return (data ?? []) as Disponibilite[]
  },

  /** Détail d'une dispo. */
  async getById(id: string): Promise<Disponibilite | null> {
    const { data, error } = await supabase
      .from('brh_disponibilites')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Disponibilite | null)
  },

  /** Création d'une dispo (pro_id auto via auth.uid()). */
  async create(proId: string, input: DisponibiliteInput): Promise<Disponibilite> {
    const { data, error } = await supabase
      .from('brh_disponibilites')
      .insert({
        pro_id: proId,
        periode_debut: input.periode_debut,
        periode_fin: input.periode_fin,
        metiers_proposes: input.metiers_proposes,
        departements: input.departements,
        description: input.description ?? null,
        capacite_chantiers: input.capacite_chantiers ?? null,
        contract_mode_pref: input.contract_mode_pref ?? 'sous_traitance',
        visibility: input.visibility ?? 'reseau',
        status: input.status ?? 'active',
        expires_at: input.expires_at ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Disponibilite
  },

  /** Update partial. */
  async update(id: string, patch: Partial<DisponibiliteInput>): Promise<Disponibilite> {
    const { data, error } = await supabase
      .from('brh_disponibilites')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Disponibilite
  },

  /** Archive (soft delete). */
  async archive(id: string): Promise<void> {
    const { error } = await supabase
      .from('brh_disponibilites')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  /** Suppression définitive (admin ou owner via RLS). */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('brh_disponibilites').delete().eq('id', id)
    if (error) throw error
  },
}
