/**
 * Phase 16.1 — Permissions granulaires employés agence.
 *
 * Pattern miroir de src/types/permissions.ts (Pro).
 *
 * Convention :
 *   - admin BRH         → toutes permissions = TRUE
 *   - signer agence     → toutes permissions = TRUE
 *   - employee agence   → permissions JSONB en base (clé → boolean)
 *   - autres            → toutes permissions = FALSE
 *
 * Source SQL : voir helper `brh_user_belongs_to_agence` /
 * `brh_user_is_signer_of_agence` dans
 * `supabase/migrations/20260706160000_brh_agence_members.sql`.
 */

/** Clés permissions reconnues côté agence. */
export type AgencePermission =
  /** Voir + claim les leads / prospects scorés (Mes leads, Score Vente). */
  | 'canManageLeads'
  /** Lancer le simulateur énergétique + sauvegarder études. */
  | 'canSimulate'
  /** Publier sur réseaux sociaux + soumettre preuves de publication. */
  | 'canShareSocial'
  /** Voir commissions, abonnement, parrainage. */
  | 'canViewCommissions'
  /** Inviter / retirer / régler permissions des autres employés. */
  | 'canManageTeam'

export type AgenceMemberPermissions = Partial<Record<AgencePermission, boolean>>

/** Toutes les permissions = TRUE — utilisé pour signer & admin. */
export const ALL_AGENCE_PERMISSIONS: Record<AgencePermission, true> = {
  canManageLeads: true,
  canSimulate: true,
  canShareSocial: true,
  canViewCommissions: true,
  canManageTeam: true,
}

/** Permissions par défaut pour un nouvel employé (commercial terrain). */
export const DEFAULT_EMPLOYEE_PERMISSIONS: AgenceMemberPermissions = {
  canManageLeads: true,
  canSimulate: true,
  canShareSocial: true,
  canViewCommissions: false,
  canManageTeam: false,
}

/** Liste ordonnée des permissions, pour rendre les toggles UI. */
export const AGENCE_PERMISSION_DEFS: Array<{
  key: AgencePermission
  label: string
  description: string
}> = [
  {
    key: 'canManageLeads',
    label: 'Gérer les leads',
    description: 'Voir et claim les prospects scorés (Mes leads, Score Vente).',
  },
  {
    key: 'canSimulate',
    label: 'Lancer simulations',
    description: 'Utiliser le simulateur énergétique et sauvegarder les études.',
  },
  {
    key: 'canShareSocial',
    label: 'Publier sur réseaux',
    description: 'Soumettre des publications réseaux pour récompense en leads.',
  },
  {
    key: 'canViewCommissions',
    label: 'Voir commissions',
    description: 'Accéder aux commissions, abonnement et parrainage.',
  },
  {
    key: 'canManageTeam',
    label: 'Gérer l\'équipe',
    description: 'Inviter / retirer / régler permissions des autres employés.',
  },
]
