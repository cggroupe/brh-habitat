import { supabase } from '@/lib/supabase'
import type {
  BrhDiagnosticRow,
  DiagnosticStatus,
  Database,
} from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type DiagnosticInsert = Database['public']['Tables']['brh_diagnostics']['Insert']
type DiagnosticUpdate = Database['public']['Tables']['brh_diagnostics']['Update']

export interface PaginatedDiagnostics {
  data: BrhDiagnosticRow[]
  count: number
  page: number
}

export async function fetchDiagnostics(
  page: number,
  status?: DiagnosticStatus,
): Promise<PaginatedDiagnostics> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_diagnostics')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchDiagnosticById(id: string): Promise<BrhDiagnosticRow> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function fetchUserDiagnostics(userId: string): Promise<BrhDiagnosticRow[]> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data ?? []
}

/** Récupérer le brouillon en cours d'un utilisateur (le plus récent) */
export async function fetchUserDraftDiagnostic(userId: string): Promise<BrhDiagnosticRow | null> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data
}

/** Récupérer les diagnostics terminés (non-draft) d'un utilisateur */
export async function fetchUserCompletedDiagnostics(userId: string): Promise<BrhDiagnosticRow[]> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function createDiagnostic(payload: DiagnosticInsert): Promise<BrhDiagnosticRow> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

/** Créer ou mettre à jour un brouillon de diagnostic */
export async function upsertDraftDiagnostic(
  draftId: string | null,
  payload: DiagnosticUpdate & { user_id: string },
): Promise<BrhDiagnosticRow> {
  if (draftId) {
    // Mettre à jour le brouillon existant
    const { data, error } = await supabase
      .from('brh_diagnostics')
      .update({
        ...payload,
        status: payload.status ?? 'draft',
      })
      .eq('id', draftId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Créer un nouveau brouillon
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .insert({
      user_id: payload.user_id,
      types: (payload.types as string[]) ?? [],
      property_type: (payload.property_type as string) ?? '',
      property_address: (payload.property_address as string) ?? '',
      property_surface: (payload.property_surface as number) ?? 0,
      property_year: (payload.property_year as number) ?? 0,
      property_floors: (payload.property_floors as number) ?? 0,
      symptoms: (payload.symptoms as Record<string, string[]>) ?? {},
      equipment: payload.equipment ?? {},
      current_step: (payload.current_step as number) ?? 1,
      photos: [],
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      results: null,
      status: 'draft' as const,
      admin_notes: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDiagnosticStatus(
  id: string,
  status: DiagnosticStatus,
  adminNotes?: string,
): Promise<BrhDiagnosticRow> {
  const payload: DiagnosticUpdate = { status }
  if (adminNotes !== undefined) {
    payload.admin_notes = adminNotes
  }

  const { data, error } = await supabase
    .from('brh_diagnostics')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
