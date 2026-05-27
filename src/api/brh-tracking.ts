/**
 * API client tracking employés — sessions + events.
 *
 * RGPD : ne stocke aucune donnée intrusive (pas de keylogger, pas de contenu
 * de formulaire, pas de geoloc). Just timeline d'events pro (login, page_view,
 * click, send_email, claim_prospect…) + heartbeat pour "online status".
 */
import { supabase } from '@/lib/supabase'

export type TrackingEventType =
  | 'login'
  | 'logout'
  | 'page_view'
  | 'click'
  | 'send_email'
  | 'claim_prospect'
  | 'unclaim_prospect'
  | 'contact_tel'
  | 'contact_email'
  | 'open_fiche'
  | string

export interface TrackingLiveUser {
  user_id: string
  full_name: string | null
  email: string | null
  role: string | null
  session_id: string
  started_at: string
  last_seen_at: string
  events_count: number
  current_page_path: string | null
}

export interface TrackingEmployeeStats {
  user_id: string
  period: '24h' | '7d' | '30d' | '90d'
  since: string
  total_events: number
  total_sessions: number
  total_duration_minutes: number
  last_seen_at: string | null
  by_event_type: Record<string, number>
  by_day: Record<string, number>
}

export interface TrackingRecentEvent {
  id: number
  user_id: string
  user_full_name: string | null
  session_id: string | null
  event_type: string
  page_path: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export interface TrackingLeaderboardRow {
  user_id: string
  full_name: string | null
  email: string | null
  role: string | null
  total_events: number
  total_sessions: number
  total_duration_minutes: number
  last_seen_at: string | null
  events_login: number
  events_click: number
  events_page_view: number
  events_send_email: number
  events_claim_prospect: number
  events_contact_tel: number
  events_contact_email: number
}

export const brhTrackingApi = {
  async heartbeat(args: { sessionId?: string | null; pagePath?: string; userAgent?: string }) {
    const { data, error } = await supabase.rpc('brh_tracking_heartbeat', {
      p_session_id: args.sessionId ?? undefined,
      p_page_path: args.pagePath ?? undefined,
      p_user_agent: args.userAgent ?? undefined,
      p_ip_prefix: undefined,
    })
    if (error) throw error
    return data as { session_id: string }
  },

  async record(args: {
    sessionId: string | null
    eventType: TrackingEventType
    pagePath?: string
    payload?: Record<string, unknown>
  }) {
    // p_session_id est UUID NOT NULL côté PG ; on ne devrait pas appeler record
    // sans session active (skip silencieux si sessionId est null pour ne pas
    // crash sur les events parasites pré-bootstrap)
    if (!args.sessionId) return
    const { error } = await supabase.rpc('brh_tracking_record_event', {
      p_session_id: args.sessionId,
      p_event_type: args.eventType,
      p_page_path: args.pagePath ?? undefined,
      p_payload: (args.payload ?? null) as never,
    })
    if (error) throw error
  },

  async liveUsers(): Promise<TrackingLiveUser[]> {
    const { data, error } = await supabase.rpc('brh_tracking_live_users')
    if (error) throw error
    return (data ?? []) as TrackingLiveUser[]
  },

  async employeeStats(userId: string | null, period: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<TrackingEmployeeStats> {
    const { data, error } = await supabase.rpc('brh_tracking_employee_stats', {
      p_user_id: userId ?? undefined,
      p_period: period,
    })
    if (error) throw error
    return data as unknown as TrackingEmployeeStats
  },

  async recentEvents(userId: string | null, limit = 50): Promise<TrackingRecentEvent[]> {
    const { data, error } = await supabase.rpc('brh_tracking_recent_events', {
      p_user_id: userId ?? undefined,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as TrackingRecentEvent[]
  },

  async teamLeaderboard(period: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<TrackingLeaderboardRow[]> {
    const { data, error } = await supabase.rpc('brh_tracking_team_leaderboard', { p_period: period })
    if (error) throw error
    return (data ?? []) as TrackingLeaderboardRow[]
  },
}

export const TRACKING_EVENT_LABELS: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  page_view: 'Page vue',
  click: 'Clic',
  send_email: 'Email envoyé',
  claim_prospect: 'Prospect réservé',
  unclaim_prospect: 'Prospect libéré',
  contact_tel: 'Appel tel',
  contact_email: 'Email (lien direct)',
  open_fiche: 'Fiche ouverte',
}
