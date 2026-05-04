/**
 * Playwright config — Phase 19 (smoke tests E2E).
 *
 * Pourquoi : couvrir les 3 flows critiques (page d'accueil, login, admin guard)
 * pour détecter les régressions visibles avant deploy.
 *
 * Ne pas confondre avec Vitest (`npm run test`) qui couvre la couche
 * api/hooks/lib en isolation. Playwright = navigateur réel.
 */
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 5173)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
