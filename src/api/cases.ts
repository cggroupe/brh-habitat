import { supabase } from '@/lib/supabase'
import type { BrhCaseRow, CaseStatus, Database } from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type CaseInsert = Database['public']['Tables']['brh_cases']['Insert']
type CaseUpdate = Database['public']['Tables']['brh_cases']['Update']

export interface PaginatedCases {
  data: BrhCaseRow[]
  count: number
  page: number
}

export async function fetchCases(
  page: number,
  status?: CaseStatus,
): Promise<PaginatedCases> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_cases')
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

export async function fetchUserCases(userId: string): Promise<BrhCaseRow[]> {
  const { data, error } = await supabase
    .from('brh_cases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function fetchCaseById(id: string): Promise<BrhCaseRow> {
  const { data, error } = await supabase
    .from('brh_cases')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function createCase(payload: CaseInsert): Promise<BrhCaseRow> {
  const { data, error } = await supabase
    .from('brh_cases')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateCase(
  id: string,
  payload: CaseUpdate,
): Promise<BrhCaseRow> {
  const { data, error } = await supabase
    .from('brh_cases')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
