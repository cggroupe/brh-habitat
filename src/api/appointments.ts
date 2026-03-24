import { supabase } from '@/lib/supabase'
import type {
  BrhAppointmentRow,
  AppointmentType,
  AppointmentStatus,
  Database,
} from '@/types/database'
import { PAGE_SIZE } from '@/data/constants'

type AppointmentInsert = Database['public']['Tables']['brh_appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['brh_appointments']['Update']

export interface AppointmentFilters {
  type?: AppointmentType
  status?: AppointmentStatus
}

export interface PaginatedAppointments {
  data: BrhAppointmentRow[]
  count: number
  page: number
}

export async function fetchAppointments(
  page: number,
  filters?: AppointmentFilters,
): Promise<PaginatedAppointments> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('brh_appointments')
    .select('*', { count: 'exact' })
    .order('requested_date', { ascending: false })
    .range(from, to)

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error, count } = await query

  if (error) throw error

  return { data: data ?? [], count: count ?? 0, page }
}

export async function fetchUserAppointments(userId: string): Promise<BrhAppointmentRow[]> {
  const { data, error } = await supabase
    .from('brh_appointments')
    .select('*')
    .eq('user_id', userId)
    .order('requested_date', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function createAppointment(
  payload: AppointmentInsert,
): Promise<BrhAppointmentRow> {
  const { data, error } = await supabase
    .from('brh_appointments')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function updateAppointment(
  id: string,
  payload: AppointmentUpdate,
): Promise<BrhAppointmentRow> {
  const { data, error } = await supabase
    .from('brh_appointments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return data
}
