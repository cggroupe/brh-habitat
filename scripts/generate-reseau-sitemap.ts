/**
 * Phase 18.11 — Génération du sitemap.xml pour les pages SEO réseau.
 *
 * Usage : `npx tsx scripts/generate-reseau-sitemap.ts > public/sitemap-reseau.xml`
 *
 * Génère 75 URLs (5 dépts × 15 métiers BTP) pour indexation Google.
 * À enrichir au sitemap principal via robots.txt + sitemap_index.xml.
 */

const BASE_URL = 'https://www.renovation-brh.fr'

const DEPTS = ['22', '29', '35', '56', '44']
const METIERS = [
  'isolation_combles',
  'isolation_murs',
  'isolation_sols',
  'menuiseries',
  'pac_air_eau',
  'pac_air_air',
  'chaudiere_gaz',
  'plomberie',
  'electricite',
  'couverture',
  'zinguerie',
  'maconnerie',
  'platrerie',
  'peinture',
  'carrelage',
]

function generateSitemap(): string {
  const today = new Date().toISOString().split('T')[0]
  const urls: string[] = []

  // 1) Page hub /pros
  urls.push(`<url>
    <loc>${BASE_URL}/pros</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)

  // 2) Pages dept (5)
  for (const d of DEPTS) {
    urls.push(`<url>
    <loc>${BASE_URL}/pros/${d}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`)
  }

  // 3) Pages dept × métier (75)
  for (const d of DEPTS) {
    for (const m of METIERS) {
      urls.push(`<url>
    <loc>${BASE_URL}/pros/${d}/${m}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`)
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>
`
}

console.log(generateSitemap())
