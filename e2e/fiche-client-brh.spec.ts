/**
 * Phase 4 — E2E Fiche Client BRH foncier (portail employé).
 *
 * Skip si pas de creds. Vérifie : liste clients, section foncier rendue
 * (cross-matches DPE/DVF/permis post RPC v3 BAN).
 */
import { test, expect } from '@playwright/test'
import { HAS_CREDS, loginAsEmployee } from './support/auth'

test.describe('Fiche Client BRH — portail employé', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('liste /employe/clients-brh se charge', async ({ page }) => {
    await page.goto('/employe/clients-brh')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const clientLink = page.locator('a[href*="/employe/clients-brh/"]')
    await expect(clientLink.first()).toBeVisible({ timeout: 15_000 })
  })

  test('fiche détail affiche identité + section foncier', async ({ page }) => {
    await page.goto('/employe/clients-brh')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const firstLink = page.locator('a[href*="/employe/clients-brh/"]').first()
    if (!(await firstLink.isVisible().catch(() => false))) {
      test.skip(true, 'Aucun client dans la liste')
      return
    }
    await firstLink.click()
    await expect(page).toHaveURL(/\/employe\/clients-brh\/[^/]+/, { timeout: 10_000 })

    // Identité visible (heading principal)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })

    // Section foncier titre attendu — exposé par ClientFoncierSection.tsx
    // (peut être "Foncier", "Adresse", "DPE", "Logement" selon refacto UI)
    const foncierMarker = page.getByText(/Foncier|Adresse|DPE|Cadastre/i).first()
    await expect(foncierMarker).toBeVisible({ timeout: 15_000 })
  })
})
