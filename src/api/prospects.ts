import { supabase } from '@/lib/supabase'
import type { BrhProspectRow, ProspectStatus } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'
import { prospectInsertSchema, type ProspectInsert } from './schemas'

export type { ProspectInsert } from './schemas'

export type ProspectUpdate = Partial<Omit<BrhProspectRow, 'id' | 'created_at' | 'updated_at'>>

export interface PaginatedProspects {
  data: BrhProspectRow[]
  count: number
  page: number
}

export async function fetchCompanyProspects(
  companyId: string,
  page: number,
  status?: ProspectStatus,
): Promise<PaginatedProspects> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_prospects')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchAllProspects(
  page: number,
  status?: ProspectStatus,
): Promise<PaginatedProspects> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_prospects')
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

export async function fetchProspectById(id: string): Promise<BrhProspectRow> {
  const { data, error } = await supabase
    .from('brh_prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProspect(payload: ProspectInsert): Promise<BrhProspectRow> {
  const validated = prospectInsertSchema.parse(payload)

  const { data, error } = await supabase
    .from('brh_prospects')
    .insert(validated)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProspect(id: string, payload: ProspectUpdate): Promise<BrhProspectRow> {
  const { data, error } = await supabase
    .from('brh_prospects')
    .update({ ...payload, status_updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_prospects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export interface ProspectStats {
  total: number
  nouveau: number
  etude: number
  devis_envoye: number
  signe: number
  termine: number
  perdu: number
}

export async function fetchCompanyProspectStats(companyId: string): Promise<ProspectStats> {
  const { data, error } = await supabase
    .from('brh_prospects')
    .select('status')
    .eq('company_id', companyId)

  if (error) throw error

  const stats: ProspectStats = { total: 0, nouveau: 0, etude: 0, devis_envoye: 0, signe: 0, termine: 0, perdu: 0 }
  for (const row of data ?? []) {
    stats.total++
    const s = row.status as keyof Omit<ProspectStats, 'total'>
    if (s in stats) stats[s]++
  }
  return stats
}
