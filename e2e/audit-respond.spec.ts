/**
 * Phase 4 — E2E Audit Respond (public).
 *
 * Tests publics CI-compatibles : pas besoin de creds Supabase.
 * On vérifie le rendu de la page /audit/respond avec différents états du token.
 */
import { test, expect } from '@playwright/test'

test.describe('Audit Respond — page publique', () => {
  test('sans token : affiche erreur "Lien invalide"', async ({ page }) => {
    await page.goto('/audit/respond')
    await expect(page.getByRole('heading', { name: /Lien invalide/i })).toBeVisible()
  })

  test('avec token fictif : affiche le formulaire avec 5 cards radio', async ({ page }) => {
    await page.goto('/audit/respond?token=fake_token_test_e2e')
    await expect(page.getByRole('heading', { name: /Comment s'est passé votre contact/i })).toBeVisible()

    // 5 options feedback
    await expect(page.getByText(/Tout s'est bien passé/i)).toBeVisible()
    await expect(page.getByText(/Je suis intéressé/i)).toBeVisible()
    await expect(page.getByText(/Je n'ai jamais été contacté/i)).toBeVisible()
    await expect(page.getByText(/Contact insistant/i)).toBeVisible()
    await expect(page.getByText(/Je souhaite déposer une plainte/i)).toBeVisible()
  })

  test('submit sans feedback : bouton désactivé', async ({ page }) => {
    await page.goto('/audit/respond?token=fake_token')
    const submit = page.getByRole('button', { name: /Envoyer ma réponse/i })
    await expect(submit).toBeDisabled()
  })

  test('sélection feedback active le bouton submit', async ({ page }) => {
    await page.goto('/audit/respond?token=fake_token')
    await page.getByText(/Tout s'est bien passé/i).click()
    const submit = page.getByRole('button', { name: /Envoyer ma réponse/i })
    await expect(submit).toBeEnabled()
  })

  test('soumission avec token invalide : message d\'erreur RPC', async ({ page }) => {
    // CI utilise un stub Supabase URL → le call RPC échouera côté réseau
    // (pas de DB réelle). En local, la RPC retourne "Lien invalide ou expiré".
    // On vérifie juste qu'un message d'erreur apparaît (sans assertion sur le contenu).
    test.skip(
      !process.env.BRH_E2E_REAL_SUPABASE,
      'BRH_E2E_REAL_SUPABASE requis pour soumettre vraiment',
    )

    await page.goto('/audit/respond?token=fake_token_should_be_rejected')
    await page.getByText(/Tout s'est bien passé/i).click()
    await page.getByRole('button', { name: /Envoyer ma réponse/i }).click()
    await expect(page.getByText(/Lien invalide ou expiré/i)).toBeVisible({ timeout: 10_000 })
  })
})
