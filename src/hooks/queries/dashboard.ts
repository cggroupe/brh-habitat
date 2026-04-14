import { useQuery } from '@tanstack/react-query'
import {
  fetchDashboardStats,
  fetchRecentDiagnostics,
  fetchUserCounts,
} from '@/api/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60_000,
  })
}

export function useRecentDiagnostics(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'recent-diagnostics', limit],
    queryFn: () => fetchRecentDiagnostics(limit),
  })
}

export function useUserCounts(userIds: string[]) {
  return useQuery({
    queryKey: ['dashboard', 'user-counts', userIds],
    queryFn: () => fetchUserCounts(userIds),
    enabled: userIds.length > 0,
  })
}
