import { Navigate } from 'react-router-dom'
import { useFeature } from '@/hooks/useFeature'
import type { TenantFeatures } from '@/config/tenant.types'

interface FeatureGateProps {
  feature: keyof TenantFeatures
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Affiche les children uniquement si la feature est activee.
 * Sinon, redirige vers / ou affiche le fallback.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const enabled = useFeature(feature)
  if (!enabled) return fallback ? <>{fallback}</> : null
  return <>{children}</>
}

/**
 * Version route : redirige vers / si la feature est desactivee.
 * Usage: <FeatureRoute feature="aiChiffrage"><ProChiffrage /></FeatureRoute>
 */
export function FeatureRoute({ feature, children }: { feature: keyof TenantFeatures; children: React.ReactNode }) {
  const enabled = useFeature(feature)
  if (!enabled) return <Navigate to="/" replace />
  return <>{children}</>
}
