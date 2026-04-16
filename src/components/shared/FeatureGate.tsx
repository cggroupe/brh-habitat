import { Navigate, useLocation } from 'react-router-dom'
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
 * Version route : redirige vers le dashboard du portail si la feature est desactivee.
 * Detecte automatiquement le portail actif via l'URL.
 */
export function FeatureRoute({ feature, children }: { feature: keyof TenantFeatures; children: React.ReactNode }) {
  const enabled = useFeature(feature)
  const { pathname } = useLocation()

  if (!enabled) {
    // Rediriger vers le dashboard du portail actif au lieu de la homepage publique
    if (pathname.startsWith('/pro')) return <Navigate to="/pro" replace />
    if (pathname.startsWith('/particulier')) return <Navigate to="/particulier" replace />
    if (pathname.startsWith('/admin')) return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
