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

export async function createDiagnostic(payload: DiagnosticInsert): Promise<BrhDiagnosticRow> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .insert(payload)
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
