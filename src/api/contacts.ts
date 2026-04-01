import { supabase } from '@/lib/supabase'
import type { BrhContactRow, ContactStatus, Database } from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type ContactInsert = Database['public']['Tables']['brh_contacts']['Insert']
type ContactUpdate = Database['public']['Tables']['brh_contacts']['Update']

export interface PaginatedContacts {
  data: BrhContactRow[]
  count: number
  page: number
}

export async function createContact(
  payload: ContactInsert,
): Promise<BrhContactRow> {
  const { data, error } = await supabase
    .from('brh_contacts')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function fetchContacts(
  page: number,
  status?: ContactStatus,
): Promise<PaginatedContacts> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_contacts')
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

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
  adminNotes?: string,
): Promise<BrhContactRow> {
  const payload: ContactUpdate = { status }
  if (adminNotes !== undefined) {
    payload.admin_notes = adminNotes
  }

  const { data, error } = await supabase
    .from('brh_contacts')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
