/**
 * Stress test d'ACTIONS concurrentes (pas de simple navigation).
 *
 * Scenarios :
 *  - 10 pros creent chacun 2 prospects via le formulaire UI -> 20 prospects
 *  - 10 affilies creent chacun 1 parrainage via le formulaire UI -> 10 parrainages
 *  - 10 affilies envoient 1 message simultanement via l'UI messagerie
 *
 * Pour chaque action : capture le resultat (succes/echec) + message d'erreur precis.
 * Rapport final avec stats de succes par scenario et bugs trouves.
 */

import { chromium, type Browser, type Page } from 'playwright'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE_URL = process.env.BASE_URL ?? 'https://brh-habitat.vercel.app'
const CREDS_FILE = join(__dirname, '.seed-credentials.json')
const ERROR_SHOTS = join(ROOT, 'screenshots', 'stress-actions-errors')

if (!existsSync(CREDS_FILE)) {
  console.error('❌ Lance `npm run seed` d\'abord.')
  process.exit(1)
}
if (!existsSync(ERROR_SHOTS)) mkdirSync(ERROR_SHOTS, { recursive: true })

interface Cred { email: string; password: string; fullName: string; referralCode?: string }
interface AllCreds { pros: Cred[]; affiliates: Cred[]; clients: Cred[] }
const creds = JSON.parse(readFileSync(CREDS_FILE, 'utf8')) as AllCreds

// ─── Donnees de remplissage ─────────────────────────────────────────────────
const CLIENT_FIRST = ['Marc', 'Anne', 'Paul', 'Sylvie', 'Bertrand', 'Celine', 'David', 'Isabelle']
const CLIENT_LAST = ['Riou', 'Le Bras', 'Kerneis', 'Abgrall', 'Salaun', 'Caradec', 'Cadiou', 'Jaffres']
const CITIES_BREIZH = [
  { name: 'Brest', cp: '29200' }, { name: 'Rennes', cp: '35000' },
  { name: 'Quimper', cp: '29000' }, { name: 'Vannes', cp: '56000' },
  { name: 'Lorient', cp: '56100' }, { name: 'Saint-Brieuc', cp: '22000' },
]
function pick<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)] }
function phone(): string {
  const prefix = pick(['0602', '0603', '0607', '0612', '0645', '0298', '0297'])
  return prefix + Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('')
}

// ─── Auth helper ────────────────────────────────────────────────────────────
async function patchRole(page: Page, role: 'pro' | 'particulier'): Promise<void> {
  await page.evaluate((r) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.endsWith('-user')) {
        try { const u = JSON.parse(localStorage.getItem(key) ?? '{}'); u.role = r; localStorage.setItem(key, JSON.stringify(u)) } catch { /* */ }
      }
    }
  }, role)
}

async function login(page: Page, email: string, password: string, role: 'pro' | 'particulier'): Promise<boolean> {
  await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"]').first().click()
  try {
    await page.waitForURL(u => !u.pathname.includes('/connexion'), { timeout: 15_000 })
    await patchRole(page, role)
    return true
  } catch { return false }
}

// ─── Scenario 1 : Pro cree un prospect ─────────────────────────────────────
interface ActionResult {
  ok: boolean
  scenario: string
  user: string
  durationMs: number
  error?: string
}

async function proCreateProspect(page: Page, cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'pro:create-prospect', user: cred.email, durationMs: 0 }
  try {
    await patchRole(page, 'pro')
    await page.goto(`${BASE_URL}/pro/prospects/nouveau`, { waitUntil: 'networkidle', timeout: 30_000 })

    const city = pick(CITIES_BREIZH)
    const first = pick(CLIENT_FIRST)
    const last = pick(CLIENT_LAST)

    await page.locator('input[placeholder="Jean"]').fill(first)
    await page.locator('input[placeholder="Dupont"]').fill(last)
    await page.locator('input[placeholder="06 00 00 00 00"]').fill(phone())
    await page.locator('input[placeholder*="jean.dupont"]').fill(`${first.toLowerCase()}.${last.toLowerCase().replace(/\s/g, '')}@test.fr`)
    await page.locator('input[placeholder*="rue des"]').fill(`${Math.floor(Math.random() * 99) + 1} rue de la Tour`)
    await page.locator('input[placeholder="29000"]').fill(city.cp)
    await page.locator('input[placeholder="Quimper"]').fill(city.name)

    // Cocher 1 type de travaux (labels existants dans ProProspectNew)
    const workLabels = ['Toiture', 'Isolation', 'Ravalement', 'Plomberie']
    await page.locator(`label:has-text("${pick(workLabels)}")`).first().click({ timeout: 10_000 })

    // Budget & urgence (select)
    await page.locator('select').first().selectOption({ index: 1 }) // premier budget
    await page.locator('select').nth(1).selectOption({ index: 1 }) // premiere urgence

    // Notes
    await page.locator('textarea').first().fill(`Stress test prospect #${idx}`)

    // Submit
    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()

    // Attendre redirect. Si pas dans 15s, checker vrai message d'erreur
    try {
      await page.waitForURL(u => u.pathname.includes('/pro/prospects') && !u.pathname.includes('/nouveau'), { timeout: 15_000 })
      result.ok = true
    } catch {
      const errMsgs = await page.locator('[class*="text-red"]').allTextContents().catch(() => [] as string[])
      const real = errMsgs.map(s => s.trim()).filter(s => s.length > 3)
      result.error = real.length ? real[0].slice(0, 200) : 'timeout 15s (pas de redirect)'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `pro-prospect-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Scenario 2 : Affilie cree un parrainage ───────────────────────────────
async function affiliateCreateParrainage(page: Page, cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'affiliate:create-parrainage', user: cred.email, durationMs: 0 }
  try {
    await patchRole(page, 'particulier')
    await page.goto(`${BASE_URL}/particulier/parrainages/nouveau`, { waitUntil: 'networkidle', timeout: 30_000 })

    const city = pick(CITIES_BREIZH)
    const first = pick(CLIENT_FIRST)
    const last = pick(CLIENT_LAST)

    // Remplir les inputs de la page
    const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')
    const count = await inputs.count()

    // Strategy : remplir tous les text/tel/email visibles avec des donnees plausibles
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const type = await input.getAttribute('type') ?? 'text'
      const placeholder = (await input.getAttribute('placeholder') ?? '').toLowerCase()
      const name = (await input.getAttribute('name') ?? '').toLowerCase()

      const hint = placeholder + ' ' + name
      try {
        if (hint.includes('prenom') || hint.includes('first')) await input.fill(first)
        else if (hint.includes('nom') || hint.includes('last')) await input.fill(last)
        else if (type === 'tel' || hint.includes('tel') || hint.includes('phone')) await input.fill(phone())
        else if (type === 'email' || hint.includes('email') || hint.includes('mail')) await input.fill(`${first.toLowerCase()}.${last.toLowerCase().replace(/\s/g, '')}@gmail.com`)
        else if (hint.includes('ville') || hint.includes('city')) await input.fill(city.name)
        else if (hint.includes('postal') || hint.includes('cp')) await input.fill(city.cp)
        else if (hint.includes('adresse') || hint.includes('address')) await input.fill(`${Math.floor(Math.random() * 99) + 1} rue de la Plage`)
      } catch { /* ignore */ }
    }

    // Cocher au moins 1 type de travaux (buttons dans PartParrainageNew)
    const workLabels = ['Toiture', 'Isolation', 'Ravalement', 'Plomberie']
    const workLabel = pick(workLabels)
    await page.locator(`button:has-text("${workLabel}")`).first().click({ timeout: 10_000 }).catch(() => { /* */ })

    // Remplir les select
    const selects = page.locator('select')
    const sc = await selects.count()
    for (let i = 0; i < sc; i++) {
      await selects.nth(i).selectOption({ index: 1 }).catch(() => { /* */ })
    }

    // Remplir textarea si presente
    const ta = page.locator('textarea').first()
    if (await ta.count() > 0) await ta.fill(`Parrainage stress-test #${idx}`).catch(() => { /* */ })

    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()

    // Attendre redirect. Si pas de redirect dans 15s, checker message erreur visible
    try {
      await page.waitForURL(u => u.pathname.includes('/particulier/parrainages') && !u.pathname.includes('/nouveau'), { timeout: 15_000 })
      result.ok = true
    } catch {
      // Cherche un message d'erreur >5 chars (pas juste l'asterisque)
      const errMsgs = await page.locator('[class*="text-red"]').allTextContents().catch(() => [] as string[])
      const real = errMsgs.map(s => s.trim()).filter(s => s.length > 3)
      result.error = real.length ? real[0].slice(0, 200) : 'timeout 15s (pas de redirect)'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `aff-parrainage-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Scenario 3 : Affilie envoie un message ────────────────────────────────
async function affiliateSendMessage(page: Page, cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'affiliate:send-message', user: cred.email, durationMs: 0 }
  try {
    await patchRole(page, 'particulier')
    await page.goto(`${BASE_URL}/particulier/messages`, { waitUntil: 'networkidle', timeout: 30_000 })

    // Cliquer sur "Nouveau message"
    await page.getByRole('button', { name: /nouveau/i }).first().click({ timeout: 10_000 })
    await page.waitForTimeout(500)

    // Remplir input sujet
    const subjectInput = page.locator('input[placeholder*="Ex"], input[placeholder*="sujet"], input[placeholder*="Question"]').first()
    await subjectInput.fill(`Question stress-test #${idx}`).catch(() => { /* */ })

    // Remplir textarea message
    await page.locator('textarea:visible').first().fill(`Bonjour, test automatique #${idx}. Merci pour votre retour !`)

    // Submit : bouton "ENVOYER" (insensible a la casse)
    await page.getByRole('button', { name: /envoyer/i }).last().click({ timeout: 10_000 })

    // Succes si on voit le nouveau thread ou un toast
    await page.waitForTimeout(2000)
    const bodyText = await page.locator('body').textContent().catch(() => '')
    if (bodyText?.includes(`stress-test #${idx}`) || bodyText?.includes('envoye') || bodyText?.includes('succes')) {
      result.ok = true
    } else {
      const errMsgs = await page.locator('[class*="text-red"]').allTextContents().catch(() => [] as string[])
      const real = errMsgs.map(s => s.trim()).filter(s => s.length > 3)
      result.error = real.length ? real[0].slice(0, 200) : 'pas de confirmation visible'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `message-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Scenario 4 : Affilie utilise le chiffrage IA ─────────────────────────
async function affiliateChiffrageIA(page: Page, cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'affiliate:chiffrage-ia', user: cred.email, durationMs: 0 }
  try {
    await patchRole(page, 'particulier')
    await page.goto(`${BASE_URL}/particulier/chiffrage`, { waitUntil: 'networkidle', timeout: 30_000 })

    const prompts = [
      'Chiffre-moi 100m2 de toiture en zinc',
      'Isolation de combles perdus 80m2',
      'Remplacement de 8 fenetres double vitrage PVC',
      'Renovation salle de bain 6m2 complete',
      'Ravalement facade crepi 120m2',
    ]
    const input = page.locator('input[placeholder*="Decrivez"], textarea[placeholder*="Decrivez"], input[placeholder*="travaux"]').first()
    await input.fill(pick(prompts), { timeout: 10_000 })

    // Submit le prompt
    const submitBtn = page.locator('button[type="submit"]').last()
    await submitBtn.click()

    // Attendre que l'IA reponde (peut prendre 10-30s)
    try {
      await page.waitForSelector('.whitespace-pre-wrap, [class*="prose"], article', { timeout: 45_000 })
      // Attendre un peu plus pour la reponse complete
      await page.waitForTimeout(3000)
      const bodyText = await page.locator('body').textContent().catch(() => '')
      if (bodyText && (bodyText.includes('EUR') || bodyText.includes('€') || bodyText.length > 800)) {
        result.ok = true
      } else {
        result.error = 'reponse IA vide ou trop courte'
      }
    } catch {
      result.error = 'timeout 45s (IA n\'a pas repondu)'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `chiffrage-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Scenario 5 : Affilie echange un cadeau ────────────────────────────────
async function affiliateClaimReward(page: Page, cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'affiliate:claim-reward', user: cred.email, durationMs: 0 }
  try {
    await patchRole(page, 'particulier')
    await page.goto(`${BASE_URL}/particulier/catalogue`, { waitUntil: 'networkidle', timeout: 30_000 })

    // Cliquer sur un bouton "Echanger" (premier cadeau disponible)
    const echangeBtn = page.locator('button:has-text("Echanger")').first()
    const available = await echangeBtn.count()
    if (available === 0) {
      result.error = 'aucun cadeau disponible (pas assez de points ?)'
      return result
    }
    await echangeBtn.click({ timeout: 10_000 })

    // Modal s'ouvre. Remplir adresse si physique
    await page.waitForTimeout(800)
    const addressField = page.locator('textarea[placeholder*="adresse"], textarea[placeholder*="livraison"]').first()
    if (await addressField.count() > 0) {
      await addressField.fill(`${Math.floor(Math.random() * 99) + 1} rue de la Plage\n29000 Brest\nFrance`).catch(() => { /* */ })
    }

    // Confirmer
    await page.locator('button:has-text("Confirmer")').first().click({ timeout: 10_000 })

    await page.waitForTimeout(2500)
    const bodyText = await page.locator('body').textContent().catch(() => '')
    if (bodyText?.includes('envoye') || bodyText?.includes('bien') || bodyText?.includes('succes') || bodyText?.includes('contactera')) {
      result.ok = true
    } else {
      const errMsgs = await page.locator('[class*="text-red"]').allTextContents().catch(() => [] as string[])
      const real = errMsgs.map(s => s.trim()).filter(s => s.length > 3)
      result.error = real.length ? real[0].slice(0, 200) : 'pas de confirmation visible'
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `reward-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Scenario 6 : Diagnostic public (visiteur sans login) ──────────────────
async function publicDiagnostic(page: Page, _cred: Cred, idx: number): Promise<ActionResult> {
  const start = Date.now()
  const result: ActionResult = { ok: false, scenario: 'public:diagnostic', user: 'visiteur-anonyme', durationMs: 0 }
  try {
    await page.goto(`${BASE_URL}/diagnostic`, { waitUntil: 'networkidle', timeout: 30_000 })

    // Cliquer sur un type (Humidite, Isolation, etc.) — premier bouton/card
    const firstCard = page.locator('button, [role="button"], a').filter({ hasText: /humidit|isolat|toiture|renovation|electri|chauffage|vmc|salle/i }).first()
    await firstCard.click({ timeout: 10_000 })

    await page.waitForTimeout(1500)

    // Remplir tous les inputs texte/tel/email visibles
    const inputs = page.locator('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):visible')
    const count = await inputs.count()
    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i)
      const type = await input.getAttribute('type') ?? 'text'
      try {
        if (type === 'email') await input.fill(`visiteur${idx}@test.fr`)
        else if (type === 'tel') await input.fill(phone())
        else if (type === 'number') await input.fill(String(Math.floor(Math.random() * 100) + 20))
        else await input.fill(`Test ${idx}`)
      } catch { /* */ }
    }

    // Selectionner premier radio de chaque group si presents
    const radios = page.locator('input[type="radio"]')
    const radioCount = await radios.count()
    for (let i = 0; i < Math.min(radioCount, 5); i++) {
      await radios.nth(i).click({ force: true }).catch(() => { /* */ })
    }

    // Boucle multi-etapes : a chaque etape, remplir inputs + selects + radios puis "Continuer"
    for (let step = 0; step < 8; step++) {
      // Remplir tous les inputs visibles non encore remplis
      const stepInputs = page.locator('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):visible')
      const nInputs = await stepInputs.count()
      for (let i = 0; i < nInputs; i++) {
        const inp = stepInputs.nth(i)
        const type = await inp.getAttribute('type') ?? 'text'
        const placeholder = (await inp.getAttribute('placeholder') ?? '').toLowerCase()
        const val = await inp.inputValue().catch(() => '')
        if (val) continue
        try {
          if (type === 'email') await inp.fill(`visiteur${idx}@test.fr`)
          else if (type === 'tel') await inp.fill(phone())
          else if (type === 'number' || /^\d+$/.test(placeholder)) {
            // Ex 1975 = annee, 85 = surface
            if (placeholder.startsWith('19')) await inp.fill('1995')
            else await inp.fill('85')
          } else await inp.fill(`${pick(CLIENT_FIRST)}`)
        } catch { /* */ }
      }
      // Remplir tous les selects
      const selects = page.locator('select:visible')
      const nSel = await selects.count()
      for (let i = 0; i < nSel; i++) {
        await selects.nth(i).selectOption({ index: 1 }).catch(() => { /* */ })
      }
      // Cliquer premier radio de chaque fieldset (approximation : premier de la page)
      const radios = page.locator('input[type="radio"]:visible')
      if (await radios.count() > 0) {
        await radios.first().click({ force: true }).catch(() => { /* */ })
      }

      const nextBtn = page.locator('button:has-text("Suivant"), button:has-text("Continuer"), button:has-text("Voir"), button:has-text("Obtenir"), button:has-text("Valider"), button:has-text("Terminer")').last()
      const disabled = await nextBtn.isDisabled().catch(() => true)
      if (disabled) {
        await page.waitForTimeout(500)
        continue
      }
      await nextBtn.click({ timeout: 5_000 }).catch(() => { /* */ })
      await page.waitForTimeout(1200)
      if (page.url().includes('/resultat')) break
    }

    await page.waitForTimeout(2000)
    const url = page.url()
    if (url.includes('/resultats') || url.includes('/resultat')) {
      result.ok = true
    } else {
      const bodyText = await page.locator('body').textContent().catch(() => '')
      if (bodyText && (bodyText.includes('diagnostic') && (bodyText.includes('EUR') || bodyText.includes('estimation')))) {
        result.ok = true
      } else {
        result.error = `url=${url.replace(BASE_URL, '')}`
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  } finally {
    result.durationMs = Date.now() - start
    if (!result.ok) {
      await page.screenshot({ path: join(ERROR_SHOTS, `diag-${idx}.png`), fullPage: false }).catch(() => { /* */ })
    }
  }
  return result
}

// ─── Runner ────────────────────────────────────────────────────────────────
async function runScenario<T extends Cred>(
  browser: Browser,
  cred: T,
  role: 'pro' | 'particulier',
  idx: number,
  action: (page: Page, cred: T, idx: number) => Promise<ActionResult>,
): Promise<ActionResult> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  let result: ActionResult = { ok: false, scenario: 'init', user: cred.email, durationMs: 0, error: 'not started' }
  try {
    const ok = await login(page, cred.email, cred.password, role)
    if (!ok) {
      result = { ok: false, scenario: 'login', user: cred.email, durationMs: 0, error: 'login failed' }
    } else {
      result = await action(page, cred, idx)
    }
  } finally {
    await context.close()
  }
  return result
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n🔥 STRESS TEST D'ACTIONS\n`)
  console.log(`   Base URL : ${BASE_URL}\n`)

  const browser = await chromium.launch({ headless: true })

  const prosForTest = creds.pros.slice(0, 10)
  const affsForTest = creds.affiliates.slice(0, 10)
  const affsForChiffrage = creds.affiliates.slice(0, 8)  // IA = un peu moins pour pas saturer le VPS
  const affsForReward = creds.affiliates.slice(0, 6)
  const affsForMessage = creds.affiliates.slice(0, 10)
  const diagCount = 10

  console.log(`📋 Scenario 1 : ${prosForTest.length} pros creent 2 prospects chacun (20 concurrentes)`)
  console.log(`📋 Scenario 2 : ${affsForTest.length} affilies creent 1 parrainage chacun (10 concurrentes)`)
  console.log(`📋 Scenario 3 : ${affsForMessage.length} affilies envoient 1 message (10 concurrentes)`)
  console.log(`📋 Scenario 4 : ${affsForChiffrage.length} affilies font un chiffrage IA (8 concurrentes) → stress VPS`)
  console.log(`📋 Scenario 5 : ${affsForReward.length} affilies echangent un cadeau (6 concurrentes)`)
  console.log(`📋 Scenario 6 : ${diagCount} visiteurs anonymes font un diagnostic (10 concurrentes)\n`)

  const startAll = Date.now()

  // Scenario 1
  console.log(`🚀 Scenario 1 (prospects pro)...`)
  let stepStart = Date.now()
  const proActions = prosForTest.flatMap((c, i) => [
    runScenario(browser, c, 'pro', i * 2, proCreateProspect),
    runScenario(browser, c, 'pro', i * 2 + 1, proCreateProspect),
  ])
  const proResults = await Promise.all(proActions)
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  // Scenario 2
  console.log(`🚀 Scenario 2 (parrainages affilies)...`)
  stepStart = Date.now()
  const affResults = await Promise.all(
    affsForTest.map((c, i) => runScenario(browser, c, 'particulier', i, affiliateCreateParrainage))
  )
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  // Scenario 3 : messages
  console.log(`🚀 Scenario 3 (messages)...`)
  stepStart = Date.now()
  const msgResults = await Promise.all(
    affsForMessage.map((c, i) => runScenario(browser, c, 'particulier', i, affiliateSendMessage))
  )
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  // Scenario 4 : chiffrage IA (stress VPS)
  console.log(`🚀 Scenario 4 (chiffrage IA — 8 requetes simultanees sur VPS)...`)
  stepStart = Date.now()
  const iaResults = await Promise.all(
    affsForChiffrage.map((c, i) => runScenario(browser, c, 'particulier', i, affiliateChiffrageIA))
  )
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  // Scenario 5 : echange cadeau
  console.log(`🚀 Scenario 5 (echange cadeaux)...`)
  stepStart = Date.now()
  const rewardResults = await Promise.all(
    affsForReward.map((c, i) => runScenario(browser, c, 'particulier', i, affiliateClaimReward))
  )
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  // Scenario 6 : diagnostic public (pas besoin login)
  console.log(`🚀 Scenario 6 (diagnostic public — 10 visiteurs anonymes)...`)
  stepStart = Date.now()
  const diagResults = await Promise.all(
    Array.from({ length: diagCount }, async (_, i) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      const pg = await ctx.newPage()
      const r = await publicDiagnostic(pg, { email: '', password: '', fullName: '' }, i)
      await ctx.close()
      return r
    })
  )
  console.log(`   Fini en ${((Date.now() - stepStart) / 1000).toFixed(1)}s\n`)

  await browser.close()

  const allResults = [...proResults, ...affResults, ...msgResults, ...iaResults, ...rewardResults, ...diagResults]
  const totalDuration = Date.now() - startAll

  // Rapport
  console.log(`═══════════════════════════════════════`)
  console.log(`📊 RAPPORT STRESS TEST D'ACTIONS`)
  console.log(`═══════════════════════════════════════`)
  console.log(`⏱  Duree totale    : ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(`🎬 Actions tentees : ${allResults.length}`)
  console.log(`✅ Reussies        : ${allResults.filter(r => r.ok).length}`)
  console.log(`❌ Echouees        : ${allResults.filter(r => !r.ok).length}`)
  console.log('')

  // Par scenario
  const byScenario = new Map<string, { ok: number; ko: number; errors: string[] }>()
  for (const r of allResults) {
    const g = byScenario.get(r.scenario) ?? { ok: 0, ko: 0, errors: [] }
    if (r.ok) g.ok++
    else { g.ko++; if (r.error) g.errors.push(r.error) }
    byScenario.set(r.scenario, g)
  }

  console.log(`📈 Par scenario :\n`)
  for (const [scenario, stats] of byScenario) {
    const total = stats.ok + stats.ko
    const pct = total > 0 ? Math.round(stats.ok / total * 100) : 0
    console.log(`  ${scenario}`)
    console.log(`    ${stats.ok}/${total} reussi (${pct}%)`)
    if (stats.errors.length) {
      // Regrouper par type d'erreur
      const errCount = new Map<string, number>()
      for (const e of stats.errors) {
        const key = e.slice(0, 100)
        errCount.set(key, (errCount.get(key) ?? 0) + 1)
      }
      const sortedErrs = [...errCount.entries()].sort((a, b) => b[1] - a[1])
      for (const [msg, count] of sortedErrs.slice(0, 5)) {
        console.log(`       x${count} — ${msg}`)
      }
    }
    console.log('')
  }

  // Duree moyenne par action
  const avgDuration = allResults.reduce((a, r) => a + r.durationMs, 0) / allResults.length
  console.log(`⏱  Duree moyenne / action : ${Math.round(avgDuration)}ms`)
  console.log('')

  if (allResults.some(r => !r.ok)) {
    console.log(`📸 Screenshots des echecs : ${ERROR_SHOTS}`)
  } else {
    console.log(`🎉 Tous les scenarios passent !`)
  }
  console.log('')
}

main().catch(err => { console.error('\n❌ Fatal :', err); process.exit(1) })
