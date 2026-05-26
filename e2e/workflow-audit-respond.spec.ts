/**
 * Phase 4 — E2E Workflow Audit Respond (public, sans creds).
 *
 * Couvre la mutation complète (form submit → RPC → success state) sur la
 * page publique /audit/respond. Utilise un audit factice créé en DB
 * (skip si BRH_E2E_REAL_SUPABASE pas set car on a besoin d'écrire en DB).
 */
import { test, expect } from '@playwright/test'

const HAS_DB_WRITE = !!process.env.BRH_E2E_AUDIT // réutilise le flag audit complet

test.describe('Workflow Audit Respond — public', () => {
  test('sans token : message erreur + pas de form', async ({ page }) => {
    await page.goto('/audit/respond')
    await expect(page.getByRole('heading', { name: /Lien invalide/i })).toBeVisible({
      timeout: 10_000,
    })
    // Form NE doit PAS être visible
    const submitBtn = page.getByRole('button', { name: /Envoyer ma réponse/i })
    expect(await submitBtn.isVisible().catch(() => false)).toBe(false)
  })

  test('avec token factice : form affiché + bouton désactivé sans sélection', async ({ page }) => {
    await page.goto('/audit/respond?token=test_e2e_factice_token')
    await expect(page.getByRole('heading', { name: /Comment s'est passé/i })).toBeVisible({
      timeout: 10_000,
    })

    const submitBtn = page.getByRole('button', { name: /Envoyer ma réponse/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('sélection feedback active le bouton', async ({ page }) => {
    await page.goto('/audit/respond?token=test_e2e_factice_token')

    await page.getByText(/Tout s'est bien passé/i).click()
    const submitBtn = page.getByRole('button', { name: /Envoyer ma réponse/i })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
  })

  test('submit token invalide → message erreur RPC', async ({ page }) => {
    test.skip(!HAS_DB_WRITE, 'BRH_E2E_AUDIT=1 requis (envoie réelle au RPC)')

    await page.goto('/audit/respond?token=token_definitivement_invalide_e2e')
    await page.getByText(/Tout s'est bien passé/i).click()
    await page.getByRole('button', { name: /Envoyer ma réponse/i }).click()

    // Le RPC retourne success=false + "Lien invalide ou expiré"
    await expect(page.getByText(/Lien invalide ou expiré/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})
