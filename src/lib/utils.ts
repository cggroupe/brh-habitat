/**
 * Formate une date en string YYYY-MM-DD en utilisant la date locale (pas UTC).
 * Remplace toISOString().slice(0,10) qui cause un decalage de jour hors UTC.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
