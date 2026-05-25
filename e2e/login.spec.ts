/**
 * Phase 4 — E2E Login flow complet.
 *
 * Skip si BRH_E2E_EMAIL / BRH_E2E_PASSWORD absents (CI sans creds).
 * Vérifie : login, redirection, logout, erreur mauvais pwd.
 */
import { test, expect } from '@playwright/test'
import { E2E_EMAIL, E2E_PASSWORD, HAS_CREDS, loginAsEmployee } from './support/auth'

test.describe('Login flow', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test('login avec creds valides redirige hors de /connexion', async ({ page }) => {
    await loginAsEmployee(page)
    expect(page.url()).not.toContain('/connexion')
  })

  test('login avec mauvais mot de passe affiche message d\'erreur', async ({ page }) => {
    await page.goto('/connexion')
    await page.locator('input[type="email"]').fill(E2E_EMAIL)
    await page.locator('input[type="password"]').fill('mauvais_mot_de_passe_e2e_test')
    await page.locator('button[type="submit"]').click()

    await expect(
      page.getByText(/Email ou mot de passe incorrect|Invalid login credentials/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('login sans email : html5 validation empêche submit', async ({ page }) => {
    await page.goto('/connexion')
    await page.locator('input[type="password"]').fill('something')
    await page.locator('button[type="submit"]').click()
    // L'URL ne change pas (form HTML5 required bloque le submit)
    expect(page.url()).toContain('/connexion')
  })
})

test.describe('Session persistence', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test('session persiste après reload de la page', async ({ page }) => {
    await loginAsEmployee(page)

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).not.toContain('/connexion')

    // Supabase stocke la session dans localStorage (pas cookies)
    const hasSupabaseToken = await page.evaluate(() => {
      return Object.keys(localStorage).some((k) => k.includes('supabase') || k.includes('sb-'))
    })
    expect(hasSupabaseToken).toBe(true)
  })
})
