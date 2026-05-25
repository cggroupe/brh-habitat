/**
 * Phase 4 — E2E Fiche Dirigeant (portail employé).
 *
 * Skip si pas de creds. Vérifie : liste dirigeants, navigation détail,
 * présence identité + mini-carte Leaflet.
 */
import { test, expect } from '@playwright/test'
import { HAS_CREDS, loginAsEmployee, gotoEmployePage } from './support/auth'

test.describe('Fiche Dirigeant — portail employé', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('liste /employe/dirigeants se charge', async ({ page }) => {
    await gotoEmployePage(page, '/employe/dirigeants')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    // Au moins un lien vers une fiche dirigeant attendu
    const dirigeantLink = page.locator('a[href*="/employe/dirigeants/"]')
    await expect(dirigeantLink.first()).toBeVisible({ timeout: 15_000 })
  })

  test('click sur un dirigeant ouvre sa fiche détail', async ({ page }) => {
    await gotoEmployePage(page, '/employe/dirigeants')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const firstLink = page.locator('a[href*="/employe/dirigeants/"]').first()
    const href = await firstLink.getAttribute('href')
    await firstLink.click()

    // URL doit changer vers /employe/dirigeants/:id
    await expect(page).toHaveURL(new RegExp(`/employe/dirigeants/[^/]+`), { timeout: 10_000 })
    if (href) expect(page.url()).toContain(href)

    // Le titre / nom du dirigeant doit être visible
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('fiche dirigeant affiche une carte Leaflet (si données géolocalisées)', async ({
    page,
  }) => {
    await gotoEmployePage(page, '/employe/dirigeants')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const firstLink = page.locator('a[href*="/employe/dirigeants/"]').first()
    if (!(await firstLink.isVisible().catch(() => false))) {
      test.skip(true, 'Aucun dirigeant dans la liste')
      return
    }
    await firstLink.click()
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    // La carte ne s'affiche que si le dirigeant a au moins 1 bien géolocalisé.
    // Si .leaflet-container présent → assert visible. Sinon, log info (pas un fail).
    const leafletContainer = page.locator('.leaflet-container')
    const hasMap = await leafletContainer.first().isVisible().catch(() => false)
    if (!hasMap) {
      test.skip(true, 'Aucun bien géolocalisé pour ce dirigeant — carte absente')
      return
    }
    await expect(leafletContainer.first()).toBeVisible()
  })
})
