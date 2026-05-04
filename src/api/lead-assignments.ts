/**
 * Phase 16.0.5 — API Lead Assignments (anti-doublon inter-agences).
 *
 * Une agence peut "claim" un lead (= prospect DPE F/G) pour 30 jours
 * d'exclusivité. Pendant ce délai, aucune autre agence ne peut claim ce
 * même prospect. Frequency cap : 2 tentatives max par lead (déclarées par
 * l'agence dans `last_attempt_outcome`).
 *
 * Cron `brh_release_expired_assignments()` (helper SQL Phase 16.0.1) libère
 * automatiquement les leads dont expires_at < now().
 */
import { supabase } from '@/lib/supabase'

export type AssignmentStatus =
  | 'active'
  | 'contacted'
  | 'expired'
  | 'released'
  | 'blacklisted'

export type ContactOutcome =
  | 'no_answer'
  | 'no_contact_info'
  | 'interested'
  | 'refused'
  | 'already_sold'
  | 'wrong_address'

export interface LeadAssignment {
  id: string
  prospect_id: number
  agence_id: string
  status: AssignmentStatus
  contact_attempts: number
  last_attempt_at: string | null
  last_attempt_outcome: ContactOutcome | null
  notes: string | null
  claimed_at: string
  expires_at: string
  released_at: string | null
}

export interface ListAssignmentsFilters {
  agenceId?: string
  prospectId?: number
  status?: AssignmentStatus
  /** Inclure expirés (default false : seulement active + contacted). */
  includeReleased?: boolean
  limit?: number
}

export const leadAssignmentsApi = {
  async list(filters: ListAssignmentsFilters = {}): Promise<LeadAssignment[]> {
    const limit = Math.min(filters.limit ?? 200, 1000)
    let q = supabase
      .from('brh_lead_assignments')
      .select('*')
      .order('claimed_at', { ascending: false })
      .limit(limit)

    if (filters.agenceId) q = q.eq('agence_id', filters.agenceId)
    if (filters.prospectId) q = q.eq('prospect_id', filters.prospectId)
    if (filters.status) q = q.eq('status', filters.status)
    else if (!filters.includeReleased) q = q.in('status', ['active', 'contacted'])

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as LeadAssignment[]
  },

  /**
   * Claim un lead pour une agence pendant 30j.
   * Lève une erreur si le lead est déjà actif sur une autre agence
   * (UNIQUE INDEX brh_lead_assignments_unique_active).
   */
  async claim(prospectId: number, agenceId: string): Promise<LeadAssignment> {
    const { data, error } = await supabase
      .from('brh_lead_assignments')
      .insert({
        prospect_id: prospectId,
        agence_id: agenceId,
        status: 'active',
      })
      .select()
      .single()
    if (error) throw error
    return data as LeadAssignment
  },

  /**
   * Déclare une tentative de contact (incrémente contact_attempts).
   * Si attempts atteint 2 sans interest → marque blacklisted automatiquement.
   * Si outcome='interested' → status passe à 'contacted'.
   */
  async logAttempt(
    id: string,
    outcome: ContactOutcome,
    notes?: string,
  ): Promise<LeadAssignment> {
    // Récupère l'état actuel pour calculer le nouveau status
    const { data: current, error: getErr } = await supabase
      .from('brh_lead_assignments')
      .select('contact_attempts')
      .eq('id', id)
      .single()
    if (getErr) throw getErr

    const newAttempts = (current.contact_attempts ?? 0) + 1
    let newStatus: AssignmentStatus = 'active'
    if (outcome === 'interested') newStatus = 'contacted'
    else if (newAttempts >= 2) newStatus = 'blacklisted'

    const { data, error } = await supabase
      .from('brh_lead_assignments')
      .update({
        contact_attempts: newAttempts,
        last_attempt_at: new Date().toISOString(),
        last_attempt_outcome: outcome,
        status: newStatus,
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as LeadAssignment
  },

  /**
   * Libère manuellement un lead (avant expiration). Permet à l'agence de
   * dire "je n'arriverai pas à contacter, libérer pour les autres".
   */
  async release(id: string): Promise<void> {
    const { error } = await supabase
      .from('brh_lead_assignments')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
  },

  /**
   * Trigger admin : libère tous les leads dont expires_at < now().
   * En production, le cron pg_cron exécute ça quotidiennement (à brancher
   * via une 2ᵉ migration). Cet endpoint manuel reste utile pour tests + ops.
   */
  async releaseExpired(): Promise<number> {
    const { data, error } = await supabase.rpc('brh_release_expired_assignments')
    if (error) throw error
    return (data as number) ?? 0
  },

  /** Combien de leads actifs cette agence détient actuellement ? */
  async countActiveForAgence(agenceId: string): Promise<number> {
    const { count, error } = await supabase
      .from('brh_lead_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('agence_id', agenceId)
      .in('status', ['active', 'contacted'])
    if (error) throw error
    return count ?? 0
  },
}
