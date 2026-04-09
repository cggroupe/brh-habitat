import { supabase } from '@/lib/supabase'

export interface RecruitedPartner {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  prospects_count: number
  signed_count: number
}

export interface RecruitmentCommission {
  id: string
  recruited_id: string
  recruited_name?: string
  source_type: string
  source_amount: number
  commission_rate_percent: number
  commission_amount: number
  status: string
  created_at: string
}

export async function fetchMyRecruits(recruiterId: string): Promise<RecruitedPartner[]> {
  // Requete unique via RPC (pas de N+1)
  const { data, error } = await supabase.rpc('get_recruit_stats', { p_recruiter_id: recruiterId })

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.profile_id as string,
    full_name: (row.full_name as string) ?? '—',
    email: row.email as string,
    role: row.role as string,
    created_at: row.created_at as string,
    prospects_count: Number(row.prospects_count ?? 0),
    signed_count: Number(row.signed_count ?? 0),
  }))
}

export async function fetchMyRecruitmentCommissions(recruiterId: string): Promise<RecruitmentCommission[]> {
  const { data, error } = await supabase
    .from('brh_recruitment_commissions')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const recruits = data ?? []
  const recruitedIds = [...new Set(recruits.map((r) => r.recruited_id).filter(Boolean))]

  let nameMap: Record<string, string> = {}
  if (recruitedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', recruitedIds)
    nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? '—']))
  }

  return recruits.map((r) => ({
    ...r,
    recruited_name: r.recruited_id ? nameMap[r.recruited_id] ?? '—' : '—',
  })) as RecruitmentCommission[]
}
