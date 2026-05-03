/**
 * Phase 22 — Tests pure functions referral.
 *
 * Couvre `generateShortCode` (entropie OK), `getReferralLink` /
 * `getSimulationLink` (URL bien formée), et les share urls (encoding correct).
 *
 * Note env : vitest est configuré en `environment: 'node'` (pas de DOM par défaut).
 * On stub `window` / `navigator` à la main avec `vi.stubGlobal`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateShortCode,
  getReferralLink,
  getSimulationLink,
  getWhatsAppShareUrl,
  getSmsShareUrl,
  copyToClipboard,
} from './referral'

describe('generateShortCode', () => {
  it('respecte le format 2 lettres + 3 chiffres', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode('Philippe', 'Gagnon')
      expect(code).toMatch(/^[A-Z]{2}\d{3}$/)
      expect(code.startsWith('PG')).toBe(true)
    }
  })

  it('majuscule les initiales même si le prénom est en minuscules', () => {
    const code = generateShortCode('alice', 'martin')
    expect(code.startsWith('AM')).toBe(true)
  })

  it('fallback "X" si prénom ou nom vide', () => {
    expect(generateShortCode('', 'Dupont')).toMatch(/^XD\d{3}$/)
    expect(generateShortCode('Alice', '')).toMatch(/^AX\d{3}$/)
    expect(generateShortCode('', '')).toMatch(/^XX\d{3}$/)
  })

  it('partie numérique reste dans [100, 999]', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateShortCode('A', 'B')
      const num = Number(code.slice(2))
      expect(num).toBeGreaterThanOrEqual(100)
      expect(num).toBeLessThanOrEqual(999)
    }
  })
})

describe('getReferralLink / getSimulationLink', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://www.renovation-brh.fr' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('génère un lien de parrainage avec le code en query', () => {
    expect(getReferralLink('PG247')).toBe(
      'https://www.renovation-brh.fr/inscription/particulier?ref=PG247',
    )
  })

  it('génère un lien simulateur sans workType', () => {
    expect(getSimulationLink('PG247')).toBe(
      'https://www.renovation-brh.fr/diagnostic?ref=PG247',
    )
  })

  it('génère un lien simulateur avec workType', () => {
    expect(getSimulationLink('PG247', 'isolation')).toBe(
      'https://www.renovation-brh.fr/diagnostic?ref=PG247&type=isolation',
    )
  })
})

describe('getWhatsAppShareUrl / getSmsShareUrl', () => {
  it('encode correctement le texte WhatsApp avec retour à la ligne', () => {
    const url = getWhatsAppShareUrl('Salut !', 'https://example.com/r/PG247')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.split('?text=')[1])).toBe(
      'Salut !\nhttps://example.com/r/PG247',
    )
  })

  it('encode correctement le SMS', () => {
    const url = getSmsShareUrl('Mon code parrain : PG247')
    expect(url).toBe('sms:?body=Mon%20code%20parrain%20%3A%20PG247')
  })
})

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renvoie true si clipboard.writeText réussit', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyToClipboard('hello')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('renvoie false si clipboard.writeText throw', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyToClipboard('hello')).resolves.toBe(false)
  })

  it('renvoie false si clipboard est absent (Safari ancien, contexte non sécurisé)', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copyToClipboard('hello')).resolves.toBe(false)
  })
})
