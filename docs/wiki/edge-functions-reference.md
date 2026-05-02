# BRH Habitat — Edge Functions Reference

> Source : `supabase/functions/`.
> **Dernière mesure** : 2026-05-02 · **Total** : 20 fonctions + `_shared/` (+ Phase 13.6.3 `notify-artisan-lead`).

## Convention globale

- **Runtime** : Deno, imports épinglés
- **CORS** : `getCorsHeaders(req)` depuis `_shared/cors.ts`
- **Auth** : Bearer token JWT en début de handler (sauf endpoints publics documentés)
- **Rate limiting** : checkRateLimit obligatoire sur TOUTE EF (règle anti-bug #9)
- **Erreurs** : try/catch avec codes HTTP corrects + Sentry côté frontend
- **Secrets** : `Deno.env.get()` (JAMAIS hardcode)
- **Validation inputs** : types + bornes obligatoires

## Catalogue

### 🤖 IA (2)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `ai-proxy` | Proxy OpenAI (assistant technique BTP, chiffrage IA) | Bearer token (visitor=public, pro/chiffrage=auth) | 20-40 req/min selon rôle |
| `chiffrage-prices` | Retourne prix de référence pour chiffrage (base de données interne) | Public | 40 req/min |

→ Voir [chiffrage-ia.md](chiffrage-ia.md) pour le flow complet.

### 📧 Emails (2)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `auto-email` | Emails automatiques (bienvenue, relances, notifications) | Bearer admin | 30 req/min |
| `send-notification-email` | Notifications transactionnelles (nouveau prospect, devis signé, etc.) | Optionnel (JWT si user) | 10 req/min |

**Provider** : Resend (`Deno.env.get('RESEND_API_KEY')`).

### 👔 Invitations Pro (3)

Système multi-membres entreprise (migration 2026-04-23).

| Fonction | Rôle | Auth | Flow |
|----------|------|------|------|
| `company-invite` | Créer invitation pour email X (envoie email avec token) | JWT (owner company) | Insert `brh_company_invitations` + `send-notification-email` |
| `company-invite-verify` | Vérifie qu'un token est valide (page d'acceptation) | Token URL | Lit `brh_company_invitations` par token |
| `company-invite-accept` | Accepte l'invitation (crée `brh_company_members`) | JWT + token | Upsert member + marque invitation `accepted_at` |

### 🔑 Auth bridge Clerk (2)

Stratégie hybride : **Clerk** gère l'UI d'authentification, **Supabase** garde son `auth.users` (migration 2026-04-21).

| Fonction | Rôle | Auth | Déclencheur |
|----------|------|------|-------------|
| `bridge-signin` | Échange un JWT Clerk contre un JWT Supabase | JWT Clerk | Après sign-in Clerk réussi |
| `clerk-webhook` | Webhook Clerk → sync events vers Supabase (`user.created`, `user.updated`, `user.deleted`) | Signature webhook Clerk (`CLERK_WEBHOOK_SECRET`) | Events Clerk |

### 🏢 SIRET (1)

| Fonction | Rôle | Auth | API externe |
|----------|------|------|-------------|
| `verify-siret` | Vérifie SIRET via API SIRENE officielle, retourne données officielles | JWT | API SIRENE (INSEE) |

**Usage** : inscription pro — au lieu de stocker ce que l'user tape, on stocke ce que SIRENE renvoie (migration `siret_verification_fields`).

### 🔗 CRM (1)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `crm-sync` | Sync prospect/quote vers CRM externe via webhook | Bearer admin (migration v7 correction C2) | 5 req/min |

**Correction v7** : Auparavant public sans auth (faille critique). Maintenant auth admin + rate limit strict.

### 🌐 Sources externes prospection — Phase 11.1 (2)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `enrich-prospect` | Enrichit 1 prospect (IRIS + commune + Géorisques) + calcule score_v2 | JWT | 20 req/min |
| `georisques-lookup` | Wrapper API Géorisques BRGM avec cache 90j Supabase | JWT | 30 req/min |

→ Voir [external-data-sources.md](external-data-sources.md) pour le détail Tier 1.

### ✨ Killer feature — Courrier IA Phase 13 (1)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `generate-prospect-letter` | Génère un courrier de prospection IA (Claude Opus 4.7) avec quota Phase 15 | JWT | 20 req/min |

**Quota gating Phase 15** : la fonction appelle `brh_consume_letter_quota(profile_id)` avant Claude. Refus 402 si quota dépassé. Le tier est lu depuis `brh_pro_subscriptions`.

### 💳 SaaS Stripe — Phase 15 (3)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `create-checkout-session` | Crée Stripe Checkout pour upgrade vers Pro/Expert | JWT | 5 req/min |
| `create-portal-session` | Crée Stripe Customer Portal (gestion abonnement) | JWT | 10 req/min |
| `stripe-webhook` | Reçoit events Stripe (subscription created/updated/deleted) → sync `brh_pro_subscriptions` | Signature Stripe HMAC SHA-256 | n/a (Stripe) |

**Variables d'environnement Phase 15** :
- `STRIPE_SECRET_KEY` — clé secrète Stripe (sk_live_... ou sk_test_...)
- `STRIPE_WEBHOOK_SECRET` — secret de vérification du webhook
- `STRIPE_PRICE_PRO`, `STRIPE_PRICE_EXPERT` — IDs des prix Stripe (price_...)
- `SITE_URL` — URL de retour Checkout (par défaut `https://www.renovation-brh.fr`)

**Mode preview** : si `STRIPE_SECRET_KEY` absent, les EFs renvoient 503 avec message clair (mode développement). Le code est prêt pour brancher Stripe quand les credentials seront fournis.

**Tarification SaaS pro RGE** (distincte des paliers agences immo Phase 12) :
- **Free** (Découverte) : 0 €, 5 courriers IA / mois
- **Pro** : 49 €/mois, 100 courriers IA + bulk top 50 + ZIP + export CSV
- **Expert** : 149 €/mois, 500 courriers IA + marketplace artisans (Phase 13.6) + API + multi-utilisateurs

### 🔧 Marketplace artisans — Phase 13.6.3 (1)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `notify-artisan-lead` | Envoie email Resend à l'artisan quand un pro RGE lui recommande un prospect (template HTML BRH avec contexte DPE + MPR + signaux) | JWT | 10 req/min |

**Trigger** : appelée automatiquement par le hook `useCreateArtisanLead` après création du lead (best-effort, n'échoue pas la mutation si Resend indisponible).

**Variables d'environnement** : `RESEND_API_KEY` + `EMAIL_FROM` (déjà configurés depuis Phase 4).

## Variables d'environnement

| Variable | Usage |
|----------|-------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auto-fournies par Supabase runtime |
| `OPENAI_API_KEY` | ai-proxy |
| `RESEND_API_KEY` | auto-email, send-notification-email |
| `CLERK_SECRET_KEY` | bridge-signin, clerk-webhook |
| `CLERK_WEBHOOK_SECRET` | clerk-webhook (vérification signature) |
| `SIRENE_API_KEY` | verify-siret |
| `CRM_WEBHOOK_URL`, `CRM_WEBHOOK_SECRET` | crm-sync |
| `ANTHROPIC_API_KEY` | generate-prospect-letter (Claude Opus 4.7) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | create-checkout-session, stripe-webhook, create-portal-session |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_EXPERT` | IDs des Prices Stripe (49€/mois et 149€/mois) |
| `SITE_URL` | URL de retour Checkout/Portal (https://www.renovation-brh.fr) |

## Patterns d'implémentation

### Auth Bearer JWT
```ts
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }),
    { status: 401, headers: corsHeaders });
}
```

### Rate limiting (pattern ai-proxy)
```ts
// Clé = user_id ou IP, fenêtre glissante en mémoire ou via table
const rateLimited = await checkRateLimit({
  key: user?.id ?? req.headers.get('x-forwarded-for'),
  limit: 20,
  windowMinutes: 1,
});
if (rateLimited) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } });
}
```

### CORS
```ts
import { getCorsHeaders } from '../_shared/cors.ts';
const corsHeaders = getCorsHeaders(req);
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

### Response structurée
```ts
return new Response(
  JSON.stringify({ data: result }),
  {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  }
);
```

### Invocation frontend
```ts
const { data, error } = await supabase.functions.invoke('ai-proxy', {
  body: { prompt, context },
});
if (error) throw error;
```

## Sécurité — checklist avant deploy

- [ ] Auth Bearer token vérifié (si pas public)
- [ ] Inputs validés (types, bornes, sanitization)
- [ ] Rate limiting en place (règle anti-bug #9)
- [ ] CORS via `getCorsHeaders()` (pas `*` en prod)
- [ ] Secrets via `Deno.env.get()` uniquement
- [ ] try/catch avec codes HTTP appropriés (400, 401, 403, 429, 500)
- [ ] Pas de logs sensibles (tokens, credentials)
- [ ] Testé en local : `supabase functions serve <name>`

## Commandes utiles

```bash
# Lister les fonctions
supabase functions list

# Déployer une fonction
supabase functions deploy <name>

# Logs en live
supabase functions logs <name> --tail

# Définir un secret
supabase secrets set KEY=value

# Lister les secrets
supabase secrets list
```

## Statut d'implémentation

| EF | BDD ready | Auth | Rate limit | Déployé | Notes |
|----|-----------|------|------------|---------|-------|
| `ai-proxy` | ✅ | ✅ | ✅ 20-40/min | ✅ | OpenAI GPT-4 |
| `chiffrage-prices` | ✅ | Public | ✅ 40/min | ✅ | |
| `auto-email` | ✅ | ✅ admin | ✅ 30/min | ✅ | Resend |
| `send-notification-email` | ✅ | Optionnel | ✅ 10/min | ✅ | Resend |
| `company-invite` | ✅ | ✅ | — (à vérifier) | ✅ | ⭐ NEW 2026-04-23 |
| `company-invite-verify` | ✅ | Token | — (à vérifier) | ✅ | ⭐ NEW |
| `company-invite-accept` | ✅ | ✅ + token | — (à vérifier) | ✅ | ⭐ NEW |
| `bridge-signin` | ✅ | JWT Clerk | — (à vérifier) | ✅ | ⭐ Migration 2026-04-21 |
| `clerk-webhook` | ✅ | Signature | ✅ | ✅ | ⭐ Migration 2026-04-21 |
| `verify-siret` | ✅ | ✅ | — (à vérifier) | ✅ | ⭐ Migration 2026-04-21 |
| `crm-sync` | ✅ | ✅ admin | ✅ 5/min | ✅ | Correction v7 C2 |

## Findings à suivre

- ⚠️ **company-invite**, **company-invite-verify**, **company-invite-accept** : vérifier que rate limiting est en place (pattern ai-proxy) — si manquant, ajouter (règle #9)
- ⚠️ **verify-siret** : vérifier rate limit (API SIRENE peut être coûteuse)
- ⚠️ **bridge-signin** : vérifier rate limit anti-brute-force
- ❌ **Monitoring Sentry côté EFs** : Sentry uniquement frontend. Pour EF, logs Supabase uniquement.

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy). Catalog des 11 EF + 6 ajouts post-audit v7.
