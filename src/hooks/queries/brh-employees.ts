/**
 * Hooks React Query — brh_employees.
 */
import { useQuery } from '@tanstack/react-query'
import { employeesApi } from '@/api/brh-employees'

export const EMPLOYEES_KEY = ['brh-employees'] as const

export function useMyEmployee() {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'me'] as const,
    queryFn: () => employeesApi.getMine(),
    staleTime: 60_000,
  })
}

export function useActiveEmployees() {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'active'] as const,
    queryFn: () => employeesApi.listActive(),
    staleTime: 5 * 60_000,
  })
}

export function useMyRecentActions(employeeId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'actions', employeeId, limit] as const,
    queryFn: () => (employeeId ? employeesApi.myRecentActions(employeeId, limit) : Promise.resolve([])),
    enabled: !!employeeId,
    staleTime: 30_000,
  })
}
