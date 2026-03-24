import { supabase } from '@/lib/supabase'
import type { BrhHomeRow, Database } from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type HomeInsert = Database['public']['Tables']['brh_homes']['Insert']
type HomeUpdate = Database['public']['Tables']['brh_homes']['Update']

export interface HomeFilters {
  city?: string
  property_type?: string
}

export interface PaginatedHomes {
  data: BrhHomeRow[]
  count: number
  page: number
}

export async function fetchHomes(
  page: number,
  filters?: HomeFilters,
): Promise<PaginatedHomes> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_homes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`)
  }

  if (filters?.property_type) {
    query = query.eq('property_type', filters.property_type)
  }

  const { data, error, count } = await query

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchUserHomes(userId: string): Promise<BrhHomeRow[]> {
  const { data, error } = await supabase
    .from('brh_homes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function fetchHomeById(id: string): Promise<BrhHomeRow> {
  const { data, error } = await supabase
    .from('brh_homes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function createHome(payload: HomeInsert): Promise<BrhHomeRow> {
  const { data, error } = await supabase
    .from('brh_homes')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateHome(
  id: string,
  payload: HomeUpdate,
): Promise<BrhHomeRow> {
  const { data, error } = await supabase
    .from('brh_homes')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function deleteHome(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_homes')
    .delete()
    .eq('id', id)

  if (error) throw error
}
