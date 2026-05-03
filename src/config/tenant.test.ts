/**
 * Phase 18 — sanity tests multi-tenant.
 *
 * Vérifie que :
 *   - les 3 tenants (brh, idf, paca) chargent sans throw
 *   - la région de chacun matche le code attendu
 *   - les départements sont disjoints (pas de chevauchement entre régions)
 *   - chaque tenant respecte le contrat TenantConfig (tier, branding, features)
 */
import { describe, it, expect } from 'vitest'
import { TENANT_REGIONS } from './tenant.types'
import brh from './tenants/brh'
import idf from './tenants/idf'
import paca from './tenants/paca'

describe('Phase 18 — multi-tenant config', () => {
  it('charge les 3 tenants sans throw', () => {
    expect(brh.tenantId).toBe('brh')
    expect(idf.tenantId).toBe('idf')
    expect(paca.tenantId).toBe('paca')
  })

  it('chaque tenant a une région cohérente avec son tenantId', () => {
    expect(brh.region?.code).toBe('bretagne')
    expect(idf.region?.code).toBe('idf')
    expect(paca.region?.code).toBe('paca')
  })

  it('les départements des 3 régions sont disjoints', () => {
    const all = [
      ...TENANT_REGIONS.bretagne.departments,
      ...TENANT_REGIONS.idf.departments,
      ...TENANT_REGIONS.paca.departments,
    ]
    const unique = new Set(all)
    expect(unique.size).toBe(all.length)
  })

  it('Bretagne couvre 22, 29, 35, 56', () => {
    expect(TENANT_REGIONS.bretagne.departments).toEqual(['22', '29', '35', '56'])
  })

  it('IDF couvre Paris + petite/grande couronne (8 départements)', () => {
    expect(TENANT_REGIONS.idf.departments).toHaveLength(8)
    expect(TENANT_REGIONS.idf.departments).toContain('75')
    expect(TENANT_REGIONS.idf.departments).toContain('95')
  })

  it('PACA couvre 6 départements dont 13 et 06', () => {
    expect(TENANT_REGIONS.paca.departments).toHaveLength(6)
    expect(TENANT_REGIONS.paca.departments).toContain('13')
    expect(TENANT_REGIONS.paca.departments).toContain('06')
  })

  it('BRH reste tier enterprise (tenant production)', () => {
    expect(brh.tier).toBe('enterprise')
  })

  it('IDF et PACA partent en tier pro (gabarits partenaires)', () => {
    expect(idf.tier).toBe('pro')
    expect(paca.tier).toBe('pro')
  })

  it('chaque tenant expose un branding minimal complet', () => {
    for (const t of [brh, idf, paca]) {
      expect(t.branding.companyName.length).toBeGreaterThan(0)
      expect(t.branding.colors.primary).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.pwa.themeColor).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
