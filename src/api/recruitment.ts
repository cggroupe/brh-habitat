import { supabase } from '@/lib/supabase'

export interface RecruitedPartner {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  // Stats
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
  // Chercher les affilies recrutes
  const { data: affiliateRecruits } = await supabase
    .from('brh_affiliates')
    .select('id')
    .eq('recruited_by', recruiterId)

  // Chercher les companies recrutees
  const { data: companyRecruits } = await supabase
    .from('brh_companies')
    .select('owner_id')
    .eq('recruited_by', recruiterId)

  const recruitedIds = [
    ...(affiliateRecruits ?? []).map((a) => a.id),
    ...(companyRecruits ?? []).filter((c) => c.owner_id).map((c) => c.owner_id!),
  ]

  if (recruitedIds.length === 0) return []

  // Charger les profils
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .in('id', recruitedIds)

  // Charger les stats prospects par recrue
  const result: RecruitedPartner[] = []
  for (const profile of profiles ?? []) {
    let prospectsCount = 0
    let signedCount = 0

    if (profile.role === 'particulier') {
      const { count: total } = await supabase
        .from('brh_prospects')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', profile.id)
      const { count: signed } = await supabase
        .from('brh_prospects')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', profile.id)
        .in('status', ['signe', 'termine'])
      prospectsCount = total ?? 0
      signedCount = signed ?? 0
    } else if (profile.role === 'pro') {
      const { data: company } = await supabase
        .from('brh_companies')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)
        .maybeSingle()
      if (company) {
        const { count: total } = await supabase
          .from('brh_prospects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
        const { count: signed } = await supabase
          .from('brh_prospects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .in('status', ['signe', 'termine'])
        prospectsCount = total ?? 0
        signedCount = signed ?? 0
      }
    }

    result.push({
      id: profile.id,
      full_name: profile.full_name ?? '—',
      email: profile.email,
      role: profile.role,
      created_at: profile.created_at,
      prospects_count: prospectsCount,
      signed_count: signedCount,
    })
  }

  return result
}

export async function fetchMyRecruitmentCommissions(recruiterId: string): Promise<RecruitmentCommission[]> {
  const { data, error } = await supabase
    .from('brh_recruitment_commissions')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Enrichir avec les noms des recrues
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
