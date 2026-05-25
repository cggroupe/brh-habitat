/**
 * AUDIT FULL TOUR — Audit exhaustif Playwright multi-personas BRH Habitat.
 *
 * Pour chaque persona :
 *   1. Login via /connexion
 *   2. Pour chaque route accessible : navigate, capture errors console + network
 *      4xx/5xx, screenshot full-page, vérifie absence de redirect injuste.
 *   3. Test interactions UI principales (boutons sidebar, filtres, search).
 *
 * Output : audit-output/ (1 JSON par persona + screenshots PNG nommés
 * `${persona}-${route_safe}.png`).
 *
 * Lancer avec :
 *   npx playwright test e2e/audit-full-tour.spec.ts --workers=1 --timeout=90000 --reporter=list
 *
 * Mot de passe commun pour les 6 comptes audit : AuditBrh2026.@
 */
import { test, expect, type Page } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'audit-output'
const SCREENSHOT_DIR = join(OUT_DIR, 'screenshots')
const PASSWORD = 'AuditBrh2026.@'

interface RouteResult {
  route: string
  final_url: string
  status: 'ok' | 'redirect_unexpected' | 'http_error' | 'crash'
  page_title: string | null
  visible_text_excerpt: string | null
  console_errors: string[]
  network_errors: { url: string; status: number }[]
  unhandled_exceptions: string[]
  load_time_ms: number
  screenshot_path: string | null
}

interface PersonaResult {
  persona: string
  email: string
  login_ok: boolean
  login_error: string | null
  routes: RouteResult[]
  summary: {
    total: number
    ok: number
    redirect_unexpected: number
    http_error: number
    crash: number
    routes_with_console_errors: number
  }
}

const PERSONAS = [
  {
    key: 'particulier',
    email: 'audit-particulier@test.brh',
    routes: [
      '/tableau-de-bord',
      '/mes-logements',
      '/mes-dossiers',
      '/mes-rdv',
      '/profil',
      '/particulier',
      '/particulier/parrainage',
      '/particulier/badges',
      '/particulier/points',
      '/particulier/leaderboard',
      '/particulier/messages',
      '/particulier/notifications',
      '/diagnostic',
      '/audit-complet',
      '/articles',
      '/partenaires',
    ],
  },
  {
    key: 'affilie',
    email: 'audit-affilie@test.brh',
    routes: [
      '/tableau-de-bord',
      '/mes-logements',
      '/particulier',
      '/particulier/parrainage',
      '/particulier/badges',
      '/particulier/points',
      '/particulier/leaderboard',
      '/diagnostic',
    ],
  },
  {
    key: 'employe',
    email: 'audit-employe@test.brh',
    routes: [
      '/employe',
      '/employe/leads-v2',
      '/employe/leads-legacy',
      '/employe/clients-brh',
      '/employe/dirigeants',
      '/employe/recherche',
      '/employe/favoris',
      '/employe/foncier/carte',
      '/employe/foncier/prospects',
      '/employe/foncier/favoris',
      '/employe/foncier/sci',
      '/employe/foncier/tertiaire',
      '/employe/prospection/bretagne',
      '/employe/prospection/carte',
      '/employe/simulateur',
      '/employe/mails',
      '/employe/calendrier',
      '/employe/social',
    ],
  },
  {
    key: 'admin',
    email: 'audit-admin@test.brh',
    routes: [
      '/admin',
      '/admin/users',
      '/admin/companies',
      '/admin/prospects',
      '/admin/cases',
      '/admin/commissions',
      '/admin/feature-flags',
      '/admin/opt-out-requests',
      '/admin/dashboard',
      '/admin/messages',
      '/admin/badges',
      '/admin/score-vente',
    ],
  },
  {
    key: 'agence',
    email: 'audit-agence@test.brh',
    routes: [
      '/agence',
      '/agence/leads-v2',
      '/agence/leads-legacy',
      '/agence/recherche',
      '/agence/favoris',
      '/agence/leaderboard',
      '/agence/score-vente',
      '/agence/simulateur',
      '/agence/contributions',
      '/agence/progression',
      '/agence/parrainage',
      '/agence/equipe',
      '/agence/qr-code',
      '/agence/messages',
      '/agence/abonnement',
      '/agence/profil',
      '/agence/foncier/carte',
      '/agence/foncier/prospects',
      '/agence/foncier/favoris',
      '/agence/foncier/sci',
      '/agence/foncier/tertiaire',
      '/agence/reseaux-sociaux',
    ],
  },
  {
    key: 'artisan',
    email: 'audit-artisan@test.brh',
    routes: [
      '/artisan',
      '/artisan/missions',
      '/artisan/simulateur',
      '/artisan/chiffrage',
      '/artisan/leads-v2',
      '/artisan/leads-legacy',
      '/artisan/recherche',
      '/artisan/favoris',
      '/artisan/reseau',
      '/artisan/reseaux-sociaux',
      '/artisan/qr-code',
      '/artisan/progression',
      '/artisan/agenda',
      '/artisan/factures',
      '/artisan/profil',
      '/artisan/messages',
    ],
  },
]

function routeToFilename(persona: string, route: string): string {
  const safe = route.replace(/\//g, '_').replace(/[^a-z0-9_-]/gi, '') || 'root'
  return `${persona}${safe}.png`
}

async function loginPersona(page: Page, email: string): Promise<{ ok: boolean; error: string | null }> {
  try {
    await page.goto('/connexion', { waitUntil: 'networkidle', timeout: 15_000 })
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()

    // Attend SOIT redirect hors /connexion, SOIT workspace switcher affiché.
    // Le LoginPage RESTE sur /connexion quand multi-portails (ex: pro avec
    // company + contract → 2 portails → switcher en place).
    await Promise.race([
      page.waitForFunction(() => window.location.pathname !== '/connexion', null, {
        timeout: 15_000,
      }),
      page.getByRole('button', { name: /Espace |Console /i }).first().waitFor({
        state: 'visible',
        timeout: 15_000,
      }),
    ])
    await page.waitForLoadState('networkidle', { timeout: 15_000 })

    // Si workspace switcher visible, choisir le 1er portail (priorité : employe > admin > agence > artisan > particulier)
    const switcherLink = page.getByRole('button', { name: /Espace |Console /i }).first()
    if (await switcherLink.isVisible().catch(() => false)) {
      await switcherLink.click()
      await page.waitForFunction(() => window.location.pathname !== '/connexion', null, {
        timeout: 10_000,
      })
      await page.waitForLoadState('networkidle', { timeout: 10_000 })
    }
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

async function auditRoute(page: Page, persona: string, route: string): Promise<RouteResult> {
  const consoleErrors: string[] = []
  const networkErrors: { url: string; status: number }[] = []
  const unhandledExceptions: string[] = []

  const onPageError = (err: Error) => unhandledExceptions.push(err.message)
  const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  }
  const onResponse = (resp: import('@playwright/test').Response) => {
    const status = resp.status()
    if (status >= 400 && status !== 404) {
      // 404 souvent légitime (favicon, sourcemap missing) → ignore
      networkErrors.push({ url: resp.url(), status })
    }
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)
  page.on('response', onResponse)

  const result: RouteResult = {
    route,
    final_url: '',
    status: 'ok',
    page_title: null,
    visible_text_excerpt: null,
    console_errors: [],
    network_errors: [],
    unhandled_exceptions: [],
    load_time_ms: 0,
    screenshot_path: null,
  }

  const t0 = Date.now()
  try {
    await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(800) // laisse le rendu se finir
  } catch (err) {
    result.status = 'crash'
    result.unhandled_exceptions.push(err instanceof Error ? err.message : String(err))
  }
  result.load_time_ms = Date.now() - t0

  result.final_url = page.url()
  if (result.status !== 'crash') {
    // redirect unexpected = url finale ne contient pas le path (sans query)
    const expectedPath = route.split('?')[0]
    if (!result.final_url.includes(expectedPath)) {
      result.status = 'redirect_unexpected'
    } else if (networkErrors.some((e) => e.status >= 500)) {
      result.status = 'http_error'
    }
  }

  try {
    result.page_title = await page.title()
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')
    result.visible_text_excerpt = bodyText.slice(0, 300).replace(/\s+/g, ' ').trim()
  } catch {
    // ignore
  }

  const filename = routeToFilename(persona, route)
  try {
    await page.screenshot({
      path: join(SCREENSHOT_DIR, filename),
      fullPage: true,
      timeout: 10_000,
    })
    result.screenshot_path = `screenshots/${filename}`
  } catch {
    // ignore
  }

  result.console_errors = consoleErrors.filter(
    (e) =>
      !/sentry|posthog|googletagmanager|favicon|manifest|service worker|sw\.js/i.test(e) &&
      !/Failed to load resource/i.test(e),
  )
  result.network_errors = networkErrors
  result.unhandled_exceptions = unhandledExceptions

  page.off('pageerror', onPageError)
  page.off('console', onConsole)
  page.off('response', onResponse)

  return result
}

test.describe('Audit Full Tour BRH Habitat', () => {
  // Skip en CI : ce spec nécessite les 6 comptes audit-* + une DB Supabase
  // réelle (pas les stubs CI). Lancer manuellement en local après création
  // des comptes via /tmp/create-audit-accounts.py :
  //   BRH_E2E_AUDIT=1 npx playwright test e2e/audit-full-tour.spec.ts
  test.skip(!process.env.BRH_E2E_AUDIT, 'BRH_E2E_AUDIT=1 requis (audit manuel)')

  test.setTimeout(20 * 60_000) // 20 min total max par persona

  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  for (const persona of PERSONAS) {
    test(`Audit persona ${persona.key} (${persona.routes.length} routes)`, async ({ page }) => {
      const result: PersonaResult = {
        persona: persona.key,
        email: persona.email,
        login_ok: false,
        login_error: null,
        routes: [],
        summary: {
          total: persona.routes.length,
          ok: 0,
          redirect_unexpected: 0,
          http_error: 0,
          crash: 0,
          routes_with_console_errors: 0,
        },
      }

      const loginResult = await loginPersona(page, persona.email)
      result.login_ok = loginResult.ok
      result.login_error = loginResult.error

      if (!loginResult.ok) {
        writeFileSync(join(OUT_DIR, `${persona.key}.json`), JSON.stringify(result, null, 2))
        // Login fail = signal critique mais on continue les autres personas
        throw new Error(`Login failed for ${persona.email}: ${loginResult.error}`)
      }

      for (const route of persona.routes) {
        const r = await auditRoute(page, persona.key, route)
        result.routes.push(r)
        if (r.status === 'ok') result.summary.ok++
        if (r.status === 'redirect_unexpected') result.summary.redirect_unexpected++
        if (r.status === 'http_error') result.summary.http_error++
        if (r.status === 'crash') result.summary.crash++
        if (r.console_errors.length > 0) result.summary.routes_with_console_errors++
      }

      writeFileSync(join(OUT_DIR, `${persona.key}.json`), JSON.stringify(result, null, 2))

      // Test passe si pas de crash. Les redirects/console errors sont reportés dans le rapport.
      expect(result.summary.crash, `${result.summary.crash} crash(es) sur ${persona.key}`).toBe(0)
    })
  }
})
