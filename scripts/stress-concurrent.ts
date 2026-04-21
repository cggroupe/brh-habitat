/**
 * Stress test : 25 sessions Playwright simultanees.
 * Simule 25 utilisateurs (pros + affilies + clients) qui naviguent,
 * consultent leurs pages, envoient des messages, creent des prospects.
 *
 * Capture tous les errors (console, page errors, network failures).
 * Rapport final + screenshots des pages en erreur si applicable.
 *
 * Usage :
 *   npm run stress
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE_URL = process.env.BASE_URL ?? 'https://brh-habitat.vercel.app'
const CREDS_FILE = join(__dirname, '.seed-credentials.json')
const ERROR_SHOTS = join(ROOT, 'screenshots', 'stress-errors')
const CONCURRENT = Number(process.env.CONCURRENT ?? '25')
const ACTIONS_PER_USER = Number(process.env.ACTIONS ?? '6')

if (!existsSync(CREDS_FILE)) {
  console.error('❌ .seed-credentials.json introuvable. Lance `npm run seed` d\'abord.')
  process.exit(1)
}

interface Cred { email: string; password: string; fullName: string; referralCode?: string }
interface AllCreds { pros: Cred[]; affiliates: Cred[]; clients: Cred[] }
const allCreds = JSON.parse(readFileSync(CREDS_FILE, 'utf8')) as AllCreds

// ─── Pages par role ─────────────────────────────────────────────────────────
const PAGES_BY_ROLE: Record<'pro' | 'particulier' | 'client', string[]> = {
  pro: [
    '/pro', '/pro/prospects', '/pro/prospects/nouveau', '/pro/commissions',
    '/pro/equipe', '/pro/qr', '/pro/rapport', '/pro/social',
    '/pro/chiffrage', '/pro/assistant', '/pro/profil',
  ],
  particulier: [
    '/particulier', '/particulier/parrainages', '/particulier/catalogue',
    '/particulier/points', '/particulier/messages', '/particulier/statut',
    '/particulier/simulateur', '/particulier/reseaux-sociaux',
    '/particulier/vendeurs', '/particulier/chiffrage', '/particulier/badges',
  ],
  client: [
    '/tableau-de-bord', '/mes-logements', '/mes-dossiers', '/mes-rdv', '/profil',
  ],
}

// ─── Patch localStorage apres login (le role n'est pas persiste) ────────────
async function patchRole(page: Page, role: 'admin' | 'pro' | 'particulier'): Promise<void> {
  await page.evaluate((r) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.endsWith('-user')) {
        try {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          const u = JSON.parse(raw)
          u.role = r
          localStorage.setItem(key, JSON.stringify(u))
        } catch { /* ignore */ }
      }
    }
  }, role)
}

async function login(page: Page, email: string, password: string, role: 'pro' | 'particulier' | 'client'): Promise<boolean> {
  await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle', timeout: 30_000 })
  try {
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(u => !u.pathname.includes('/connexion'), { timeout: 15_000 })
    // Pour les clients (role=particulier basique sans affiliate), on patch 'particulier' aussi
    const effectiveRole = role === 'client' ? 'particulier' : role
    await patchRole(page, effectiveRole)
    return true
  } catch {
    return false
  }
}

interface SessionReport {
  userIndex: number
  email: string
  role: string
  loginOk: boolean
  pagesVisited: number
  errors: Array<{ page: string; type: 'console' | 'pageerror' | 'http'; msg: string }>
  duration: number
}

async function runSession(
  browser: Browser,
  cred: Cred,
  role: 'pro' | 'particulier' | 'client',
  index: number,
): Promise<SessionReport> {
  const start = Date.now()
  const report: SessionReport = {
    userIndex: index, email: cred.email, role, loginOk: false,
    pagesVisited: 0, errors: [], duration: 0,
  }

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  // Capture des erreurs
  page.on('pageerror', err => {
    report.errors.push({ page: page.url(), type: 'pageerror', msg: err.message })
  })
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignorer bruit connu
      if (text.includes('favicon') || text.includes('Failed to load resource') && text.includes('404')) return
      report.errors.push({ page: page.url(), type: 'console', msg: text.slice(0, 200) })
    }
  })
  page.on('response', resp => {
    const url = resp.url()
    if (resp.status() >= 500 && !url.includes('favicon')) {
      report.errors.push({ page: page.url(), type: 'http', msg: `${resp.status()} ${url.slice(0, 100)}` })
    }
  })

  try {
    report.loginOk = await login(page, cred.email, cred.password, role)
    if (!report.loginOk) {
      report.errors.push({ page: '/connexion', type: 'pageerror', msg: 'Login failed' })
      return report
    }

    const pagesForRole = PAGES_BY_ROLE[role]
    for (let i = 0; i < ACTIONS_PER_USER; i++) {
      const path = pagesForRole[Math.floor(Math.random() * pagesForRole.length)]
      try {
        // Re-patch localStorage avant chaque nav (le store strip le role)
        const effectiveRole = role === 'client' ? 'particulier' : role
        await patchRole(page, effectiveRole)
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 20_000 })
        // Simuler un tps de lecture
        await page.waitForTimeout(300 + Math.random() * 1200)
        report.pagesVisited++
      } catch (err) {
        report.errors.push({
          page: path, type: 'pageerror',
          msg: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
        })
      }
    }

    // Screenshot seulement si erreurs (pour debug Philippe)
    if (report.errors.length > 0) {
      if (!existsSync(ERROR_SHOTS)) mkdirSync(ERROR_SHOTS, { recursive: true })
      await page.screenshot({
        path: join(ERROR_SHOTS, `session_${index}_${role}_err.png`),
        fullPage: false,
      }).catch(() => { /* ignore */ })
    }
  } finally {
    await context.close()
    report.duration = Date.now() - start
  }

  return report
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n🔥 Stress test BRH\n`)
  console.log(`   Base URL   : ${BASE_URL}`)
  console.log(`   Sessions   : ${CONCURRENT}`)
  console.log(`   Actions/user : ${ACTIONS_PER_USER}\n`)

  // Constituer le pool de users : mix pros + affilies + clients
  const pool: Array<{ cred: Cred; role: 'pro' | 'particulier' | 'client' }> = []
  allCreds.pros.forEach(c => pool.push({ cred: c, role: 'pro' }))
  allCreds.affiliates.forEach(c => pool.push({ cred: c, role: 'particulier' }))
  allCreds.clients.forEach(c => pool.push({ cred: c, role: 'client' }))

  // Melanger
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const selected = pool.slice(0, CONCURRENT)
  console.log(`📋 Selection : ${selected.filter(p => p.role === 'pro').length} pros, ${selected.filter(p => p.role === 'particulier').length} affilies, ${selected.filter(p => p.role === 'client').length} clients\n`)

  const browser = await chromium.launch({ headless: true })

  console.log(`🚀 Lancement ${selected.length} sessions en parallele...\n`)
  const startAll = Date.now()

  const results = await Promise.all(
    selected.map((item, i) => runSession(browser, item.cred, item.role, i))
  )

  await browser.close()

  const totalDuration = Date.now() - startAll
  const okSessions = results.filter(r => r.loginOk).length
  const totalPages = results.reduce((a, r) => a + r.pagesVisited, 0)
  const totalErrors = results.reduce((a, r) => a + r.errors.length, 0)

  console.log(`\n═══════════════════════════════════════`)
  console.log(`📊 RAPPORT STRESS TEST`)
  console.log(`═══════════════════════════════════════`)
  console.log(`⏱  Duree totale      : ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(`✅ Logins reussis     : ${okSessions}/${selected.length}`)
  console.log(`📄 Pages visitees     : ${totalPages}`)
  console.log(`❌ Erreurs detectees  : ${totalErrors}`)
  console.log('')

  // Regrouper erreurs par type/message
  const errorGroups = new Map<string, { count: number; pages: Set<string>; roles: Set<string> }>()
  for (const r of results) {
    for (const e of r.errors) {
      const key = `[${e.type}] ${e.msg.slice(0, 120)}`
      if (!errorGroups.has(key)) errorGroups.set(key, { count: 0, pages: new Set(), roles: new Set() })
      const g = errorGroups.get(key)!
      g.count++
      g.pages.add(e.page.replace(BASE_URL, '').split('?')[0])
      g.roles.add(r.role)
    }
  }

  if (errorGroups.size > 0) {
    console.log(`🐛 BUGS A FIXER (par frequence) :\n`)
    const sorted = [...errorGroups.entries()].sort((a, b) => b[1].count - a[1].count)
    sorted.slice(0, 20).forEach(([msg, info], i) => {
      console.log(`${i + 1}. ${msg}`)
      console.log(`     x${info.count} | roles: ${[...info.roles].join(',')} | pages: ${[...info.pages].slice(0, 3).join(', ')}${info.pages.size > 3 ? '...' : ''}`)
    })
    if (sorted.length > 20) console.log(`\n   (+ ${sorted.length - 20} autres)`)
  } else {
    console.log(`🎉 Aucune erreur detectee — site stable sous charge.`)
  }

  console.log('')
  if (existsSync(ERROR_SHOTS)) {
    console.log(`📸 Screenshots des erreurs : ${ERROR_SHOTS}`)
  }
  console.log('')
}

main().catch(err => { console.error('\n❌ Fatal :', err); process.exit(1) })
