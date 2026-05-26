import { test } from '@playwright/test'

test('smoke prod : pas d\'erreur runtime + nouveaux composants présents', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })

  await page.goto('https://brh-habitat.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  console.log('=== ERRORS ===')
  errors.forEach((e) => console.log(e))
  console.log('=== TITLE ===')
  console.log(await page.title())
})
