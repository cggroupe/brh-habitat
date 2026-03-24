# Integration BRH Habitat ↔ BRHCRM — Rapport Global

**Date** : 2026-03-24
**Auteur** : Claude Opus 4.6
**Projets** : BRH Habitat (site public) + BRHCRM (ERP interne)

---

## Vue d'ensemble

BRH Habitat est le site public de Bretagne Renovation Habitat. Les particuliers y font un diagnostic gratuit de leur logement et prennent RDV avec un commercial. Le BRHCRM est l'ERP interne qui gere les commerciaux, les chantiers, la facturation, etc.

L'integration connecte le parcours public du particulier aux agendas des commerciaux du CRM, en temps reel.

```
PARTICULIER                          BRHCRM
─────────────────────────────────────────────────────────

[BRH Habitat]                        [Agenda commercial]
  Diagnostic 5 etapes                 Vue semaine/jour
  → Resultats + aides + plan          RDV colores par status
  → "Prendre rendez-vous"
       │
       ▼
  [CalendarPicker]
  Choisir jour → creneaux libres
       │
       ▼ fetch GET
  ┌─────────────────────────────┐
  │  Edge Function              │
  │  public-booking             │──→  [rdv_commerciaux]
  │  (Supabase BRHCRM)         │──→  [activites_commerciales]
  │                             │──→  [clients] (prospect auto)
  └─────────────────────────────┘
       │
       ▼ POST reserver
  Confirmation instantanee
  "RDV confirme le 25 mars 10h-11h"
```

---

## Architecture Technique

### Deux projets Supabase separes

| Projet | Supabase Ref | Vercel | Usage |
|--------|-------------|--------|-------|
| BRH Habitat | `lygmmvxnmvlgynmrcpny` | brh-habitat | Site public, diagnostic, articles |
| BRHCRM | `woicuzcxfdknxqdjuamj` | brhcrm | ERP, agendas, clients, facturation |

### Communication

BRH Habitat appelle l'Edge Function `public-booking` du BRHCRM via `fetch()` natif (pas le SDK Supabase — c'est un projet different).

**Authentification** : Pas de JWT utilisateur. L'Edge Function est publique (`--no-verify-jwt`). La securite repose sur :
- CORS : seuls les domaines BRH Habitat Vercel sont autorises
- Rate limiting natif Supabase
- Validation des inputs
- `service_role` cote serveur (jamais expose au client)
- Le header `apikey` (anon key CRM) est requis pour passer le API Gateway Supabase

**Variable d'environnement** sur BRH Habitat :
```
VITE_BRHCRM_ANON_KEY=eyJhbG...  (anon key du projet CRM)
```

---

## Elements BRHCRM modifies

### Migration 097 — `097_public_booking.sql`

```sql
-- Colonne zone geographique sur les users
ALTER TABLE users ADD COLUMN zone_departements TEXT[] DEFAULT '{}';

-- Fonction SQL pour calculer les creneaux disponibles
CREATE FUNCTION get_available_slots(company_id, date, duree, departement)
  → Retourne les creneaux libres par commercial
  → Creneaux : 9h-12h et 14h-19h par tranche de 30 min
  → Filtre : Commercial ou Directeur Commercial, actif, zone matchee
  → Verifie collisions avec rdv_commerciaux existants
```

### Migration 098 — `098_fix_booking_function.sql`

Fix de la migration 097 : suppression du check `deleted_at` (colonne inexistante sur `users`).

### Edge Function — `supabase/functions/public-booking/index.ts`

**GET** — Creneaux disponibles :
```
GET ?date=2026-04-01&duree=60&departement=29

→ Appelle get_available_slots()
→ Deduplique (un creneau par horaire, pas un par commercial)
→ Masque les commercial_id (le particulier ne sait pas qui est dispo)
→ Retourne : [{ date, heure_debut, heure_fin }]
```

**POST** — Reserver un creneau :
```
POST { date, heure_debut, heure_fin, contact_name, contact_phone,
       contact_email, lieu, notes, diagnostic_id, diagnostic_summary,
       departement }

→ Verifie disponibilite (409 si pris entre-temps)
→ Selectionne le commercial optimal (zone + moins de RDV ce jour)
→ Cree ou retrouve le prospect dans clients (source: brh_habitat_diagnostic)
→ Cree rdv_commerciaux (status: confirme, couleur: green)
→ Cree activites_commerciales (type: rdv)
→ Retourne { success, rdv_id, date, heure_debut, heure_fin, message }
```

**CORS** :
```typescript
const ALLOWED_ORIGINS = [
  'https://brhcrm.vercel.app',
  'https://brh-habitat-cggroupes-projects.vercel.app',
  // + regex pour tout sous-domaine brh-habitat*.vercel.app
  // + localhost si ENVIRONMENT != production
]
```

### Configuration des zones commerciaux

| Commercial | Profil | Departements |
|-----------|--------|-------------|
| Philippe Gagnon | Commercial | 29 (Finistere), 22 (Cotes-d'Armor) |
| Sophie Leroy | Directeur Commercial | 35 (Ille-et-Vilaine), 56 (Morbihan) |

**Pour ajouter un commercial** :
1. Creer le user dans BRHCRM avec profil "Commercial"
2. Configurer ses departements : `UPDATE users SET zone_departements = '{29,22}' WHERE email = '...'`
3. Les creneaux apparaissent automatiquement sur BRH Habitat

**Si un commercial n'a pas de zone** (`zone_departements = '{}'` ou `NULL`) :
→ Il est considere comme couvrant TOUTE la Bretagne (fallback)

---

## Elements BRH Habitat modifies

### CalendarPicker (`src/components/CalendarPicker.tsx`)

Composant de selection de creneau en 2 etapes :
1. **Choix du jour** : navigation semaine par semaine (lun-ven), jours passes desactives
2. **Choix de l'heure** : creneaux matin (9h-12h) et apres-midi (14h-19h)

Fetch les dispos via `fetch()` vers l'Edge Function CRM. Si l'API est indisponible → fallback telephone BRH.

### ContactRdvModal (`src/components/ContactRdvModal.tsx`)

Modal de prise de contact integree dans la page de resultats du diagnostic :
- Nom + Telephone + Email + CalendarPicker + Message
- POST vers l'Edge Function CRM au submit
- Gestion du 409 (creneau pris entre-temps) avec message et refresh
- Insert local dans `brh_appointments` (Habitat) pour la trace cote admin Habitat
- Confirmation avec date/heure exactes

---

## BRH Habitat — Etat complet du projet

### Stack

| Composant | Version |
|-----------|---------|
| React | 19.2.0 |
| TypeScript | 5.9.3 (strict) |
| Vite | 7.3.1 |
| Tailwind CSS | 4.2.1 |
| Supabase | 2.96.0 |
| React Query | 5.90.21 |
| Zustand | 5.0.11 |
| Sentry | @sentry/react |
| Deploy | Vercel |

### Metriques

| Metrique | Valeur |
|----------|--------|
| Fichiers source | ~76 |
| LOC | ~17 000 |
| Routes | 26 |
| Tables DB (Habitat) | 7 (profiles, diagnostics, homes, cases, appointments, articles, contacts) |
| Migrations | 3 |
| Engines metier | 3 (diagnostic, aides, renovation-plan) |
| Modules API | 6 |
| Hooks React Query | 27 |

### Fonctionnalites

| Feature | Description |
|---------|-------------|
| Diagnostic 5 etapes | Types → Logement → Situation → Equipements → Symptomes |
| 68 symptomes | 7 domaines + specificites Bretagne (ardoise, granit, humidite) |
| 67 recommandations | Avec budget estime et priorite |
| Simulateur aides | MaPrimeRenov 2026 + CEE + eco-PTZ + TVA 5.5% |
| Plan de renovation | Ordonnancement ADEME avec warnings d'interactions |
| Etiquette DPE | Avant/apres avec gain estime et economies annuelles |
| Calendrier booking | Creneaux reels connectes aux agendas CRM |
| Articles SEO | 10 articles avec recommandations contextuelles |
| Dashboard user | Logements, dossiers, RDV |
| Admin complet | Diagnostics, users, articles, RDV, dossiers |
| Security headers | CSP, HSTS, X-Frame-Options, Referrer-Policy |
| RLS corrigees | Elevation privileges bloquee, is_admin() SECURITY DEFINER |
| Monitoring | Sentry integre (actif avec VITE_SENTRY_DSN) |

### Scores audits

| Categorie | Score |
|-----------|-------|
| Architecture | 8/10 |
| Securite | 0 CRITICAL, 0 HIGH |
| npm audit | 0 vulnerabilites |

### Pages du wizard diagnostic

```
Step 1 — Domaines : 7 types (humidite, isolation, ventilation, menuiseries, electricite, toiture, plomberie)
Step 2 — Logement : type, adresse, surface, annee (obligatoire), etages
Step 3 — Situation : proprietaire, taille foyer, revenus (pour calcul aides)
Step 4 — Equipements : chauffage, ventilation, fenetres, toiture, DPE, derniere renovation
Step 5 — Symptomes : 68 symptomes avec poids et urgence, specificites Bretagne
```

### Page de resultats

```
Section 1 — Score global + budget brut + aides estimees + reste a charge
Section 2 — Etiquette DPE avant/apres avec economies annuelles
Section 3 — Plan de renovation ordonne (logique ADEME + warnings)
Section 4 — Detail aides financieres (MaPrimeRenov + CEE)
Section 5 — Analyse par domaine avec recommandations
Section 6 — Articles contextuels lies au diagnostic
Section 7 — CTA : Prendre RDV (→ calendrier CRM) + PDF + Refaire diagnostic
```

---

## Points d'attention pour les modifications de design

### Fichiers cles a connaitre

| Fichier | Role | LOC |
|---------|------|-----|
| `src/pages/public/HomePage.tsx` | Page d'accueil marketing | 479 |
| `src/pages/public/DiagnosticPage.tsx` | Orchestrateur wizard 5 steps | 165 |
| `src/pages/public/DiagnosticResultsPage.tsx` | Page resultats complete | 773 |
| `src/pages/public/ServicesPage.tsx` | 7 sections services | 397 |
| `src/pages/public/ContactPage.tsx` | Formulaire contact | 417 |
| `src/pages/public/ArticlePage.tsx` | Rendu article markdown | 969 |
| `src/components/ContactRdvModal.tsx` | Modal RDV + calendrier | ~350 |
| `src/components/CalendarPicker.tsx` | Calendrier booking CRM | 248 |
| `src/components/DpeScale.tsx` | Etiquette DPE visuelle | 123 |
| `src/components/AidesCard.tsx` | Carte aides financieres | 112 |
| `src/components/RenovationTimeline.tsx` | Timeline plan renovation | 177 |

### Charte graphique

| Element | Valeur |
|---------|--------|
| Primary green | #1c7b1d / #359932 |
| Dark gray | #3d3d3d |
| Light gray | #e8e8e8 |
| Font titres | Oswald (`font-display`) |
| Font body | Raleway (`font-body`) |
| Font accroches | Bebas Neue |
| Font logo | Montserrat Bold |
| Arrondis | rounded-xl (12px) / rounded-2xl (16px) |
| Shadows | shadow-xl shadow-slate-200/50 |

### Composants diagnostic (sous-composants)

```
src/pages/public/diagnostic/
├── StepTypes.tsx        — Selection des domaines
├── StepProperty.tsx     — Infos logement (annee obligatoire)
├── StepSituation.tsx    — Proprietaire, foyer, revenus
├── StepEquipment.tsx    — Chauffage, VMC, fenetres, DPE
├── StepSymptoms.tsx     — 68 symptomes par categorie
├── HorizontalStepper.tsx — Barre de progression
├── SidePanel.tsx        — Panneau lateral avec tips
├── NavFooter.tsx        — Boutons Retour/Continuer/Voir resultats
└── DiagnosticIcon.tsx   — Resolver d'icones
```

### Layout shells

```
PublicShell   → Navbar + Footer (pages publiques)
AppShell      → DashboardNav (pages utilisateur connecte)
AdminShell    → Sidebar admin (pages admin)
```
