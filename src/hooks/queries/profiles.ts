import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchProfiles,
  fetchProfileById,
  updateProfile,
  updateProfileRole,
  deleteProfile,
} from '@/api/profiles'
import type { UserRole } from '@/types/database'
import type { Database } from '@/types/database'

type ProfileUpdate = Omit<Database['public']['Tables']['profiles']['Update'], 'role'>

export function useAdminProfiles(page: number) {
  return useQuery({
    queryKey: ['profiles', 'admin', page],
    queryFn: () => fetchProfiles(page),
  })
}

export function useProfileDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['profiles', 'detail', id],
    queryFn: () => fetchProfileById(id!),
    enabled: !!id,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProfileUpdate }) =>
      updateProfile(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.setQueryData(['profiles', 'detail', data.id], data)
    },
  })
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateProfileRole(id, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.setQueryData(['profiles', 'detail', data.id], data)
    },
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}
