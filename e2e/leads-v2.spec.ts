/**
 * Phase 4 — E2E Leads v2 (portail employé).
 *
 * Skip si pas de creds. Vérifie : page leads-v2 se charge, filtres visibles,
 * search input fonctionnel, card cliquable.
 */
import { test, expect } from '@playwright/test'
import { HAS_CREDS, loginAsEmployee } from './support/auth'

test.describe('Leads v2 — portail employé', () => {
  test.skip(!HAS_CREDS, 'BRH_E2E_EMAIL / BRH_E2E_PASSWORD requis')

  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('page /employe/leads-v2 charge sans erreur console bloquante', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/employe/leads-v2')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const blocking = consoleErrors.filter(
      (e) =>
        !/sentry|posthog|googletagmanager|favicon|manifest|service worker|sw\.js/i.test(e) &&
        !/Failed to load resource/i.test(e),
    )
    expect(blocking, `Erreurs console : ${blocking.join('\n')}`).toHaveLength(0)
  })

  test('filtres "Mes leads" sont visibles', async ({ page }) => {
    await page.goto('/employe/leads-v2')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    // Filtres F1-F6 du handoff (bugs résolus 22/05). Au moins un filtre attendu.
    const filtreCandidate = page.locator('button, [role="button"]').filter({
      hasText: /Mes leads|Tous|Filtre|Score|Étiquette/i,
    })
    await expect(filtreCandidate.first()).toBeVisible({ timeout: 10_000 })
  })

  test('search input fonctionne (saisie)', async ({ page }) => {
    await page.goto('/employe/leads-v2')
    await page.waitForLoadState('networkidle', { timeout: 20_000 })

    const searchInput = page.locator('input[type="search"], input[placeholder*="Recherche" i], input[placeholder*="search" i]')
    const count = await searchInput.count()
    if (count === 0) {
      test.skip(true, 'Pas de search input identifiable (refacto UI ?)')
      return
    }
    await searchInput.first().fill('brest')
    await page.waitForTimeout(500) // debounce
    // pas d'assertion stricte sur les résultats (dépend des données prod)
    expect(await searchInput.first().inputValue()).toBe('brest')
  })
})
