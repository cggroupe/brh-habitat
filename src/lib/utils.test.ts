/**
 * Tests des helpers utils — règles anti-bug #13 (toISOString().slice prohibé)
 * + isSafeUrl (anti-XSS javascript:).
 */
import { describe, expect, it } from 'vitest'
import { isSafeUrl, formatLocalDate } from './utils'

describe('formatLocalDate', () => {
  it('formate une date arbitraire en YYYY-MM-DD locale', () => {
    const d = new Date(2026, 4, 24) // Mai = 4 (0-indexed)
    expect(formatLocalDate(d)).toBe('2026-05-24')
  })

  it('pad month/day avec zéros', () => {
    expect(formatLocalDate(new Date(2026, 0, 1))).toBe('2026-01-01')
    expect(formatLocalDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('utilise la date courante par défaut', () => {
    const r = formatLocalDate()
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('n a pas le bug toISOString UTC (date locale conservée)', () => {
    // Test crucial : 23h45 locale = lendemain UTC. formatLocalDate doit donner
    // la date locale, pas la date UTC.
    const d = new Date(2026, 4, 24, 23, 45) // 24 mai 23h45 local
    expect(formatLocalDate(d)).toBe('2026-05-24')
  })
})

describe('isSafeUrl', () => {
  it('accepte http/https', () => {
    expect(isSafeUrl('https://example.com')).toBe('https://example.com')
    expect(isSafeUrl('http://example.com/path')).toBe('http://example.com/path')
  })

  it('rejette javascript:', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe('#')
    expect(isSafeUrl('JAVASCRIPT:void(0)')).toBe('#')
  })

  it('rejette data: et autres protocoles', () => {
    expect(isSafeUrl('data:text/html,<script>')).toBe('#')
    expect(isSafeUrl('file:///etc/passwd')).toBe('#')
    expect(isSafeUrl('ftp://example.com')).toBe('#')
  })

  it('retourne # pour null/undefined/empty/invalide', () => {
    expect(isSafeUrl(null)).toBe('#')
    expect(isSafeUrl(undefined)).toBe('#')
    expect(isSafeUrl('')).toBe('#')
    expect(isSafeUrl('not a url')).toBe('#')
  })
})
