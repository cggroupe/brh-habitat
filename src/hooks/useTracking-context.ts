/**
 * Context interne pour TrackingProvider. Séparé du provider pour respecter
 * la règle ESLint react-refresh/only-export-components (un fichier .tsx
 * exporte UNIQUEMENT des composants, le contexte est exporté depuis un .ts).
 */
import { createContext } from 'react'
import type { TrackingEventType } from '@/api/brh-tracking'

export interface TrackingContextValue {
  sessionId: string | null
  trackEvent: (type: TrackingEventType, payload?: Record<string, unknown>) => void
  isTrackingActive: boolean
}

export const TrackingContext = createContext<TrackingContextValue>({
  sessionId: null,
  trackEvent: () => {},
  isTrackingActive: false,
})
