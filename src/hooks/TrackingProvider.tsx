/**
 * useTracking — provider + hook tracking employés.
 *
 * - Auto heartbeat toutes les 30s (refresh session.last_seen_at + status "online")
 * - Auto page_view à chaque changement de route
 * - Helper `trackEvent(type, payload?)` à appeler dans les boutons critiques
 *
 * RGPD : pas de tracking pour les comptes non-employé (particulier/agence/etc).
 * Le provider s'auto-désactive si role n'est pas dans ('employe', 'admin').
 *
 * Le sessionId est stocké en sessionStorage (durée onglet) — pas localStorage
 * (l'onglet fermé = session terminée).
 */
import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { brhTrackingApi, type TrackingEventType } from '@/api/brh-tracking'
import { TrackingContext } from './useTracking-context'

const SESSION_KEY = 'brh.tracking.sessionId'
const HEARTBEAT_INTERVAL_MS = 30_000

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const sessionIdRef = useRef<string | null>(null)
  const lastPathRef = useRef<string | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tracking activé uniquement pour employé + admin (RGPD : pas de tracking
  // pour les users particuliers/agences/artisans qui sont des clients, pas des
  // salariés à manager). UserRole type ne contient pas 'employe' mais profiles.role
  // peut le valoir, donc string-compare brute.
  const role = (user?.role ?? '') as string
  const isTrackingActive = !!user && (role === 'employe' || role === 'admin')

  // 1) Bootstrap session à l'auth (récupère sessionStorage ou crée nouvelle)
  useEffect(() => {
    if (!isAuthenticated || !isTrackingActive) {
      // Clean si déco
      sessionIdRef.current = null
      if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY)
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
      return
    }

    let cancelled = false
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null

    async function boot() {
      try {
        const ua = typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 256) : undefined
        const res = await brhTrackingApi.heartbeat({
          sessionId: stored,
          pagePath: location.pathname,
          userAgent: ua,
        })
        if (cancelled) return
        sessionIdRef.current = res.session_id
        if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, res.session_id)

        // Si nouvelle session (pas d'id stored OU changé), log un event 'login'
        if (!stored || stored !== res.session_id) {
          void brhTrackingApi.record({
            sessionId: res.session_id,
            eventType: 'login',
            pagePath: location.pathname,
          })
        }
      } catch {
        // silencieux — le tracking n'est pas critique
      }
    }
    void boot()

    // Setup heartbeat
    heartbeatTimerRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return
      try {
        await brhTrackingApi.heartbeat({
          sessionId: sessionIdRef.current,
          pagePath: lastPathRef.current ?? undefined,
        })
      } catch { /* silencieux */ }
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      cancelled = true
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isTrackingActive, user?.id])

  // 2) Auto page_view à chaque changement de pathname
  useEffect(() => {
    if (!isTrackingActive || !sessionIdRef.current) return
    if (lastPathRef.current === location.pathname) return
    lastPathRef.current = location.pathname
    void brhTrackingApi.record({
      sessionId: sessionIdRef.current,
      eventType: 'page_view',
      pagePath: location.pathname,
    })
  }, [location.pathname, isTrackingActive])

  // 3) Helper exposé : trackEvent(type, payload?)
  const trackEvent = useCallback(
    (type: TrackingEventType, payload?: Record<string, unknown>) => {
      if (!isTrackingActive || !sessionIdRef.current) return
      void brhTrackingApi.record({
        sessionId: sessionIdRef.current,
        eventType: type,
        pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        payload,
      })
    },
    [isTrackingActive],
  )

  return (
    <TrackingContext.Provider value={{ sessionId: sessionIdRef.current, trackEvent, isTrackingActive }}>
      {children}
    </TrackingContext.Provider>
  )
}
