import { supabase } from '@/lib/supabase'
import type { ProfileRow, UserRole, Database } from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface PaginatedProfiles {
  data: ProfileRow[]
  count: number
  page: number
}

export async function fetchProfiles(page: number): Promise<PaginatedProfiles> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchProfileById(id: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return data
}

export async function updateProfile(
  id: string,
  payload: Omit<ProfileUpdate, 'role'>,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateProfileRole(
  id: string,
  role: UserRole,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) throw error
}
