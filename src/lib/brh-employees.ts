/**
 * Liste des employés BRH (V1 — registre statique).
 *
 * Plus tard : remplacer par une table `brh_employees` en DB avec :
 *   - profile_id (FK profiles)
 *   - role_label (ex: 'commercial', 'opérationnel', 'direction')
 *   - calendar_url (lien Calendly ou table brh_employee_calendar)
 *   - signature_html (signature email personnalisée)
 *   - activity_score (calculé auto via brh_employee_actions)
 *   - active (bool)
 *
 * Pour l'instant : check par email. Permet de basculer Pierre Collard
 * et toute future personne BRH sur EmployeShell sans migration DB.
 */

export interface BrhEmployee {
  email: string
  full_name: string
  role_label: string
  /** Score d'activité fake pour V1 — à remplacer par calcul DB */
  activity_score: number
  /** Niveau dérivé du score : standard / pro / expert / master */
  activity_level: 'standard' | 'pro' | 'expert' | 'master'
}

export const BRH_EMPLOYEES: BrhEmployee[] = [
  {
    email: 'pierre.collard@brh-demo.fr',
    full_name: 'Pierre Collard',
    role_label: 'Commercial BRH',
    activity_score: 42,
    activity_level: 'standard',
  },
  // Ajouter les autres employés ici quand ils seront onboardés
]

/**
 * Retourne true si l'utilisateur est un employé BRH (par email).
 * Utilisé par EmployeGuard et le LoginPage workspace switcher.
 */
export function isBrhEmployee(email: string | null | undefined): boolean {
  if (!email) return false
  return BRH_EMPLOYEES.some((e) => e.email.toLowerCase() === email.toLowerCase())
}

export function getBrhEmployee(email: string | null | undefined): BrhEmployee | null {
  if (!email) return null
  return BRH_EMPLOYEES.find((e) => e.email.toLowerCase() === email.toLowerCase()) ?? null
}

/**
 * Mapping score → leads débloqués / mois.
 * À déplacer en DB quand on aura le système de gamification réel.
 */
export const ACTIVITY_THRESHOLDS = {
  standard: { min_score: 0, max_leads_month: 5, label: 'Standard', color: '#71717a' },
  pro: { min_score: 50, max_leads_month: 15, label: 'Pro', color: '#0284c7' },
  expert: { min_score: 150, max_leads_month: 35, label: 'Expert', color: '#7c3aed' },
  master: { min_score: 350, max_leads_month: 999, label: 'Master', color: '#f59e0b' },
} as const

export function getNextLevel(currentLevel: BrhEmployee['activity_level']): keyof typeof ACTIVITY_THRESHOLDS | null {
  const order: BrhEmployee['activity_level'][] = ['standard', 'pro', 'expert', 'master']
  const idx = order.indexOf(currentLevel)
  if (idx === -1 || idx === order.length - 1) return null
  return order[idx + 1]
}
