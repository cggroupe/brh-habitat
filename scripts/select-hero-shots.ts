/**
 * Selectionne les 14 screenshots hero (1 par slide de presentation) et les
 * copie dans screenshots/hero/ avec un nommage adapte pour Genspark/Gamma.
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'screenshots')
const DST = join(ROOT, 'screenshots', 'hero')

// Mapping : slide -> screenshot source
const SELECTION: Array<{ slide: number; label: string; src: string }> = [
  { slide: 1,  label: 'slide01_homepage',            src: '01_homepage.png' },
  { slide: 2,  label: 'slide02_diagnostic',          src: '02_diagnostic_intro.png' },
  { slide: 3,  label: 'slide03_services',            src: '03_services.png' },
  { slide: 4,  label: 'slide04_ia_visiteur',         src: '06_assistant_public.png' },
  { slide: 5,  label: 'slide05_dashboard_client',    src: '07_dashboard_client.png' },
  { slide: 6,  label: 'slide06_admin_dashboard',     src: '11_admin_dashboard.png' },
  { slide: 7,  label: 'slide07_admin_prospects',     src: '12_admin_prospects.png' },
  { slide: 8,  label: 'slide08_admin_commissions',   src: '13_admin_commissions.png' },
  { slide: 9,  label: 'slide09_pro_dashboard',       src: '16_pro_dashboard.png' },
  { slide: 10, label: 'slide10_pro_prospect_new',    src: '18_pro_prospect_new.png' },
  { slide: 11, label: 'slide11_pro_chiffrage_ia',    src: '24_pro_chiffrage.png' },
  { slide: 12, label: 'slide12_part_dashboard',      src: '26_part_dashboard.png' },
  { slide: 13, label: 'slide13_part_statut_fiscal',  src: '30_part_statut_fiscal.png' }, // star
  { slide: 14, label: 'slide14_part_catalogue',      src: '28_part_catalogue.png' },
]

function run(): void {
  if (!existsSync(DST)) mkdirSync(DST, { recursive: true })

  console.log(`\n📦 Selection hero shots`)
  console.log(`   De : ${SRC}`)
  console.log(`   Vers : ${DST}\n`)

  let totalBytes = 0
  for (const { slide, label, src } of SELECTION) {
    const srcPath = join(SRC, src)
    if (!existsSync(srcPath)) {
      console.log(`  ⚠️  ${src} manquant — skip`)
      continue
    }
    const dstPath = join(DST, `${label}.png`)
    copyFileSync(srcPath, dstPath)
    const size = statSync(dstPath).size
    totalBytes += size
    const sizeStr = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`
    console.log(`  ✅ Slide ${String(slide).padStart(2)} : ${label}.png  (${sizeStr})`)
  }

  const totalMB = (totalBytes / 1024 / 1024).toFixed(1)
  console.log(`\n📊 Total : ${SELECTION.length} fichiers, ${totalMB} MB`)
  if (totalBytes > 10 * 1024 * 1024) {
    console.log(`⚠️  Depasse 10 MB, lance aussi 'npm run optimize-shots' pour compresser`)
  } else {
    console.log(`✅ Taille compatible avec Genspark (< 10 MB)`)
  }
}

run()
