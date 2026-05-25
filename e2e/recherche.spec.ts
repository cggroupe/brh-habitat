/**
 * Phase 4 — E2E Page Recherche + drill-down (portail employé).
 *
 * Skip si pas de creds. Vérifie : /recherche se charge, query string accepté.
 * Drill-down /adresse/:id, /entreprise/:siren, /personne/:id.
 */
import { test, expect } from '@playwright/test'
import { HAS_CREDS, loginAsEmployee } from './support/auth'

test.describe('Recherche + drill-down', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('page /recherche se charge avec input visible', async ({ page }) => {
    await page.goto('/recherche')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const searchInput = page.locator('input[type="search"], input[placeholder*="Recherche" i]')
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 })
  })

  test('/recherche?q=Brest renvoie résultats (ou message "rien trouvé")', async ({ page }) => {
    await page.goto('/recherche?q=Brest')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    // Soit une liste de résultats, soit "aucun résultat"
    const hasResult = await page
      .locator('a[href*="/adresse/"], a[href*="/entreprise/"], a[href*="/personne/"]')
      .first()
      .isVisible()
      .catch(() => false)
    const hasEmpty = await page
      .getByText(/aucun résultat|rien trouvé|0 résultat/i)
      .first()
      .isVisible()
      .catch(() => false)

    expect(hasResult || hasEmpty).toBeTruthy()
  })
})
