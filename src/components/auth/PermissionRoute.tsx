/**
 * Phase R6 — Route guard par permission granulaire.
 *
 * Bloque l'accès à une route au niveau Router (pas juste UI). Si l'user
 * n'a pas la permission demandée → redirect vers `/pro`.
 *
 * Usage :
 *   <Route path="/pro/commissions" element={
 *     <PermissionRoute permission="canViewFinance">
 *       <ProCommissions />
 *     </PermissionRoute>
 *   } />
 */
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMyMembership } from '@/hooks/queries/membership'
import { userCan } from '@/lib/permissions'
import type { Permission } from '@/types/permissions'

interface PermissionRouteProps {
  permission: Permission
  children: ReactNode
  /** Route de fallback si permission refusée (défaut /pro). */
  redirectTo?: string
}

export function PermissionRoute({
  permission,
  children,
  redirectTo = '/pro',
}: PermissionRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { data: membership, isLoading: membershipLoading } = useMyMembership()

  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const ok = userCan(
    {
      userRole: user?.role ?? null,
      memberRole: membership?.memberRole ?? null,
      permissions: membership?.permissions ?? null,
    },
    permission,
  )

  return ok ? <>{children}</> : <Navigate to={redirectTo} replace />
}
