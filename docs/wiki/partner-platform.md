# BRH Habitat — Plateforme Partenaires

> Source : `PARTNER-PLATFORM.md` + migrations `20260403200000-20260404000000` + `src/api/` (companies, prospects, quotes, recruitment).
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

BRH Habitat héberge une **plateforme d'affiliation multi-niveaux** pour les professionnels du BTP (architectes, agents immobiliers, maîtres d'œuvre, courtiers) qui apportent des prospects à BRH. Système de commissions automatiques + recrutement cascade (level 1/2/3).

### Acteurs

| Acteur | Rôle DB | Portail | Guard |
|--------|---------|---------|-------|
| Admin BRH | `role='admin'` | `/admin/*` | `AdminGuard` |
| Pro (partenaire) | `role='pro'` | `/pro/*` | `ProGuard` |
| Particulier | `role='particulier'` | `/particulier/*` | `ParticulierGuard` |
| User basique | `role='user'` | `/tableau-de-bord` | `AuthGuard` |

## Modèle de données

### `brh_companies` (entreprises partenaires)
```
id                        UUID PK
owner_id                  UUID → profiles(id)
name                      TEXT
siret                     TEXT + champs officiels SIRENE (migration 2026-04-21)
address, city, postal_code
logo_url, website
profession                TEXT CHECK IN ('architecte','agent_immobilier','maitre_oeuvre','courtier','autre')
commission_rate_percent   INTEGER (ex: 10 = 10%)
level                     TEXT ('bronze'/'silver'/'gold'/'platinum') — auto MAJ par trigger
total_ca_apporte          INTEGER cents — auto MAJ par trigger
recruiter_id              UUID? → brh_companies(id) — chaîne de recrutement
is_active                 BOOLEAN
created_at, updated_at    TIMESTAMPTZ
```

### `brh_company_members` (membres entreprise)
```
company_id, user_id, role ('owner'/'admin'/'member'), is_active
```

### `brh_company_invitations` (⭐ 2026-04-23 — flow multi-membres)
```
company_id, email, role, token UNIQUE, expires_at, accepted_at
```

### `brh_prospects` (prospects apportés)
```
id, company_id, user_id_created_by
name, email, phone, address
status                    TEXT ('new'/'contacted'/'qualified'/'lost'/'converted')
lead_score                INTEGER (calc trigger)
estimated_value_cents     INTEGER
notes
created_at, updated_at
```

> ⚠ Schéma documenté ici est une description métier — vérifier dans la migration `20260403200000_partner_platform_tables` pour les colonnes exactes avant modif.

### `brh_prospect_files`
Fichiers attachés (bucket `prospect-files`, scopé `{company_id}/`).

### `brh_quotes` (devis)
```
id                  UUID PK
prospect_id         UUID → brh_prospects
company_id          UUID → brh_companies
amount_cents        INTEGER (HT)
status              TEXT ('draft'/'sent'/'signed'/'refused')
signed_at           TIMESTAMPTZ?
commission_cents    INTEGER (auto par trigger `calculate_commission`)
```

### `brh_recruitment_commissions` (cascade multi-niveaux)
```
id, recruiter_company_id, recruited_company_id
source_quote_id, level (1/2/3)
commission_cents INTEGER, paid_at TIMESTAMPTZ?
```

## Flux métier

### 1. Inscription partenaire pro

```
Visiteur → /connexion → Clerk UI (bridge-signin)
  → supabase.auth.users créé
  → handle_new_user() trigger :
      - lookup email dans brh_admin_emails
      - assigne role='admin' si match, sinon role='user'
  → Page /devenir-partenaire
  → Remplit form (SIRET, profession)
  → verify-siret EF valide via API SIRENE
  → createCompany(): insert brh_companies + brh_company_members(owner)
      - RLS INSERT : fix migration 20260410000000
      - RLS SELECT owner : fix migration 20260420000000
  → role='pro' assigné (via admin ou auto-upgrade)
```

### 2. Inviter un membre (⭐ 2026-04-23)

```
Owner → /pro/equipe → "Inviter un membre"
  → invitationsApi.create({ email, role })
  → EF company-invite :
      - insert brh_company_invitations
      - send-notification-email → envoi lien avec token
  → Email utilisateur : "Rejoignez {company_name}"
      - Lien : /invitation/accept?token=xxx
  → User clique lien
  → EF company-invite-verify : valide token
  → User sign-up/sign-in (si besoin)
  → EF company-invite-accept :
      - vérifie token + expires_at
      - insert brh_company_members
      - UPDATE brh_company_invitations.accepted_at = now()
```

### 3. Créer un prospect

```
Pro → /pro/prospects → "Nouveau prospect"
  → prospectsApi.create(input)
  → Trigger calculate_lead_score() calcule brh_prospects.lead_score
  → Upload fichiers via prospect-files bucket
  → EF send-notification-email → notif admin BRH
```

### 4. Créer un devis + commission auto

```
Pro → /pro/prospects/:id → "Générer devis"
  → Optionnel : IA chiffrage (EF ai-proxy, voir chiffrage-ia.md)
  → quotesApi.create({ prospect_id, amount_cents })
  → Status = 'draft'
  → Envoyer : status = 'sent'
  → Client signe (email/portail) : status = 'signed'
      ↓ Trigger calculate_commission() :
          brh_quotes.commission_cents = amount_cents * commission_rate_percent / 100
      ↓ Trigger update_company_ca() :
          brh_companies.total_ca_apporte += amount_cents
          brh_companies.level = CASE
            WHEN total_ca >= 50_000_000 THEN 'platinum'  -- 500k€
            WHEN total_ca >= 10_000_000 THEN 'gold'      -- 100k€
            WHEN total_ca >= 2_500_000  THEN 'silver'    -- 25k€
            ELSE 'bronze'
          END
      ↓ Trigger calculate_recruitment_commission() :
          Cascade sur chaîne recruteur_id (level 1/2/3) :
          INSERT brh_recruitment_commissions (
            recruiter_company_id = chain[level],
            level,
            commission_cents = base_commission * level_percent
          )
      ↓ Trigger award_affiliate_points() :
          Si prospect apporté par affilié particulier :
          INSERT brh_points_transactions (earned)
```

### 5. Recrutement multi-niveaux

Chaîne de recruteur : `Company A` a recruté `Company B` a recruté `Company C`.
Quand C vend un devis signé :
- Commission directe à C : `amount * C.commission_rate_percent`
- Commission level 1 à B : `base * level1_percent` (ex: 2%)
- Commission level 2 à A : `base * level2_percent` (ex: 1%)

Les pourcentages cascade sont définis dans `brh_platform_settings` (configurables).

## Endpoints API (`src/api/`)

| Module | Fonctions principales |
|--------|----------------------|
| [`companies.ts`](../../src/api/companies.ts) | `list`, `get`, `create`, `update`, `getStats (RPC)` |
| [`company-members.ts`](../../src/api/company-members.ts) | `listByCompany`, `add`, `remove`, `updateRole` |
| [`invitations.ts`](../../src/api/invitations.ts) | ⭐ `create` (invoke `company-invite`), `listByCompany`, `revoke`, `verify` |
| [`prospects.ts`](../../src/api/prospects.ts) | `list`, `get`, `create`, `update`, `remove`, `uploadFile` |
| [`quotes.ts`](../../src/api/quotes.ts) | `list`, `get`, `create`, `update`, `markSigned` |
| [`recruitment.ts`](../../src/api/recruitment.ts) | `listChain`, `listCommissions`, `stats` |

## Hooks React Query

`src/hooks/queries/partners.ts` expose :
- `useCompanies()`, `useCompany(id)`
- `useProspects()`, `useProspect(id)`
- `useQuotes()`, `useQuote(id)`
- `useRecruitmentCommissions()`
- `useCreateProspect()`, `useCreateQuote()`, `useMarkQuoteSigned()` (mutations)
- Toutes les mutations invalident `['dashboard', 'stats']`

## Pages

### Portail Pro (17 pages)
- `/pro/tableau-de-bord` — KPIs : prospects, devis signés, CA apporté, level
- `/pro/prospects` — liste + filtres
- `/pro/prospects/nouveau` — création
- `/pro/prospects/:id` — détail + devis + fichiers + messages
- `/pro/pipeline` — Kanban (status workflow)
- `/pro/devis` — liste devis
- `/pro/devis/:id` — détail devis
- `/pro/commissions` — historique commissions
- `/pro/equipe` — membres entreprise + invitations (⭐ 2026-04-23)
- `/pro/messages` — messagerie avec BRH admin
- `/pro/parrainage` — chaîne recrutement (gated `recruitmentPyramid`)
- `/pro/social` — social posts (gated `socialMediaPosts`)
- `/pro/qr-code` — QR code pro (gated `qrCodeGeneration`)
- `/pro/chiffrage-ia` — IA chiffrage (gated `aiChiffrage`)
- `/pro/assistant-technique` — IA assistant (gated `aiAssistantTechnique`)
- `/pro/rapport-mensuel` — PDF mensuel (gated `monthlyPdfReport`)
- `/pro/stats-equipe` — stats équipe (gated `teamStats`)

### Portail Admin (13 pages)
- `/admin/partenaires` — liste companies
- `/admin/partenaires/:id` — détail company
- `/admin/commissions` — toutes commissions + paiement
- `/admin/prospects` — supervision prospects
- `/admin/devis` — supervision devis
- etc.

## Commission auto — exemple de calcul

Company A (rate 10%, niveau gold) fait signer devis 50 000€ HT :
```
brh_quotes.commission_cents = 50_000 * 100 * 10 / 100 = 500_000 (5 000€)
brh_companies.total_ca_apporte += 5_000_000 (50 000€)

Chaîne recrutement (A recrutée par B recrutée par C) :
brh_recruitment_commissions :
  level 1 (B) : 500_000 * 0.20 = 100_000 (1 000€)
  level 2 (C) : 500_000 * 0.10 = 50_000  (500€)

Si prospect parrainé par particulier P :
brh_points_transactions (P) : earned +500 points
```

## Sécurité

### RLS
- `brh_companies` : SELECT/UPDATE par owner + members. Admin bypass.
- `brh_prospects` : scopé `company_id = get_my_company_id()`
- `brh_quotes` : scopé par company
- `brh_recruitment_commissions` : SELECT par recruiter_company_id

### Storage (`prospect-files`)
Policy : `(storage.foldername(name))[1] = get_my_company_id()::text`

### Règles business
- `commission_rate_percent` : admin only (pas modifiable par pro)
- `level` : calculé auto (read-only pour pro)
- `total_ca_apporte` : calculé auto

## Écarts Blueprint vs Implémentation

Le `PARTNER-PLATFORM.md` initial prévoyait :
- ✅ Schéma complet — implémenté
- ✅ Commissions auto via triggers — implémenté
- ✅ Multi-niveaux cascade — implémenté (level 1/2/3)
- ✅ Kanban pipeline — implémenté (`/pro/pipeline`)
- ✅ CRM sync via EF — implémenté (`crm-sync`)
- ✅ PDF via @react-pdf/renderer — implémenté
- ✅ Email via Resend — implémenté
- 🟡 Multi-membres entreprise — Phase 5 (2026-04-23) via invitations

## Phases d'implémentation

| Phase | Contenu | Statut |
|-------|---------|--------|
| Phase 1 | Schéma + RLS + triggers commission | ✅ DONE |
| Phase 2 | UI portail Pro base (dashboard, prospects, devis) | ✅ DONE |
| Phase 3 | Multi-niveaux + stats + messagerie | ✅ DONE |
| Phase 4 | SIRET + Clerk + admin emails + invitations | ✅ DONE (avril 2026) |
| Phase 5 | Features virales (simulation, leaderboard, cashback) | 🟡 Voir [viral-features.md](viral-features.md) |

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy).
