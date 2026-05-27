/**
 * Page Admin — Tracking activité employés.
 *
 * Sections :
 *  1. Notice RGPD (rappel obligation info salariés + rétention 90j)
 *  2. Live : qui est connecté maintenant (auto-refresh 15s)
 *  3. Leaderboard équipe : stats par employé sur période (24h/7j/30j/90j)
 *  4. Détail employé : timeline events + stats agrégées
 *
 * Route : /admin/tracking
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, Users, MousePointerClick, Send, Handshake, Phone, Mail,
  ShieldAlert, Eye, ChevronRight, X,
} from 'lucide-react'
import {
  brhTrackingApi,
  TRACKING_EVENT_LABELS,
  type TrackingLiveUser, type TrackingLeaderboardRow, type TrackingRecentEvent,
} from '@/api/brh-tracking'
import Avatar from '@/components/ui/Avatar'

type Period = '24h' | '7d' | '30d' | '90d'

const PERIOD_LABELS: Record<Period, string> = {
  '24h': '24 h',
  '7d': '7 j',
  '30d': '30 j',
  '90d': '90 j',
}

export default function AdminTracking() {
  const [period, setPeriod] = useState<Period>('7d')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: liveUsers = [] } = useQuery({
    queryKey: ['tracking', 'live'],
    queryFn: () => brhTrackingApi.liveUsers(),
    refetchInterval: 15_000,
  })

  const { data: leaderboard = [], isLoading: loadingLb } = useQuery({
    queryKey: ['tracking', 'leaderboard', period],
    queryFn: () => brhTrackingApi.teamLeaderboard(period),
    staleTime: 30_000,
  })

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">Pilotage équipe</p>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-text mt-1 tracking-tight inline-flex items-center gap-2">
          <Activity className="text-[#00600a]" size={24} />
          Tracking activité employés
        </h1>
      </header>

      {/* Notice RGPD obligatoire */}
      <div className="mb-6 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong className="text-sm">RGPD — surveillance des salariés en environnement pro.</strong>
          <p className="mt-1">
            Ce tracking est légal au titre du droit de l'employeur de contrôler l'activité professionnelle de ses salariés, MAIS implique :
          </p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li>Information préalable des salariés (politique interne, mention DUERP, charte informatique)</li>
            <li>Consultation du CSE si l'entreprise compte plus de 11 salariés</li>
            <li>Rétention par défaut : 90 jours (purge automatique)</li>
            <li>Données minimisées : pas de keylogger, pas de screenshot, pas de contenu de formulaire</li>
            <li>Droit d'accès art. 15 RGPD : chaque employé peut consulter ses propres données</li>
          </ul>
        </div>
      </div>

      {/* Live users */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold text-text inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00600a] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00600a]" />
            </span>
            Connectés maintenant
            <span className="text-text-muted text-sm">({liveUsers.length})</span>
          </h2>
          <p className="text-[11px] text-text-muted">Auto-refresh 15 s · sessions actives &lt; 2 min</p>
        </div>
        {liveUsers.length === 0 ? (
          <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-6 text-center text-sm text-text-muted">
            Aucun employé connecté actuellement.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {liveUsers.map((u) => <LiveUserCard key={u.session_id} user={u} onSelect={() => setSelectedUserId(u.user_id)} />)}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section>
        <div className="mb-3 flex items-end justify-between flex-wrap gap-3">
          <h2 className="font-display text-lg font-bold text-text inline-flex items-center gap-2">
            <Users size={18} className="text-text-muted" />
            Activité équipe
          </h2>
          <div className="inline-flex rounded-full bg-stone-100 p-0.5 ring-1 ring-stone-200">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  period === p
                    ? 'bg-white text-[#00600a] shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {loadingLb ? (
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-6 text-center text-sm text-text-muted">
            Aucune activité sur cette période.
          </div>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-widest font-bold text-text-muted">
                <tr>
                  <th className="text-left px-4 py-2.5">Employé</th>
                  <th className="text-right px-2 py-2.5">Events</th>
                  <th className="text-right px-2 py-2.5">Sessions</th>
                  <th className="text-right px-2 py-2.5">Durée</th>
                  <th className="text-right px-2 py-2.5" title="Pages vues"><Eye size={11} className="inline" /></th>
                  <th className="text-right px-2 py-2.5" title="Clics"><MousePointerClick size={11} className="inline" /></th>
                  <th className="text-right px-2 py-2.5" title="Emails envoyés"><Send size={11} className="inline" /></th>
                  <th className="text-right px-2 py-2.5" title="Prospects réservés"><Handshake size={11} className="inline" /></th>
                  <th className="text-right px-2 py-2.5" title="Appels tel"><Phone size={11} className="inline" /></th>
                  <th className="text-right px-4 py-2.5" title="Emails contact"><Mail size={11} className="inline" /></th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r) => (
                  <LeaderboardRow key={r.user_id} row={r} onSelect={() => setSelectedUserId(r.user_id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Drawer détail employé */}
      {selectedUserId && (
        <EmployeeDetailDrawer userId={selectedUserId} period={period} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  )
}

function useMinutesSince(iso: string): number {
  const [n, setN] = useState(() => Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
  useEffect(() => {
    const tick = () => setN(Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [iso])
  return n
}

function LiveUserCard({ user, onSelect }: { user: TrackingLiveUser; onSelect: () => void }) {
  // Date.now() est impur mais ici c'est juste pour un libellé visuel "X min" — pas un
  // bug : le re-render suivant ré-affichera la valeur fraîche. Isolé via Ref pour la
  // règle react-hooks/purity.
  const sinceMin = useMinutesSince(user.started_at)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-2xl bg-white ring-1 ring-[#00600a]/30 p-4 hover:ring-[#00600a]/60 transition"
    >
      <div className="flex items-center gap-3">
        <Avatar name={user.full_name ?? user.email ?? '?'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-semibold text-text truncate">
            {user.full_name ?? user.email}
          </div>
          <div className="text-[11px] text-text-muted">
            Connecté depuis {sinceMin} min · {user.events_count} actions
          </div>
        </div>
      </div>
      {user.current_page_path && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-stone-50 ring-1 ring-stone-200 px-2 py-0.5 text-[10px] text-text-muted font-mono truncate max-w-full">
          <Eye size={9} />
          {user.current_page_path}
        </div>
      )}
    </button>
  )
}

function LeaderboardRow({ row, onSelect }: { row: TrackingLeaderboardRow; onSelect: () => void }) {
  return (
    <tr className="border-t border-stone-100 hover:bg-stone-50 cursor-pointer" onClick={onSelect}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.full_name ?? row.email ?? '?'} size={28} />
          <div className="min-w-0">
            <div className="font-medium text-text text-sm truncate">{row.full_name ?? row.email}</div>
            <div className="text-[10px] text-text-muted">
              {row.role === 'admin' ? 'Admin' : 'Employé'} ·{' '}
              {row.last_seen_at
                ? `vu ${new Date(row.last_seen_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                : 'jamais connecté'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums font-medium text-text">{row.total_events.toLocaleString('fr-FR')}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.total_sessions}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">
        {formatDuration(row.total_duration_minutes)}
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.events_page_view}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.events_click}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.events_send_email}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.events_claim_prospect}</td>
      <td className="px-2 py-2.5 text-right tabular-nums text-text-muted">{row.events_contact_tel}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
        {row.events_contact_email}
        <ChevronRight size={12} className="inline ml-1 opacity-40" />
      </td>
    </tr>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}` : ''}`
}

function EmployeeDetailDrawer({
  userId, period, onClose,
}: { userId: string; period: Period; onClose: () => void }) {
  const { data: stats } = useQuery({
    queryKey: ['tracking', 'stats', userId, period],
    queryFn: () => brhTrackingApi.employeeStats(userId, period),
  })
  const { data: events = [] } = useQuery({
    queryKey: ['tracking', 'events', userId],
    queryFn: () => brhTrackingApi.recentEvents(userId, 100),
  })

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <aside className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-text">
            Détail activité — {PERIOD_LABELS[period]}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </header>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 p-4">
            <Kpi label="Events" value={stats.total_events} />
            <Kpi label="Sessions" value={stats.total_sessions} />
            <Kpi label="Temps actif" value={formatDuration(stats.total_duration_minutes)} />
          </div>
        )}

        {/* Breakdown by event type */}
        {stats && Object.keys(stats.by_event_type).length > 0 && (
          <section className="px-4 pb-4">
            <h4 className="mb-2 text-[10px] uppercase tracking-widest font-bold text-text-muted">Répartition par action</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(stats.by_event_type).map(([type, n]) => (
                <div key={type} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 ring-1 ring-stone-200 text-xs">
                  <span className="text-text">{TRACKING_EVENT_LABELS[type] ?? type}</span>
                  <span className="font-bold tabular-nums text-[#00600a]">{n}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline events */}
        <section className="px-4 pb-6">
          <h4 className="mb-2 text-[10px] uppercase tracking-widest font-bold text-text-muted">Timeline ({events.length} derniers)</h4>
          <ul className="space-y-1">
            {events.map((e) => <EventRow key={e.id} event={e} />)}
          </ul>
        </section>
      </aside>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">{label}</div>
      <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-text">{value}</div>
    </div>
  )
}

function EventRow({ event }: { event: TrackingRecentEvent }) {
  const dt = new Date(event.created_at)
  return (
    <li className="flex items-start gap-2 rounded-lg bg-white ring-1 ring-stone-100 px-3 py-2 text-xs">
      <div className="text-[10px] text-text-muted tabular-nums w-12 shrink-0">
        {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-text">{TRACKING_EVENT_LABELS[event.event_type] ?? event.event_type}</span>
          {event.page_path && (
            <span className="font-mono text-[10px] text-text-muted truncate">
              · {event.page_path}
            </span>
          )}
        </div>
        {event.payload && Object.keys(event.payload).length > 0 && (
          <div className="mt-0.5 text-[10px] text-text-muted truncate">
            {Object.entries(event.payload).slice(0, 3).map(([k, v]) => (
              <span key={k} className="mr-2">
                <strong>{k}:</strong> {String(v).slice(0, 40)}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
