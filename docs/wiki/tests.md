# BRH Habitat — Testing Strategy

> Source : `package.json` + inspection `src/test/` (si existe) + audit ARCHITECTURE.md.
> **Dernière mesure** : 2026-04-23.

## État actuel (2026-05-25 — Sprint "4 chantiers")

**Vitest (unitaires + intégration)** : ✅ **416 tests passants** (23 fichiers, 1.4s).
**Playwright (E2E)** : ✅ **infra installée + 12 tests E2E (3 smoke + 9 nouveaux Phase 4)** + CI GH Actions.

### Nouveaux specs Phase 4 (25/05)

| Spec | Sujet | CI-compatible |
|------|-------|---------------|
| `e2e/audit-respond.spec.ts` | Page publique `/audit/respond` : token absent/présent, 5 cards radio, bouton désactivé, sélection feedback | ✅ oui (4 tests) + 1 skip si pas `BRH_E2E_REAL_SUPABASE` |
| `e2e/login.spec.ts` | Login valide, mauvais pwd, html5 validation, session persistence reload | ⚠️ skip si pas `BRH_E2E_EMAIL` / `BRH_E2E_PASSWORD` |
| `e2e/leads-v2.spec.ts` | Page leads-v2 : charge sans erreur console, filtres visibles, search input | ⚠️ skip si pas creds |
| `e2e/fiche-dirigeant.spec.ts` | Liste + détail dirigeant + mini-carte Leaflet rendue | ⚠️ skip si pas creds |
| `e2e/fiche-client-brh.spec.ts` | Liste + détail client BRH + section foncier visible | ⚠️ skip si pas creds |
| `e2e/recherche.spec.ts` | `/recherche` input + `?q=Brest` renvoie résultats ou empty state | ⚠️ skip si pas creds |
| `e2e/support/auth.ts` | Helper `loginAsEmployee()`, `requireCredsOrSkip()`, `gotoAsEmployee()` | — |

**Setup local pour tests auth** :
```bash
export BRH_E2E_EMAIL=pierrecollard@contact-brh.fr
export BRH_E2E_PASSWORD=Brh29200.@
npx playwright test
```

**Setup CI** : aucun changement requis (`BRH_E2E_*` absent → skip propre, seulement smoke + audit-respond publics tournent).

**RLS / triggers / EFs auth-flow** : ❌ pas encore couverts (roadmap Phase 1-5 ci-dessous).

### Ce qui est couvert
- DPE Engine (computeDpe, zones climatiques, MPR ampleur, chauffage, bâti, finals)
- Multi-tenant config (chargement BRH / IDF / PACA, helpers region)
- Lib pure : `referral` (13 tests), `tenant-region` (9 tests)
- Marketplace artisans : `haversineKm`, `proximityFactor`, `matchArtisansForGeste`, `findProspectsForArtisan` (21 tests)

### Ce qui ne l'est pas (roadmap)

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
**Phase 19 livrée 2026-05-03** : infra Playwright + 3 smoke tests dans `e2e/smoke.spec.ts` :
1. Page d'accueil charge sans erreur console bloquante
2. `/login` expose un champ email
3. `/admin` redirige les visiteurs non-authentifiés

Lancer en local :
```bash
npx playwright install chromium    # one-shot (download browser)
npm run test:e2e                   # lance dev server + tests
npm run test:e2e:ui                # mode UI debug
E2E_BASE_URL=https://… npm run test:e2e   # cibler un environnement déjà en route
```

**Reste à faire** (flows authentifiés, demandent fixtures Clerk + Supabase) :
- Inscription particulier → diagnostic → résultats
- Inscription pro → création company → invitation membre
- Pro → création prospect → devis → signature
- Admin → gestion commissions

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

- ✅ **Vitest 264 / 264 passants** (DPE engine + multi-tenant + lib pure)
- ✅ **Playwright infra + 3 smoke tests** (Phase 19 du 2026-05-03)
- ❌ Tests RLS Supabase pas encore implémentés
- ❌ Tests triggers (cascade commissions) pas encore implémentés
- ❌ Tests EF (happy path + auth fail) pas encore implémentés
- ✅ TypeScript strict
- ✅ Zod validation
- ✅ Audits sécurité (v4→v8)
- ✅ Tests manuels Philippe avant deploy
- 🟠 **Recommandation** : implémenter phase 2-3 (RLS + triggers) avant prochaine montée en charge

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy v2). Honnêteté sur absence tests + roadmap.
- **2026-05-03** : Phase 19 — Playwright installé + 3 smoke tests + Vitest passe à 264 tests (15 fichiers).
- **2026-05-03** : Phase 20 — CI GitHub Actions (`.github/workflows/ci.yml`) lance lint + tsc + Vitest + Playwright sur push.
- **2026-05-03** : Phase 22 — tests pure functions referral + match-artisans, Vitest passe à **298 tests** (17 fichiers).
