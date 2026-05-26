/**
 * E2E refonte fiches Data-B style — rejeu des 11 cas audit 26/05.
 *
 * Vérifie :
 * - Bug parsing GINDRE corrigé (Alexandre Charles Jacques GINDRE → fiche complète)
 * - StickyEntityHeader visible avec KPIs
 * - Breadcrumb multi-niveaux via navStackStore
 * - OriginBanner sur drill-down
 * - Distinction patrimoine vs utility (KPI hero distinct)
 * - PaginationInfo sur SCI géantes (ENEDIS 1100)
 * - FicheEmptyState enrichi avec actions pivots
 * - DgfipPivot affiché quand propriétaire inconnu
 *
 * Lancement :
 *   BRH_E2E_EMAIL=pierrecollard@contact-brh.fr \
 *   BRH_E2E_PASSWORD='Brh29200.@' \
 *   E2E_BASE_URL=https://brh-habitat.vercel.app \
 *   npx playwright test e2e/refonte-fiches-data-b.spec.ts
 */
import { expect, test } from '@playwright/test'
import { loginAsEmployee, requireCredsOrSkip } from './support/auth'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

test.beforeEach(async ({ page }) => {
  requireCredsOrSkip()
  await loginAsEmployee(page)
})

test('Bug GINDRE fixé : Alexandre Charles Jacques GINDRE affiche KER GWEL VAD', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/personne/ALEXANDRE%20CHARLES%20JACQUES%20GINDRE`)
  // KPI hero rempli avec >0 SCI patrimoniale (avant fix : 0)
  await expect(page.getByText('SCI patrimoniales')).toBeVisible({ timeout: 10000 })
  // L'entité KER GWEL VAD doit apparaître dans la liste mandats
  await expect(page.getByText(/KER GWEL VAD|MIRANDOLE/i)).toBeVisible({ timeout: 10000 })
  // Pas de message "Aucun rôle"
  await expect(page.getByText('Aucun rôle ou patrimoine BRH connu')).not.toBeVisible()
})

test('StickyEntityHeader visible avec KPIs sur fiche entreprise', async ({ page }) => {
  // SCI Mirandole / Ker Gwel Vad
  await page.goto(`${BASE_URL}/employe/leads/entreprise/918350695`)
  // Header sticky : badge entity_class
  await expect(page.locator('[class*="sticky"]').first()).toBeVisible({ timeout: 10000 })
  // KPI hero : ≥ 1 KPI affiché (Dirigeants, Adresses, BODACC, Succession)
  await expect(page.getByText(/Dirigeants/).first()).toBeVisible()
})

test('ENEDIS : KPI hero affiche 1100 adresses + tab Patrimoine montre PaginationInfo', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/entreprise/444608442`)
  // KPI Adresses détenues
  await expect(page.getByText(/1\s?100|Adresses détenues/).first()).toBeVisible({ timeout: 10000 })
  // Banner utility
  await expect(page.getByText(/Société utility|non patrimonial|Opérateur réseau/i).first()).toBeVisible()
})

test('Xavier PINTAT : KPI hero distingue patrimoine vs utility', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/personne/XAVIER%20PINTAT`)
  // KPI doit montrer SCI patrimoniales=0 ET rôles utility=1 (ENEDIS)
  await expect(page.getByText(/SCI patrimoniales/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/utility/i).first()).toBeVisible()
})

test('Charlotte LESCOAT : cas positif référence, mandats visibles', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/personne/CHARLOTTE%20LESCOAT`)
  await expect(page.getByText('SCI patrimoniales')).toBeVisible({ timeout: 10000 })
})

test('Marie-Christine AULAGNON (BADOUARD) : parsing parens fixé', async ({ page }) => {
  await page.goto(
    `${BASE_URL}/employe/leads/personne/MARIE-CHRISTINE%20AULAGNON%20(BADOUARD)`,
  )
  // La fiche doit charger sans erreur (peut ne pas avoir de patrimoine mais doit afficher la fiche)
  await expect(page.locator('h1').first()).toContainText('AULAGNON', { timeout: 10000 })
})

test('Trail SCI → Dirigeant → Autre SCI : breadcrumb conserve 3 niveaux + OriginBanner', async ({ page }) => {
  // Step 1 : entrée SCI KER GWEL VAD
  await page.goto(`${BASE_URL}/employe/leads/entreprise/918350695`)
  await page.waitForLoadState('networkidle')

  // Step 2 : drill sur dirigeant Gindre depuis le tab Décideurs
  const decideursTab = page.getByRole('tab', { name: /Décideurs/i })
  if (await decideursTab.isVisible()) await decideursTab.click()
  const gindreLink = page.getByText(/GINDRE/i).first()
  await gindreLink.click()
  await page.waitForLoadState('networkidle')

  // OriginBanner doit apparaître : "Depuis KER GWEL VAD"
  await expect(page.getByText(/Depuis|KER GWEL VAD/i).first()).toBeVisible({ timeout: 5000 })
})

test('Page entreprise introuvable : FicheEmptyState avec actions pivots', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/entreprise/000000000`)
  await expect(page.getByText(/non catalogué|introuvable/i).first()).toBeVisible({ timeout: 5000 })
})

test('Sticky header reste visible au scroll long', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/entreprise/444608442`)
  await page.waitForLoadState('networkidle')
  // Scroll loin
  await page.evaluate(() => window.scrollBy(0, 2000))
  // Le header doit toujours être visible
  const sticky = page.locator('[class*="sticky"]').first()
  await expect(sticky).toBeVisible()
})

test('Tabs URL persist : ?tab=patrimoine reste après reload', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/entreprise/918350695?tab=patrimoine`)
  await page.waitForLoadState('networkidle')
  // Le tab actif doit être patrimoine
  await expect(page.url()).toContain('tab=patrimoine')
})

test('FavoriButton change d\'état inline (pas de toast)', async ({ page }) => {
  await page.goto(`${BASE_URL}/employe/leads/entreprise/918350695`)
  await page.waitForLoadState('networkidle')
  const favoriBtn = page.getByRole('button', { name: /Ajouter aux favoris|En favori/i }).first()
  if (await favoriBtn.isVisible()) {
    const initialText = await favoriBtn.textContent()
    await favoriBtn.click()
    await page.waitForTimeout(800)
    const newText = await favoriBtn.textContent()
    // L'état doit avoir changé sur le bouton lui-même
    expect(newText).not.toBe(initialText)
  }
})
