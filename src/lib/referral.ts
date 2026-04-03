/**
 * Genere un code court memorisable de 5 caracteres.
 * Format : 2 initiales + 3 chiffres (ex: PD-247)
 */
export function generateShortCode(firstName: string, lastName: string): string {
  const f = (firstName[0] ?? 'X').toUpperCase()
  const l = (lastName[0] ?? 'X').toUpperCase()
  const num = String(Math.floor(Math.random() * 900) + 100) // 100-999
  return `${f}${l}${num}`
}

/**
 * Genere le lien de parrainage complet
 */
export function getReferralLink(code: string): string {
  return `${window.location.origin}/inscription/particulier?ref=${code}`
}

/**
 * Genere le lien simulateur personnalise
 */
export function getSimulationLink(code: string, workType?: string): string {
  const base = `${window.location.origin}/diagnostic?ref=${code}`
  return workType ? `${base}&type=${workType}` : base
}

/**
 * Copie dans le presse-papier avec callback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Genere un lien WhatsApp avec message pre-rempli
 */
export function getWhatsAppShareUrl(text: string, url: string): string {
  const message = encodeURIComponent(`${text}\n${url}`)
  return `https://wa.me/?text=${message}`
}

/**
 * Genere un lien SMS avec message pre-rempli
 */
export function getSmsShareUrl(text: string): string {
  return `sms:?body=${encodeURIComponent(text)}`
}
