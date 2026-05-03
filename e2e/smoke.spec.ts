/**
 * Phase 19 — Smoke tests E2E.
 *
 * 3 tests qui vérifient que l'app monte côté navigateur :
 *   1. Page d'accueil publique se charge sans erreur console
 *   2. Page de login pro est accessible
 *   3. Routes guardées (admin) redirigent un visiteur non-authentifié
 *
 * Aucun login réel ici (pas de creds test en CI). Pour les flows authentifiés,
 * voir la roadmap dans docs/wiki/tests.md (Phase 6 — E2E).
 */
import { test, expect } from '@playwright/test'

test.describe('Smoke — public surface', () => {
  test('page d\'accueil charge et affiche la marque BRH', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => consoleErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/BRH|Bretagne|Rénovation/i)
    await expect(page.locator('body')).toBeVisible()

    // Filtre les erreurs réseau attendues en dev (Sentry, analytics, supabase preview)
    const blocking = consoleErrors.filter(
      (e) =>
        !/sentry|posthog|googletagmanager|favicon|manifest|service worker|sw\.js/i.test(e) &&
        !/Failed to load resource/i.test(e),
    )
    expect(blocking, `Erreurs console bloquantes : ${blocking.join('\n')}`).toHaveLength(0)
  })

  test('page login pro est accessible et expose un champ email', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('Smoke — guards', () => {
  test('un visiteur non-authentifié sur /admin est redirigé hors de la console admin', async ({
    page,
  }) => {
    await page.goto('/admin')
    // Soit redirigé vers /login, soit affiche une page non-admin (jamais le dashboard admin)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const url = page.url()
    expect(url).not.toMatch(/\/admin\/?$/)
  })
})
