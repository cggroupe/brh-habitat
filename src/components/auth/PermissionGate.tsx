/**
 * Phase R1 — `<PermissionGate>` : masque les enfants si la permission n'est
 * pas accordée à l'utilisateur courant.
 *
 * Usage :
 *
 *   <PermissionGate permission="canViewFinance">
 *     <Link to="/pro/commissions">Commissions</Link>
 *   </PermissionGate>
 *
 *   <PermissionGate permission="canExport" fallback={<UpgradePrompt />}>
 *     <ExportButton />
 *   </PermissionGate>
 *
 * Pas de loader pendant le fetch membership : on render `null` en attendant
 * pour éviter les flashes de contenu autorisé puis masqué.
 */
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyMembership } from '@/hooks/queries/membership'
import { userCan } from '@/lib/permissions'
import type { Permission } from '@/types/permissions'

interface PermissionGateProps {
  permission: Permission
  children: ReactNode
  /** Affiché si la permission est refusée. Par défaut : rien (mask total). */
  fallback?: ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { user, loading: authLoading } = useAuth()
  const { data: membership, isLoading: membershipLoading } = useMyMembership()

  // Pendant le chargement initial, on masque pour éviter le flash.
  if (authLoading || membershipLoading) return null

  const ok = userCan(
    {
      userRole: user?.role ?? null,
      memberRole: membership?.memberRole ?? null,
      permissions: membership?.permissions ?? null,
    },
    permission,
  )

  return <>{ok ? children : fallback}</>
}
