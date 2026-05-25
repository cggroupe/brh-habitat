/**
 * Helper auth pour les specs E2E Playwright.
 *
 * Stratégie : creds via env BRH_E2E_EMAIL / BRH_E2E_PASSWORD.
 * Si absents → `test.skip` pour éviter d'échouer en CI où on n'a pas
 * de DB Supabase réelle (cf .github/workflows/ci.yml job e2e-smoke
 * qui utilise des stubs URL).
 *
 * Compte test recommandé (cf handoff) : pierrecollard@contact-brh.fr (rôle employe).
 */
import { test, type Page, expect } from '@playwright/test'

export const E2E_EMAIL = process.env.BRH_E2E_EMAIL ?? ''
export const E2E_PASSWORD = process.env.BRH_E2E_PASSWORD ?? ''

export const HAS_CREDS = !!E2E_EMAIL && !!E2E_PASSWORD

/**
 * Skip le test entier si pas de creds (CI / dev sans setup).
 * À appeler en début de `test.describe` ou `beforeAll`.
 */
export function requireCredsOrSkip(): void {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis pour cette suite')
}

/**
 * Login via la page /connexion. Attend la redirection automatique puis
 * navigate explicitement vers le portail employé (l'auto-redirect peut
 * tomber sur /particulier pour les comptes multi-rôles).
 *
 * Le compte test a rôle 'admin' avec whitelist email pour EmployeGuard.
 */
export async function loginAsEmployee(page: Page): Promise<void> {
  await page.goto('/connexion')
  await page.locator('input[type="email"]').fill(E2E_EMAIL)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()

  // Attend la sortie de /connexion et le chargement complet (loadBrhEmployeesFromDb
  // hydrate le cache employé après signInWithPassword — sinon EmployeGuard
  // refuse Pierre Collard et redirige vers /tableau-de-bord).
  await page.waitForFunction(() => window.location.pathname !== '/connexion', null, {
    timeout: 15_000,
  })
  await page.waitForLoadState('networkidle', { timeout: 20_000 })

  // Navigate vers portail employé. Retry une fois si EmployeGuard refuse encore
  // (race possible si le cache n'est pas encore complètement à jour).
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto('/employe/leads-v2')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })
    if (page.url().includes('/employe/')) return
    // Refusé → wait + retry
    await page.waitForTimeout(2000)
  }
}

/**
 * Navigate vers une route /employe/* en gérant la race condition EmployeGuard
 * vs loadBrhEmployeesFromDb (cache hydraté en background dans useAuth, pas
 * forcément prêt au render du Guard → redirect vers /tableau-de-bord).
 *
 * Retry jusqu'à 3 fois avec wait. Suppose loginAsEmployee déjà appelé.
 */
export async function gotoEmployePage(page: Page, path: string): Promise<void> {
  if (!path.startsWith('/employe/')) {
    throw new Error(`gotoEmployePage attend un path /employe/* (reçu: ${path})`)
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path)
    await page.waitForLoadState('networkidle', { timeout: 20_000 })
    if (page.url().includes('/employe/')) return
    // Refusé par EmployeGuard (cache pas hydraté) → wait + retry
    await page.waitForTimeout(3000)
  }
  throw new Error(`Impossible d'accéder à ${path} : EmployeGuard redirige systématiquement vers ${page.url()}`)
}

/**
 * @deprecated utiliser gotoEmployePage à la place pour les routes /employe/*.
 */
export async function gotoAsEmployee(page: Page, path: string): Promise<void> {
  await loginAsEmployee(page)
  await page.goto(path)
}

/**
 * Sanity check : vérifier qu'on est bien sur un portail employé après login.
 */
export async function expectEmployeContext(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/employe|\/admin|\/tableau-de-bord/, { timeout: 10_000 })
}
