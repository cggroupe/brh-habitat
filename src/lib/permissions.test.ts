/**
 * Phase R1 — Tests du résolveur de permissions.
 *
 * Couvre les 5 cas du contrat (admin / non-auth / non-membre / owner / member),
 * la valeur par défaut FALSE pour clés absentes, et le helper resolveAllPermissions.
 */
import { describe, it, expect } from 'vitest'
import { userCan, resolveAllPermissions } from './permissions'

describe('userCan — règles de base', () => {
  it('admin BRH a toutes les permissions, même si memberRole null', () => {
    expect(
      userCan({ userRole: 'admin', memberRole: null, permissions: null }, 'canViewFinance'),
    ).toBe(true)
    expect(
      userCan({ userRole: 'admin', memberRole: null, permissions: null }, 'canManageEmployees'),
    ).toBe(true)
  })

  it('utilisateur non authentifié n\'a aucune permission', () => {
    expect(
      userCan({ userRole: null, memberRole: null, permissions: null }, 'canViewFinance'),
    ).toBe(false)
  })

  it('pro sans membership (orphelin) n\'a aucune permission', () => {
    expect(
      userCan({ userRole: 'pro', memberRole: null, permissions: null }, 'canViewFinance'),
    ).toBe(false)
  })

  it('particulier authentifié n\'a aucune permission pro', () => {
    expect(
      userCan({ userRole: 'particulier', memberRole: null, permissions: null }, 'canViewFinance'),
    ).toBe(false)
    expect(
      userCan({ userRole: 'particulier', memberRole: null, permissions: null }, 'canExport'),
    ).toBe(false)
  })

  it('owner a toutes les permissions, ignorant le JSONB', () => {
    expect(
      userCan({ userRole: 'pro', memberRole: 'owner', permissions: null }, 'canViewFinance'),
    ).toBe(true)
    expect(
      userCan(
        { userRole: 'pro', memberRole: 'owner', permissions: { canViewFinance: false } },
        'canViewFinance',
      ),
    ).toBe(true)
  })
})

describe('userCan — member avec JSONB permissions', () => {
  it('member avec canViewFinance=true → TRUE', () => {
    expect(
      userCan(
        { userRole: 'pro', memberRole: 'member', permissions: { canViewFinance: true } },
        'canViewFinance',
      ),
    ).toBe(true)
  })

  it('member avec canViewFinance=false → FALSE', () => {
    expect(
      userCan(
        { userRole: 'pro', memberRole: 'member', permissions: { canViewFinance: false } },
        'canViewFinance',
      ),
    ).toBe(false)
  })

  it('member avec clé absente → FALSE par défaut (sécurité)', () => {
    expect(
      userCan({ userRole: 'pro', memberRole: 'member', permissions: {} }, 'canViewFinance'),
    ).toBe(false)
  })

  it('member avec permissions null → FALSE par défaut', () => {
    expect(
      userCan({ userRole: 'pro', memberRole: 'member', permissions: null }, 'canSendCourriers'),
    ).toBe(false)
  })

  it('member peut avoir certaines permissions et pas d\'autres', () => {
    const ctx = {
      userRole: 'pro' as const,
      memberRole: 'member' as const,
      permissions: { canSendCourriers: true, canViewFinance: false },
    }
    expect(userCan(ctx, 'canSendCourriers')).toBe(true)
    expect(userCan(ctx, 'canViewFinance')).toBe(false)
    expect(userCan(ctx, 'canManageEmployees')).toBe(false) // absente → FALSE
  })
})

describe('resolveAllPermissions', () => {
  it('résout toutes les clés à TRUE pour admin', () => {
    const r = resolveAllPermissions({ userRole: 'admin', memberRole: null, permissions: null })
    expect(Object.values(r).every((v) => v === true)).toBe(true)
  })

  it('résout toutes les clés à FALSE pour non-auth', () => {
    const r = resolveAllPermissions({ userRole: null, memberRole: null, permissions: null })
    expect(Object.values(r).every((v) => v === false)).toBe(true)
  })

  it('résout finement pour un member partiel', () => {
    const r = resolveAllPermissions({
      userRole: 'pro',
      memberRole: 'member',
      permissions: { canSendCourriers: true, canManageMarketplace: true },
    })
    expect(r.canSendCourriers).toBe(true)
    expect(r.canManageMarketplace).toBe(true)
    expect(r.canViewFinance).toBe(false)
    expect(r.canManageEmployees).toBe(false)
    expect(r.canExport).toBe(false)
  })
})
