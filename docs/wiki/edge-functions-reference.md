# BRH Habitat — Edge Functions Reference

> Source : `supabase/functions/` + lint `scripts/verify-wiki.sh`.
> **Dernière mesure** : 2026-05-12 · **Total** : **41 fonctions** + `_shared/` (post Phases 16→19 + Employé V2 + Foncier Pro IA).

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

### 💰 Facturation commission — Phase 13.6.7.2 (1)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `send-commission-invoice` | Génère signed URL 30j sur PDF Storage + envoie email Resend HTML à l'artisan + update `email_sent_at` + `email_resend_id` | JWT admin | 30 req/min |

**Workflow** : Admin clique "Envoyer" sur AdminCommissionsArtisans → front génère PDF via `@react-pdf/renderer` → upload Supabase Storage `brh-commission-invoices/{artisan_id}/{year}/{month}.pdf` → EF crée signed URL + envoie Resend.

**Bucket** : `brh-commission-invoices` (privé, max 10 MB, MIME pdf only). RLS : admin tout, artisan voit `{artisan.id}/*` via signed URL.

### 🔧 Onboarding artisan magic link — Phase 13.6.5 (3)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `artisan-invite-create` | Admin crée invitation magic link + email Resend (avec template HTML CTA) | JWT admin | 30 req/min |
| `artisan-invite-verify` | **PUBLIC** — vérifie token (valide / expired / accepted / revoked / invalid) | Aucune | 60 req/min |
| `artisan-invite-accept` | Lie `profile_id` du user authentifié à `brh_artisans_rge.id` via helper SQL atomique | JWT | 10 req/min |

**Workflow magic link** (zéro friction, sans password) :
1. Admin BRH crée l'invitation → token 64 chars hex aléatoire (helper SQL `brh_gen_artisan_token`)
2. Email Resend envoyé à l'artisan avec lien `/artisan/onboarding/:token`
3. Artisan clique le lien → page publique vérifie le token via `artisan-invite-verify`
4. Saisit son email → `supabase.auth.signInWithOtp` envoie un magic link Supabase
5. Clique le 2ᵉ email magic link → revient sur la page avec session active
6. Page appelle `artisan-invite-accept` → helper SQL `brh_artisan_invite_accept` lie atomiquement
7. Redirection vers `/artisan/dashboard`

**Sécurité** :
- Token 32 bytes random encodé hex (256 bits d'entropie, anti-bruteforce)
- Expiry 30 jours (auto-marqué `expired` au prochain verify post-deadline)
- 1 artisan ne peut être lié qu'à 1 seul `profile_id` (UNIQUE constraint)
- Helper SQL avec `FOR UPDATE` lock + `SECURITY DEFINER` + `SET search_path = ''`

### 🏠 Foncier Pro — Phase 19 (4)

Cadastre + IA PLU + Vision satellite + cache parcelles. Voir [foncier-pro-status.md](foncier-pro-status.md).

| Fonction | Rôle | Auth | Rate limit | Cache |
|----------|------|------|------------|-------|
| `cadastre-fetch` | Parcelles IGN api-carto (3 modes : par IDU, INSEE+section+numéro, GPS) | JWT | 60 req/min | 90j (`brh_parcelles_cache`) |
| `permis-fetch` | Permis construire Sit@del2 (cache-only V1 ; ingestion CSV ~500 MB = script standalone mensuel) | JWT | 60 req/min | DB-only |
| `plu-summarize-ai` | PLU résumé via Claude Sonnet 4.6 (PDF GPU → JSONB zones + ABF + mentions). HEAD check 32 MB max → 413 sinon. | JWT | 10 req/min | 180j (`brh_plu_summaries`) — ~0.01-0.03 €/résumé |
| `satellite-vision-ai` | Analyse toiture aérienne BD ORTHO IGN (WMS crop 768×768 jpeg) → Claude Sonnet 4.6 vision → roof_area, orientation, tilt, tree_shade, solar_potential_kwh_year | JWT | 15 req/min | 365j (`brh_satellite_analyses`) — ~0.02-0.04 €/analyse |

### 🏢 SCI & Successions — Phase 19.B (2)

| Fonction | Rôle | Auth | Rate limit | API externe |
|----------|------|------|------------|-------------|
| `sci-search` | Recherche entreprises gratuit (`recherche-entreprises.api.gouv.fr`) — mode SIREN exact ou query libre filtré nature_juridique=6540,6541,6543,6551, etat_administratif=A. Fire-and-forget matching décès pour dirigeants ≥60 ans via `EdgeRuntime.waitUntil`. | JWT | 30 req/min | recherche-entreprises (cache 30j `brh_sci_companies`) |
| `sci-deces-match` | Matching décès gratuit (`deces.matchid.io`) sur chaque dirigeant → update `est_decede` + `latest_deces_date`. RPC `brh_sci_recompute_succession_score`. | JWT | 20 req/min | matchid.io (live, audit trail `brh_sci_deces_matches`) |

### 🌍 Données communales Phase 19.C+E (3)

| Fonction | Rôle | Auth | Rate limit | Cache |
|----------|------|------|------------|-------|
| `commune-sociodemo-fetch` | geo.api.gouv.fr (décimalage, population, épci) + RPC `brh_dvf_commune_stats` (gentrification score) | JWT | 30 req/min | 90j (`brh_communes_sociodemo`) |
| `georisques-fetch` | API `georisques.gouv.fr/api/v1/resultats_rapport_risque` (risques naturels + technologiques, gratuit illimité) | JWT | 60 req/min | 90j (`brh_ext_cache`) |
| `bodacc-fetch` | BODACC datadila opendatasoft (ventes commerciales, procédures collectives, radiations RCS) — filtre INSEE/dept/famille/days_back | JWT | 30 req/min | 7j (`brh_bodacc_alerts` upsert) |

### 🎯 DPE Express — Phase 11 lead capture (2)

Captures rapides depuis pages publiques diagnostic-express + simulateur public.

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `dpe-express-create-lead` | INSERT `brh_prospects` (service_role bypass RLS anonymes), lead_score computed (30 base + bonus email/address/budget/urgency), attribution UTM/gclid/fbclid dans notes | Optionnel (anon ou JWT) | 3 req/min/IP |
| `dpe-express-lookup` | Proxy stateless du simulateur `/api/dpe-virtuel` (FastAPI 8915) pour bypass CORS | Public | 30 req/min |

### 💎 Agences SaaS — Phase 16 (2)

| Fonction | Rôle | Auth | Rate limit | API externe |
|----------|------|------|------------|-------------|
| `agence-checkout` | Stripe Checkout subscription pour upgrade tier (standard/premium/expert). Métadonnées `agence_id`, `tier`, `subscription_id`. Preview-safe (503 si `STRIPE_SECRET_KEY` absent). | JWT | 10 req/min | Stripe `/v1/checkout/sessions` |
| `monthly-audit-agencies` | Cron MENSUELLE (header `x-brh-admin-token`, **pas JWT**) — RPC `brh_generate_monthly_audits(p_audit_month)` sample 5% leads contactés → emails Resend best-effort (V1 emails reportés jusqu'à `brh_proprietaires` Phase 16.x) | Admin token | n/a | Resend (optionnel) |

### 🔗 AUTAF Bridge — Phase 18.8 (1)

| Fonction | Rôle | Auth | Rate limit | API externe |
|----------|------|------|------------|-------------|
| `autaf-recommendations-fetch` | Fetch recommandations AUTAF live via token OAuth chiffré (Bearer). Update `brh_autaf_link.last_error` + `last_sync_at`. Retourne `bridge_inactive` / `scope_missing` / `autaf_unavailable` gracieusement. | JWT | 60 req/min | `autaf.fr/wp-json/autaf/v1/recommendations/{id}` |

### 📧 Emails employés / RDV / audits — Phase Employé V2 (3)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `send-recruitment-email` | Recharge employé (vérif `brh_employees.is_active=true`) + template `brh_email_templates.slug` + render variables → Resend → INSERT `brh_email_sends` + INSERT `brh_employee_actions` (+5 pts gamification) | JWT (employé actif) | 30 req/min |
| `send-audit-email` | Vérif caller = `brh_audits.pro_user_id` ou admin → signed URL 30j PDF Storage `audits/{auditId}/audit.pdf` → Resend HTML (template DPE couleur A-G + CEP kWh) → log `brh_audit_emails` | JWT | 5 req/min |
| `send-rdv-confirmation` | Fire-and-forget depuis ContactRdvModal — envoie email CLIENT (récap créneaux) + email ADMIN (tableau détails). RESEND_API_KEY absent = warn log, ne bloque pas appointment. | Public | 5 req/min/IP |

### 🛡️ RGPD opt-out (1)

| Fonction | Rôle | Auth | Rate limit |
|----------|------|------|------------|
| `submit-optout` | Capture source_ip + user_agent (preuve eIDAS) → best-effort match `brh_dpe_prospects` (code_postal+commune) → INSERT `brh_optout_requests` (RLS anon allowed) → email confirmation best-effort. Deadline +30j (Art. 21 RGPD). | Public | 5 req/IP/heure |

### 🛠️ Utilities (1)

| Fonction | Rôle | Auth | Rate limit | Cache |
|----------|------|------|------------|-------|
| `fetch-fx-rate` | Taux change USD→EUR via `api.frankfurter.app` (ECB rates) pour pricing Anthropic EUR. Fallback 0.92 si API down. | Public | 60 req/min | 24h (`brh_ext_cache` source='frankfurter_fx') |

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
