/**
 * Capture automatique des screenshots pour la presentation BRH.
 *
 * Usage :
 *   1. cp scripts/.env.screenshots.example scripts/.env.screenshots
 *   2. Remplir les credentials dans scripts/.env.screenshots
 *   3. npm run screenshots
 *
 * Le script se connecte sequentiellement avec 3 comptes (admin, pro, particulier)
 * et capture chaque page en PNG dans /screenshots/.
 */

import { chromium, type Page, type Browser } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Config ─────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'screenshots')
const ENV_FILE = join(__dirname, '.env.screenshots')

interface Creds {
  admin: { email: string; password: string }
  pro: { email: string; password: string }
  particulier: { email: string; password: string }
}

function loadEnv(): { baseUrl: string; creds: Creds } {
  if (!existsSync(ENV_FILE)) {
    console.error(`ERREUR : ${ENV_FILE} introuvable.`)
    console.error(`Copie scripts/.env.screenshots.example et remplis les valeurs.`)
    process.exit(1)
  }
  const raw = readFileSync(ENV_FILE, 'utf8')
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  const get = (k: string): string => {
    if (!env[k]) {
      console.error(`ERREUR : ${k} manquant dans ${ENV_FILE}`)
      process.exit(1)
    }
    return env[k]
  }
  return {
    baseUrl: get('BASE_URL'),
    creds: {
      admin: { email: get('ADMIN_EMAIL'), password: get('ADMIN_PASSWORD') },
      pro: { email: get('PRO_EMAIL'), password: get('PRO_PASSWORD') },
      particulier: { email: get('PART_EMAIL'), password: get('PART_PASSWORD') },
    },
  }
}

// ─── Pages a capturer ───────────────────────────────────────────────────────
type Account = 'public' | 'admin' | 'pro' | 'particulier'

interface PageSpec {
  id: string
  path: string
  account: Account
  waitFor?: string // selecteur CSS a attendre avant capture
  scroll?: boolean // prendre un fullpage screenshot
  delay?: number // ms a attendre avant capture
  action?: (page: Page) => Promise<void> // action custom (ex: ouvrir un menu)
}

const PAGES: PageSpec[] = [
  // Public
  { id: '01_homepage', path: '/', account: 'public', scroll: true },
  { id: '02_diagnostic_intro', path: '/diagnostic', account: 'public' },
  { id: '03_services', path: '/services', account: 'public', scroll: true },
  { id: '04_articles', path: '/articles', account: 'public' },
  { id: '05_partenaires', path: '/partenaires', account: 'public', scroll: true },
  { id: '06_assistant_public', path: '/assistant', account: 'public' },

  // Client particulier (role: particulier mais dashboard classique)
  { id: '07_dashboard_client', path: '/tableau-de-bord', account: 'particulier' },
  { id: '08_mes_logements', path: '/mes-logements', account: 'particulier' },
  { id: '09_mes_dossiers', path: '/mes-dossiers', account: 'particulier' },
  { id: '10_mes_rdv', path: '/mes-rdv', account: 'particulier' },

  // Admin
  { id: '11_admin_dashboard', path: '/admin', account: 'admin', scroll: true },
  { id: '12_admin_prospects', path: '/admin/prospects', account: 'admin' },
  { id: '13_admin_commissions', path: '/admin/commissions', account: 'admin' },
  { id: '14_admin_dossiers', path: '/admin/dossiers', account: 'admin' },
  { id: '15_admin_partenaires', path: '/admin/partenaires', account: 'admin' },

  // Pro
  { id: '16_pro_dashboard', path: '/pro', account: 'pro', scroll: true },
  { id: '17_pro_prospects', path: '/pro/prospects', account: 'pro' },
  { id: '18_pro_prospect_new', path: '/pro/prospects/nouveau', account: 'pro' },
  { id: '19_pro_commissions', path: '/pro/commissions', account: 'pro' },
  { id: '20_pro_equipe', path: '/pro/equipe', account: 'pro' },
  { id: '21_pro_qrcode', path: '/pro/qr', account: 'pro' },
  { id: '22_pro_rapport', path: '/pro/rapport', account: 'pro' },
  { id: '23_pro_social', path: '/pro/social', account: 'pro' },
  { id: '24_pro_chiffrage', path: '/pro/chiffrage', account: 'pro' },
  { id: '25_pro_assistant', path: '/pro/assistant', account: 'pro' },

  // Particulier affilie
  { id: '26_part_dashboard', path: '/particulier', account: 'particulier', scroll: true },
  { id: '27_part_parrainages', path: '/particulier/parrainages', account: 'particulier' },
  { id: '28_part_catalogue', path: '/particulier/catalogue', account: 'particulier', scroll: true },
  { id: '29_part_points', path: '/particulier/points', account: 'particulier' },
  { id: '30_part_statut_fiscal', path: '/particulier/statut', account: 'particulier', scroll: true },
  { id: '31_part_simulateur', path: '/particulier/simulateur', account: 'particulier' },
  { id: '32_part_social', path: '/particulier/reseaux-sociaux', account: 'particulier' },
  { id: '33_part_vendeurs', path: '/particulier/vendeurs', account: 'particulier' },
  { id: '34_part_chiffrage', path: '/particulier/chiffrage', account: 'particulier' },
  { id: '35_part_badges', path: '/particulier/badges', account: 'particulier' },
  { id: '36_part_assistant', path: '/particulier/assistant', account: 'particulier' },
]

// ─── Login ──────────────────────────────────────────────────────────────────
async function login(page: Page, baseUrl: string, email: string, password: string, role: 'admin' | 'pro' | 'particulier'): Promise<void> {
  console.log(`  🔐 Login ${email}...`)
  await page.goto(`${baseUrl}/connexion`, { waitUntil: 'networkidle' })

  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"]').first()
  const submitButton = page.locator('button[type="submit"]').first()

  await emailInput.fill(email)
  await passwordInput.fill(password)
  await submitButton.click()

  // Attendre la redirection hors de /connexion
  await page.waitForURL(url => !url.pathname.includes('/connexion'), { timeout: 15_000 })

  // Patcher localStorage avec le role reel pour que les reloads des pages suivantes
  // ne retombent pas sur le role 'user' par defaut (voir loadUser() dans appStore.ts)
  await page.evaluate((targetRole) => {
    // Le tenant key est dynamique (ex: 'brh-user'). On scan localStorage pour toutes les cles *-user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.endsWith('-user')) {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const u = JSON.parse(raw)
          u.role = targetRole
          localStorage.setItem(key, JSON.stringify(u))
        } catch { /* ignore */ }
      }
    }
  }, role)

  console.log(`  ✅ Connecte (role=${role})`)
}

async function logout(page: Page, baseUrl: string): Promise<void> {
  // Nettoyage de la session via cookies/localStorage
  await page.goto(baseUrl)
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.context().clearCookies()
}

// ─── Capture ────────────────────────────────────────────────────────────────
async function capture(page: Page, baseUrl: string, spec: PageSpec, role?: 'admin' | 'pro' | 'particulier'): Promise<void> {
  const outPath = join(OUT_DIR, `${spec.id}.png`)
  console.log(`  📸 ${spec.id} -> ${spec.path}`)

  try {
    // Avant chaque goto, re-patcher localStorage avec le role
    // (validateSession strip le role a chaque reload via saveUser)
    if (role) {
      await page.evaluate((targetRole) => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.endsWith('-user')) {
            try {
              const raw = localStorage.getItem(key)
              if (!raw) continue
              const u = JSON.parse(raw)
              u.role = targetRole
              localStorage.setItem(key, JSON.stringify(u))
            } catch { /* ignore */ }
          }
        }
      }, role)
    }

    await page.goto(`${baseUrl}${spec.path}`, { waitUntil: 'networkidle', timeout: 30_000 })

    if (spec.waitFor) {
      await page.waitForSelector(spec.waitFor, { timeout: 10_000 })
    }

    if (spec.action) {
      await spec.action(page)
    }

    if (spec.delay) {
      await page.waitForTimeout(spec.delay)
    } else {
      await page.waitForTimeout(1500)
    }

    await page.screenshot({
      path: outPath,
      fullPage: spec.scroll === true,
    })
    console.log(`     OK`)
  } catch (err) {
    console.error(`     ERREUR: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function run(): Promise<void> {
  const { baseUrl, creds } = loadEnv()
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  console.log(`\n🎬 Capture screenshots BRH Habitat`)
  console.log(`   Base URL : ${baseUrl}`)
  console.log(`   Sortie   : ${OUT_DIR}`)
  console.log(`   Pages    : ${PAGES.length}\n`)

  const browser: Browser = await chromium.launch({ headless: true })
  const viewport = { width: 1440, height: 900 }

  // 1. Pages publiques
  console.log(`━━━ PUBLIC ━━━`)
  const publicContext = await browser.newContext({ viewport })
  const publicPage = await publicContext.newPage()
  for (const spec of PAGES.filter(p => p.account === 'public')) {
    await capture(publicPage, baseUrl, spec)
  }
  await publicContext.close()

  // 2. Admin
  console.log(`\n━━━ ADMIN ━━━`)
  const adminContext = await browser.newContext({ viewport })
  const adminPage = await adminContext.newPage()
  try {
    await login(adminPage, baseUrl, creds.admin.email, creds.admin.password, 'admin')
    for (const spec of PAGES.filter(p => p.account === 'admin')) {
      await capture(adminPage, baseUrl, spec, 'admin')
    }
  } catch (err) {
    console.error(`  ❌ Login admin echec: ${err instanceof Error ? err.message : err}`)
  }
  await logout(adminPage, baseUrl)
  await adminContext.close()

  // 3. Pro
  console.log(`\n━━━ PRO ━━━`)
  const proContext = await browser.newContext({ viewport })
  const proPage = await proContext.newPage()
  try {
    await login(proPage, baseUrl, creds.pro.email, creds.pro.password, 'pro')
    for (const spec of PAGES.filter(p => p.account === 'pro')) {
      await capture(proPage, baseUrl, spec, 'pro')
    }
  } catch (err) {
    console.error(`  ❌ Login pro echec: ${err instanceof Error ? err.message : err}`)
  }
  await logout(proPage, baseUrl)
  await proContext.close()

  // 4. Particulier
  console.log(`\n━━━ PARTICULIER ━━━`)
  const partContext = await browser.newContext({ viewport })
  const partPage = await partContext.newPage()
  try {
    await login(partPage, baseUrl, creds.particulier.email, creds.particulier.password, 'particulier')
    for (const spec of PAGES.filter(p => p.account === 'particulier')) {
      await capture(partPage, baseUrl, spec, 'particulier')
    }
  } catch (err) {
    console.error(`  ❌ Login particulier echec: ${err instanceof Error ? err.message : err}`)
  }
  await partContext.close()

  await browser.close()

  console.log(`\n✅ Termine ! ${PAGES.length} screenshots dans ${OUT_DIR}`)
}

run().catch(err => {
  console.error(`\n❌ Erreur fatale :`, err)
  process.exit(1)
})
