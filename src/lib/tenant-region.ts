/**
 * Phase 18 — Helpers de scoping par région tenant.
 *
 * Centralise la logique "ce code INSEE / postal appartient-il à la région
 * du tenant courant ?" — utilisé par la map prospects, les requêtes Supabase
 * (filtre `code_dept in (...)`), et le matching artisans.
 */
import { tenant } from '@/config/tenant'
import type { TenantRegion } from '@/config/tenant.types'

/** Région active (déduite du tenant courant). Bretagne par défaut. */
export const activeRegion: TenantRegion =
  tenant.region ?? {
    code: 'bretagne',
    name: 'Bretagne',
    departments: ['22', '29', '35', '56'],
    centerLat: 48.2,
    centerLng: -2.93,
    defaultZoom: 8,
  }

/**
 * Extrait le code département (2 chars) d'un code INSEE 5 chars.
 * Gère la Corse (2A/2B). Renvoie null si le format est invalide.
 */
export function departementFromInsee(insee: string | null | undefined): string | null {
  if (!insee) return null
  const trimmed = insee.trim()
  if (trimmed.length !== 5) return null
  // Corse : 2A001, 2B042 → "2A" / "2B"
  if (trimmed.startsWith('2A') || trimmed.startsWith('2B')) return trimmed.slice(0, 2)
  return trimmed.slice(0, 2)
}

/** True si le code INSEE appartient à la région du tenant courant. */
export function isInActiveRegion(insee: string | null | undefined): boolean {
  const dept = departementFromInsee(insee)
  if (!dept) return false
  return activeRegion.departments.includes(dept)
}

/**
 * Extrait le code département depuis un code postal français (5 chars).
 * Idem Corse : 20000–20190 → 2A, 20200–20620 → 2B (approximation usuelle).
 */
export function departementFromPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null
  const trimmed = postalCode.trim()
  if (!/^\d{5}$/.test(trimmed)) return null
  const prefix = trimmed.slice(0, 2)
  if (prefix === '20') {
    const num = Number(trimmed)
    return num >= 20200 ? '2B' : '2A'
  }
  return prefix
}
