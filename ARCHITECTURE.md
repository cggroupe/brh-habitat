# Audit Architecture v5 — BRH Habitat

**Date** : 2026-04-14
**Stack** : React 19.2 + Vite 7.3 + TypeScript 5.9 strict + Tailwind CSS 4.2 + Supabase + Zustand 5 + React Query 5.99 + @react-pdf/renderer 4.4 + Sentry 10.48 + Zod 4.3 + i18next 26
**Deploy** : Vercel (SPA) | Sentry (monitoring) | 5 Edge Functions Supabase
**Metriques** : 247 fichiers source | 35 318 LOC | 67 routes | 33 composants + 127 pages | 30 tables DB | 27 migrations | 5 Edge Functions | 14 hooks | 24 modules API | 2 stores Zustand

---

## Resume Executif

BRH Habitat est une plateforme SaaS multi-portails (public, user, admin, pro, particulier) pour la renovation habitat en Bretagne, integrant un systeme de partenariat/affiliation avec IA batiment, gamification, commissions multi-niveaux, et CRM. L'architecture est **bien structuree** avec une separation claire des responsabilites (API layer centralise dans `/api`, hooks React Query, 4 guards d'authentification, feature flags par tenant). La securite RLS couvre 27/27 tables avec des fonctions SECURITY DEFINER pour eviter la recursion circulaire. Les **faiblesses critiques** identifiees : **cache React Query non vide au logout** (fuite de donnees inter-utilisateurs), **11+ invalidations de cache manquantes** (UI desynchronisee), **aucun rate limiting sur les endpoints publics**, **etat diagnostic triple-stocke sans synchronisation**, et **estimated_budget en TEXT au lieu d'INTEGER cents**. Le projet est fonctionnel en production mais necessite des corrections avant montee en charge.

---

## Score de Sante

| Categorie | Score | Details |
|-----------|-------|---------|
| Structure | 9/10 | Organisation exemplaire : feature-based, naming coherent, code splitting avec 49 lazy imports |
| Data Flow | 5/10 | 11+ invalidations manquantes, triple-stockage diagnostic, pas d'optimistic updates, staleTime uniforme |
| Securite | 7/10 | RLS 27/27 tables, SECURITY DEFINER OK, mais pas de rate limiting, cache non vide au logout |
| Permissions | 8/10 | 4 guards + 18 feature flags, mais routes feature-gatees accessibles par URL directe |
| Error Handling | 6/10 | Error Boundary Sentry present, logError() existe mais non utilise dans les hooks, erreurs API generiques |
| TypeScript | 7/10 | Strict mode, mais 32+ `as unknown as`, 7 fichiers avec `as any`, 507 `!` assertions |
| Performance | 7/10 | 49 lazy imports, SW cache, mais images non optimisees, pas de per-query staleTime |
| DX (Developer Experience) | 8/10 | API layer propre, hooks bien structures, types centralises, i18n FR/EN |

**Score global : 7.1/10**

---

## 1. Stack Complete

### Frontend
| Technologie | Version | Usage |
|------------|---------|-------|
| React | 19.2.0 | UI framework |
| React Router | 6.30.3 | Routing SPA |
| TypeScript | 5.9.3 | Typage strict |
| Vite | 7.3.1 | Build tool |
| Tailwind CSS | 4.2.1 | Styling utility-first |
| Zustand | 5.0.11 | State client (2 stores) |
| TanStack React Query | 5.99.0 | State serveur + cache |
| @react-pdf/renderer | 4.4.0 | Generation PDF (rapports, chiffrages) |
| react-markdown | 10.1.0 | Rendu Markdown |
| lucide-react | 1.8.0 | Icones |
| Zod | 4.3.6 | Validation schemas |
| i18next | 26.0.4 | Internationalisation FR/EN |
| @sentry/react | 10.48.0 | Error tracking |

### Backend / BaaS
| Technologie | Usage |
|------------|-------|
| Supabase (PostgreSQL) | Base de donnees + Auth + Storage + Realtime + Edge Functions |
| 5 Edge Functions Deno | ai-proxy, auto-email, chiffrage-prices, crm-sync, send-notification-email |
| Resend | Envoi d'emails transactionnels |

### Deploy
| Service | Configuration |
|---------|--------------|
| Vercel | SPA avec CSP, HSTS 2 ans, X-Frame-Options DENY, Referrer-Policy strict |
| Supabase Cloud | PostgreSQL + Auth + Storage + Edge Functions |

---

## 2. Metriques Detaillees

### Fichiers par section
| Section | Fichiers | LOC |
|---------|----------|-----|
| src/pages | 127 | 21 504 |
| src/components | 33 | 4 249 |
| src/api | 24 | 2 091 |
| src/lib | 11 | 1 960 |
| src/hooks | 14 | 1 335 |
| src/types | 3 | 498 |
| src/config | 6 | 274 |
| src/stores | 2 | 257 |
| src/data | 18 | ~1 150 |
| **TOTAL src/** | **247** | **35 318** |

### Pages par portail
| Portail | Pages | Routes |
|---------|-------|--------|
| Public | 16 | 15 |
| Dashboard (user) | 7 | 7 |
| Admin | 14 | 14 |
| Pro | 16 | 18 |
| Particulier | 13 | 13 |
| **TOTAL** | **66** | **67** |

### Base de donnees
| Categorie | Nombre |
|-----------|--------|
| Tables | 30 |
| Migrations | 27 (2 156 LOC SQL) |
| Policies RLS | 50+ |
| Functions SQL | 12 |
| Triggers | 17 |
| Storage Buckets | 6 |

---

## 3. Architecture des Dossiers

```
src/
├── App.tsx                    # Router principal (49 lazy imports)
├── main.tsx                   # Entry point + Sentry ErrorBoundary + SW register
├── index.css                  # Styles globaux Tailwind
│
├── pages/                     # 127 fichiers — Composants de pages
│   ├── public/                # 16 pages + sous-composants (home/, diagnostic/, article/, contact/)
│   ├── dashboard/             # 7 pages + sous-composants (profil/, logement-detail/, mes-rdv/)
│   ├── admin/                 # 14 pages + sous-composants (admin-articles/, admin-dossier/)
│   ├── pro/                   # 16 pages + sous-composants (pro-messages/, pro-rapport/, pro-social/)
│   └── particulier/           # 13 pages + sous-composants (part-social/)
│
├── components/                # 33 fichiers — Composants reutilisables
│   ├── auth/                  # AuthGuard, AdminGuard, ProGuard, ParticulierGuard
│   ├── layout/                # AppShell, AdminShell, ProShell, ParticulierShell, PublicShell, Navbar, Footer, MobileDrawer, DashboardNav
│   ├── carnet/                # HealthScoreGauge, HealthOverview, HealthDomainCard, HealthTabNavigation, WorkHistoryList, DocumentsList, BretagneAlerts
│   ├── shared/                # CalendarWidget, ChatAI, NotificationBell, PortalMobileNav, FeatureGate
│   ├── ui/                    # AddressAutocomplete, SocialIcons
│   └── pro/                   # MonthlyCAChart, QRCodeDownload
│
├── hooks/                     # 14 fichiers
│   ├── useAuth.ts             # Auth flow complet (login, logout, session)
│   ├── useFeature.ts          # Feature flags
│   ├── useNotifications.ts    # Notifications Realtime
│   ├── queries.ts             # Base queries config
│   └── queries/               # 10 hooks React Query (homes, cases, diagnostics, appointments, articles, profiles, contacts, dashboard, health, partners)
│
├── api/                       # 24 modules — Couche d'abstraction Supabase
│   ├── affiliates, appointments, articles, badges, cases, chiffrages, companies, company-members
│   ├── contacts, dashboard, diagnostics, health-records, home-documents, homes
│   ├── partner-messages, partner-notifications, profiles, prospects, quotes
│   ├── recruitment, rewards, schemas (Zod), social-posts, work-history
│
├── stores/                    # 2 stores Zustand
│   ├── appStore.ts            # user, locale, drawerOpen (localStorage manuel)
│   └── diagnosticStore.ts     # Draft diagnostic multi-etapes (persist IndexedDB)
│
├── lib/                       # 11 utilitaires
│   ├── supabase.ts            # Client singleton
│   ├── ai.ts, aides-engine.ts, diagnostic-engine.ts, renovation-plan-engine.ts  # Moteurs metier
│   ├── chiffrage-pdf.tsx, rapport-pdf.tsx  # Generation PDF
│   ├── error.ts, notify.ts, referral.ts, utils.ts  # Helpers
│
├── types/                     # database.ts, partner.ts, index.ts
├── config/                    # TenantContext, tenant.ts, tenant.types.ts, tier-presets.ts, tenants/brh.ts
├── i18n/                      # fr.json, en.json, index.ts
└── data/                      # articles/ (12 fichiers), seo-strategy.ts, health-impacts.ts, constants

supabase/
├── migrations/                # 27 fichiers SQL (2026-02-27 → 2026-04-14)
├── functions/                 # 5 Edge Functions + _shared/cors.ts
│   ├── ai-proxy/              # Proxy IA Claude (public visiteur + auth pro/chiffrage)
│   ├── auto-email/            # Emails auto sur changement statut prospect (admin only)
│   ├── chiffrage-prices/      # Recherche prix depuis BRHCRM (public)
│   ├── crm-sync/              # Sync prospect → CRM externe (service_key)
│   └── send-notification-email/  # Emails transactionnels (service_key)
└── .temp/                     # Metadata dev local
```

---

## 4. Routing & Permissions

### 4.1 Routes completes (67 total)

#### Routes publiques (15) — `<PublicShell>` sans auth
| Route | Composant |
|-------|-----------|
| `/` | HomePage |
| `/services` | ServicesPage |
| `/diagnostic` | DiagnosticPage |
| `/diagnostic/resultats/local` | DiagnosticResultsPage |
| `/diagnostic/resultats/:id` | DiagnosticResultsPage |
| `/articles` | ArticlesPage |
| `/articles/:slug` | ArticlePage |
| `/contact` | ContactPage |
| `/connexion` | LoginPage |
| `/inscription` | RegisterPage |
| `/inscription/pro` | RegisterProPage |
| `/inscription/particulier` | RegisterParticulierPage |
| `/partenaires` | PartenairesPage |
| `/assistant` | AssistantPage |
| `/mentions-legales`, `/politique-de-confidentialite` | Pages legales |

#### Routes User (7) — `<AuthGuard>` (isAuthenticated)
`/tableau-de-bord`, `/mes-logements`, `/mes-logements/:id`, `/mes-dossiers`, `/mes-dossiers/:id`, `/mes-rdv`, `/profil`

#### Routes Admin (14) — `<AdminGuard>` (role === 'admin')
`/admin`, `/admin/logements`, `/admin/dossiers`, `/admin/dossiers/:id`, `/admin/rdv`, `/admin/messages`, `/admin/articles`, `/admin/utilisateurs`, `/admin/partenaires`, `/admin/prospects`, `/admin/commissions`, `/admin/catalogue`, `/admin/parametres`, `/admin/publications`

#### Routes Pro (18) — `<ProGuard>` (role === 'pro' || 'admin') + Feature Flags
`/pro`, `/pro/prospects`, `/pro/prospects/nouveau`, `/pro/prospects/:id`, `/pro/commissions`, `/pro/equipe`, `/pro/messages`, `/pro/profil`, `/pro/reseaux-sociaux`, `/pro/qrcode`, `/pro/vendeurs`, `/pro/assistant`, `/pro/chiffrage`, `/pro/chiffrages`, `/pro/stats-equipe`, `/pro/rapport`

#### Routes Particulier (13) — `<ParticulierGuard>` (role === 'particulier' || 'admin') + Feature Flags
`/particulier`, `/particulier/parrainages`, `/particulier/parrainages/nouveau`, `/particulier/catalogue`, `/particulier/points`, `/particulier/messages`, `/particulier/reseaux-sociaux`, `/particulier/simulateur`, `/particulier/vendeurs`, `/particulier/assistant`, `/particulier/chiffrage`, `/particulier/chiffrages`, `/particulier/badges`

### 4.2 Systeme de permissions

**Roles (4)** : `user`, `admin`, `pro`, `particulier`

**Feature Flags (18)** : portalPro, portalParticulier, aiChiffrage, aiAssistantTechnique, recruitmentPyramid, socialMediaPosts, badgesGamification, catalogueCadeaux, qrCodeGeneration, monthlyPdfReport, notifications, crmWebhook, emailNotifications, simulationLinks, teamStats, publicDiagnostic, publicArticles, publicAssistantAI

**Protection** :
- Routes : 4 guards React Router (AuthGuard, AdminGuard, ProGuard, ParticulierGuard)
- Features : `<FeatureGate>` et `<FeatureRoute>` dans les Shells
- Navigation : Liens filtres par role + feature flags dans ProShell/ParticulierShell

---

## 5. Schema Base de Donnees (30 tables)

### Tables principales

| Table | Colonnes cles | Relations |
|-------|--------------|-----------|
| `profiles` | id (PK→auth.users), email, full_name, role, avatar_url, locale, is_active, phone | Parent de tout |
| `brh_homes` | id, user_id (FK), address, city, postal_code, surface, year_built, health_score | → profiles, ← brh_cases, ← brh_health_records |
| `brh_diagnostics` | id, user_id (FK), types[], property_type, status, current_step, equipment (JSONB), referral_code | → profiles |
| `brh_cases` | id, user_id (FK), home_id (FK), diagnostic_id (FK), title, work_types[], status, estimated_budget | → profiles, → brh_homes, → brh_diagnostics |
| `brh_appointments` | id, user_id (FK), case_id (FK), home_id (FK), type, requested_date, status, contact_* | → profiles, → brh_cases, → brh_homes |
| `brh_articles` | id, slug (UNIQUE), title, content, category, tags[], published, seo_* | Independante |
| `brh_contacts` | id, nom, email, telephone, sujet, message, status | Independante |

### Tables Partenaire/Affilie

| Table | Role |
|-------|------|
| `brh_companies` | Entreprises partenaires (level bronze→platinum, commission_rate) |
| `brh_company_members` | Membres d'entreprise (owner/member) |
| `brh_affiliates` | Affilies particuliers (referral_code, short_code, points, level) |
| `brh_prospects` | Leads soumis par pro/particulier |
| `brh_prospect_files` | Fichiers joints aux prospects |
| `brh_quotes` | Devis avec calcul commission automatique (trigger) |
| `brh_points_transactions` | Historique points (immutable) |
| `brh_recruitment_commissions` | Commissions multi-niveaux (jusqu'a 5 niveaux) |

### Tables Gamification & Social

| Table | Role |
|-------|------|
| `brh_rewards_catalog` | Catalogue cadeaux |
| `brh_reward_claims` | Demandes de cadeaux |
| `brh_badges` | 12 badges predefinis |
| `brh_user_badges` | Badges debloques |
| `brh_social_posts` | Publications social media |
| `brh_simulation_shares` | Partages simulation |
| `brh_simulation_leads` | Leads depuis simulations |

### Tables Support

| Table | Role |
|-------|------|
| `brh_message_threads` | Fils de discussion interne |
| `brh_messages` | Messages (avec attachments) |
| `brh_notifications` | Notifications (Realtime) |
| `brh_health_records` | Carnet de sante du batiment |
| `brh_work_history` | Historique travaux |
| `brh_home_documents` | Documents du logement |
| `brh_chiffrages` | Chiffrages/devis IA |
| `brh_platform_settings` | Settings singleton (1 row) |

### Colonnes monetaires

| Table.Colonne | Type | Status |
|--------------|------|--------|
| `brh_quotes.amount` | INTEGER (cents) | OK |
| `brh_quotes.commission_amount` | INTEGER (cents) | OK |
| `brh_chiffrages.total_ht/tva/ttc` | INTEGER (cents) | OK |
| `brh_rewards_catalog.value_cents` | INTEGER (cents) | OK |
| `brh_social_posts.reward_amount_cents` | INTEGER (cents) | OK |
| `brh_prospects.estimated_budget` | **TEXT** | **BUG** — Devrait etre INTEGER cents |
| `brh_work_history.cost` | **NUMERIC** | **INCONSISTANT** — Devrait etre INTEGER cents |

---

## 6. RLS — Row Level Security

### Couverture : 27/27 tables protegees

### Fonctions SECURITY DEFINER (5)
- `is_admin()` — Retourne BOOLEAN (stable, search_path = '')
- `is_pro()` — Retourne BOOLEAN
- `get_my_role()` — Retourne TEXT role
- `get_my_company_id()` — Retourne UUID company
- `find_profile_by_email(text)` — Recherche profil (evite recursion RLS)

### Matrice RLS simplifiee

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own + admin | trigger auth.users | Own (sauf role) + admin | N/A |
| brh_homes | Own + admin | Own | Own + admin | Own + admin |
| brh_diagnostics | Own + admin | Auth | Own + admin | CASCADE |
| brh_cases | Own + admin | Own | Own + admin | CASCADE |
| brh_appointments | Own + admin | Auth | Own + admin | CASCADE |
| brh_articles | Published OR admin | N/A | N/A | N/A |
| brh_contacts | N/A | Auth (uid NOT NULL) | N/A | N/A |
| brh_companies | company_member OR admin | Pro (owner) | Owner + admin | N/A |
| brh_prospects | company/affiliate + admin | Pro/part (source_type) | N/A | N/A |
| brh_quotes | company/affiliate + admin | N/A (trigger) | N/A | N/A |
| brh_social_posts | Submitter + admin | Submitter (uid check) | N/A | Admin |
| brh_simulation_leads | Affiliate + admin | **PUBLIC (true)** | N/A | Admin |
| brh_platform_settings | Admin only | N/A | Admin | Admin |
| brh_notifications | Recipient | System | Recipient (mark read) | Admin |
| brh_messages | Participant/sender + admin | Sender | Participant (mark read) | Admin |

### Points d'attention RLS
- `brh_simulation_leads` INSERT WITH CHECK (true) — Intentionnel pour tracking public mais necessite rate limiting
- `brh_contacts` corrige de `true` a `auth.uid() IS NOT NULL` (migration fix_qa_bugs)
- `brh_platform_settings` corrige de auth → admin only (migration fix_qa_bugs)

---

## 7. Edge Functions

| Fonction | Auth | Rate Limit | Input Validation | Timeout | CORS |
|----------|------|-----------|------------------|---------|------|
| ai-proxy | Partiel (visiteur=public, pro=JWT) | **NON** | Sanitization mode + search | **NON** | Whitelist 3 origines |
| auto-email | Admin (JWT + role check) | **NON** | prospect_id + status | **NON** | Whitelist |
| chiffrage-prices | **AUCUN** (public) | **NON** | Category mapping + limit 50 | **NON** | Whitelist |
| crm-sync | SERVICE_KEY only | **NON** | prospect_id | **NON** | Whitelist |
| send-notification-email | SERVICE_KEY only | **NON** | recipient_id + subject + html | **NON** | Whitelist |

---

## 8. State Management & Data Flow

### Stores Zustand

**appStore** : `user` (User|null), `locale` ('fr'|'en'), `drawerOpen` (boolean)
- Persistence : localStorage manuelle avec cle tenant-prefixed
- Probleme : locale non persistee, drawerOpen non reset au logout

**diagnosticStore** : Draft diagnostic multi-etapes (5 steps), persist IndexedDB
- Probleme : Triple stockage (Zustand + React Query + Supabase) sans mecanisme de sync

### React Query Config

```typescript
staleTime: 5 * 60 * 1000    // 5 min (uniforme — trop long pour data user)
retry: 1
refetchOnWindowFocus: false
gcTime: 5 min (default)     // Non configure explicitement
```

### Invalidations manquantes (CRITIQUE)

| Mutation | Invalidation manquante | Impact |
|----------|----------------------|--------|
| `useUpdateProspect()` | `['prospects', 'stats', companyId]` | Stats widget ne se met pas a jour |
| `useUpdateAppointment()` | Detail setQueryData + list | UI ne reflete pas le changement |
| `useCreateQuote()` | `['companies', 'stats', companyId]` | Stats entreprise desynchronisees |
| `useCreateRewardClaim()` | `['points', 'history']` + `['rewards', 'claims']` | Points/claims non mis a jour |
| `useUpdateCommissionStatus()` | `['companies', 'stats', companyId]` | Stats commission incorrectes |
| `useUpdateSocialPostStatus()` | `['social-posts', 'monthly-count']` | Compteur mensuel incorrect |
| `useInviteMember()` / `useRemoveMember()` | Stats entreprise | Nombre membres desynchronise |
| `useCreateReward()` | `['rewards', 'catalog', activeOnly]` | Catalogue incomplet |
| Toutes mutations dashboard | `['dashboard', 'stats']` | Dashboard affiche donnees obsoletes |

### Probleme critique : Logout

```
ACTUEL:
signOut() → supabase.auth.signOut() → setUser(null) → diagnosticStore.reset()

MANQUANT:
- queryClient.clear()          → Donnees User A restent en cache pour User B
- appStore locale reset         → Mauvaise langue
- appStore drawerOpen reset     → Drawer ouvert au login suivant
- Referral code non nettoye     → Code affilie persistant
```

### Realtime

Seul `useNotifications` utilise Supabase Realtime (INSERT only). Les messages, prospects, et autres donnees frequemment mises a jour ne beneficient pas du temps reel.

---

## 9. Findings

### CRITIQUE (bloquants avant montee en charge)

**C1 — Cache React Query non vide au logout**
- Fichier : `src/hooks/useAuth.ts:103-112`
- Impact : Fuite de donnees entre utilisateurs (User A → User B voit cache stale)
- Fix : Ajouter `queryClient.clear()` dans signOut() + reset complet de tous les stores

**C2 — 11+ invalidations de cache manquantes**
- Fichiers : `src/hooks/queries/partners.ts`, `appointments.ts`, `dashboard.ts`
- Impact : UI desynchronisee apres mutations — l'utilisateur ne voit pas ses changements
- Fix : Ajouter les invalidations specifiques listees dans la section 8

**C3 — Aucun rate limiting sur endpoints publics**
- Fichiers : `supabase/functions/ai-proxy/index.ts`, `chiffrage-prices/index.ts`
- Impact : Abus/DDoS possible, couts API Claude non controles
- Fix : Implementer rate limiting (Cloudflare, pg-rate-limiter, ou middleware Deno)

**C4 — brh_simulation_leads INSERT WITH CHECK (true)**
- Fichier : Migration `viral_features.sql`
- Impact : N'importe qui peut inserer des leads sans authentification
- Fix : Ajouter rate limiting + CAPTCHA ou restricter a anon key seulement

**C5 — Etat diagnostic triple-stocke sans sync**
- Fichiers : `src/stores/diagnosticStore.ts`, `src/hooks/queries/diagnostics.ts`, `src/api/diagnostics.ts`
- Impact : Perte de donnees, conflit entre Zustand (IndexedDB) et Supabase
- Fix : Source unique de verite (Supabase), Zustand en memoire seulement

### HAUT (risque important)

**H1 — estimated_budget en TEXT au lieu d'INTEGER cents**
- Table : `brh_prospects.estimated_budget`
- Impact : Calculs impossibles, tri incorrect, injection potentielle
- Fix : `ALTER TABLE brh_prospects ALTER COLUMN estimated_budget TYPE INTEGER USING 0`

**H2 — brh_work_history.cost en NUMERIC au lieu d'INTEGER cents**
- Table : `brh_work_history.cost`
- Impact : Inconsistance avec le reste du schema (tout en cents)
- Fix : Migration vers INTEGER cents

**H3 — Routes feature-gatees accessibles par URL directe**
- Fichier : `src/App.tsx`
- Impact : Un user pro peut acceder a `/pro/chiffrage` meme si aiChiffrage=false via URL
- Fix : Wrapper chaque route feature-gatee avec `<FeatureRoute>`

**H4 — ContactRdvModal sans protection double-soumission**
- Fichier : `src/components/ContactRdvModal.tsx:123-145`
- Impact : Soumissions multiples possibles
- Fix : Ajouter `disabled={mutation.isPending}` sur le bouton submit

**H5 — RequestModal date avec toISOString().split('T')[0]**
- Fichier : `src/pages/dashboard/mes-rdv/RequestModal.tsx:25`
- Impact : Date incorrecte pres de minuit selon timezone (bug documente dans MEMORY)
- Fix : Utiliser `formatLocalDate()` de lib/utils.ts

**H6 — Pas de timeout sur crm-sync Edge Function**
- Fichier : `supabase/functions/crm-sync/index.ts`
- Impact : Connexion qui hang indefiniment, pool exhaustion
- Fix : Ajouter `signal: AbortSignal.timeout(30000)` au fetch

**H7 — Trigger auto-creation affilie manquant**
- Fichier : Migration `fix_handle_new_user_role.sql`
- Impact : Signup pro/particulier ne cree pas automatiquement l'entree brh_affiliates
- Fix : Ajouter INSERT brh_affiliates dans handle_new_user() pour role particulier

**H8 — logError() non utilise dans les hooks React Query**
- Fichiers : Tous les hooks dans `src/hooks/queries/`
- Impact : Erreurs silencieuses, pas de remontee Sentry
- Fix : Ajouter `onError: (err) => logError(err)` dans les mutations

### MOYEN (a planifier)

**M1 — 32+ `as unknown as` dans l'API layer**
- Fichiers : `src/api/affiliates.ts:54`, `partner-messages.ts:16-26`, `social-posts.ts`, `rewards.ts`
- Impact : Perte de type safety aux frontieres API
- Fix : Remplacer par validation Zod (schemas.ts existe deja)

**M2 — staleTime uniforme 5 min pour toute l'app**
- Fichier : `src/App.tsx:93-101`
- Impact : Donnees user potentiellement obsoletes, articles sur-fetchees
- Fix : staleTime 1 min pour data user, 30 min pour articles publics

**M3 — Aucun optimistic update implemente**
- Impact : Chaque mutation bloque l'UI jusqu'a reponse serveur
- Fix prioritaire : Prospect status change, message send, notification mark-read

**M4 — Modals ne lockent pas le scroll du background**
- Fichiers : Toutes les modals (25+ fichiers avec z-[60])
- Fix : useEffect avec `document.documentElement.style.overflow = 'hidden'`

**M5 — Service Worker ne cache que HTML**
- Fichier : `public/sw.js:2`
- Impact : CSS/JS non caches, PWA offline degradee
- Fix : Ajouter les bundles Vite au STATIC_ASSETS

**M6 — Pas de soft delete (GDPR)**
- Impact : Suppression definitive sans audit trail
- Fix : Ajouter `is_deleted`, `deleted_at` sur les tables avec donnees personnelles

**M7 — Images non optimisees**
- Impact : 127 references images sans lazy loading, WebP, ou srcset
- Fix : `loading="lazy"` systematique + format WebP

**M8 — Profondeur recursion CTE inconsistante**
- Fichier : `get_full_recruit_tree()` utilise LIMIT 10 mais settings dit max 5
- Fix : Utiliser `recruitment_max_levels` de brh_platform_settings

### BAS (ameliorations)

**B1 — 507 non-null assertions (!)**
- La majorite sont safe dans le contexte React, mais preference pour optional chaining

**B2 — Duplication code admin pages**
- AdminArticles, AdminCatalogue, AdminCommissions partagent un pattern table+modal identique
- Refactorer en composant generique `AdminCrudPage`

**B3 — Locale non persistee**
- appStore.locale perd la preference utilisateur au refresh
- Persister dans localStorage comme user

**B4 — Notifications Realtime INSERT only**
- useNotifications ne gere pas UPDATE/DELETE en temps reel
- Ajouter event: '*' ou au minimum 'UPDATE'

**B5 — TEXT+CHECK au lieu de PostgreSQL ENUM**
- Tous les champs status/role utilisent TEXT avec CHECK constraint
- Migration vers ENUM pour performance (pas bloquant)

**B6 — Pas de test automatises**
- 0 fichiers de test detectes
- Priorite : Tests E2E Playwright sur les formulaires critiques

---

## 10. Regles Anti-Bug

**Ces regles doivent etre suivies IMPERATIVEMENT avant chaque modification :**

1. **JAMAIS `toISOString().split('T')[0]`** pour les dates locales. Toujours utiliser `formatLocalDate()` de `lib/utils.ts`.

2. **Toute mutation React Query DOIT invalider les queries dependantes.** Avant de coder un `useMutation`, lister TOUTES les queries qui affichent la meme donnee et les invalider dans `onSuccess`.

3. **Montants TOUJOURS en INTEGER cents.** Jamais de DECIMAL, NUMERIC, FLOAT, ou TEXT pour de l'argent. Division par 100 uniquement a l'affichage.

4. **Chaque formulaire DOIT avoir `disabled={mutation.isPending}`** sur le bouton submit pour prevenir la double-soumission.

5. **JAMAIS de `* { margin: 0 }` sans `@layer base { }`** en Tailwind CSS 4. Utiliser `--font-*` (pas `--font-family-*`).

6. **JAMAIS de `SELECT FROM profiles` dans une policy RLS sur `profiles`.** Utiliser une fonction `SECURITY DEFINER` (`is_admin()`, `get_my_role()`).

7. **Charger le profil dans `signIn()` directement**, pas dans `onAuthStateChange`. `isLoading: false` au demarrage du store.

8. **Au logout, TOUJOURS** : `queryClient.clear()` + reset ALL Zustand stores + clear localStorage.

9. **Chaque modal DOIT** : verrouiller le scroll body, utiliser z-[60] minimum, reset son state interne onClose.

10. **Z-index convention** : BottomNav/PortalMobileNav z-[61], modals z-[60], toasts z-[70], overlays z-[50].

11. **Toute Edge Function publique DOIT avoir du rate limiting** (meme basique via headers X-RateLimit).

12. **Les feature flags doivent proteger les ROUTES en plus de la navigation.** Utiliser `<FeatureRoute>` dans App.tsx, pas juste masquer le lien.

13. **TOUJOURS incrementer `CACHE_NAME` dans sw.js** apres chaque deploy (actuellement `brh-habitat-v1`).

14. **Pas de `as any` dans le code.** Utiliser Zod pour valider les reponses Supabase aux frontieres.

15. **Chaque hook React Query avec `enabled` DOIT verifier** que le parametre n'est ni null ni undefined avant de fetch.

---

## 11. Checklist Pre-Modification

### Avant de toucher a un hook React Query (`src/hooks/queries/`)
- [ ] Lister TOUTES les queries qui dependent de la meme table
- [ ] Verifier que `onSuccess` invalide ces queries
- [ ] Verifier que `enabled` a une condition valide
- [ ] Ajouter `onError: (err) => logError(err)` si absent
- [ ] Tester : mutation → UI met a jour sans refresh manuel ?

### Avant de toucher a une page/composant
- [ ] Verifier le guard de la route dans App.tsx
- [ ] Verifier le feature flag si applicable
- [ ] Verifier z-index si c'est une modal (z-[60])
- [ ] Verifier double-submission protection sur les formulaires

### Avant de toucher a une migration SQL
- [ ] Verifier que RLS est active sur toute nouvelle table
- [ ] Ajouter policies SELECT/INSERT/UPDATE/DELETE
- [ ] Utiliser `SECURITY DEFINER` si la policy reference `profiles`
- [ ] Ajouter des index sur les FK et colonnes filtrees
- [ ] Montants en INTEGER (cents), pas DECIMAL/TEXT
- [ ] Tester avec `auth.uid()` simule

### Avant de toucher a une Edge Function
- [ ] Verifier l'authentification (JWT ou service_key)
- [ ] Valider les inputs (types, bornes)
- [ ] Gestion d'erreurs try/catch avec codes HTTP corrects
- [ ] Headers CORS via `_shared/cors.ts`
- [ ] Pas de secrets hardcodes
- [ ] Timeout sur les fetch externes

### Avant de deployer
- [ ] Incrementer `CACHE_NAME` dans `public/sw.js`
- [ ] Verifier `vercel.json` CSP si nouveaux domaines
- [ ] Verifier que les nouvelles tables ont RLS + policies
- [ ] Pas de `console.log` en production

---

## 12. Carte des Dependances Critiques

### Si on touche a... il faut verifier...

| Fichier modifie | Fichiers dependants a verifier |
|----------------|-------------------------------|
| `src/types/database.ts` | TOUS les fichiers `src/api/*.ts` + `src/hooks/queries/*.ts` |
| `src/types/partner.ts` | `src/hooks/queries/partners.ts` + toutes les pages pro/ et particulier/ |
| `src/lib/supabase.ts` | Tout le projet (singleton importe partout) |
| `src/stores/appStore.ts` | `useAuth.ts`, tous les layouts (Navbar, Shells), toutes les pages |
| `src/stores/diagnosticStore.ts` | `DiagnosticPage.tsx`, `DiagnosticResultsPage.tsx`, `useAuth.ts` (cleanup) |
| `src/hooks/useAuth.ts` | Login/Register pages, tous les guards, tous les layouts |
| `src/hooks/queries/partners.ts` | 16 pages pro/ + 13 pages particulier/ + admin/partenaires + admin/commissions |
| `src/hooks/queries/homes.ts` | MesLogements, LogementDetail, AdminLogements, composants carnet/ |
| `src/config/tenant.types.ts` | TenantContext, tenant.ts, tous les FeatureGate/FeatureRoute |
| `src/config/tenants/brh.ts` | Toute la config tenant (feature flags, couleurs, textes) |
| `src/components/auth/*Guard.tsx` | App.tsx (routes protegees) |
| `src/components/layout/*Shell.tsx` | Toutes les pages du portail correspondant |
| `supabase/functions/_shared/cors.ts` | Les 5 Edge Functions |
| Migration RLS | Types frontend + API calls + hooks queries |

### Couplages forts (modifier ensemble)

1. **`database.ts` ↔ `api/*.ts` ↔ `hooks/queries/*.ts`** — Le type DB drive tout le data flow
2. **`appStore.user` ↔ `useAuth.ts` ↔ `*Guard.tsx`** — La session drive la navigation
3. **`tenant.types.ts` ↔ `brh.ts` ↔ `FeatureGate/FeatureRoute`** — Les features drives les routes
4. **`profiles` table ↔ `handle_new_user()` trigger ↔ `is_admin()`/`get_my_role()`** — Le role drive les RLS
5. **`brh_quotes` INSERT ↔ 3 triggers** (commission, CA, points) — Un INSERT quote declenche 3 side-effects

---

## 13. Triggers & Business Logic (17 triggers)

### Triggers metier critiques

| Trigger | Table | Event | Fonction | Effet |
|---------|-------|-------|----------|-------|
| on_auth_user_created | auth.users | AFTER INSERT | handle_new_user() | Cree profil + set role |
| trigger_calculate_commission | brh_quotes | BEFORE INSERT | calculate_commission() | Auto-calcul commission_amount |
| trigger_update_company_ca | brh_quotes | AFTER INSERT | update_company_ca() | MAJ total_ca + level entreprise |
| trigger_award_affiliate_points | brh_quotes | BEFORE INSERT | award_affiliate_points() | Credits points affilie |
| trigger_calculate_lead_score | brh_prospects | BEFORE INSERT/UPDATE | calculate_lead_score() | Score 0-65 automatique |
| trigger_recruitment_commission | brh_quotes | AFTER INSERT | calculate_recruitment_commission() | Commissions multi-niveaux (5 levels LOOP) |

**Attention** : Un seul INSERT dans `brh_quotes` declenche 4 triggers (calculate_commission → update_company_ca → award_affiliate_points → recruitment_commission). Ordre d'execution : BEFORE (commission, points) puis AFTER (CA, recruitment).

---

## 14. Fonctionnalites Detectees

1. **Diagnostic Habitat IA** — Guide multi-etapes (5 steps) avec moteur diagnostic
2. **Carnet de Sante Batiment** — Score sante, historique travaux, documents, alertes Bretagne
3. **Portail Partenaire Pro** — Prospects, commissions, equipe, messages, chiffrage IA, stats
4. **Portail Affilie Particulier** — Parrainages, points, catalogue cadeaux, badges, simulation
5. **Gamification** — 12 badges, niveaux (standard→VIP), points, leaderboard
6. **Commissions Multi-Niveaux** — Pyramide recrutement jusqu'a 5 niveaux avec % degressif
7. **Chiffrage IA** — Devis assistes par IA avec base prix BRHCRM + export PDF
8. **Publications Social Media** — Soumission/validation de posts avec recompenses
9. **CRM Sync** — Synchronisation prospects vers CRM externe avec retry
10. **Emails Automatiques** — Templates par statut prospect (Resend)
11. **Multi-Tenant** — Architecture tenant configurable (brh.ts + template.ts)
12. **i18n** — Francais/Anglais
13. **PWA** — Manifest + Service Worker + offline fallback
14. **Admin Complet** — Dashboard, gestion utilisateurs/partenaires/articles/parametres

---

*Audit realise le 2026-04-14 par Claude Opus 4.6. 247 fichiers analyses, 35 318 LOC, 27 migrations SQL, 5 Edge Functions, 50+ policies RLS.*
