/**
 * Helpers export CSV/XLSX pour les listes — pattern Data-B.
 *
 * - `exportCsv(rows, columns, filename)` télécharge un .csv UTF-8 BOM (Excel-safe).
 * - `exportXlsx` n'est pas implémenté ici (require lib externe `xlsx` = +200kB).
 *   Pour Excel, ouvrir le .csv UTF-8 fonctionne ≥ Excel 2016 grâce au BOM.
 *
 * Format quoting RFC 4180 :
 *   - séparateur `;` (Excel FR natif sans étape "données → texte en colonnes")
 *   - quotes doublées `""` à l'intérieur des champs quotés
 *   - quote forcée si valeur contient `;` `"` `\n` ou commence par `=` (anti-injection)
 */

export interface ExportColumn<T> {
  header: string
  /** Cell value extractor. Retourner '' ou null pour cellule vide. */
  get: (row: T) => string | number | null | undefined | boolean
}

/**
 * Échappe une valeur cellule pour CSV.
 * Anti-injection Excel : préfixe `'` si commence par `= + - @` (CSV injection).
 */
function escapeCell(value: string | number | null | undefined | boolean): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // Anti CSV injection — RFC OWASP
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str
  }
  const needsQuote = /[;"\n\r]/.test(str)
  if (needsQuote) {
    str = '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

export function rowsToCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(';')
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.get(row))).join(';'))
    .join('\r\n')
  return header + '\r\n' + body
}

/**
 * Déclenche un téléchargement client-side du contenu CSV.
 * BOM UTF-8 préfixé pour qu'Excel détecte l'encodage automatiquement.
 */
export function downloadCsv(content: string, filename: string) {
  const BOM = '﻿'
  const blob = new Blob([BOM + content], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    // micro-tâche pour laisser le browser commencer le DL avant revoke
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export function exportCsv<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
) {
  const csv = rowsToCsv(rows, columns)
  downloadCsv(csv, filename)
}

/**
 * Format date FR utilisable directement par Excel (`27/05/2026`).
 * Renvoie '' si date NULL/invalid.
 */
export function fmtDateFr(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** Format euros sans symbole, séparateur de milliers `,` neutre — Excel-safe. */
export function fmtEur(cents: number | null | undefined, isCents = false): string {
  if (cents === null || cents === undefined) return ''
  const euros = isCents ? cents / 100 : cents
  if (Number.isNaN(euros)) return ''
  return euros.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}
