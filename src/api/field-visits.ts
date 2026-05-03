/**
 * Phase R2 — API tracking commercial terrain.
 *
 * Pair volontaire avec hooks/queries/field-visits.ts.
 *
 * RLS appliquée :
 *   - SELECT : tous les membres de la même company voient
 *   - INSERT : un employé crée pour SA company, employee_id = auth.uid()
 *   - UPDATE : seulement ses propres visites
 *   - DELETE : auteur OU owner de la company
 *   - admin BRH : bypass
 */
import { supabase } from '@/lib/supabase'

export type VisitTargetType = 'prospect_dpe' | 'artisan' | 'agence_immo'
export type VisitType = 'door_to_door' | 'consultation' | 'rappel' | 'rdv_signe'
export type VisitStatus =
  | 'planned'
  | 'completed'
  | 'no_answer'
  | 'refused'
  | 'interested'

export interface FieldVisit {
  id: string
  company_id: string
  employee_id: string
  target_type: VisitTargetType
  target_id: string
  visit_type: VisitType
  status: VisitStatus
  notes: string | null
  lat: number | null
  lng: number | null
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface FieldVisitWithEmployee extends FieldVisit {
  employee: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface ListVisitsFilters {
  companyId?: string
  employeeId?: string
  targetType?: VisitTargetType
  status?: VisitStatus
  visitType?: VisitType
  /** ISO date — visites avec completed_at OU scheduled_at après cette date. */
  fromDate?: string
  /** ISO date — visites avec completed_at OU scheduled_at avant cette date. */
  toDate?: string
  /** Limite de résultats (défaut 200, max 1000). */
  limit?: number
}

export interface CreateVisitPayload {
  company_id: string
  target_type: VisitTargetType
  target_id: string
  visit_type: VisitType
  status?: VisitStatus
  notes?: string | null
  lat?: number | null
  lng?: number | null
  scheduled_at?: string | null
  completed_at?: string | null
}

export type UpdateVisitPayload = Partial<
  Omit<FieldVisit, 'id' | 'company_id' | 'employee_id' | 'target_type' | 'target_id' | 'created_at' | 'updated_at'>
>

export const fieldVisitsApi = {
  /**
   * Liste les visites avec filtres, jointure profil employé.
   * Tri : completed_at DESC NULLS FIRST (les planifiées en haut), puis scheduled_at DESC.
   */
  async list(filters: ListVisitsFilters = {}): Promise<FieldVisitWithEmployee[]> {
    const limit = Math.min(filters.limit ?? 200, 1000)
    let q = supabase
      .from('brh_field_visits')
      .select(
        'id, company_id, employee_id, target_type, target_id, visit_type, status, notes, lat, lng, scheduled_at, completed_at, created_at, updated_at, employee:profiles!brh_field_visits_employee_id_fkey(id, full_name, avatar_url)',
      )
      .order('completed_at', { ascending: false, nullsFirst: true })
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (filters.companyId) q = q.eq('company_id', filters.companyId)
    if (filters.employeeId) q = q.eq('employee_id', filters.employeeId)
    if (filters.targetType) q = q.eq('target_type', filters.targetType)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.visitType) q = q.eq('visit_type', filters.visitType)
    if (filters.fromDate) {
      q = q.or(`completed_at.gte.${filters.fromDate},scheduled_at.gte.${filters.fromDate}`)
    }
    if (filters.toDate) {
      q = q.or(`completed_at.lte.${filters.toDate},scheduled_at.lte.${filters.toDate}`)
    }

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as unknown as FieldVisitWithEmployee[]
  },

  /**
   * Toutes les visites pour une cible donnée (prospect/artisan/agence).
   * Utile depuis la fiche détail : "qui est passé chez ce prospect ?"
   */
  async listForTarget(
    targetType: VisitTargetType,
    targetId: string,
    companyId?: string,
  ): Promise<FieldVisitWithEmployee[]> {
    let q = supabase
      .from('brh_field_visits')
      .select(
        'id, company_id, employee_id, target_type, target_id, visit_type, status, notes, lat, lng, scheduled_at, completed_at, created_at, updated_at, employee:profiles!brh_field_visits_employee_id_fkey(id, full_name, avatar_url)',
      )
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('completed_at', { ascending: false, nullsFirst: true })

    if (companyId) q = q.eq('company_id', companyId)

    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as unknown as FieldVisitWithEmployee[]
  },

  /** Crée une visite. RLS exige employee_id = auth.uid() — on laisse Postgres remplir. */
  async create(payload: CreateVisitPayload): Promise<FieldVisit> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('brh_field_visits')
      .insert({
        ...payload,
        employee_id: user.id,
        status: payload.status ?? 'planned',
      })
      .select()
      .single()
    if (error) throw error
    return data as FieldVisit
  },

  async update(id: string, patch: UpdateVisitPayload): Promise<FieldVisit> {
    const { data, error } = await supabase
      .from('brh_field_visits')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FieldVisit
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('brh_field_visits').delete().eq('id', id)
    if (error) throw error
  },

  /**
   * Marque une visite comme terminée + fixe completed_at = now() côté serveur
   * (utiliser un UPDATE explicite avec timestamp côté client est OK aussi).
   */
  async complete(id: string, status: VisitStatus, notes?: string): Promise<FieldVisit> {
    const { data, error } = await supabase
      .from('brh_field_visits')
      .update({
        status,
        completed_at: new Date().toISOString(),
        ...(notes !== undefined ? { notes } : {}),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FieldVisit
  },
}
