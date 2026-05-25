/**
 * Registre employés BRH — V2 : cache hydraté depuis la table DB `brh_employees`
 * (Phase Employé V1+V2.1→V2.5, migration `20260706700000_brh_employees_foundation`).
 *
 * Schéma DB : profile_id (FK profiles), full_name, email UNIQUE, role_label,
 * activity_score INTEGER (trigger auto via brh_employee_actions),
 * activity_level CHECK (standard|pro|expert|master), is_active BOOLEAN, etc.
 *
 * Le cache module-level est hydraté par `loadBrhEmployeesFromDb()` :
 *   - au refresh de session (useAuth.validateSession)
 *   - après signInWithPassword (LoginPage)
 *
 * `isBrhEmployee` / `getBrhEmployee` restent SYNC (lecture cache) pour rester
 * compatibles avec EmployeGuard et EmployeShell qui les appellent dans le render.
 *
 * Le seed statique (BRH_EMPLOYEES) sert de fallback pour dev/test local quand
 * la DB n'est pas reachable, et garantit que Pierre Collard demo reste détecté
 * même si le cache n'a pas encore été hydraté.
 */

import { supabase } from '@/lib/supabase'

export interface BrhEmployee {
  email: string
  full_name: string
  role_label: string
  activity_score: number
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
]

// Cache module-level — clé = email lowercase, valeur = employé.
// Initialisé avec le seed statique, étendu par loadBrhEmployeesFromDb().
const _cache = new Map<string, BrhEmployee>(
  BRH_EMPLOYEES.map((e) => [e.email.toLowerCase(), e]),
)

let _lastLoadedAt = 0
let _inFlight: Promise<void> | null = null
const LOAD_DEBOUNCE_MS = 30_000

/**
 * Charge la liste des employés actifs depuis la table `brh_employees` et hydrate
 * le cache module-level. Idempotent + debounced (30s) pour éviter les rounds-trips
 * inutiles si appelé plusieurs fois en parallèle.
 *
 * Les RLS de `brh_employees` limitent ce que chaque user peut lire :
 *   - employé : son propre row
 *   - admin   : tous les rows
 * Le cache reçoit donc {0, 1+} rows selon la persona — suffisant pour `isBrhEmployee`
 * (qui ne s'intéresse qu'à savoir si l'email courant est un employé).
 *
 * À appeler après login et après validateSession. Sans-op si appel < 30s.
 */
export async function loadBrhEmployeesFromDb(): Promise<void> {
  // Si un fetch est déjà en cours, on lui s'attache — évite l'ancien bug
  // où le 2e appel skip immédiatement avant que le 1er ait fini d'hydrater
  // le cache (EmployeGuard recevait alors un cache vide → redirect injuste).
  if (_inFlight) return _inFlight

  const now = Date.now()
  if (now - _lastLoadedAt < LOAD_DEBOUNCE_MS) return

  _inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('brh_employees')
        .select('email, full_name, role_label, activity_score, activity_level')
        .eq('is_active', true)

      if (error || !data) return

      for (const row of data) {
        const key = String(row.email ?? '').toLowerCase()
        if (!key) continue
        _cache.set(key, {
          email: row.email as string,
          full_name: (row.full_name as string) ?? '',
          role_label: (row.role_label as string) ?? 'Employé BRH',
          activity_score: (row.activity_score as number) ?? 0,
          activity_level: (row.activity_level as BrhEmployee['activity_level']) ?? 'standard',
        })
      }
      _lastLoadedAt = Date.now()
    } finally {
      _inFlight = null
    }
  })()

  return _inFlight
}

/**
 * Vide le cache (à appeler au signOut pour éviter qu'un employé "fantôme"
 * reste détecté pour le user suivant qui se logge dans la même tab).
 */
export function resetBrhEmployeesCache(): void {
  _cache.clear()
  for (const e of BRH_EMPLOYEES) _cache.set(e.email.toLowerCase(), e)
  _lastLoadedAt = 0
  _inFlight = null
}

/**
 * Retourne true si l'utilisateur est un employé BRH (par email).
 * Lit le cache module-level. Synchronous — pour EmployeGuard / EmployeShell.
 */
export function isBrhEmployee(email: string | null | undefined): boolean {
  if (!email) return false
  return _cache.has(email.toLowerCase())
}

export function getBrhEmployee(email: string | null | undefined): BrhEmployee | null {
  if (!email) return null
  return _cache.get(email.toLowerCase()) ?? null
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
