/**
 * API brh_employee_calendar — Phase Employé V2.3.
 */
import { supabase } from '@/lib/supabase'

export type CalendarPeriod = 'morning' | 'afternoon'
export type CalendarStatus = 'available' | 'unavailable'

export interface CalendarSlot {
  id: string
  employee_id: string
  day_of_week: number // 0=dim, 6=sam
  period: CalendarPeriod
  status: CalendarStatus
}

export interface AvailableEmployeeForSlot {
  employee_id: string
  full_name: string
  role_label: string
  activity_score: number
  activity_level: 'standard' | 'pro' | 'expert' | 'master'
}

export const employeeCalendarApi = {
  /** Mon calendrier (employé courant). */
  async getMine(employeeId: string): Promise<CalendarSlot[]> {
    const { data, error } = await supabase
      .from('brh_employee_calendar')
      .select('*')
      .eq('employee_id', employeeId)
    if (error) throw error
    return (data ?? []) as CalendarSlot[]
  },

  /** Toggle un créneau (upsert). */
  async toggleSlot(employeeId: string, dayOfWeek: number, period: CalendarPeriod, isAvailable: boolean): Promise<void> {
    if (isAvailable) {
      // Insert ou update à 'available'
      const { error } = await supabase
        .from('brh_employee_calendar')
        .upsert(
          { employee_id: employeeId, day_of_week: dayOfWeek, period, status: 'available' },
          { onConflict: 'employee_id,day_of_week,period' },
        )
      if (error) throw error
    } else {
      // Delete pour économiser des rows (vs status='unavailable')
      const { error } = await supabase
        .from('brh_employee_calendar')
        .delete()
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek)
        .eq('period', period)
      if (error) throw error
    }
  },

  /** Employés dispo pour un créneau donné (publique, appelée depuis ContactRdvModal). */
  async availableForSlot(dayOfWeek: number, period: CalendarPeriod, limit = 3): Promise<AvailableEmployeeForSlot[]> {
    const { data, error } = await supabase.rpc('brh_available_employees_for_slot', {
      p_day_of_week: dayOfWeek,
      p_period: period,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as AvailableEmployeeForSlot[]
  },
}
