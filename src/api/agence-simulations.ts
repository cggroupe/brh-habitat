/**
 * Phase 16.1 — API simulations agence (sauvegarde + reprise des études).
 */
import { supabase } from '@/lib/supabase'

export interface AgenceSimulation {
  id: string
  agence_id: string
  created_by: string | null
  lead_assignment_id: string | null
  prospect_dpe_id: number | null
  titre: string
  adresse: string | null
  code_postal: string | null
  commune: string | null
  code_insee: string | null
  notes: string | null
  inputs: Record<string, unknown>
  result: Record<string, unknown> | null
  scenarios: Record<string, unknown> | null
  etiquette_dpe: string | null
  cep_kwh_ep_m2_an: number | null
  created_at: string
  updated_at: string
}

export type SimulationInsert = Omit<
  AgenceSimulation,
  'id' | 'created_at' | 'updated_at'
>

export const agenceSimulationsApi = {
  async list(agenceId: string): Promise<AgenceSimulation[]> {
    const { data, error } = await supabase
      .from('brh_agence_simulations')
      .select(
        'id, agence_id, created_by, lead_assignment_id, prospect_dpe_id, titre, adresse, code_postal, commune, code_insee, notes, etiquette_dpe, cep_kwh_ep_m2_an, created_at, updated_at',
      )
      .eq('agence_id', agenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AgenceSimulation[]
  },

  async listForLead(leadAssignmentId: string): Promise<AgenceSimulation[]> {
    const { data, error } = await supabase
      .from('brh_agence_simulations')
      .select(
        'id, titre, etiquette_dpe, cep_kwh_ep_m2_an, created_at, updated_at, agence_id, created_by, lead_assignment_id, prospect_dpe_id, adresse, code_postal, commune, code_insee, notes',
      )
      .eq('lead_assignment_id', leadAssignmentId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AgenceSimulation[]
  },

  async getById(id: string): Promise<AgenceSimulation | null> {
    const { data, error } = await supabase
      .from('brh_agence_simulations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AgenceSimulation | null
  },

  async create(input: SimulationInsert): Promise<AgenceSimulation> {
    const { data, error } = await supabase
      .from('brh_agence_simulations')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as AgenceSimulation
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('brh_agence_simulations')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
