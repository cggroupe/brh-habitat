import { supabase } from '@/lib/supabase'
import type { BrhWorkHistoryRow, Database } from '@/types/database'

type WorkHistoryInsert = Database['public']['Tables']['brh_work_history']['Insert']
type WorkHistoryUpdate = Database['public']['Tables']['brh_work_history']['Update']

export async function fetchWorkHistoryByHome(homeId: string): Promise<BrhWorkHistoryRow[]> {
  const { data, error } = await supabase
    .from('brh_work_history')
    .select('*')
    .eq('home_id', homeId)
    .order('work_date', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

export async function createWorkEntry(payload: WorkHistoryInsert): Promise<BrhWorkHistoryRow> {
  const { data, error } = await supabase
    .from('brh_work_history')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWorkEntry(id: string, payload: WorkHistoryUpdate): Promise<BrhWorkHistoryRow> {
  const { data, error } = await supabase
    .from('brh_work_history')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWorkEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_work_history')
    .delete()
    .eq('id', id)

  if (error) throw error
}
