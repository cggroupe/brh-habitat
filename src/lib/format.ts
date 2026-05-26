/**
 * Helpers de formatage généraux pour les fiches BRH.
 *
 * Complète `format-fr.ts` qui gère les noms/téléphones/adresses.
 * Centralise les helpers SIREN, m², euros, dates utilisés par les composants UI.
 */

/** "918350695" → "918 350 695" (groupes de 3 chiffres). */
export function formatSiren(siren: string | null | undefined): string {
  if (!siren) return ''
  const digits = siren.replace(/\D/g, '')
  if (digits.length !== 9) return siren.trim()
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`
}

/** 89 → "89 m²" / null → "—" */
export function formatM2(m2: number | null | undefined): string {
  if (m2 == null || !Number.isFinite(m2)) return '—'
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(m2))} m²`
}

/**
 * Convertit montant cents → euros formaté FR avec symbole €.
 * 1234500 cents → "12 345 €"
 * null → "—"
 */
export function formatEurosFromCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '—'
  const euros = Math.round(cents / 100)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(euros)
}

/**
 * Date ISO "2024-03-15" → "15 mars 2024".
 * Tolère également un objet Date ou un timestamp.
 */
export function formatDate(d: string | Date | number | null | undefined): string {
  if (d == null || d === '') return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Date ISO "2024-03-15" → "15/03/2024" (format court).
 */
export function formatDateShort(d: string | Date | number | null | undefined): string {
  if (d == null || d === '') return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Formate un grand nombre avec séparateur de milliers FR.
 * 1100 → "1 100"
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-FR').format(n)
}
