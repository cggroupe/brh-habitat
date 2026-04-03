import { supabase } from '@/lib/supabase'
import type { BrhCompanyRow } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'

export type CompanyUpdate = Partial<Omit<BrhCompanyRow, 'id' | 'created_at' | 'updated_at'>>

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

  let commissionsDues = 0
  let commissionsVersees = 0

  // Fallback: fetch quotes via prospects
  const { data: prospects } = await supabase
    .from('brh_prospects')
    .select('id')
    .eq('company_id', companyId)

  if (prospects && prospects.length > 0) {
    const prospectIds = prospects.map((p) => p.id)
    const { data: quotesData } = await supabase
      .from('brh_quotes')
      .select('commission_amount, commission_status')
      .in('prospect_id', prospectIds)

    for (const q of quotesData ?? []) {
      if (q.commission_status === 'versee') commissionsVersees += q.commission_amount ?? 0
      else commissionsDues += q.commission_amount ?? 0
    }
  }

  return {
    totalCa: company?.total_ca_apporte ?? 0,
    commissionsDues,
    commissionsVersees,
    level: company?.level ?? 'bronze',
    commissionRate: company?.commission_rate_percent ?? 0,
  }
}
