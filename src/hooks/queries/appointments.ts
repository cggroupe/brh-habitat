import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchUserAppointments,
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '@/api/appointments'
import type { AppointmentFilters } from '@/api/appointments'
import type { Database } from '@/types/database'

type AppointmentInsert = Database['public']['Tables']['brh_appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['brh_appointments']['Update']

export function useUserAppointments(userId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'user', userId],
    queryFn: () => fetchUserAppointments(userId!),
    enabled: !!userId,
  })
}

export function useAdminAppointments(page: number, filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ['appointments', 'admin', page, filters],
    queryFn: () => fetchAppointments(page, filters),
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AppointmentInsert) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AppointmentUpdate }) =>
      updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
