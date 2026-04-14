import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logError } from '@/lib/error'
import {
  fetchUserHomes,
  fetchHomeById,
  fetchHomes,
  createHome,
  updateHome,
  deleteHome,
} from '@/api/homes'
import type { HomeFilters } from '@/api/homes'
import type { Database } from '@/types/database'

type HomeInsert = Database['public']['Tables']['brh_homes']['Insert']
type HomeUpdate = Database['public']['Tables']['brh_homes']['Update']

export function useUserHomes(userId: string | undefined) {
  return useQuery({
    queryKey: ['homes', 'user', userId],
    queryFn: () => fetchUserHomes(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

export function useHomeDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['homes', 'detail', id],
    queryFn: () => fetchHomeById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

export function useAdminHomes(page: number, filters?: HomeFilters) {
  return useQuery({
    queryKey: ['homes', 'admin', page, filters],
    queryFn: () => fetchHomes(page, filters),
  })
}

export function useCreateHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: HomeInsert) => createHome(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useCreateHome', err),
  })
}

export function useUpdateHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: HomeUpdate }) =>
      updateHome(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.setQueryData(['homes', 'detail', data.id], data)
    },
    onError: (err) => logError('useUpdateHome', err),
  })
}

export function useDeleteHome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteHome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
    onError: (err) => logError('useDeleteHome', err),
  })
}
