# BRH Habitat — Playbooks (Troubleshooting & How-to)

> Source : patterns observés dans audits v4→v8 + `PARTNER-PLATFORM.md` + expérience debugging.
> **Dernière mesure** : 2026-04-23.

Recueil de playbooks pour les opérations courantes et les bugs récurrents.

## 🔥 Playbook 1 — Debug "Erreur 500 Supabase / RLS recursion"

### Symptômes
- API renvoie 500 sans message clair
- Logs Supabase : `"stack depth limit exceeded"` ou `"infinite recursion"`
- Souvent sur `profiles` ou jointures avec `profiles`

### Cause probable
Policy RLS qui fait `SELECT FROM profiles WHERE id=auth.uid()` depuis une policy sur `profiles` elle-même → recursion.

### Fix
Utiliser une fonction `SECURITY DEFINER` :
```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

-- Puis dans la policy :
CREATE POLICY "..." ON public.profiles
  USING (public.get_my_role() = 'admin' OR id = auth.uid());
```

### Exemple historique
Migration `20260326120000_fix_profiles_rls_recursion` a résolu ce problème sur `profiles`.

## 🔑 Playbook 2 — Debug "Clerk ↔ Supabase bridge"

### Symptômes
- User connecté côté Clerk mais queries Supabase retournent 401
- `auth.uid()` = null dans les requêtes
- Session "jamais créée" côté Supabase

### Flow correct
```
1. User → Clerk Sign-in UI
2. Frontend récupère Clerk JWT via `useAuth()` de Clerk
3. Frontend → POST bridge-signin { clerkJWT }
4. EF bridge-signin :
   - Valide Clerk JWT (signature + exp)
   - Cherche profiles WHERE clerk_user_id = clerk.userId
     (via fonction profile_id_from_clerk)
   - Si profile n'existe pas : créer (sync via clerk-webhook d'abord)
   - Génère Supabase session JWT
5. Frontend → supabase.auth.setSession({ access_token, refresh_token })
6. Toutes les queries utilisent maintenant auth.uid() = profiles.id
```

### Points de vérif
- [ ] `CLERK_SECRET_KEY` défini en EF secrets
- [ ] `profiles.clerk_user_id` renseigné (via webhook `user.created`)
- [ ] `profile_id_from_clerk()` fonction existe et accessible
- [ ] `bridge-signin` EF déployée et pas de rate limit atteint

### Commandes debug
```bash
supabase functions logs bridge-signin --tail
# Chercher : "Invalid Clerk JWT", "Profile not found", "Session created"

# Côté DB
SELECT clerk_user_id, email FROM profiles WHERE clerk_user_id IS NULL;
# = users à re-sync via clerk-webhook
```

## 🛠 Playbook 3 — Créer une nouvelle migration

### Prérequis
- Jamais de `db push` sans accord Philippe (hook PreToolUse actif)
- Pattern Karpathy : lire wiki AVANT, update APRÈS

### Étapes
```bash
cd /Users/philippegagnon/Desktop/brh-habitat/brh-habitat

# 1. Générer timestamp UTC
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
FILE="supabase/migrations/${TIMESTAMP}_description.sql"
touch "$FILE"

# 2. Écrire la migration
# Template :
cat > "$FILE" <<'EOF'
-- Migration: {Description}
-- Date: YYYY-MM-DD
-- Contexte: {pourquoi}

BEGIN;

-- Table
CREATE TABLE IF NOT EXISTS brh_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES brh_companies(id) ON DELETE CASCADE,
  -- colonnes métier
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brh_new_table_company ON brh_new_table(company_id);

-- RLS
ALTER TABLE brh_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brh_new_table_own_company" ON brh_new_table
  FOR ALL TO authenticated
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Trigger updated_at
CREATE TRIGGER brh_new_table_updated_at
  BEFORE UPDATE ON brh_new_table
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
EOF

# 3. Tester en local
supabase db reset    # re-applique toutes les migrations
# Tester avec un user non-admin

# 4. Régénérer types TS
supabase gen types typescript --local > src/types/database.ts

# 5. MAJ wiki (data-model.md + migrations-audit.md + log.md)

# 6. Commit (PAS push sans accord)
git add supabase/migrations/$FILE src/types/database.ts docs/wiki/
git commit -m "feat(db): ajoute brh_new_table"

# 7. Deploy prod — UNIQUEMENT SI PHILIPPE CONFIRME
# supabase db push
```

## 📨 Playbook 4 — Créer une Edge Function

### Étapes
```bash
# 1. Créer la fonction
supabase functions new my-function

# 2. Implémenter (copier pattern ai-proxy pour auth + rate limit)
# supabase/functions/my-function/index.ts

# 3. Tester en local
supabase functions serve my-function
curl -X POST http://localhost:54321/functions/v1/my-function \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# 4. Définir secrets si besoin
supabase secrets set MY_API_KEY=xxx

# 5. Déployer (AVEC ACCORD PHILIPPE)
supabase functions deploy my-function

# 6. MAJ wiki (edge-functions-reference.md + log.md)
```

### Checklist obligatoire (règle anti-bug #9)
- [ ] Auth Bearer JWT vérifiée (sauf si public explicite)
- [ ] Rate limiting (pattern `checkRateLimit`)
- [ ] CORS via `getCorsHeaders(req)`
- [ ] Inputs validés (types, bornes)
- [ ] Secrets via `Deno.env.get()`
- [ ] try/catch avec codes HTTP corrects
- [ ] Pas de logs avec tokens

## 💰 Playbook 5 — Ajouter une colonne financière

### Règle d'or (anti-bug #2)
**INTEGER en centimes**. JAMAIS NUMERIC/FLOAT/TEXT.

### Migration
```sql
ALTER TABLE brh_xxx ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 0;
-- Nom suffixé _cents pour signaler au dev
```

### Côté code
```typescript
// Types Supabase
amount_cents: number

// Affichage
import { formatEuros } from '@/lib/format'
<span>{formatEuros(amount_cents)}</span>

// src/lib/format.ts
export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })
}

// Input user (€ → cents)
const cents = Math.round(parseFloat(eurosInput) * 100)
```

## 📅 Playbook 6 — Gérer une date locale

### Règle d'or (anti-bug #13)
**JAMAIS `toISOString().slice(0,10)`** — donne la date UTC, pas locale.

### Mauvais
```typescript
const today = new Date().toISOString().slice(0, 10)  // ❌ UTC
// Si user en France à 01:30 → renvoie la date d'hier
```

### Bon
```typescript
const d = new Date()
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Ou helper :
import { toLocalDate } from '@/lib/date'
const today = toLocalDate(new Date())
```

## 🎨 Playbook 7 — Style Tailwind 4

### Règle d'or (anti-bug #14)
**Toujours `@layer base { }`** pour les resets CSS. Sinon spécificité CSS imprévisible.

### Mauvais
```css
/* src/index.css */
* { margin: 0; padding: 0; }  /* ❌ Écrase tout */
```

### Bon
```css
@layer base {
  * { margin: 0; padding: 0; }  /* ✅ Layer contrôlé */
}

/* Fonts personnalisées */
@theme {
  --font-display: "DM Sans", sans-serif;
  --font-sans: "Inter", sans-serif;
  /* JAMAIS --font-family-display — le nom doit être --font-XXX en Tailwind 4 */
}
```

## 🔄 Playbook 8 — Ajouter une mutation avec cache

### Pattern obligatoire (règle anti-bug #1)
```typescript
// hooks/queries/xxx.ts
export function useCreateXxx() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: XxxCreateInput) => xxxApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['xxx'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] }) // ← OBLIGATOIRE
    },
    onError: (err) => {
      logError(err, { context: 'createXxx' })
      // toast handled by component
    },
  })
}
```

### Points critiques
- Invalider **tous les queryKeys dépendants** (ex: `['xxx']`, `['related']`, `['dashboard', 'stats']`)
- `logError()` dans `onError`
- Pas de `as unknown as` dans `mutationFn` — toujours Zod `.parse()` dans `api/xxx.ts`

## 🚨 Playbook 9 — Urgence : restaurer session loggée-out

### Symptôme
Logout incomplet : `localStorage` résiduel, stores Zustand gardent user, queries React Query renvoient cache stale.

### Flow correct (dans `useAuth.ts`)
```typescript
async function signOut() {
  initRef.current = false
  await supabase.auth.signOut()
  setUser(null)                 // Clear Zustand
  queryClient.clear()            // Clear RQ cache
  useDiagnosticStore.reset()     // Clear diagnostic draft
  useAppStore.closeDrawer()      // Close UI drawer

  // Si problème : nettoyer localStorage manuel
  Object.keys(localStorage)
    .filter(k => k.startsWith(`${tenantId}-`) || k.startsWith('sb-'))
    .forEach(k => localStorage.removeItem(k))
}
```

## 📊 Playbook 10 — Comprendre la cascade commissions

### Scenario
Company A (recrutée par B, B recrutée par C) fait signer devis 50 000€ HT avec commission 10%.

### Cascade
```
1. brh_quotes.status = 'signed'
   ↓ trigger calculate_commission()
2. brh_quotes.commission_cents = 5_000_00 (500 000 centimes = 5 000€)
   ↓ trigger update_company_ca()
3. brh_companies[A].total_ca_apporte += 5_000_000
   brh_companies[A].level = CASE selon seuils
   ↓ trigger calculate_recruitment_commission()
4. INSERT brh_recruitment_commissions (B, level=1, commission=base*20%)
   INSERT brh_recruitment_commissions (C, level=2, commission=base*10%)
5. Si prospect apporté par affilié P (particulier) :
   ↓ trigger award_affiliate_points()
   INSERT brh_points_transactions (P, type='earned', points=+500)
```

### Debug : commission absente
```sql
-- Vérifier que le trigger s'est bien déclenché
SELECT * FROM brh_quotes WHERE id = '<quote_id>';
-- commission_cents doit être > 0

-- Vérifier cascade
SELECT * FROM brh_recruitment_commissions WHERE source_quote_id = '<quote_id>';

-- Chaîne recruteur
WITH RECURSIVE chain AS (
  SELECT id, recruiter_id, 0 AS level FROM brh_companies WHERE id = '<company_id>'
  UNION ALL
  SELECT c.id, c.recruiter_id, chain.level + 1
  FROM brh_companies c JOIN chain ON c.id = chain.recruiter_id
)
SELECT * FROM chain;
```

## 🔄 Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy v2). 10 playbooks critiques documentés.
