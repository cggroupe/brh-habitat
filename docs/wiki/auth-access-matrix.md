# Auth & Access Matrix — Source de vérité (2026-05-08)

> **Pattern Karpathy LLM Wiki** — Page consolidée après refonte 4 personas (Phases A → D + ménage + Phase E nettoyage RGE). Décrit qui peut faire quoi, qui clique où, et où on peut aller depuis n'importe quel point.
>
> **⚠️ MAJ Phase E (2026-05-08 fin journée)** — Suppression du système "Pro RGE distinct". Il n'y a désormais qu'**un seul type Professionnel** qui peut tout faire (prospection + chantiers + propositions). RGE devient un attribut profil optionnel, pas un type de compte. Les routes `/pro/missions`, `/pro/agenda`, `/pro/factures-brh`, `/pro/profil-rge` sont supprimées. Question RGE à l'inscription supprimée. Groupe "Activité RGE" dans ProShell supprimé. Le portail `/artisan/*` reste accessible en legacy (rétrocompat magic link historique) mais n'est plus la cible préférée.
>
> Source : `src/App.tsx` (78 routes), `src/components/auth/*Guard.tsx` (8 guards), `src/components/layout/*Shell.tsx` (8 shells), `src/pages/public/Register*.tsx` + `LoginPage.tsx`.
>
> **Mise à jour obligatoire** : toute modification de routes / guards / shells / pages d'inscription doit re-vérifier cette page et la corriger si besoin.

---

## 1. Personas (8 profils utilisateur — post Phase Employé V2)

| # | Persona | Marqueur DB primaire | Marqueurs DB secondaires |
|---|---------|---------------------|---------------------------|
| 1 | **Visiteur** | non authentifié | — |
| 2 | **Particulier classique** | `profiles.role='particulier'` | `brh_affiliates` auto-créé (trigger) — aucun parrainage signé |
| 3 | **Particulier affilié engagé** | `profiles.role='particulier'` | `brh_affiliates` avec ≥1 prospect parrainé status `signe`/`termine` |
| 4 | **Professionnel** (BTP, RGE ou non) | `profiles.role='pro'` | `brh_companies.owner_id` — peut faire prospection + chantiers + propositions |
| 5 | **Artisan legacy** | aucun `brh_companies` | `brh_artisans_rge.profile_id` (onboarding magic link historique — déprécié) |
| 6 | **Agence immobilière** | `profiles.role='pro'` | `brh_partner_contracts.signer_profile_id` avec `partner_type='agence_immo'` + `status='active'` |
| 7 | **Employé BRH** ⭐ | `profiles.role='admin'` (V1) | Email présent dans cache `lib/brh-employees.ts` hydraté depuis `brh_employees` DB (`is_active=true`) — fallback seed statique pour dev |
| 8 | **Admin** | `profiles.role='admin'` | sans entrée dans `brh_employees` |

**Suppressions Phase E** : "Pro RGE" et "User legacy" retirés de la matrice :
- Pro RGE = simple Professionnel (RGE est un attribut profil optionnel, pas un persona). La table `brh_artisans_rge` reste utilisée par le marketplace (`/pro/marketplace-artisans`) pour suggérer des artisans certifiés à des clients.
- User legacy (`role='user'`) = à migrer one-shot vers `role='particulier'` (anomalie connue, voir Section 6).

Notes :
- **Pro et Agence partagent `role='pro'`** : la distinction se fait via les tables membership (`brh_companies` vs `brh_partner_contracts`). C'est intentionnel (flexibilité) mais ça oblige le LoginPage à faire 4 queries au login.
- **Tous les particuliers ont `brh_affiliates`** (auto-créé par trigger `handle_new_user`). Le statut "engagé" se déduit du nombre de prospects parrainés signés, pas d'une colonne dédiée.

---

## 2. Matrice d'accès routes × personas

Légende : ✅ accès · 🔄 redirect (avec destination) · ❌ 404 · ✅* feature gate (selon tenant config) · 🛡️ permission gate (selon brh_permissions)

### 2.1 Routes publiques (PublicShell, aucun guard) — 24 routes

Toutes accessibles à TOUS les personas (✅ partout). Liste exhaustive :

```
/, /services, /diagnostic, /diagnostic-express, /diagnostic/resultats/local,
/diagnostic/resultats/:id, /artisan/onboarding/:token (magic link),
/articles, /articles/:slug, /contact, /connexion, /inscription, /inscription/particulier,
/inscription/pro, /inscription/pro/rejoindre, /inscription/agence, /partenaires,
/assistant, /mentions-legales, /politique-de-confidentialite, /opt-out,
/pros/:dept/:metier (annuaire SEO), /a/:agenceId (vitrine agence),
* (404 catch-all)
```

### 2.2 Routes auth génériques (AppShell + AuthGuard) — 8 routes

Tous les rôles authentifiés ont accès en théorie, mais en pratique les portails spécialisés redirigent vers leur shell dédié.

| Route | Visiteur | Particulier | Pro | Agence | Admin |
|-------|----------|-------------|-----|--------|-------|
| `/tableau-de-bord` | 🔄 `/connexion` | ✅ | ✅ | ✅ | ✅ |
| `/mes-logements`, `/mes-dossiers`, `/mes-rdv`, `/profil`, `/audit-energetique/:id` | 🔄 `/connexion` | ✅ | ✅ | ✅ | ✅ |

**Attention** : ces routes ne redirigent PAS vers le portail spécialisé. Un Pro authentifié qui tape `/mes-logements` à la main y a accès. C'est la responsabilité du LoginPage de rediriger immédiatement vers `/pro` après auth.

### 2.3 Routes Pro (ProShell + ProGuard) — 29 routes

Guard : `role IN ('pro', 'admin')`. **Phase E (08/05 fin)** — Suppression des 4 alias RGE (`/pro/missions`, `/pro/agenda`, `/pro/factures-brh`, `/pro/profil-rge`) car le système "Pro RGE distinct" a été supprimé.

| Route | Professionnel | Artisan legacy | Agence | Admin | Particulier |
|-------|---------------|----------------|--------|-------|-------------|
| `/pro` | ✅ | 🔄 `/tableau-de-bord` | 🔄 `/tableau-de-bord` | ✅ | 🔄 `/tableau-de-bord` |
| `/pro/prospects[/...]`, `/pro/audits[/...]`, `/pro/equipe`, `/pro/messages`, `/pro/profil`, `/pro/terrain`, `/pro/marketplace-artisans`, `/pro/prospects-bretagne`, `/pro/prospects-carte` | ✅ | 🔄 | 🔄 | ✅ | 🔄 |
| `/pro/commissions`, `/pro/analytics`, `/pro/abonnement`, `/pro/rapport`, `/pro/mes-leads-artisans` | 🛡️ `canViewFinance` | 🔄 | 🔄 | 🛡️ | 🔄 |
| `/pro/reseaux-sociaux`, `/pro/qrcode`, `/pro/vendeurs`, `/pro/stats-equipe`, `/pro/ia[/historique]` | ✅* feature | 🔄 | 🔄 | ✅* | 🔄 |
| `/pro/chiffrage`, `/pro/chiffrages`, `/pro/assistant` (legacy) | 🔄 `/pro/ia[?mode=...]` | 🔄 | 🔄 | 🔄 | 🔄 |

**Note** : les chantiers proposés par d'autres pros / agences / architectes sont sur `/reseau/chantiers` (marketplace Phase 18, accessible aux Pros via Phase D).

### 2.4 Routes Particulier (ParticulierShell + ParticulierGuard) — 14 routes

Guard : `role IN ('particulier', 'admin')`.

| Route | Particulier | Pro | Agence | Admin |
|-------|-------------|-----|--------|-------|
| `/particulier`, `/particulier/profil`, `/particulier/parrainages[/nouveau]`, `/particulier/messages`, `/particulier/points`, `/particulier/statut` | ✅ | 🔄 `/tableau-de-bord` | 🔄 | ✅ |
| `/particulier/catalogue`, `/particulier/reseaux-sociaux`, `/particulier/simulateur`, `/particulier/vendeurs`, `/particulier/ia[/historique]`, `/particulier/badges` | ✅* feature | 🔄 | 🔄 | ✅* |

### 2.5 Routes Agence (AgenceShell + AgenceGuard) — 22 routes

Guard : `useMyAgenceMembership()` → query `brh_partner_contracts` avec `partner_type='agence_immo'` + `status='active'`.

| Route | Agence | Pro | Admin | Autre |
|-------|--------|-----|-------|-------|
| `/agence`, `/agence/leads`, `/agence/leaderboard`, `/agence/score-vente`, `/agence/simulateur`, `/agence/contributions`, `/agence/progression`, `/agence/reseaux-sociaux`, `/agence/parrainage[/...]`, `/agence/equipe`, `/agence/qr-code`, `/agence/messages`, `/agence/abonnement`, `/agence/profil` | ✅ | 🔄 `/tableau-de-bord` | 🔄 | 🔄 |
| `/agence/foncier/carte`, `/agence/foncier/prospects`, `/agence/foncier/favoris`, `/agence/foncier/sci`, `/agence/foncier/tertiaire`, `/agence/foncier/parcelle/:idu` | ✅ | 🔄 | 🔄 | 🔄 |

⚠️ **Admin n'a PAS accès à `/agence/*`** : `AgenceGuard` redirige Admin vers `/tableau-de-bord` car il n'a pas de membership agence. Pour modérer les agences, l'Admin passe par `/admin/agences-immo`.

### 2.6 Routes Réseau pro (ReseauPortalShell + ReseauGuard) — 10 routes (Phase D)

Guard élargi (Phase D 2026-05-08) : `brh_partner_contracts` actif **OU** `brh_companies.owner_id`.

| Route | Pro | Pro RGE | Artisan legacy | Agence | Admin | Particulier |
|-------|-----|---------|----------------|--------|-------|-------------|
| `/reseau`, `/reseau/decouvrir`, `/reseau/chantiers[/...]`, `/reseau/connexions`, `/reseau/messages`, `/reseau/parametres/autaf`, `/reseau/profil/:slug`, `/reseau/abonnement` | ✅ | ✅ | ✅ | ✅ | 🔄 | 🔄 |

**Shell adaptatif** : `ReseauPortalShell` détecte le portail dominant et rend `AgenceShell` (pour les agences) ou `ProShell` (pour les pros). Cohérence visuelle préservée.

### 2.7 Routes Artisan legacy (ArtisanShell + ArtisanGuard) — 13 routes

Guard : `useQuery brh_artisans_rge.profile_id`. Fonctionnel uniquement pour artisans onboardés via magic link (`/artisan/onboarding/:token`).

| Route | Artisan legacy | Pro RGE (avec brh_companies) | Tous autres |
|-------|----------------|------------------------------|-------------|
| `/artisan`, `/artisan/dashboard`, `/artisan/missions`, `/artisan/simulateur`, `/artisan/chiffrage`, `/artisan/leads`, `/artisan/reseau`, `/artisan/reseaux-sociaux`, `/artisan/qr-code`, `/artisan/progression`, `/artisan/agenda`, `/artisan/factures`, `/artisan/profil`, `/artisan/messages` | ✅ | ✅ (mais `LoginPage` redirige plutôt vers `/pro`) | 🔄 `/tableau-de-bord` |

Note ménage Phase D : un Pro RGE qui a ET `brh_companies` ET `brh_artisans_rge` est redirigé vers `/pro` au login. L'`ArtisanShell` reste accessible mais peu utilisé en pratique. Banner `ArtisanDashboard` propose explicitement de basculer vers `/pro`.

### 2.8 Routes Employé BRH (EmployeShell + EmployeGuard) — 14 routes ⭐

Guard : `isBrhEmployee(user.email)` lit le **cache module-level** `src/lib/brh-employees.ts` (Map email→BrhEmployee), hydraté par `loadBrhEmployeesFromDb()` depuis la table `brh_employees` (Phase Employé V2). RLS auto-filtre : un employé voit son row, un admin voit tous, un autre user voit 0. Debounce 30s. Cache purgé au `signOut`. Fallback seed statique pour Pierre Collard demo.

| Route | Employé BRH (Pierre Collard) | Admin pur (sans brh_employees) | Tous autres |
|-------|------------------------------|--------------------------------|-------------|
| `/employe` | ✅ Cockpit gamifié | 🔄 `/tableau-de-bord` | 🔄 |
| `/employe/foncier/*` (carte, prospects, favoris, sci, tertiaire, parcelle) | ✅ (réutilise composants `/agence/foncier/*`) | 🔄 | 🔄 |
| `/employe/prospection/*` (bretagne, carte) | ✅ (réutilise `ProProspects*`) | 🔄 | 🔄 |
| `/employe/simulateur` | ✅ (réutilise `AgenceSimulateur`) | 🔄 | 🔄 |
| `/employe/mails` | ✅ Templates emails recrutement | 🔄 | 🔄 |
| `/employe/calendrier` | ✅ Créneaux RDV exposés au public | 🔄 | 🔄 |
| `/employe/social` | ✅ Publications réseaux sociaux | 🔄 | 🔄 |
| `/employe/leads` | ✅ Quota mensuel + RDV attribués | 🔄 | 🔄 |

**Note importante** : LoginPage redirige les employés vers `/employe` **en priorité absolue avant `/admin`**. Un user dans le registre `BRH_EMPLOYEES` arrive donc directement sur son cockpit gamifié, pas sur la console admin.

**Intégration cross-persona** : la fonction publique `brh_available_employees_for_slot(dow, period, limit)` est appelée par `ContactRdvModal` (sur `/diagnostic-express`) lors de la prise de RDV particulier → expose les employés dispo triés par `activity_score DESC`. C'est l'unique endroit où la donnée employé fuite vers l'utilisateur final.

### 2.9 Routes Admin (AdminShell + AdminGuard) — 23 routes

Guard : `role='admin'`.

```
/admin, /admin/logements, /admin/dossiers[/:id], /admin/rdv, /admin/messages,
/admin/articles, /admin/utilisateurs, /admin/partenaires, /admin/agences-immo,
/admin/score-vente, /admin/opt-out-requests, /admin/agence-social-posts,
/admin/reseau-moderation, /admin/partner-contracts, /admin/agence-audits,
/admin/lead-assignments, /admin/prospects, /admin/commissions-artisans,
/admin/commissions, /admin/catalogue, /admin/parametres, /admin/publications
```

✅ uniquement pour Admin. Tous les autres → 🔄 `/tableau-de-bord`.

---

## 3. Graphe d'inscription (parcours utilisateur)

```
HomePage (/)
  ├─ "Diagnostic gratuit" ─── /diagnostic ─── /diagnostic/results
  │   └─ CTA "Créer un compte" → /inscription/particulier (Phase D ménage)
  │
  ├─ "S'inscrire" ─── /inscription (HUB Phase A — RegisterHubPage)
  │   │  Param ?ref=CODE propagé sur les 3 cards
  │   │
  │   ├─ Card 1 "Particulier" → /inscription/particulier?ref=CODE
  │   │   └─ RegisterPage : form (fullName, email, phone, password)
  │   │       └─ signUp { user_metadata: { role='particulier', ... } }
  │   │           ├─ Trigger handle_new_user → INSERT profiles + brh_affiliates
  │   │           ├─ Si ?recruiter → updateAffiliateRecruiter (RPC validate_recruiter)
  │   │           └─ navigate('/particulier')
  │   │
  │   ├─ Card 2 "Pro/Artisan" → /inscription/pro?ref=CODE
  │   │   └─ RegisterProPage (2 étapes)
  │   │       ├─ Étape 1 : SIRET → EF verify-siret → SIRENE data
  │   │       ├─ Étape 2 : compte + question RGE (radio Oui/Non OBLIGATOIRE)
  │   │       └─ signUp { user_metadata: { role='pro', is_rge_intended: bool } }
  │   │           ├─ INSERT profiles + brh_companies (extra = SIRENE) + brh_company_members(role='owner')
  │   │           ├─ Si ?recruiter → updateCompanyRecruiter
  │   │           └─ navigate('/pro')   [si RGE=Oui : workflow admin 48h activera brh_artisans_rge]
  │   │
  │   └─ Card 3 "Agence" → /inscription/agence?ref=AGENCE_ID
  │       └─ InscriptionAgencePage (5 étapes)
  │           ├─ SIRET agence → SIRENE
  │           ├─ Représentant + role
  │           ├─ Tier (discovery/standard/premium/expert)
  │           ├─ Charte signée Markdown + 3 consentements (eIDAS)
  │           └─ signUp { role='pro' } puis
  │               INSERT brh_agences_immo + brh_partner_contracts + brh_agence_subscriptions
  │               navigate('/agence')
  │
  └─ "Connexion" → /connexion (LoginPage)
      ├─ signInWithPassword + load profile
      ├─ listAccessiblePortals(userId, role) → 4 queries parallèles
      │   • brh_artisans_rge.profile_id
      │   • brh_partner_contracts (agence_immo, status=active)
      │   • brh_companies.owner_id
      │   • brh_affiliates.id
      │
      ├─ 1 portail accessible → navigate(portal.path) directement
      │
      └─ >1 portail → écran "Choisir mon espace" inline (style Stripe/Notion)
          ├─ Card Admin (role='admin' → priorité absolue)
          ├─ Card Agence (brh_partner_contracts agence_immo)
          ├─ Card Pro (brh_companies — fusion Pro+RGE Phase B)
          ├─ Card Artisan (brh_artisans_rge SANS brh_companies = legacy)
          ├─ Card Particulier (role='particulier' OU brh_affiliates)
          └─ Card Standard (fallback /tableau-de-bord)
```

---

## 4. Workspace switcher post-login (Phase A)

Logique exacte de `listAccessiblePortals(userId, role)` dans [`LoginPage.tsx`](../../src/pages/public/LoginPage.tsx) lignes 103-157 :

1. Si `role='admin'` → ajoute portail Admin en tête (priorité absolue, persona unique en pratique).
2. Lance 4 queries Supabase en parallèle :
   - `brh_artisans_rge.profile_id = userId` → existe ?
   - `brh_partner_contracts WHERE signer_profile_id=userId AND partner_type='agence_immo' AND status='active'` → existe ?
   - `brh_companies.owner_id = userId` → existe ?
   - `brh_affiliates.id = userId` → existe ?
3. Si agence → ajoute portail Agence.
4. **Fusion Pro+Artisan (Phase B)** : si `brh_companies` → ajoute Pro (avec menu RGE augmenté si artisan présent). Sinon si `brh_artisans_rge` → ajoute Artisan legacy.
5. Si `role='particulier'` OU `brh_affiliates` → ajoute Particulier.
6. Si liste vide → ajoute portail Standard fallback.

**Comportement final** :
- 0 portail → `/tableau-de-bord` (rare, role='user' legacy)
- 1 portail → redirect direct
- 2+ portails → écran de choix inline (pas d'URL dédiée, les boutons font `navigate(portal.path, { replace: true })`)

---

## 5. Système parrainage MLM (cross-persona)

| Lien | Param | Persona qui peut générer | Effet au signup |
|------|-------|--------------------------|-----------------|
| `/inscription/particulier?ref=PARTICULIER_ID` | `?ref` ou `?recruiter` | Particulier affilié | `brh_affiliates.recruited_by = recruiter_id` (validé via RPC `validate_recruiter`) |
| `/inscription/pro?ref=PARTICULIER_ID` ou `?recruiter=PRO_ID` | `?ref` / `?recruiter` | Particulier OU Pro | `brh_companies.recruited_by = recruiter_id` |
| `/inscription/agence?ref=AGENCE_ID` | `?ref` | Agence | `brh_agences_immo.referred_by_agence_id = referrerAgenceId` + trigger commission cascade L1/L2/L3 |

Le hub `/inscription` propage automatiquement le param à toutes les cards (`refQuery` dans [`RegisterHubPage.tsx`](../../src/pages/public/RegisterHubPage.tsx) ligne 98).

---

## 6. Anomalies / points de friction connus

### 6.1 Bloquants ou semi-bloquants

| # | Issue | Fichier | Impact | Action |
|---|-------|---------|--------|--------|
| 1 | Admin n'a pas accès à `/reseau` (ReseauGuard) | `auth/ReseauGuard.tsx:33-50` | Admin doit créer une fake company pour modérer | Si modération désirée, ajouter clause `role='admin'` |
| 2 | ~~`role='user'` legacy reste bloqué sur `/tableau-de-bord`~~ **FIXED 2026-05-12** | `LoginPage.tsx:listAccessiblePortals` | Aucun portail spécialisé ne l'accepte | ✅ `listAccessiblePortals` accepte maintenant `role === 'user'` au check particulier — migration one-shot DB toujours recommandée |
| 3 | Activation Artisan RGE = workflow manuel 48h | `RegisterProPage.tsx:90-105` | User signup avec `is_rge_intended=true` n'a accès qu'à `/pro` immédiatement | UI annonce déjà "validation 48h", à industrialiser via cron + email admin |
| 4 | ~~`isBrhEmployee()` lisait UNIQUEMENT le seed statique `BRH_EMPLOYEES` (Pierre Collard demo)~~ **FIXED 2026-05-12** | `lib/brh-employees.ts` | Tout employé prod (autre que demo) bloqué sur `/tableau-de-bord` après login | ✅ Cache module-level Map hydraté par `loadBrhEmployeesFromDb()` (RLS auto, debounce 30s), appelé après `signInWithPassword` (LoginPage) et `validateSession` (useAuth). Cache purgé au signOut. |
| 5 | ~~Message "Email de confirmation envoyé" affiché en rouge erreur dans RegisterPage~~ **FIXED 2026-05-12** | `RegisterPage.tsx` | UX trompeuse — l'utilisateur croit que l'inscription a échoué | ✅ Nouveau state `info` avec style bleu `bg-blue-50 border-blue-200 text-blue-700` distinct de l'erreur rouge |
| 6 | ~~Cross-persona : Claire Pichon (agence immo loggée) voyait `/tableau-de-bord` particulier~~ **FIXED 2026-05-12 (nuit + 6)** | `auth/AuthGuard` ➔ `auth/ParticulierDashboardGuard` | Une agence pouvait taper `/tableau-de-bord` ou `/mes-logements` et accéder au dashboard particulier alors qu'elle a `/agence` dédié | ✅ Nouveau `ParticulierDashboardGuard` qui détecte les memberships `brh_artisans_rge`, `brh_partner_contracts` (agence), `brh_companies` et redirige automatiquement vers le bon portail. Admin reste autorisé partout. Affecte routes `/tableau-de-bord`, `/mes-logements`, `/mes-dossiers`, `/mes-rdv`, `/profil`, `/audit-energetique/:id`. |
| 7 | ~~Visiteur public anonyme ne pouvait pas prendre RDV depuis ContactRdvModal~~ **FIXED 2026-05-12 (nuit + 6)** | `brh_appointments` RLS | Tout user non-connecté qui terminait son diagnostic et essayait de prendre RDV plantait silencieusement (RLS exigeait `auth.uid() IS NOT NULL`) | ✅ Migration `20260713100000_brh_appointments_anon_insert.sql` ajoute policy `Anonymous visitors can create public appointments` autorisant role `anon` à INSERT avec contraintes anti-spam (user_id NULL + nom/email/phone obligatoires + type IN diagnostic/contact). |

### 6.2 UX / cohérence

| # | Issue | Fichier | Impact |
|---|-------|---------|--------|
| 4 | `/pro/missions` réutilise `ArtisanMissions` mais sous ProShell — pas de marqueur visuel | `App.tsx:394-397` | User ne sait pas qu'il est sur du contenu "Artisan" sémantiquement |
| 5 | Routes `/pro/chiffrage|chiffrages|assistant` sont des `<Navigate>` client-side (302), pas 301 HTTP | `App.tsx:388-390` | SEO non-critique (routes auth uniquement) |
| 6 | Pas de sauvegarde du dernier portail visité dans le switcher post-login | `LoginPage.tsx:200-205` | User multi-portail re-choisit à chaque fois |
| 7 | Param `?ref` perdu si l'user refresh entre HubPage et la card cliquée | `RegisterHubPage.tsx` | Drop parrainage si interruption |

### 6.3 DB / cohérence métier

| # | Issue | Impact |
|---|-------|--------|
| 8 | Pro et Agence partagent `role='pro'` | Distinction par membership tables — fonctionnel mais oblige 4 queries au login |
| 9 | Tous les particuliers ont `brh_affiliates` auto-créé | Pas de marqueur "affilié actif" — Phase E pourra ajouter `is_engaged BOOLEAN` ou seuil dérivé |
| 10 | `feature gates` (FeatureRoute) rendent une page vide si feature désactivée | UI confuse au lieu de redirect — à wrapper avec fallback |

### 6.4 Particulier ne peut PAS accéder à :

- ✅ Aucune route `/agence/*` (AgenceGuard requiert `brh_partner_contracts agence_immo`)
- ✅ Aucune route `/pro/*` (ProGuard requiert `role='pro'` ou `admin`)
- ✅ Aucune route `/artisan/*` (ArtisanGuard requiert `brh_artisans_rge`)
- ✅ Aucune route `/admin/*` (AdminGuard requiert `role='admin'`)
- ✅ Aucune route `/reseau/*` (ReseauGuard requiert `brh_partner_contracts` OU `brh_companies`)

→ **Réponse à la question Philippe** : un particulier non affilié ne peut PAS accéder au portail agence, ni au portail pro. Les guards le redirigent toujours vers `/tableau-de-bord`. Pour devenir parrain rémunéré, il reste sur `/particulier` et utilise le banner d'activation MLM (Phase C).

---

## 7. Tables référencées

| Table | Usage auth/access |
|-------|-------------------|
| `profiles` | Source de vérité du `role` (admin/pro/particulier/user) |
| `brh_companies` | Membership Pro (owner_id) — déclenche ProShell + accès `/reseau` |
| `brh_company_members` | Multi-membres d'une entreprise (role='owner'/'member') |
| `brh_artisans_rge` | Membership Artisan RGE (profile_id) — déclenche ArtisanShell legacy + groupe RGE dans ProShell |
| `brh_partner_contracts` | Charte signée multi-personae (`partner_type` ∈ agence_immo, artisan_rge, pro_company…) |
| `brh_agences_immo` | Identité agence (siret, raison_sociale, referred_by_agence_id) |
| `brh_agence_subscriptions` | Tier d'abonnement agence (discovery/standard/premium/expert) |
| `brh_affiliates` | Identité particulier affilié (referral_code, points_balance, level standard/ambassadeur/expert/vip) |

---

## 8. Workflows clés diagnostic/audit (ajoutés 12/05/2026)

Documentation explicite des chemins « clic → action » pour les flows utilisateur du diagnostic + audit complet. Source de vérité pour s'assurer qu'aucun parcours ne casse silencieusement.

### 8.1 Hub `/diagnostic` → Mode rapide

```
1. Visiteur arrive sur /diagnostic
   └─> DiagnosticHub (cases problème + 2 propositions)
       └─> Visiteur coche « Trop froid l'hiver » + « Factures élevées »
           └─> Le badge « Recommandé » s'affiche sur « Diagnostic rapide » (recommended='rapide')
               └─> Clic sur la card Rapide
                   └─> Navigate to /diagnostic/rapide?p=froid,factures
                       └─> DiagnosticPage useEffect lit ?p=
                           └─> PROBLEM_TO_TYPES → ['isolation', 'menuiseries']
                               └─> useDiagnosticStore.setState({ selectedTypes: [isolation, menuiseries] })
                                   └─> StepTypes affiche les 2 domaines déjà cochés
                                       └─> Le wizard démarre à l'étape 1 avec contexte pertinent
```

### 8.2 Hub `/diagnostic` → Mode complet

```
Si « Loi Climat F/G » ou « Préparer la vente » coché → recommended='complet'
   └─> Card Audit complet a le badge « Recommandé »
       └─> Clic → /audit-complet?p=loi_climat,vente
           └─> AuditComplet (wizard 8 étapes)
               └─> LocalStorage hydrate à l'open (clé brh-audit-complet-v1)
                   └─> Au final (étape 8) : si pas authentifié → écran "Créez un compte"
                       └─> Si authentifié → DpeLabelGauge officielle + résultat complet
```

### 8.3 Audit complet — enrichissement automatique step 1 (Adresse)

```
Visiteur sélectionne une adresse dans l'autocomplete BAN
   ├─> setForm({ adresse, codeInsee }) instantané
   └─> setEnriching(true)
       ├─> Promise.all([fetchDpeForAddress(), fetchParcelleAt()])
       │   ├─> EF dpe-express-lookup → simulateur 8915 → BDNB CSTB
       │   │   └─> Si trouvé : setDpeData({found, logement, dpe, …})
       │   │       └─> Pré-remplit form.surfaceHabitable, .periodeConstruction, .typeBatiment
       │   │       └─> Panel vert « Fiche DPE BDNB trouvée — pré-remplissage automatique »
       │   │
       │   └─> EF cadastre-fetch → IGN api-carto (lat,lng,radius_m=50)
       │       └─> setParcelle({idu, commune, centroid_lat, centroid_lng})
       │           └─> Panel violet « Parcelle cadastrale trouvée (IDU XXX) — analyse vision IA disponible »
       │
       └─> setEnriching(false)
```

### 8.4 Audit complet — Vision IA toiture step 4

```
Si parcelle a été trouvée à l'étape 1, panel violet en haut de l'étape 4 avec bouton « Lancer l'analyse »
   └─> Clic
       └─> setAnalyzingToiture(true)
           └─> EF satellite-vision-ai (parcelle_idu, force_refresh=false)
               ├─> Backend Edge Function :
               │   ├─> Lecture brh_parcelles_cache pour centroid + contenance
               │   ├─> WMS IGN BD ORTHO → crop 768×768 jpeg
               │   ├─> Claude Sonnet 4.6 vision (image + prompt JSON)
               │   ├─> Parse JSON {type_toiture, nb_pans, orientation, surface, etat, ombre, veluxes, potentiel_pv, commentaires}
               │   └─> Upsert brh_satellite_analyses (cache 365j)
               │
               └─> setVisionToiture(result) + pré-remplit form.toitureType
                   └─> Affiche panel résultat (8 caractéristiques + commentaire libre IA)
```

### 8.5 Cross-persona Guard — `/tableau-de-bord` accédé par agence

```
Claire Pichon (signataire agence) tape /tableau-de-bord directement dans l'URL
   └─> <Route element={<ParticulierDashboardGuard />}>
       └─> useAuth → user.role='pro', isAuthenticated=true
           └─> useQuery detectMemberships(user.id) — 3 lookups parallèles
               ├─> brh_artisans_rge.profile_id      → null
               ├─> brh_partner_contracts (agence)   → ROW (Claire = signataire)
               └─> brh_companies.owner_id           → null
                   └─> hasAgence=true
                       └─> <Navigate to="/agence" replace />
                           └─> Claire arrive sur son portail agence (correct)

Admin : role='admin' → bypass tous les checks, accès libre /tableau-de-bord
Particulier sans membership : Outlet render normal → dashboard particulier OK
```

### 8.6 Prise de RDV anonyme (fix 12/05)

```
Visiteur public termine /diagnostic/rapide → arrive sur DiagnosticResultsPage
   └─> Clic sur « Prendre RDV »
       └─> ContactRdvModal s'ouvre (no auth required)
           └─> Sélectionne 2-3 créneaux flous (matin/après-midi)
               └─> Remplit nom + tel + email
                   └─> handleSubmit()
                       ├─> supabase.from('brh_appointments').insert({
                       │     user_id: null,  ← anon, c'est ok depuis policy 12/05
                       │     type: 'diagnostic',
                       │     contact_name, contact_email, contact_phone,
                       │     preferred_slot, notes, status: 'demande'
                       │   })
                       │   └─> RLS « Anonymous visitors can create public appointments »
                       │       check: user_id IS NULL + contact_name/email/phone NOT NULL + type IN (diagnostic,contact)
                       │       → INSERT OK (depuis 20260713100000)
                       │
                       └─> EF send-rdv-confirmation (fire-and-forget)
                           ├─> Email client : « Votre demande de RDV est bien reçue »
                           └─> Email admin : tableau détails (nom/tel/email/créneaux/diagnostic)
```

---

## 9. Maintenance de cette page

À mettre à jour quand :
- Une route est ajoutée / supprimée / déplacée dans `src/App.tsx`
- Un guard est créé / modifié / supprimé dans `src/components/auth/*Guard.tsx`
- Un shell est créé / modifié / supprimé dans `src/components/layout/*Shell.tsx`
- La logique d'inscription change (ex: nouveau persona, nouveau champ obligatoire)
- La logique du LoginPage workspace switcher change
- Un workflow utilisateur clic→action est créé / modifié (section 8)

**Process** : éditer cette page, ajouter une entrée dans [`log.md`](log.md), pas de migration DB requise (pure documentation).

---

## Référencement

- [architecture-snapshot.md](architecture-snapshot.md) — vue d'ensemble stack/pages/tables
- [data-model.md](data-model.md) — schémas tables `brh_*`, RLS, triggers
- [partner-platform.md](partner-platform.md) — companies, contracts, commissions cascade
- [agence-portal-status.md](agence-portal-status.md) — détails portail agence
- [artisan-portal-status.md](artisan-portal-status.md) — détails portail artisan
- [audit-ux-2026-05-08.md](audit-ux-2026-05-08.md) — audit UX qui a déclenché les phases A-D
- [log.md](log.md) — journal des modifications, entrées 2026-05-08 (4 phases + ménage)
