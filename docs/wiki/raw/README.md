# Sources Immuables (`raw/`) — BRH Habitat

> **Pattern Karpathy** : les fichiers de référence de cette section sont des **sources de vérité** immutables. La wiki (`docs/wiki/*.md`) est **générée par lecture** de ces sources et peut dériver. Si conflit wiki ↔ raw : **raw fait foi**.

## Règle d'or

```
raw/  → sources de vérité (code, migrations, configs, audits)
wiki/ → synthèse LLM-générée, à regénérer si raw change
```

## Liste des sources immuables

### 🗄 Base de données
- [`supabase/migrations/`](../../../supabase/migrations/) — **37 migrations SQL** (source ultime du schéma)
- Chaque migration est datée UTC, immuable après application
- Format nom : `YYYYMMDDHHMMSS_description.sql`

Pour re-synchroniser le data-model :
```bash
grep -hE "CREATE TABLE (IF NOT EXISTS )?brh_" supabase/migrations/*.sql | grep -oE "brh_[a-z_]+" | sort -u
grep -hE "CREATE (OR REPLACE )?FUNCTION public\." supabase/migrations/*.sql | grep -oE "public\.[a-z_]+" | sort -u
grep -c "CREATE POLICY" supabase/migrations/*.sql | awk -F: '{sum+=$2} END {print sum}'
```

### ⚡ Edge Functions
- [`supabase/functions/`](../../../supabase/functions/) — 11 fonctions (code Deno + deno.json)
- `_shared/cors.ts` — helpers CORS partagés

### 💻 Frontend source
- [`src/App.tsx`](../../../src/App.tsx) — routes (source de vérité pour 70 routes)
- [`src/config/tenants/brh.ts`](../../../src/config/tenants/brh.ts) — tenant config
- [`src/config/tier-presets.ts`](../../../src/config/tier-presets.ts) — 18 feature flags définis
- [`package.json`](../../../package.json) — versions stack (React 19.2, TS 5.9, etc.)

### 📋 Documents d'audit (historiques, immuables)
- [`../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) — Audit v7 (2026-04-14, score 9.8/10)
- [`../../PARTNER-PLATFORM.md`](../../../PARTNER-PLATFORM.md) — Blueprint plateforme partenaires
- [`../../PROHACKER_AUDIT.md`](../../../PROHACKER_AUDIT.md) — Audit externe ProHacker
- [`../../security-audit-report.md`](../../../security-audit-report.md) — Rapport sécurité
- [`../../AUDIT-AMELIORATION-FONCTIONNELLE.md`](../../../AUDIT-AMELIORATION-FONCTIONNELLE.md) — Audit fonctionnel
- [`../../INTEGRATION-BRH-HABITAT.md`](../../../INTEGRATION-BRH-HABITAT.md) — Intégration projet

### 🔐 Config sécurité
- [`vercel.json`](../../../vercel.json) — CSP, HSTS, security headers (source de vérité)
- [`public/sw.js`](../../../public/sw.js) — Service Worker cache version

## Mapping raw → wiki

| Source raw | Pages wiki générées |
|-----------|---------------------|
| `supabase/migrations/*.sql` | [data-model.md](../data-model.md), [migrations-audit.md](../migrations-audit.md) |
| `supabase/functions/*/` | [edge-functions-reference.md](../edge-functions-reference.md) |
| `src/hooks/` + `src/api/` | [hooks-reference.md](../hooks-reference.md) |
| `src/App.tsx` | [architecture-snapshot.md](../architecture-snapshot.md) (routes, guards) |
| `src/config/tenants/brh.ts` + `tier-presets.ts` | [tenant-multitenancy.md](../tenant-multitenancy.md) |
| `package.json` | [architecture-snapshot.md](../architecture-snapshot.md) (stack versions) |
| `ARCHITECTURE.md` (v7) | [security-status.md](../security-status.md) (findings v4→v8) |
| `PARTNER-PLATFORM.md` | [partner-platform.md](../partner-platform.md) |
| `vercel.json` + `sw.js` | [performance.md](../performance.md) |

## Protocole de synchronisation

### Si une source change
1. Identifier les pages wiki impactées via [mapping ci-dessus](#mapping-raw--wiki)
2. Lancer `./scripts/ingest-wiki.sh` pour obtenir un rapport d'impact
3. Mettre à jour les pages concernées
4. Lancer `./scripts/verify-wiki.sh` pour valider
5. Entrée dans [log.md](../log.md)

### Si la wiki diverge d'une source raw
- Source raw fait foi (elle est le code qui s'exécute)
- Wiki à corriger (jamais l'inverse)
- Si la wiki décrit une intention non encore dans le code → marquer comme `(à implémenter)` explicitement

## Extensibilité future

Si le projet dépasse ~100 000 tokens de wiki (limite pattern Karpathy) :
- Ajouter étage retrieval (pgvector sur `raw/`)
- Garder wiki comme "table des matières" + synthèses
- Plus de détails : [performance.md](../performance.md) section future

## Mise à jour

- **2026-04-23** : Création — formalisation des sources immuables.
