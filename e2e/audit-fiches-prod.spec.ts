/**
 * Audit visuel exhaustif des fiches BRH Habitat sur prod.
 * Capture les bugs UX/design que Philippe a constatés en vrai.
 *
 * Cas testés :
 *  1. La Mirandole (introuvable en DB → utilise KER GWEL VAD SCI proche)
 *  2. SCI KER GWEL VAD Quimper (siren 918350695) — clic dirigeants
 *  3. SCI LE MENN-CAP Quimper (siren 889073581) — substitut « Ipo le Ménès »
 *  4. Dirigeant Charlotte (Lescoat — 3 SCI)
 *  5. Dirigeant Alexandre Gindre (id e6e0a20a-…)
 *  6. Navigation trail SCI → dirigeant → autre SCI
 *  7. XAVIER PINTAT (bug connu 1100 DPE)
 *
 * Sortie : /tmp/audit-fiches-brh/*.png + audit-report.{json,md}
 *
 * Lancement :
 *   BRH_E2E_EMAIL=pierrecollard@contact-brh.fr \
 *   BRH_E2E_PASSWORD='Brh29200.@' \
 *   E2E_BASE_URL=https://brh-habitat.vercel.app \
 *   npx playwright test e2e/audit-fiches-prod.spec.ts --reporter=list
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAsEmployee, gotoEmployePage } from './support/auth'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = '/tmp/audit-fiches-brh'
mkdirSync(OUT_DIR, { recursive: true })

interface CaseResult {
  id: string
  title: string
  url: string
  screenshot: string
  zoom_screenshot?: string
  dom_excerpt: string
  console_errors: string[]
  load_time_ms: number
  observations: string[]
  status: '🔴' | '🟠' | '🟡' | '✅' | '❓'
}

const results: CaseResult[] = []
const consoleErrors: Map<string, string[]> = new Map()

async function attachConsoleListener(page: Page, caseId: string) {
  consoleErrors.set(caseId, [])
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const arr = consoleErrors.get(caseId)
      if (arr && arr.length < 30) arr.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`)
    }
  })
  page.on('pageerror', (err) => {
    const arr = consoleErrors.get(caseId)
    if (arr && arr.length < 30) arr.push(`[pageerror] ${err.message.slice(0, 300)}`)
  })
}

async function captureCase(
  page: Page,
  caseId: string,
  title: string,
  url: string,
  zoomSelector?: string,
): Promise<CaseResult> {
  await attachConsoleListener(page, caseId)
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {})
  // Laisser le temps aux fetch supabase (RPC souvent ~3-8s)
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const loadTime = Date.now() - t0

  const screenshotPath = join(OUT_DIR, `${caseId}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})

  let zoomScreenshot: string | undefined
  if (zoomSelector) {
    const loc = page.locator(zoomSelector).first()
    if ((await loc.count()) > 0) {
      zoomScreenshot = join(OUT_DIR, `${caseId}-zoom.png`)
      await loc.screenshot({ path: zoomScreenshot }).catch(() => {})
    }
  }

  // DOM excerpt : grab main / role=main / first <article> or body
  const dom = await page
    .evaluate(() => {
      const main =
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('article') ||
        document.body
      return main ? main.innerHTML.slice(0, 25_000) : ''
    })
    .catch(() => '')

  const observations: string[] = []
  // Heuristic checks
  const text = await page.evaluate(() => document.body.innerText).catch(() => '')

  if (text.includes('Aucun rôle') || text.includes('aucun rôle')) {
    observations.push('Texte "Aucun rôle" présent → fiche dirigeant probablement vide')
  }
  if (text.match(/1100\s*DPE/)) {
    observations.push('Compteur "1100 DPE" présent (probable utility ENEDIS leak)')
  }
  if (text.includes('ENEDIS') && text.includes('utility')) {
    observations.push('Mention ENEDIS + utility détectée — pattern d\'avertissement utility OK')
  }
  if (text.match(/Erreur|erreur de chargement|404|Page non trouvée/i)) {
    observations.push('Erreur de chargement détectée dans la page')
  }
  if (loadTime > 10_000) {
    observations.push(`Temps de chargement lent : ${loadTime}ms`)
  }

  return {
    id: caseId,
    title,
    url,
    screenshot: screenshotPath,
    zoom_screenshot: zoomScreenshot,
    dom_excerpt: dom,
    console_errors: consoleErrors.get(caseId) ?? [],
    load_time_ms: loadTime,
    observations,
    status: '❓',
  }
}

test.describe.serial('Audit fiches BRH — prod', () => {
  test.setTimeout(120_000)

  test('Login', async ({ page }) => {
    await loginAsEmployee(page)
    expect(page.url()).toContain('/employe/')
  })

  test('Cas 1 — SCI KER GWEL VAD Quimper (substitut Mirandole)', async ({ page }) => {
    await loginAsEmployee(page)
    const r = await captureCase(
      page,
      '01-ker-gwel-vad-fiche-sci',
      'SCI KER GWEL VAD Quimper (siren 918350695) — proche phonétique « Ker Guell VAD »',
      'https://brh-habitat.vercel.app/employe/leads/entreprise/918350695',
      'main',
    )
    results.push(r)
  })

  test('Cas 2 — Clic sur dirigeants depuis KER GWEL VAD', async ({ page }) => {
    await loginAsEmployee(page)
    await page.goto('https://brh-habitat.vercel.app/employe/leads/entreprise/918350695', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    }).catch(() => {})
    await page.waitForTimeout(2000)
    // Capture l'état avant clic
    await page.screenshot({ path: join(OUT_DIR, '02-ker-gwel-vad-avant-clic.png'), fullPage: true })

    // Cherche le 1er dirigeant cliquable
    const dirLink = page
      .locator('a[href*="/employe/leads/personne/"], a[href*="/leads/personne/"]')
      .first()
    const found = (await dirLink.count()) > 0
    const r: CaseResult = {
      id: '02-ker-gwel-vad-dirigeants-clic',
      title: 'Clic sur 1er dirigeant depuis KER GWEL VAD',
      url: page.url(),
      screenshot: join(OUT_DIR, '02-ker-gwel-vad-dirigeants-clic.png'),
      dom_excerpt: '',
      console_errors: [],
      load_time_ms: 0,
      observations: [],
      status: '❓',
    }
    if (found) {
      const href = await dirLink.getAttribute('href')
      r.observations.push(`Lien dirigeant trouvé : ${href}`)
      const t0 = Date.now()
      await dirLink.click({ timeout: 5000 }).catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
      await page.waitForTimeout(1500)
      r.load_time_ms = Date.now() - t0
      r.url = page.url()
      await page.screenshot({ path: r.screenshot, fullPage: true })
      const text = await page.evaluate(() => document.body.innerText).catch(() => '')
      if (text.includes('Aucun rôle') || text.includes('aucun rôle')) {
        r.observations.push('Cible : "Aucun rôle" affiché — fiche vide !')
        r.status = '🔴'
      }
      if (text.match(/0\s*SCI/) || text.match(/Aucune SCI/i)) {
        r.observations.push('Compteur SCI = 0 ou "Aucune SCI"')
      }
      r.dom_excerpt = await page
        .evaluate(() => {
          const m = document.querySelector('main') || document.body
          return m.innerHTML.slice(0, 25_000)
        })
        .catch(() => '')
    } else {
      r.observations.push('AUCUN lien dirigeant cliquable trouvé sur la fiche SCI KER GWEL VAD')
      r.status = '🔴'
    }
    results.push(r)
  })

  test('Cas 3 — SCI LE MENN-CAP Quimper (substitut Ipo le Ménès)', async ({ page }) => {
    await loginAsEmployee(page)
    const r = await captureCase(
      page,
      '03-le-menn-cap-fiche-sci',
      'SCI LE MENN-CAP Quimper (siren 889073581) — substitut « Ipo le Ménès »',
      'https://brh-habitat.vercel.app/employe/leads/entreprise/889073581',
      'main',
    )
    results.push(r)
  })

  test('Cas 4 — Charlotte LESCOAT (dirigeant ref positif)', async ({ page }) => {
    await loginAsEmployee(page)
    const r = await captureCase(
      page,
      '04-charlotte-lescoat-fiche-dirigeant',
      'Dirigeant Charlotte LESCOAT — id 6892903c-… — 3 SCI (LES ALOUETTES, PRINCESSES, COPERNIC)',
      'https://brh-habitat.vercel.app/employe/leads/personne/CHARLOTTE LESCOAT',
      'main',
    )
    results.push(r)
  })

  test('Cas 5 — Alexandre GINDRE (cas client : aucun rôle)', async ({ page }) => {
    await loginAsEmployee(page)
    const r = await captureCase(
      page,
      '05-gindre-alexandre-fiche-dirigeant',
      'Dirigeant ALEXANDRE CHARLES JACQUES GINDRE — id e6e0a20a-… — 1 SCI (KER GWEL VAD)',
      'https://brh-habitat.vercel.app/employe/leads/personne/ALEXANDRE%20CHARLES%20JACQUES%20GINDRE',
      'main',
    )
    results.push(r)
  })

  test('Cas 6 — Navigation trail SCI → dirigeant → autre SCI', async ({ page }) => {
    await loginAsEmployee(page)
    const trail: Array<{ step: string; url: string; screenshot: string }> = []

    // Step 1 : aller sur SCI KER GWEL VAD
    await page.goto('https://brh-habitat.vercel.app/employe/leads/entreprise/918350695', {
      waitUntil: 'networkidle',
      timeout: 30_000,
    }).catch(() => {})
    await page.waitForTimeout(1500)
    const s1 = join(OUT_DIR, '06-trail-step1-sci-ker-gwel-vad.png')
    await page.screenshot({ path: s1, fullPage: true })
    trail.push({ step: 'SCI KER GWEL VAD', url: page.url(), screenshot: s1 })

    // Step 2 : cliquer 1er dirigeant
    const dir = page.locator('a[href*="/leads/personne/"]').first()
    let didClick = false
    if ((await dir.count()) > 0) {
      await dir.click({ timeout: 5000 }).catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
      await page.waitForTimeout(1500)
      didClick = true
    }
    const s2 = join(OUT_DIR, '06-trail-step2-dirigeant.png')
    await page.screenshot({ path: s2, fullPage: true })
    trail.push({ step: 'Dirigeant (clic depuis SCI)', url: page.url(), screenshot: s2 })

    // Step 3 : cliquer une autre SCI du dirigeant si dispo
    const sci2 = page.locator('a[href*="/leads/entreprise/"]').first()
    if ((await sci2.count()) > 0) {
      await sci2.click({ timeout: 5000 }).catch(() => {})
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
      await page.waitForTimeout(1500)
    }
    const s3 = join(OUT_DIR, '06-trail-step3-autre-sci.png')
    await page.screenshot({ path: s3, fullPage: true })
    trail.push({ step: 'Autre SCI du dirigeant', url: page.url(), screenshot: s3 })

    // Vérifier breadcrumb
    const breadcrumbHtml = await page
      .locator('nav[aria-label="Fil d\'Ariane"], nav[aria-label*="ariane" i]')
      .first()
      .innerHTML()
      .catch(() => '')

    const r: CaseResult = {
      id: '06-navigation-trail',
      title: 'Navigation trail SCI → dirigeant → autre SCI',
      url: trail.map((t) => t.url).join(' → '),
      screenshot: s3,
      dom_excerpt: breadcrumbHtml || 'AUCUN breadcrumb détecté',
      console_errors: [],
      load_time_ms: 0,
      observations: [
        `Trail : ${trail.map((t) => t.step).join(' → ')}`,
        didClick ? 'Clic dirigeant OK' : 'AUCUN dirigeant cliquable',
        breadcrumbHtml ? 'Breadcrumb détecté' : 'AUCUN breadcrumb sur la fiche finale',
      ],
      status: breadcrumbHtml ? '✅' : '🟠',
    }
    results.push(r)
  })

  test('Cas 7 — XAVIER PINTAT (bug 1100 DPE connu)', async ({ page }) => {
    await loginAsEmployee(page)
    const r = await captureCase(
      page,
      '07-xavier-pintat-bug-1100-dpe',
      'Bug connu : 1100 DPE ENEDIS via SCI masqués sur la fiche dirigeant',
      'https://brh-habitat.vercel.app/employe/leads/personne/XAVIER%20PINTAT',
      'main',
    )
    results.push(r)
  })

  test('Cas 8 — Exploration random : 5 SCI au hasard via /employe/leads', async ({ page }) => {
    await loginAsEmployee(page)
    await gotoEmployePage(page, '/employe/leads')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: join(OUT_DIR, '08-liste-leads.png'), fullPage: true })

    // Recueillir tous les liens vers /entreprise/
    const entrepriseLinks = await page
      .locator('a[href*="/leads/entreprise/"]')
      .evaluateAll((els) => Array.from(els, (e) => (e as HTMLAnchorElement).href))
      .catch(() => [] as string[])

    // dédoublonner + prendre 5 au hasard
    const unique = Array.from(new Set(entrepriseLinks))
    const sample = unique.slice(0, 5)
    const r: CaseResult = {
      id: '08-random-sample',
      title: '5 SCI au hasard depuis liste /employe/leads',
      url: '/employe/leads',
      screenshot: join(OUT_DIR, '08-liste-leads.png'),
      dom_excerpt: `Total SCI sur la page : ${unique.length}\nÉchantillon : ${sample.join('\n')}`,
      console_errors: [],
      load_time_ms: 0,
      observations: [`Found ${unique.length} liens SCI uniques sur la liste`],
      status: '❓',
    }

    for (let i = 0; i < sample.length; i++) {
      const url = sample[i]
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {})
      await page.waitForTimeout(1200)
      const shot = join(OUT_DIR, `08-random-${i + 1}.png`)
      await page.screenshot({ path: shot, fullPage: true })
      const text = await page.evaluate(() => document.body.innerText).catch(() => '')
      const sirenMatch = url.match(/\/entreprise\/([^/?#]+)/)?.[1]
      const trouvee: string[] = []
      if (text.match(/SIREN/i)) trouvee.push('SIREN ✓')
      if (text.match(/dirigeant/i)) trouvee.push('dirigeants ✓')
      if (text.match(/DPE/)) trouvee.push('DPE ✓')
      if (text.match(/adresse/i)) trouvee.push('adresse ✓')
      r.observations.push(
        `Sample ${i + 1}/${sample.length} siren=${sirenMatch} → infos: ${trouvee.join(', ') || 'AUCUNE'} (page text len=${text.length})`,
      )
    }
    results.push(r)
  })

  test('Export rapport final', async () => {
    writeFileSync(join(OUT_DIR, 'audit-report.json'), JSON.stringify(results, null, 2))
    let md = '# Audit visuel fiches BRH — prod\n\n'
    md += `Date : ${new Date().toISOString()}\n`
    md += `Cible : https://brh-habitat.vercel.app\n`
    md += `Compte : pierrecollard@contact-brh.fr (admin)\n\n`
    md += `## Tableau récap\n\n`
    md += `| # | Cas | URL | Statut | Temps | 1 ligne observation |\n`
    md += `|---|-----|-----|--------|-------|---------------------|\n`
    for (const r of results) {
      const obs = (r.observations[0] ?? '').replace(/\|/g, '/').slice(0, 120)
      md += `| ${r.id} | ${r.title.slice(0, 60)} | \`${r.url.slice(0, 80)}\` | ${r.status} | ${r.load_time_ms}ms | ${obs} |\n`
    }
    md += `\n## Détail par cas\n\n`
    for (const r of results) {
      md += `### ${r.id} — ${r.title}\n\n`
      md += `- **URL** : ${r.url}\n`
      md += `- **Screenshot** : ![](./${r.id}.png)\n`
      if (r.zoom_screenshot) md += `- **Zoom** : ![](./${r.id}-zoom.png)\n`
      md += `- **Temps chargement** : ${r.load_time_ms}ms\n`
      md += `- **Statut** : ${r.status}\n`
      md += `- **Observations** :\n`
      for (const o of r.observations) md += `  - ${o}\n`
      if (r.console_errors.length > 0) {
        md += `- **Erreurs console** :\n`
        for (const e of r.console_errors.slice(0, 5)) md += `  - \`${e}\`\n`
      }
      md += `\n`
    }
    writeFileSync(join(OUT_DIR, 'audit-report.md'), md)
    console.log(`Rapport écrit : ${OUT_DIR}/audit-report.md`)
  })
})
