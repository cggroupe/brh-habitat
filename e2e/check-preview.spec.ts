import { test } from '@playwright/test'

test('check console errors on preview', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  page.on('requestfailed', (req) => errors.push(`[reqfail] ${req.url()} ${req.failure()?.errorText}`))

  await page.goto('https://brh-habitat-git-feat-fiches-data-b-refonte-cggroupes-projects.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  console.log('\n=== ERRORS ===')
  errors.forEach((e) => console.log(e))
  console.log('\n=== BODY ===')
  const body = await page.textContent('body')
  console.log((body ?? '').substring(0, 300))
})
