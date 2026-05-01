# BRH Habitat — Testing Strategy

> Source : `package.json` + inspection `src/test/` (si existe) + audit ARCHITECTURE.md.
> **Dernière mesure** : 2026-04-23.

## État actuel : AUCUN TEST AUTOMATISÉ

**Constat honnête** : le projet n'a pas de tests unitaires, d'intégration ou E2E automatisés.

La qualité est assurée par :
1. ✅ **TypeScript strict** (évite classe entière de bugs)
2. ✅ **Zod validation** sur API (règle anti-bug #4)
3. ✅ **5 cycles d'audit** (v4→v8, "Chaos Monkey")
4. ✅ **RLS tests manuels** avec users non-admin (règle #7)
5. ✅ **Sentry** capture tout en prod
6. ✅ **Load test BRHCRM** (10 users concurrents, 230 opérations, 0 erreurs) — non transposé sur BRH Habitat

## Recommandations (priorité décroissante)

### 🔴 Priorité haute — tests critiques à ajouter

#### 1. Tests RLS (Supabase)
Les policies RLS sont la première défense — les tester avec différents roles.

```bash
# Framework : supabase-js + vitest
npm install -D vitest @vitest/ui

# Structure proposée : src/test/rls/
# - brh_companies.test.ts (pro ne peut pas voir autre company)
# - brh_prospects.test.ts (scope company)
# - brh_quotes.test.ts (admin bypass)
# - brh_simulation_leads.test.ts (INSERT public OK, SELECT refusé)
```

Pattern :
```typescript
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'

describe('RLS brh_companies', () => {
  it('pro A ne peut pas lire la company de pro B', async () => {
    const sbA = createClientWithRole('pro', 'user-a')
    const sbB = createClientWithRole('pro', 'user-b')

    const { data: companyB } = await sbB.from('brh_companies').insert({...}).select().single()
    const { data, error } = await sbA.from('brh_companies').select().eq('id', companyB.id).single()

    expect(data).toBeNull()
  })
})
```

#### 2. Tests triggers (cascade commissions)
Valider que le flow quote → commission → recruitment cascade marche.

```typescript
describe('Trigger calculate_recruitment_commission', () => {
  it('cascade 3 niveaux correctement', async () => {
    // Setup : C recrute B recrute A
    const { data: quote } = await sb.from('brh_quotes').insert({
      prospect_id, company_id: A.id, amount_cents: 5_000_000, status: 'signed'
    }).select().single()

    // Attendre triggers (setTimeout court)
    await sleep(100)

    const { data: commissions } = await sb.from('brh_recruitment_commissions')
      .select().eq('source_quote_id', quote.id)

    expect(commissions).toHaveLength(2)  // level 1 (B) + level 2 (C)
    expect(commissions.find(c => c.level === 1)?.commission_cents).toBe(100_000)
  })
})
```

#### 3. Tests Edge Functions
Au moins le happy path + auth fail.

```typescript
describe('EF bridge-signin', () => {
  it('rejette sans JWT', async () => {
    const res = await fetch('/functions/v1/bridge-signin', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('valide Clerk JWT et crée session', async () => {
    const clerkJWT = await generateTestClerkJWT()
    const res = await fetch('/functions/v1/bridge-signin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clerkJWT}` },
    })
    const data = await res.json()
    expect(data.session.access_token).toBeDefined()
  })
})
```

### 🟠 Priorité moyenne — tests unitaires lib

#### 4. Tests moteurs (pure functions)
- `lib/diagnostic-engine.ts` — scoring domaines
- `lib/renovation-plan-engine.ts` — priorisation ROI
- `lib/aides-engine.ts` — match aides
- `lib/referral.ts` — génération short_code, validation

```typescript
describe('diagnosticEngine', () => {
  it('score toiture = 70 pour toiture 30 ans refaite', () => {
    const score = calculateToitureScore({
      toiture_age: 30,
      toiture_refaite: true,
      materiau: 'tuiles',
    })
    expect(score).toBe(70)
  })
})
```

#### 5. Tests hooks React Query
- `useAuth.ts` (login/logout)
- `useFeature.ts` (feature flag resolution)

Framework : `@testing-library/react` + `@testing-library/react-hooks`.

### 🟡 Priorité basse — tests E2E

#### 6. Tests E2E (Playwright)
Flows critiques :
- Inscription particulier → diagnostic → résultats
- Inscription pro → création company → invitation membre
- Pro → création prospect → devis → signature
- Admin → gestion commissions

```bash
npm install -D @playwright/test
npx playwright install
```

## Configuration recommandée

### Vitest (tests unitaires + intégration)

**`vitest.config.ts`** :
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

**`package.json` scripts** :
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:rls": "vitest run src/test/rls"
  }
}
```

### Playwright (E2E)

**`playwright.config.ts`** :
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

## Coverage cible

| Type | Coverage cible | Priorité |
|------|---------------|----------|
| RLS (policies critiques) | 80% | 🔴 Haute |
| Triggers métier (commissions, lead_score) | 100% | 🔴 Haute |
| EF happy paths | 100% | 🟠 Moyenne |
| Lib moteurs (diagnostic, plan, aides) | 70% | 🟠 Moyenne |
| Hooks React Query | 50% | 🟡 Basse |
| Components | N/A (visual only) | — |
| E2E flows critiques | 5-8 tests | 🟡 Basse |

## Tests manuels existants (checklist)

Avant chaque déploiement, Philippe teste manuellement :

### Smoke tests
- [ ] Page d'accueil publique charge
- [ ] Login/logout (Clerk → Supabase)
- [ ] Inscription particulier → dashboard
- [ ] Diagnostic wizard → résultats
- [ ] Pro : création prospect + devis
- [ ] Admin : vue commissions

### Regression tests
- [ ] Feature gates respectées (tester avec user pro non-enterprise si applicable)
- [ ] RLS : user A ne voit pas data de user B
- [ ] PWA : install + offline
- [ ] Mobile : portails pro/particulier

## Plan d'implémentation tests (roadmap)

| Phase | Contenu | Effort |
|-------|---------|--------|
| 1 — Infra | Config Vitest + setup initial | 1j |
| 2 — RLS | Tests policies critiques (5 tables clés) | 3j |
| 3 — Triggers | Tests cascade commissions, lead_score, award_points | 2j |
| 4 — EFs | Tests auth + happy path 11 EFs | 4j |
| 5 — Lib | Tests moteurs diagnostic/plan/aides/referral | 3j |
| 6 — E2E | 5 flows critiques avec Playwright | 5j |
| **Total** | | **~3 semaines** |

## Status actuel

- ❌ Aucun test automatisé
- ✅ TypeScript strict
- ✅ Zod validation
- ✅ Audits sécurité (v4→v8)
- ✅ Tests manuels Philippe avant deploy
- 🔴 **Recommandation** : implémenter phase 1-3 (infra + RLS + triggers) en priorité avant prochaine montée en charge

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy v2). Honnêteté sur absence tests + roadmap.
