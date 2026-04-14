// ── Markdown file imports map ────────────────────────────────────────────────

export const markdownModules = import.meta.glob('/src/data/articles/*.md', {
  query: '?raw',
  import: 'default',
})

// ── Strip YAML frontmatter ───────────────────────────────────────────────────

export function stripFrontmatter(md: string): string {
  const match = md.match(/^---\n[\s\S]*?\n---\n/)
  return match ? md.slice(match[0].length) : md
}

// ── Strip the leading H1 from markdown (already shown in hero) ───────────────

export function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+[^\n]+\n?/, '')
}

// ── Extract H2 headings for table of contents ────────────────────────────────

export function extractH2s(md: string): { id: string; text: string }[] {
  const matches = [...md.matchAll(/^##\s+(.+)$/gm)]
  return matches.map((m) => {
    const text = m[1].trim()
    const id = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return { id, text }
  })
}

// ── Generate a slug-safe id from heading text ────────────────────────────────

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Category gradient helper ─────────────────────────────────────────────────

export function getCategoryGradient(category: string): string {
  switch (category) {
    case 'humidite':
      return 'from-emerald-800 via-emerald-700 to-emerald-600'
    case 'isolation':
      return 'from-green-800 via-green-700 to-green-600'
    case 'ventilation':
      return 'from-teal-800 via-teal-700 to-teal-600'
    case 'toiture':
      return 'from-green-900 via-green-800 to-green-700'
    case 'electricite':
      return 'from-emerald-700 via-emerald-600 to-emerald-500'
    case 'renovation':
      return 'from-primary-dark via-primary to-primary'
    case 'menuiseries':
      return 'from-green-800 via-green-700 to-green-600'
    case 'aides':
      return 'from-emerald-800 via-emerald-700 to-emerald-600'
    default:
      return 'from-primary-dark via-primary to-primary'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'humidite':
      return 'Humidite'
    case 'isolation':
      return 'Isolation'
    case 'ventilation':
      return 'Ventilation'
    case 'toiture':
      return 'Toiture'
    case 'electricite':
      return 'Electricite'
    case 'renovation':
      return 'Renovation'
    case 'menuiseries':
      return 'Menuiseries'
    case 'aides':
      return 'Aides'
    default:
      return category
  }
}

// ── Related articles ─────────────────────────────────────────────────────────

import { articles, type ArticleData } from '@/data/articles'

export function getRelatedArticles(current: ArticleData): ArticleData[] {
  const sameCategory = articles.filter(
    (a) => a.category === current.category && a.slug !== current.slug
  )
  const others = articles.filter(
    (a) => a.category !== current.category && a.slug !== current.slug
  )
  return [...sameCategory, ...others].slice(0, 3)
}
