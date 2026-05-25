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
 * Login via la page /connexion. Attend la redirection automatique.
 * Le LoginPage redirige soit direct vers le portail (1 access) soit
 * affiche un workspace switcher (multi-access).
 *
 * Pour notre compte test (admin + employe), on attend le switcher OU
 * le redirect vers /employe ou /admin.
 */
export async function loginAsEmployee(page: Page): Promise<void> {
  await page.goto('/connexion')
  await page.locator('input[type="email"]').fill(E2E_EMAIL)
  await page.locator('input[type="password"]').fill(E2E_PASSWORD)
  await page.locator('button[type="submit"]').click()

  // Attendre soit le workspace switcher soit redirect direct
  await page.waitForFunction(
    () =>
      window.location.pathname !== '/connexion' ||
      document.body.innerText.match(/Choisir|Console Admin|Espace Employé|Espace Particulier/i) !==
        null,
    null,
    { timeout: 15_000 },
  )

  // Si workspace switcher, choisir le portail employé
  const employeLink = page.getByRole('link', { name: /Espace Employé|Console BRH/i })
  if (await employeLink.isVisible().catch(() => false)) {
    await employeLink.click()
    await page.waitForURL(/\/employe/, { timeout: 10_000 })
  }
}

/**
 * Navigue vers une route employé, en s'assurant qu'on est loggé.
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
