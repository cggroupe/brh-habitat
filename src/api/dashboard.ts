import { supabase } from '@/lib/supabase'
import type { BrhDiagnosticRow } from '@/types/database'

export interface DashboardStats {
  diagnostics: number
  users: number
  activeCases: number
  pendingRdv: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const results = await Promise.all([
    supabase.from('brh_diagnostics').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('brh_cases')
      .select('*', { count: 'exact', head: true })
      .in('status', ['nouveau', 'en_cours', 'devis', 'travaux']),
    supabase
      .from('brh_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'demande'),
  ])

  for (const r of results) {
    if (r.error) throw r.error
  }

  return {
    diagnostics: results[0].count ?? 0,
    users: results[1].count ?? 0,
    activeCases: results[2].count ?? 0,
    pendingRdv: results[3].count ?? 0,
  }
}

export async function fetchRecentDiagnostics(limit = 5): Promise<BrhDiagnosticRow[]> {
  const { data, error } = await supabase
    .from('brh_diagnostics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export interface UserCounts {
  homes: Record<string, number>
  cases: Record<string, number>
  diagnostics: Record<string, number>
}

export async function fetchUserCounts(userIds: string[]): Promise<UserCounts> {
  if (userIds.length === 0) {
    return { homes: {}, cases: {}, diagnostics: {} }
  }

  const [homesResult, casesResult, diagnosticsResult] = await Promise.all([
    supabase.from('brh_homes').select('user_id').in('user_id', userIds),
    supabase.from('brh_cases').select('user_id').in('user_id', userIds),
    supabase.from('brh_diagnostics').select('user_id').in('user_id', userIds),
  ])

  const homes: Record<string, number> = {}
  const cases: Record<string, number> = {}
  const diagnostics: Record<string, number> = {}

  ;(homesResult.data ?? []).forEach((h) => {
    homes[h.user_id] = (homes[h.user_id] ?? 0) + 1
  })
  ;(casesResult.data ?? []).forEach((c) => {
    cases[c.user_id] = (cases[c.user_id] ?? 0) + 1
  })
  ;(diagnosticsResult.data ?? []).forEach((d) => {
    if (d.user_id) {
      diagnostics[d.user_id] = (diagnostics[d.user_id] ?? 0) + 1
    }
  })

  return { homes, cases, diagnostics }
}
