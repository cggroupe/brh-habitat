import { supabase } from '@/lib/supabase'
import type { BrhCompanyRow, CompanyProfession } from '@/types/partner'
import { PAGE_SIZE } from '@/data/constants'

export type CompanyUpdate = Partial<Omit<BrhCompanyRow, 'id' | 'created_at' | 'updated_at'>>

export interface CreateCompanyPayload {
  owner_id: string
  name: string
  siret?: string | null
  profession?: CompanyProfession | null
  /** Donnees officielles SIRENE en provenance de verify-siret */
  extra?: {
    legal_name?: string | null
    siren?: string | null
    naf_code?: string | null
    naf_label?: string | null
    entreprise_category?: string | null
    date_creation?: string | null
    address?: string | null
    city?: string | null
    postal_code?: string | null
    siret_verified_at?: string | null
  }
}

export async function createCompany(payload: CreateCompanyPayload): Promise<BrhCompanyRow> {
  const extra = payload.extra ?? {}
  const { data, error } = await supabase
    .from('brh_companies')
    .insert({
      owner_id: payload.owner_id,
      name: payload.name,
      siret: payload.siret ?? null,
      profession: payload.profession ?? null,
      ...(extra.legal_name ? { legal_name: extra.legal_name } : {}),
      ...(extra.siren ? { siren: extra.siren } : {}),
      ...(extra.naf_code ? { naf_code: extra.naf_code } : {}),
      ...(extra.naf_label ? { naf_label: extra.naf_label } : {}),
      ...(extra.entreprise_category ? { entreprise_category: extra.entreprise_category } : {}),
      ...(extra.date_creation ? { date_creation: extra.date_creation } : {}),
      ...(extra.address ? { address: extra.address } : {}),
      ...(extra.city ? { city: extra.city } : {}),
      ...(extra.postal_code ? { postal_code: extra.postal_code } : {}),
      ...(extra.siret_verified_at ? { siret_verified_at: extra.siret_verified_at } : {}),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCompanyRecruiter(companyId: string, recruitedBy: string): Promise<void> {
  // Validation serveur : le recruiter doit exister, etre actif et avoir role='pro'
  const { data: isValid, error: valErr } = await supabase
    .rpc('validate_recruiter', { p_recruiter_id: recruitedBy, p_expected_role: 'pro' })

  if (valErr) throw new Error(`Validation recruiter: ${valErr.message}`)
  if (!isValid) throw new Error('Lien de recrutement invalide ou expire.')

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
  const { data: membership, error: memberError } = await supabase
    .from('brh_company_members')
    .select('company_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle()

  if (memberError) throw memberError
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
  const { data: company, error: companyError } = await supabase
    .from('brh_companies')
    .select('total_ca_apporte, level, commission_rate_percent')
    .eq('id', companyId)
    .single()

  if (companyError) throw companyError

  // Requete unique via RPC (pas de .in() illimite)
  const { data: stats, error: statsError } = await supabase.rpc('get_company_commission_stats', { p_company_id: companyId })

  if (statsError) throw statsError

  const row = Array.isArray(stats) ? stats[0] : stats

  return {
    totalCa: company?.total_ca_apporte ?? 0,
    commissionsDues: Number(row?.dues ?? 0),
    commissionsVersees: Number(row?.versees ?? 0),
    level: company?.level ?? 'bronze',
    commissionRate: company?.commission_rate_percent ?? 0,
  }
}
