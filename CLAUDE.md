# BRH Habitat — Instructions Claude

## RÈGLE ABSOLUE N°1 — Wiki Karpathy (LLM Wiki pattern)

Cette codebase suit le **pattern Karpathy LLM Wiki**. La wiki est la **source de vérité** pour toute modification.

### Emplacement
- Wiki : [docs/wiki/](docs/wiki/)
- Index d'entrée obligatoire : [docs/wiki/index.md](docs/wiki/index.md)

### Protocole AVANT toute modification
1. Lire [docs/wiki/index.md](docs/wiki/index.md) (catalogue)
2. Identifier les pages concernées (1-3 max)
3. Lire ces pages
4. Vérifier absence de contradiction entre la tâche demandée et la wiki
5. Si la tâche contredit une décision wiki → clarifier avec Philippe AVANT d'agir

### Protocole APRÈS toute modification
1. Mettre à jour les pages wiki impactées (data-model, architecture-snapshot, feature guides)
2. Ajouter une entrée dans [docs/wiki/log.md](docs/wiki/log.md) au format :
   ```markdown
   ## {YYYY-MM-DD} — {titre court}
   - **Contexte** : {pourquoi cette modif}
   - **Fichiers modifiés** : {liste}
   - **Migrations créées** : {si applicable}
   - **Pages wiki impactées** : {liste}
   - **Risque** : {None / Low / Medium / High}
   - **Tests** : {résultat}
   - **Status** : {✅ DONE / 🟡 PARTIEL / 🔴 BLOQUÉ}
   ```
3. Si blueprint/roadmap → mettre à jour le statut

### Interdictions
- ❌ Jamais modifier le code sans avoir lu la wiki
- ❌ Jamais supprimer/renommer une page wiki sans justification dans log.md
- ❌ Jamais créer de page hors catégories définies dans index.md
- ❌ Jamais push/deploy sans accord explicite de Philippe (règle globale)

### Référence du pattern
- [docs/wiki/karpathy-pattern-setup.md](docs/wiki/karpathy-pattern-setup.md) — règles détaillées
- [Karpathy LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

---

## RÈGLES ANTI-BUG (14 règles non-négociables)

Voir [docs/wiki/index.md](docs/wiki/index.md) pour la liste complète.

### Règles critiques
1. **TOUJOURS invalider `['dashboard', 'stats']`** après mutation d'entité comptée
2. **TOUJOURS INTEGER (cents)** pour montants financiers — JAMAIS NUMERIC/FLOAT/TEXT
3. **TOUJOURS scoper localStorage par tenant** : `${tenantId}-xxx`
4. **JAMAIS `as unknown as`** — utiliser Zod (`api/schemas.ts`)
5. **TOUJOURS `if (error) throw error`** après appel Supabase
6. **JAMAIS de route sans guard** (AuthGuard / AdminGuard / ProGuard / ParticulierGuard)
7. **TOUJOURS tester RLS** avec user non-admin avant merge
8. **JAMAIS `USING (true)`** sauf exceptions (brh_simulation_leads, brh_badges SELECT)
9. **TOUJOURS rate limit** sur EFs (pattern ai-proxy)
10. **TOUJOURS incrémenter SW version** après deploy avec cache changes
11. **TOUJOURS TIMESTAMPTZ** (pas TIMESTAMP)
12. **TOUJOURS `SET search_path = ''`** sur fonctions SECURITY DEFINER
13. **JAMAIS `toISOString().slice(0,10)`** — utiliser `getFullYear/getMonth/getDate`
14. **TOUJOURS `@layer base { }`** pour resets CSS Tailwind 4

---

## RÈGLES GLOBALES (MEMORY.md rappel)

- **Architecture first** : questions + architecture AVANT de coder
- **JAMAIS deploy sans accord** : ne JAMAIS `git push`, `supabase db push`, `vercel deploy`
- **Protection .env** : fichiers `.env*` jamais committés, jamais lus en clair dans la mémoire

---

## Stack (vérifiée 2026-04-23)

- **Frontend** : React 19.2 + TypeScript 5.9 strict + Vite 7.3 + Tailwind CSS 4.2
- **State** : Zustand 5.0 + React Query 5.99
- **Backend** : Supabase 2.103 (project `lygmmvxnmvlgynmrcpny`) — PostgreSQL + Auth + Storage + Edge Functions + Realtime
- **PDF** : @react-pdf/renderer 4.4
- **Monitoring** : Sentry 10.48
- **Validation** : Zod 4.3
- **i18n** : i18next 26 (FR/EN)
- **Auth** : Clerk UI + Supabase (bridge via EF `bridge-signin`)
- **Emails** : Resend (via EFs `auto-email`, `send-notification-email`)
- **Deploy** : Vercel (SPA) · CSP, HSTS 2 ans

## Score santé

**9.8/10** (audit v7 du 2026-04-14) — voir [docs/wiki/architecture-snapshot.md](docs/wiki/architecture-snapshot.md).

## 5 portails

- **Public** (17 pages) — sans guard
- **Dashboard user** (7 pages) — AuthGuard
- **Admin** (13 pages) — AdminGuard
- **Pro** (17 pages) — ProGuard + 9 feature gates
- **Particulier** (12 pages) — ParticulierGuard + 7 feature gates

## Commandes utiles

```bash
# Mesurer le projet (ré-audit rapide)
cd /Users/philippegagnon/Desktop/brh-habitat/brh-habitat
echo "Pages:" && find src/pages -name "*.tsx" | wc -l
echo "Composants:" && find src/components -name "*.tsx" | wc -l
echo "Migrations:" && ls supabase/migrations/*.sql | wc -l

# Supabase
supabase db reset              # re-applique migrations (local)
supabase functions serve <name>  # test EF local
supabase gen types typescript --local > src/types/database.ts

# Build & dev
npm run dev
npm run build
npm run type-check
```

## Points de vigilance

- **Montants** : ALL colonnes cents sont suffixées `_cents` — vérifier à chaque INSERT/UPDATE
- **Realtime** : actif sur `brh_messages` + `brh_notifications` — attention à la charge
- **Clerk bridge** : auth flow double (Clerk UI → bridge EF → Supabase session) — debugging délicat
- **SW cache** : incrémenter version à chaque deploy qui change des assets
- **Auth flow** : `onAuthStateChange` gère UNIQUEMENT `SIGNED_OUT` (depuis 2026-04-29). Le profil DOIT être chargé par chaque flow login explicitement (LoginPage, RegisterProPage, JoinCompanyPage) après `signInWithPassword/signUp`. Voir [docs/wiki/architecture-snapshot.md](docs/wiki/architecture-snapshot.md#auth-flow-depuis-2026-04-29-).

## Pattern API ↔ Hooks (volontaire — pas un doublon)

10 paires `src/api/X.ts` ↔ `src/hooks/queries/X.ts` (noms identiques par design). C'est le pattern Tanstack React Query — ne pas refactorer comme un doublon.

```
Component → useXxx() → hooks/queries/xxx.ts → xxxApi.list()/create() → api/xxx.ts → supabase + Zod
```

Voir [docs/wiki/hooks-reference.md](docs/wiki/hooks-reference.md#pattern-api--hooks-volontaire--à-ne-pas-confondre-avec-doublons).

## Variables d'environnement Supabase (depuis 2026-04-29)

Source unique : [src/lib/config.ts](src/lib/config.ts). Tout module qui a besoin de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` ou d'une URL d'Edge Function importe depuis là :

```ts
import { SUPABASE_ANON_KEY, edgeFunctionUrl } from '@/lib/config'
const url = edgeFunctionUrl('verify-siret')
```

JAMAIS de `import.meta.env.VITE_SUPABASE_*` directement dans un module hors `lib/config`.

## Dette technique connue

- **B01 — Client Supabase non typé `<Database>`** : format `Database` manuel dans `src/types/database.ts` (30 tables) non reconnu par supabase-js v2.103. Action : exécuter `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny > src/types/database.ts` puis activer `createClient<Database>` dans [src/lib/supabase.ts](src/lib/supabase.ts). Voir [docs/wiki/log.md](docs/wiki/log.md) entrée 2026-04-29.

## Références

- Site public : https://brh-habitat.vercel.app
- Base44 (legacy mockup) : https://brh-habitat-e9ba58c9.base44.app
- ARCHITECTURE.md audit v7 : [ARCHITECTURE.md](ARCHITECTURE.md)
- PARTNER-PLATFORM.md blueprint : [PARTNER-PLATFORM.md](PARTNER-PLATFORM.md)
- Wiki Karpathy : [docs/wiki/](docs/wiki/)
