/**
 * Helpers de formatage français pour les fiches contacts BRH.
 *
 * Bugs UI à corriger sur fiche client (Bodard François 14/05/2026) :
 * - noms en minuscules → capitaliser
 * - téléphones non formatés "0683533275" → "06 83 53 32 75"
 * - adresse qui contient déjà CP+ville + on ré-ajoute "· 29200 Brest" → dédoublonner
 */

/** Capitalise un mot français (gère O'Brien, Le Goff, etc.). */
function capitalizeWord(w: string): string {
  if (!w) return w
  const lower = w.toLowerCase()
  // Préserve les particules en minuscules en milieu de chaîne
  // (mais en début de chaîne on capitalise quand même)
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** "bodard francois" → "Bodard François" (capitalisation propre française). */
export function formatNameFr(s: string | null | undefined): string {
  if (!s) return ''
  const trimmed = s.trim()
  // Si déjà en mixed case (un mot avec majuscule au milieu, ou mélange) → garder tel quel
  // sauf si tout est en minuscules ou tout en MAJUSCULES
  const isAllLower = trimmed === trimmed.toLowerCase()
  const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)
  if (!isAllLower && !isAllUpper) return trimmed
  // Capitalise chaque mot
  return trimmed
    .split(/\s+/)
    .map((token) =>
      token
        .split('-')
        .map((part) =>
          part
            .split("'")
            .map(capitalizeWord)
            .join("'"),
        )
        .join('-'),
    )
    .join(' ')
}

/** "0683533275" → "06 83 53 32 75". Gère aussi "+33 6 83..." ou "06.83.53.32.75". */
export function formatPhoneFr(s: string | null | undefined): string {
  if (!s) return ''
  const digits = s.replace(/\D/g, '')
  // Numéro international FR (+33...)
  if (digits.startsWith('33') && digits.length === 11) {
    const rest = digits.slice(2)
    return `+33 ${rest[0]} ${rest.slice(1, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`
  }
  // 10 chiffres FR (0X XX XX XX XX)
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
  }
  // Sinon retour brut
  return s.trim()
}

/**
 * Compose adresse + CP + ville sans dupliquer le CP/ville s'ils sont déjà
 * présents dans le champ `adresse`.
 *
 * Ex : adresse="14 rue bugeaud 29200 Brest France", cp="29200", ville="Brest"
 *   → "14 rue bugeaud 29200 Brest France"
 *
 * Ex : adresse="14 rue bugeaud", cp="29200", ville="Brest"
 *   → "14 rue bugeaud · 29200 Brest"
 */
export function formatFullAddress(
  adresse: string | null | undefined,
  codePostal: string | null | undefined,
  ville: string | null | undefined,
): string {
  const adr = (adresse ?? '').trim()
  const cp = (codePostal ?? '').trim()
  const v = (ville ?? '').trim()

  if (!adr && !cp && !v) return ''
  if (!adr) return `${cp} ${v}`.trim()

  const adrLower = adr.toLowerCase()
  const hasCP = cp ? adrLower.includes(cp.toLowerCase()) : true
  const hasVille = v ? adrLower.includes(v.toLowerCase()) : true

  if (hasCP && hasVille) return adr
  // Suffix complémentaire
  const suffix = [cp, v].filter(Boolean).join(' ')
  return suffix ? `${adr} · ${suffix}` : adr
}
