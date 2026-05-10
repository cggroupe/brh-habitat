/**
 * API brh_employees — Phase Employé V2.1.
 *
 * Lecture du registre des employés BRH depuis la DB (remplace le registre
 * statique src/lib/brh-employees.ts pour les écrans qui ont besoin de la
 * data live : score, niveau, leads received).
 *
 * Le module `lib/brh-employees.ts` reste utilisé par EmployeGuard et
 * LoginPage qui ont besoin de checker rapidement l'appartenance par email
 * sans hit DB (cache statique). Tout le reste passe par cette API.
 */
import { supabase } from '@/lib/supabase'

export type EmployeeLevel = 'standard' | 'pro' | 'expert' | 'master'

export type EmployeeActionType =
  | 'email_sent'
  | 'partner_recruited'
  | 'social_post'
  | 'rdv_completed'
  | 'lead_converted'
  | 'manual_admin'

export interface BrhEmployeeRow {
  id: string
  profile_id: string
  full_name: string
  email: string
  role_label: string
  activity_score: number
  activity_level: EmployeeLevel
  leads_received_this_month: number
  signature_html: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BrhEmployeeAction {
  id: string
  employee_id: string
  action_type: EmployeeActionType
  points: number
  related_entity_type: string | null
  related_entity_id: string | null
  notes: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

/** Mapping niveau → leads débloqués / mois (source de vérité côté client). */
export const LEVEL_LEADS_QUOTA: Record<EmployeeLevel, number> = {
  standard: 5,
  pro: 15,
  expert: 35,
  master: 999,
}

/** Mapping niveau → seuil minimum de points. */
export const LEVEL_THRESHOLDS: Record<EmployeeLevel, number> = {
  standard: 0,
  pro: 50,
  expert: 150,
  master: 350,
}

export const employeesApi = {
  /** Profil employé courant (par profile_id = auth.uid()). */
  async getMine(): Promise<BrhEmployeeRow | null> {
    const { data, error } = await supabase
      .from('brh_employees')
      .select('*')
      .eq('profile_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle()
    if (error) throw error
    return (data as BrhEmployeeRow) ?? null
  },

  /** Liste des employés actifs triés par score décroissant (pour mise en avant RDV). */
  async listActive(): Promise<BrhEmployeeRow[]> {
    const { data, error } = await supabase
      .from('brh_employees')
      .select('*')
      .eq('is_active', true)
      .order('activity_score', { ascending: false })
    if (error) throw error
    return (data ?? []) as BrhEmployeeRow[]
  },

  /** 10 dernières actions de l'employé courant. */
  async myRecentActions(employeeId: string, limit = 10): Promise<BrhEmployeeAction[]> {
    const { data, error } = await supabase
      .from('brh_employee_actions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as BrhEmployeeAction[]
  },

  /** Update signature email perso. */
  async updateSignature(html: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('Non authentifié')
    const { error } = await supabase
      .from('brh_employees')
      .update({ signature_html: html })
      .eq('profile_id', userId)
    if (error) throw error
  },
}
