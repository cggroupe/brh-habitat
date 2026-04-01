import { supabase } from '@/lib/supabase'
import type { BrhHealthRecordRow, Database } from '@/types/database'

type HealthRecordInsert = Database['public']['Tables']['brh_health_records']['Insert']

export async function fetchHealthRecordsByHome(homeId: string): Promise<BrhHealthRecordRow[]> {
  const { data, error } = await supabase
    .from('brh_health_records')
    .select('*')
    .eq('home_id', homeId)
    .order('domain')

  if (error) throw error
  return data ?? []
}

export async function upsertHealthRecord(payload: HealthRecordInsert): Promise<BrhHealthRecordRow> {
  const { data, error } = await supabase
    .from('brh_health_records')
    .upsert(payload, { onConflict: 'home_id,domain' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_health_records')
    .delete()
    .eq('id', id)

  if (error) throw error
}
