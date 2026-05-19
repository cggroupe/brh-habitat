import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface VisitsRecentRow {
  personne_id: string
  employee_id: string
  employee_name: string
  seen_at: string
  visit_count_total: number
}

export interface VisitsByPersonne {
  visitors: Array<{ id: string; name: string; seen_at: string }>
  total: number
}

export function useVisitsBulk(personneIds: string[]) {
  return useQuery({
    queryKey: ['brh', 'visits-recent-bulk', [...personneIds].sort().join(',')],
    queryFn: async () => {
      if (personneIds.length === 0) return new Map<string, VisitsByPersonne>()
      const { data, error } = await supabase.rpc('brh_visits_recent_bulk', {
        p_personne_ids: personneIds,
      })
      if (error) throw error
      const rows = (data ?? []) as VisitsRecentRow[]
      const map = new Map<string, VisitsByPersonne>()
      for (const r of rows) {
        const cur = map.get(r.personne_id) ?? { visitors: [], total: r.visit_count_total }
        cur.visitors.push({ id: r.employee_id, name: r.employee_name, seen_at: r.seen_at })
        cur.total = r.visit_count_total
        map.set(r.personne_id, cur)
      }
      return map
    },
    enabled: personneIds.length > 0,
    staleTime: 30_000,
  })
}
