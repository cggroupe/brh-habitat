import { supabase } from '@/lib/supabase'
import type { BrhCompanyRow, CompanyProfession } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'

export type CompanyUpdate = Partial<Omit<BrhCompanyRow, 'id' | 'created_at' | 'updated_at'>>

export interface CreateCompanyPayload {
  owner_id: string
  name: string
  siret?: string | null
  profession?: CompanyProfession | null
}

export async function createCompany(payload: CreateCompanyPayload): Promise<BrhCompanyRow> {
  const { data, error } = await supabase
    .from('brh_companies')
    .insert({
      owner_id: payload.owner_id,
      name: payload.name,
      siret: payload.siret ?? null,
      profession: payload.profession ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCompanyRecruiter(companyId: string, recruitedBy: string): Promise<void> {
  const { error } = await supabase
    .from('brh_companies')
    .update({ recruited_by: recruitedBy })
    .eq('id', companyId)

  if (error) throw error
}

export interface PaginatedCompanies {
  data: BrhCompanyRow[]
  count: number
  page: number
}

export async function fetchMyCompany(userId: string): Promise<BrhCompanyRow | null> {
  const { data: membership } = await supabase
    .from('brh_company_members')
    .select('company_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  const { data, error } = await supabase
    .from('brh_companies')
    .select('*')
    .eq('id', membership.company_id)
    .single()

  if (error) throw error
  return data
}

export async function fetchCompanyById(id: string): Promise<BrhCompanyRow> {
  const { data, error } = await supabase
    .from('brh_companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function fetchAllCompanies(page: number): Promise<PaginatedCompanies> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('brh_companies')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: data ?? [], count: count ?? 0, page }
}

export async function updateCompany(id: string, payload: CompanyUpdate): Promise<BrhCompanyRow> {
  const { data, error } = await supabase
    .from('brh_companies')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export interface CompanyDashboardStats {
  totalCa: number
  commissionsDues: number
  commissionsVersees: number
  level: string
  commissionRate: number
}

export async function fetchCompanyDashboardStats(companyId: string): Promise<CompanyDashboardStats> {
  const { data: company } = await supabase
    .from('brh_companies')
    .select('total_ca_apporte, level, commission_rate_percent')
    .eq('id', companyId)
    .single()

  // Requete unique via RPC (pas de .in() illimite)
  const { data: stats } = await supabase.rpc('get_company_commission_stats', { p_company_id: companyId })

  const row = Array.isArray(stats) ? stats[0] : stats

  return {
    totalCa: company?.total_ca_apporte ?? 0,
    commissionsDues: Number(row?.dues ?? 0),
    commissionsVersees: Number(row?.versees ?? 0),
    level: company?.level ?? 'bronze',
    commissionRate: company?.commission_rate_percent ?? 0,
  }
}
