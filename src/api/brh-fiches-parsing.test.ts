/**
 * Tests unitaires sur la stratégie multi-essai de parsing prénom/nom
 * dans getFichePersonneByName.
 *
 * Réplique la logique de tryPairs pour valider le cas GINDRE et autres
 * sans dépendre de Supabase.
 */
import { describe, expect, it } from 'vitest'

function generateTryPairs(fullName: string): Array<{ first: string; last: string }> {
  const parts = fullName.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return []
  const tryPairs: Array<{ first: string; last: string }> = []
  for (let lastWords = 1; lastWords <= Math.min(3, parts.length); lastWords++) {
    const last = parts.slice(-lastWords).join(' ')
    const first = parts.slice(0, -lastWords).join(' ')
    tryPairs.push({ first, last })
  }
  if (parts.length === 1) tryPairs.push({ first: '', last: parts[0] })
  return tryPairs
}

describe('getFichePersonneByName — parsing tryPairs', () => {
  it('ALEXANDRE CHARLES JACQUES GINDRE → essai 1 = (ALEXANDRE CHARLES JACQUES, GINDRE)', () => {
    const pairs = generateTryPairs('ALEXANDRE CHARLES JACQUES GINDRE')
    expect(pairs[0]).toEqual({ first: 'ALEXANDRE CHARLES JACQUES', last: 'GINDRE' })
  })

  it('ALEXANDRE CHARLES JACQUES GINDRE → essai 2 = (ALEXANDRE CHARLES, JACQUES GINDRE)', () => {
    const pairs = generateTryPairs('ALEXANDRE CHARLES JACQUES GINDRE')
    expect(pairs[1]).toEqual({ first: 'ALEXANDRE CHARLES', last: 'JACQUES GINDRE' })
  })

  it('MARYLENE FAURE → essai 1 = (MARYLENE, FAURE)', () => {
    const pairs = generateTryPairs('MARYLENE FAURE')
    expect(pairs[0]).toEqual({ first: 'MARYLENE', last: 'FAURE' })
  })

  it('JEAN-PIERRE DE MINIAC → essai 1 = (JEAN-PIERRE DE, MINIAC), essai 2 = (JEAN-PIERRE, DE MINIAC)', () => {
    const pairs = generateTryPairs('JEAN-PIERRE DE MINIAC')
    expect(pairs[0]).toEqual({ first: 'JEAN-PIERRE DE', last: 'MINIAC' })
    expect(pairs[1]).toEqual({ first: 'JEAN-PIERRE', last: 'DE MINIAC' })
  })

  it('MARIE-CHRISTINE AULAGNON (BADOUARD) → essai 1 last = "(BADOUARD)", essai 2 last = "AULAGNON (BADOUARD)"', () => {
    const pairs = generateTryPairs('MARIE-CHRISTINE AULAGNON (BADOUARD)')
    expect(pairs[0].last).toBe('(BADOUARD)')
    expect(pairs[1].last).toBe('AULAGNON (BADOUARD)')
  })

  it('SABINE LE GAC (JAMET) → essai 1 last = "(JAMET)", essai 2 last = "GAC (JAMET)", essai 3 last = "LE GAC (JAMET)"', () => {
    const pairs = generateTryPairs('SABINE LE GAC (JAMET)')
    expect(pairs[0].last).toBe('(JAMET)')
    expect(pairs[1].last).toBe('GAC (JAMET)')
    expect(pairs[2].last).toBe('LE GAC (JAMET)')
  })

  it('un seul mot → pair vide+mot', () => {
    const pairs = generateTryPairs('GINDRE')
    expect(pairs[0]).toEqual({ first: '', last: 'GINDRE' })
  })

  it('chaîne vide → []', () => {
    expect(generateTryPairs('')).toEqual([])
    expect(generateTryPairs('   ')).toEqual([])
  })

  it('limite à 3 essais max (anti-explosion combinatoire)', () => {
    const pairs = generateTryPairs('A B C D E F G H')
    expect(pairs).toHaveLength(3)
  })
})
