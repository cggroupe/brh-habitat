/**
 * Phase R1 — Permissions granulaires employés pros.
 *
 * Convention :
 *   - admin BRH         → toutes permissions = TRUE
 *   - pro owner         → toutes permissions = TRUE
 *   - pro member        → permissions JSONB en base (clé → boolean)
 *   - particulier       → toutes permissions = FALSE (pas concerné)
 *
 * Mirroir SQL : voir helper `brh_user_can(user_id, perm_key)` dans
 * `supabase/migrations/20260703100000_brh_refonte_r1_fondations.sql`.
 */

/** Clés permissions reconnues. À synchroniser avec le helper SQL. */
export type Permission =
  /** Voir Commissions, Abonnement, Rapport mensuel, Mes leads artisans */
  | 'canViewFinance'
  /** Inviter / supprimer / éditer membres de la company */
  | 'canManageEmployees'
  /** Exporter prospects (CSV/JSON) + bulk courriers */
  | 'canExport'
  /** Générer + envoyer courriers IA */
  | 'canSendCourriers'
  /** Recommander artisans + mes leads marketplace */
  | 'canManageMarketplace'

export type MemberPermissions = Partial<Record<Permission, boolean>>

/** Toutes les permissions = TRUE. Utilisé pour admin et owner. */
export const ALL_PERMISSIONS: Record<Permission, true> = {
  canViewFinance: true,
  canManageEmployees: true,
  canExport: true,
  canSendCourriers: true,
  canManageMarketplace: true,
}

/** Toutes les permissions = FALSE. Utilisé pour user non authentifié ou particulier. */
export const NO_PERMISSIONS: Record<Permission, false> = {
  canViewFinance: false,
  canManageEmployees: false,
  canExport: false,
  canSendCourriers: false,
  canManageMarketplace: false,
}

/** Permissions par défaut pour un nouveau member (= commercial terrain). */
export const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  canViewFinance: false,
  canManageEmployees: false,
  canExport: false,
  canSendCourriers: true,
  canManageMarketplace: true,
}
