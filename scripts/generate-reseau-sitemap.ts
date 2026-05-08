/**
 * Phase 18.11 + Phase G+ 2026-05-08 — Génération du sitemap.xml.
 *
 * Usage : `npx tsx scripts/generate-reseau-sitemap.ts > public/sitemap-reseau.xml`
 *
 * Inclut désormais :
 *   - 1 hub /pros + 5 dépts + (5 × 23 = 115) URLs SEO satellites pros
 *   - 26 articles guides /articles/:slug (10 originaux + 16 nouveaux Bretagne)
 *   - URLs principales (home, /diagnostic, /partenaires, etc.)
 */

const BASE_URL = 'https://www.renovation-brh.fr'

// Articles guides (slugs depuis src/data/seo-strategy.ts — synchroniser à la main)
const ARTICLE_SLUGS = [
  // Originaux
  'vmc-ventilation-bretagne',
  'isolation-thermique-guide',
  'ponts-thermiques-solutions',
  'problemes-humidite-bretagne',
  'renovation-energetique-guide',
  'aides-renovation-2026',
  'toiture-renovation-bretagne',
  'menuiseries-fenetres-guide',
  'dpe-diagnostic-performance',
  'mise-aux-normes-electriques',
  // Phase G+ 2026-05-08 — 16 nouveaux articles Bretagne
  'pompe-a-chaleur-air-eau-bretagne',
  'photovoltaique-autoconsommation-bretagne',
  'chauffe-eau-thermodynamique-bretagne',
  'isolation-combles-perdus-ouate-cellulose',
  'ite-granit-bretagne',
  'test-etancheite-air-infiltrometrie',
  'renovation-longere-bretonne',
  'dpe-fg-loi-climat-2026',
  'audit-energetique-gratuit-bretagne',
  'couverture-ardoise-bretagne-entretien',
  'chauffage-bois-bretagne-granules-buches',
  'combles-perdus-vs-amenageables',
  'volets-roulants-solaires-bretagne',
  'recuperation-eau-pluie-bretagne',
  'vmc-double-flux-vs-simple-flux',
  'renover-maison-1900-1948-bretagne',
]

const STATIC_PAGES = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: '/services', priority: '0.8', changefreq: 'monthly' },
  { path: '/diagnostic', priority: '0.9', changefreq: 'monthly' },
  { path: '/diagnostic-express', priority: '0.9', changefreq: 'monthly' },
  { path: '/articles', priority: '0.8', changefreq: 'weekly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/partenaires', priority: '0.8', changefreq: 'weekly' },
  { path: '/connexion', priority: '0.5', changefreq: 'monthly' },
  { path: '/inscription', priority: '0.6', changefreq: 'monthly' },
  { path: '/inscription/particulier', priority: '0.6', changefreq: 'monthly' },
  { path: '/inscription/pro', priority: '0.7', changefreq: 'monthly' },
  { path: '/inscription/agence', priority: '0.7', changefreq: 'monthly' },
]

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
  // Phase G+ 2026-05-08 — métiers complémentaires Bretagne
  'photovoltaique',
  'chauffage_bois',
  'chauffe_eau_thermodynamique',
  'vmc',
  'audit_energetique',
  'ite_bardage',
  'ardoise',
  'facade_chaux',
]

function generateSitemap(): string {
  const today = new Date().toISOString().split('T')[0]
  const urls: string[] = []

  // 1) Pages statiques principales
  for (const p of STATIC_PAGES) {
    urls.push(`<url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
  }

  // 2) Articles guides (26 au total)
  for (const slug of ARTICLE_SLUGS) {
    urls.push(`<url>
    <loc>${BASE_URL}/articles/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)
  }

  // 3) Page hub /pros
  urls.push(`<url>
    <loc>${BASE_URL}/pros</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)

  // 4) Pages dept (5)
  for (const d of DEPTS) {
    urls.push(`<url>
    <loc>${BASE_URL}/pros/${d}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`)
  }

  // 5) Pages dept × métier (5 × 23 = 115)
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
