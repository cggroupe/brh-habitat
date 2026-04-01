import { supabase } from '@/lib/supabase'
import type { BrhHomeDocumentRow, Database } from '@/types/database'

type HomeDocumentInsert = Database['public']['Tables']['brh_home_documents']['Insert']
type HomeDocumentUpdate = Database['public']['Tables']['brh_home_documents']['Update']

export async function fetchDocumentsByHome(homeId: string): Promise<BrhHomeDocumentRow[]> {
  const { data, error } = await supabase
    .from('brh_home_documents')
    .select('*')
    .eq('home_id', homeId)
    .order('issued_at', { ascending: false, nullsFirst: false })

  if (error) throw error
  return data ?? []
}

export async function createDocument(payload: HomeDocumentInsert): Promise<BrhHomeDocumentRow> {
  const { data, error } = await supabase
    .from('brh_home_documents')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDocument(id: string, payload: HomeDocumentUpdate): Promise<BrhHomeDocumentRow> {
  const { data, error } = await supabase
    .from('brh_home_documents')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_home_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
