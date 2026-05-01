# Audit Doublons — BRH Habitat

**Date** : 2026-04-29
**Périmètre** : `src/`, `supabase/migrations/`
**Méthode** : analyse exhaustive (fichiers, composants, routes, hooks, types, utilitaires, migrations, clients)

---

## Résumé exécutif

**Score doublons : 9.5 / 10** — projet sain.

| Catégorie | Doublons réels |
|-----------|----------------|
| Fichiers identiques | 0 |
| Composants React | 0 |
| Routes | 0 |
| Hooks personnalisés | 0 |
| Types / Interfaces | 0 |
| Utilitaires | **1** |
| Migrations Supabase | 0 |
| Clients Supabase | 0 |

**À traiter : 2 items** (1 dead code + 1 anti-pattern SRP).

---

## 1. VRAI doublon — `formatEurosPrecis()` (DEAD CODE)

**Fichier** : [src/lib/fiscal-simulator.ts](src/lib/fiscal-simulator.ts) (~lignes 150-160)

```ts
export function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function formatEurosPrecis(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  // ↑ STRICTEMENT IDENTIQUE à formatEuros()
}
```

| Fonction | Usages | Action |
|----------|--------|--------|
| `formatEuros()` | 11× dans `PartStatutFiscal.tsx` | ✅ Conserver |
| `formatEurosPrecis()` | 0× | ❌ **Supprimer** |

**Priorité : HAUTE** · **Effort : 5 min**

---

## 2. Anti-pattern SRP — `partners.ts` hypertrophié (511 lignes)

**Fichier** : [src/hooks/queries/partners.ts](src/hooks/queries/partners.ts)

**Problème** : un seul fichier mélange 8 domaines métier distincts.

```
partners.ts (511 L)
├─ Companies (4 hooks)
├─ Prospects (7 hooks)
├─ Company Members (3 hooks)
├─ Quotes (3 hooks)
├─ Affiliates (4 hooks)
├─ Rewards (6 hooks)
├─ Social Posts (3 hooks)
└─ Recruitment (3 hooks)
```

**Impact** :
- Maintenabilité dégradée
- Invalidations React Query croisées et complexes
- Bundle non tree-shakeable optimalement

**Refactoring proposé** :
```
src/hooks/queries/partners/
├── companies.ts
├── prospects.ts
├── members.ts
├── quotes.ts
├── affiliates.ts
├── rewards.ts
├── social.ts
├── recruitment.ts
└── index.ts (barrel export)
```

**Priorité : MOYENNE** · **Effort : ~1h**

---

## 3. Faux positifs — patterns intentionnels à documenter

### 3.1 Pattern API ↔ Hooks (10 paires)

Architecture délibérée Tanstack React Query :
- `src/api/X.ts` → fonctions Supabase pures
- `src/hooks/queries/X.ts` → wrappers React Query

| Domaine | API (lignes) | Hooks (lignes) |
|---------|-------------|----------------|
| appointments | 101 | 68 |
| articles | 118 | 90 |
| cases | 98 | 80 |
| chiffrages | 39 | 31 |
| contacts | 73 | 48 |
| dashboard | 86 | 31 |
| diagnostics | 187 | 122 |
| homes | 107 | 79 |
| profiles | 79 | 69 |

**Action** : ajouter une section "Architecture API/Hooks" dans `CLAUDE.md` ou wiki pour éviter confusion future.

### 3.2 Triple répartition `articles`

```
src/api/articles.ts (118 L)        → fetch Supabase
src/data/articles.ts (150 L)       → fallback statique + métadonnées SEO
src/data/articles/*.md             → contenu markdown (10 fichiers)
src/hooks/queries/articles.ts (90 L) → React Query
```

**Status** : architecture hybride volontaire (static + dynamic CMS) — à documenter.

---

## 4. Vérifications négatives (rien à corriger)

### Composants React
Tous noms uniques (`AidesCard`, `ContactRdvModal`, `HealthScoreGauge`, etc.). Aucun `Button.tsx` / `Card.tsx` / `Modal.tsx` dupliqué.

### Routes
Toutes paths uniques dans le router. Pas de collision.

### Hooks personnalisés
`useAuth`, `useNotifications`, `useFeature`, `useScrollLock` — tous uniques.

### Types & Interfaces
`AppointmentInsert`, `ArticleUpdate`, `CaseStatus`, `*Props` — tous uniques.

### Migrations Supabase
37 migrations (`20260403700000` → `20260423000000`). Aucune table créée 2×, aucune policy redéfinie. Pattern progressif cohérent.

### Client Supabase
Un seul client : [src/lib/supabase.ts](src/lib/supabase.ts). Aucun wrapper concurrent.

### Utilitaires
`formatLocalDate()`, `isSafeUrl()` dans `lib/utils.ts` — uniques.

---

## 5. Plan d'action

### Phase 1 — Quick wins (15 min)
- [ ] Supprimer `formatEurosPrecis()` dans [src/lib/fiscal-simulator.ts](src/lib/fiscal-simulator.ts)
- [ ] Ajouter section "Architecture API/Hooks" dans `CLAUDE.md`

### Phase 2 — Refactoring (~1h)
- [ ] Scinder `partners.ts` (511 L) en `partners/{companies,prospects,members,quotes,affiliates,rewards,social,recruitment}.ts`
- [ ] Créer `partners/index.ts` (barrel export)
- [ ] Vérifier que les invalidations React Query restent cohérentes

### Phase 3 — Documentation wiki (10 min)
- [ ] `docs/wiki/architecture-snapshot.md` : ajouter pattern API/Hooks
- [ ] Documenter triple répartition `articles` (api/data/markdown)

---

## Conclusion

Codebase **très propre** côté duplication. Les "doublons" détectés au premier niveau sont en réalité des patterns architecturaux délibérés et bien appliqués. Seuls 2 items méritent une action :

1. **Dead code** `formatEurosPrecis()` → suppression immédiate
2. **God-file** `partners.ts` → refactoring SRP recommandé

Aucune dette technique structurelle de duplication. À maintenir.
