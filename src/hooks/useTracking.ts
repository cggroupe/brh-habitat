/**
 * Hook useTracking — accède au context exposé par TrackingProvider.
 */
import { useContext } from 'react'
import { TrackingContext } from './useTracking-context'

export function useTracking() {
  return useContext(TrackingContext)
}
