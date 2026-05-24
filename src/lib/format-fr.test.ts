/**
 * Tests des helpers de formatage français — bugs B1/B2/B3 fiche client.
 *
 * Smoke tests pour éviter régression sur :
 *   - formatNameFr  : capitalisation (gérer composé, apostrophes, déjà capitalisé)
 *   - formatPhoneFr : 10 chiffres + variantes +33 et avec séparateurs
 *   - formatFullAddress : dédup CP/ville si déjà dans l'adresse
 */
import { describe, expect, it } from 'vitest'
import { formatNameFr, formatPhoneFr, formatFullAddress } from './format-fr'

describe('formatNameFr', () => {
  it('capitalise les noms tout en minuscules (bug B1)', () => {
    expect(formatNameFr('bodard francois')).toBe('Bodard Francois')
    expect(formatNameFr('jean-pierre dupont')).toBe('Jean-Pierre Dupont')
  })

  it('capitalise les noms tout en MAJUSCULES', () => {
    expect(formatNameFr('BODARD FRANCOIS')).toBe('Bodard Francois')
    expect(formatNameFr('LE GOFF')).toBe('Le Goff')
  })

  it('préserve les noms déjà en mixed case', () => {
    expect(formatNameFr("O'Brien")).toBe("O'Brien")
    expect(formatNameFr('Le Goff')).toBe('Le Goff')
    expect(formatNameFr('Jean-Pierre')).toBe('Jean-Pierre')
  })

  it('gère les noms avec apostrophe', () => {
    expect(formatNameFr("o'brien")).toBe("O'Brien")
    expect(formatNameFr("D'ARTAGNAN")).toBe("D'Artagnan")
  })

  it('retourne chaîne vide pour null/undefined/empty', () => {
    expect(formatNameFr(null)).toBe('')
    expect(formatNameFr(undefined)).toBe('')
    expect(formatNameFr('')).toBe('')
    expect(formatNameFr('   ')).toBe('')
  })

  it('trim les espaces', () => {
    expect(formatNameFr('  bodard  ')).toBe('Bodard')
  })
})

describe('formatPhoneFr', () => {
  it('formate 10 chiffres collés (bug B2)', () => {
    expect(formatPhoneFr('0683533275')).toBe('06 83 53 32 75')
    expect(formatPhoneFr('0298666800')).toBe('02 98 66 68 00')
  })

  it('formate +33 international', () => {
    expect(formatPhoneFr('+33683533275')).toBe('+33 6 83 53 32 75')
    expect(formatPhoneFr('+33 6 83 53 32 75')).toBe('+33 6 83 53 32 75')
  })

  it('normalise les séparateurs', () => {
    expect(formatPhoneFr('06.83.53.32.75')).toBe('06 83 53 32 75')
    expect(formatPhoneFr('06-83-53-32-75')).toBe('06 83 53 32 75')
    expect(formatPhoneFr('06 83 53 32 75')).toBe('06 83 53 32 75')
  })

  it('retourne chaîne vide pour null/undefined', () => {
    expect(formatPhoneFr(null)).toBe('')
    expect(formatPhoneFr(undefined)).toBe('')
    expect(formatPhoneFr('')).toBe('')
  })

  it('retourne brut si format inconnu', () => {
    expect(formatPhoneFr('06 83')).toBe('06 83')
    expect(formatPhoneFr('+1 555 1234')).toBe('+1 555 1234')
  })
})

describe('formatFullAddress', () => {
  it('ne duplique pas CP/ville déjà dans adresse (bug B3)', () => {
    expect(formatFullAddress('14 rue bugeaud 29200 Brest France', '29200', 'Brest'))
      .toBe('14 rue bugeaud 29200 Brest France')
    expect(formatFullAddress('14 RUE DU COMMANDANT GROIX 29200 BREST', '29200', 'Brest'))
      .toBe('14 RUE DU COMMANDANT GROIX 29200 BREST')
  })

  it('ajoute le suffixe CP/ville si absent', () => {
    expect(formatFullAddress('14 rue bugeaud', '29200', 'Brest'))
      .toBe('14 rue bugeaud · 29200 Brest')
  })

  it('gère adresse seule sans CP/ville', () => {
    expect(formatFullAddress('14 rue bugeaud', null, null))
      .toBe('14 rue bugeaud')
    expect(formatFullAddress('14 rue bugeaud', '', ''))
      .toBe('14 rue bugeaud')
  })

  it('gère CP+ville seuls sans adresse', () => {
    expect(formatFullAddress(null, '29200', 'Brest')).toBe('29200 Brest')
    expect(formatFullAddress('', '29200', 'Brest')).toBe('29200 Brest')
  })

  it('retourne chaîne vide si tout null', () => {
    expect(formatFullAddress(null, null, null)).toBe('')
    expect(formatFullAddress('', '', '')).toBe('')
  })

  it('détection case-insensitive du CP/ville présent', () => {
    expect(formatFullAddress('14 rue bugeaud 29200 brest', '29200', 'BREST'))
      .toBe('14 rue bugeaud 29200 brest')
  })

  it('ajoute le suffixe complet si l un des 2 (CP ou ville) absent de adresse', () => {
    // L'implémentation traite le suffixe comme un bloc — pas de logique partielle.
    expect(formatFullAddress('14 rue bugeaud Brest', '29200', 'Brest'))
      .toBe('14 rue bugeaud Brest · 29200 Brest')
  })
})
