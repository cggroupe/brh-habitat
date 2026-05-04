/**
 * Phase R1 — Résolveur de permissions (pur, testable sans DB).
 *
 * Utilisé côté front via le hook `useMyMembership()` + composant
 * `<PermissionGate>` pour masquer les actions sensibles aux membres
 * non-owner d'une company pro.
 *
 * Mirroir du helper SQL `brh_user_can(user_id, perm_key)` — toute
 * modification ici doit être synchronisée avec la migration R1.
 */
import type { UserRole, MemberRole } from '@/types/database'
import type { Permission, MemberPermissions } from '@/types/permissions'

interface ResolveContext {
  /** Rôle global de l'utilisateur (admin / pro / particulier). */
  userRole: UserRole | null
  /** Rôle dans la company pro (owner / member). null = pas de membership. */
  memberRole: MemberRole | null
  /** Permissions JSONB granulaires (member uniquement). */
  permissions: MemberPermissions | null
}

/**
 * Décide si l'utilisateur a la permission demandée.
 *
 * Règles :
 *   1. admin BRH → TRUE (override)
 *   2. pas authentifié → FALSE
 *   3. pas de membership pro → FALSE (particulier ou pro orphelin)
 *   4. owner → TRUE (toutes)
 *   5. member → lookup JSONB, FALSE par défaut
 */
export function userCan(ctx: ResolveContext, key: Permission): boolean {
  if (ctx.userRole === 'admin') return true
  if (!ctx.userRole) return false
  if (!ctx.memberRole) return false
  if (ctx.memberRole === 'owner') return true
  return ctx.permissions?.[key] === true
}

/**
 * Renvoie l'ensemble des permissions résolues (utile pour debug + UI affichage).
 */
export function resolveAllPermissions(ctx: ResolveContext): Record<Permission, boolean> {
  const keys: Permission[] = [
    'canViewFinance',
    'canManageEmployees',
    'canExport',
    'canSendCourriers',
    'canManageMarketplace',
  ]
  const result = {} as Record<Permission, boolean>
  for (const key of keys) result[key] = userCan(ctx, key)
  return result
}
