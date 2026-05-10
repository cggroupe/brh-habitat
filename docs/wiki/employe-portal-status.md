# Portail Employé BRH — Status (V1 + V2.1 → V2.5)

> **Date livraison** : 2026-05-09 · **Status** : ✅ Complet en production
> **Persona** : commerciaux / opérationnels BRH (Pierre Collard et futurs employés)
> **Vision** : plus ils utilisent l'app, plus ils débloquent de leads et plus leur profil est mis en avant.

---

## 1. Résumé exécutif

Le portail Employé BRH est un **cockpit gamifié** dédié aux commerciaux et opérationnels internes BRH. Il réutilise les composants existants (`/agence/foncier/*`, `/pro/prospects-bretagne`, `/agence/simulateur`, `/reseau/*`) sans le module MLM, et y ajoute **4 modules propres** liés à un système de score d'activité gradué qui débloque progressivement plus de leads.

**Métriques clés (au 2026-05-09)** :
- 1 employé actif (Pierre Collard, niveau Standard, 42 pts)
- 6 templates emails de recrutement seedés (artisan, agence, architecte, MOE)
- 6 templates publications réseaux sociaux seedés (LinkedIn, TikTok, Instagram)
- 4 niveaux gamifiés (Standard 5 leads → Pro 15 → Expert 35 → Master ∞)

---

## 2. Architecture technique

### Routes (toutes sous `EmployeGuard`)

| Route | Composant | Phase | Description |
|---|---|---|---|
| `/employe` | `EmployeDashboard` | V1 | Cockpit gamifié (score, leads, mise en avant) |
| `/employe/foncier/carte` | `AgenceFoncierCarte` (réutilisé) | V1 | Carte cadastre Bretagne |
| `/employe/foncier/prospects` | `AgenceFoncierProspects` (réutilisé) | V1 | Prospects DPE F/G filtrables |
| `/employe/foncier/favoris` | `AgenceFoncierFavoris` (réutilisé) | V1 | Favoris foncier |
| `/employe/foncier/sci` | `AgenceFoncierSci` (réutilisé) | V1 | SCI / personnes morales |
| `/employe/foncier/tertiaire` | `AgenceFoncierTertiaire` (réutilisé) | V1 | BODACC + permis Sit@del2 |
| `/employe/foncier/parcelle/:idu` | `AgenceFoncierParcelleDetail` (réutilisé) | V1 | Détail parcelle |
| `/employe/prospection/bretagne` | `ProProspectsBretagne` (réutilisé) | V1 | Top Bretagne F/G |
| `/employe/prospection/carte` | `ProProspectsCarte` (réutilisé) | V1 | Carte prospects |
| `/employe/simulateur` | `AgenceSimulateur` (réutilisé) | V1 | Simulateur énergétique |
| **`/employe/mails`** | **`EmployeMails`** | **V2.2** | Templates emails recrutement |
| **`/employe/calendrier`** | **`EmployeCalendrier`** | **V2.3** | Créneaux RDV exposés au public |
| **`/employe/social`** | **`EmployeSocial`** | **V2.4** | Publications réseaux sociaux |
| **`/employe/leads`** | **`EmployeLeads`** | **V2.5** | Quota mensuel + RDV attribués |
| `/reseau/*` | `ReseauPortalShell` (cross-persona) | V1 | Réseau pro (cross-persona) |

### Tables DB (7)

| Table | Phase | Description |
|---|---|---|
| `brh_employees` | V2.1 | Registre employés (profile_id, score, level, leads_received, signature) |
| `brh_employee_actions` | V2.1 | Log gamifié (email_sent, social_post, rdv_completed, partner_recruited, lead_converted, manual_admin) |
| `brh_email_templates` | V2.2 | 4 templates (artisan, agence_immo, architecte, maitre_oeuvre) |
| `brh_email_sends` | V2.2 | Tracking envois (recipient, subject, body, resend_id, status, opened_at, clicked_at) |
| `brh_employee_calendar` | V2.3 | Créneaux récurrents (day_of_week 0-6, period morning/afternoon, status) |
| `brh_social_publications` | V2.4 | Publications déclarées (platform, content, url, status, reach) |
| `brh_social_post_templates` | V2.4 | 6 templates BRH (slug, platform, content, hashtags) |

Modification : `brh_appointments` a une nouvelle colonne `assigned_employee_id` (V2.3).

### Triggers DB (4)

| Trigger | Phase | Quand → Action |
|---|---|---|
| `brh_employees_action_after_insert` | V2.1 | INSERT `brh_employee_actions` → recalcule `activity_score` + `activity_level` |
| `brh_social_publications_award` | V2.4 | INSERT `brh_social_publications` validée → +10 pts auto |
| `brh_appointments_assigned_counter` | V2.5 | INSERT `brh_appointments` avec `assigned_employee_id` → incrémente `leads_received_this_month` + +10 pts |
| `brh_appointments_reassign` | V2.5 | UPDATE `assigned_employee_id` → décrémente l'ancien, incrémente le nouveau |

### Fonctions SECURITY DEFINER (5)

| Fonction | Phase | Usage |
|---|---|---|
| `brh_compute_employee_score(uuid)` | V2.1 | SUM(points) sur actions de l'employé |
| `brh_compute_employee_level(int)` | V2.1 | IMMUTABLE, score → standard/pro/expert/master |
| `brh_available_employees_for_slot(dow, period, limit)` | V2.3 | **Publique (anon+auth)** — exposée à ContactRdvModal |
| `brh_reset_employee_leads_counter()` | V2.5 | À appeler par cron mensuel le 1er du mois |
| Trigger functions internes | V2.1+V2.4+V2.5 | Sync auto |

### Edge Functions (1)

| EF | Phase | Description |
|---|---|---|
| `send-recruitment-email` | V2.2 | Envoie via Resend, render template, INSERT `brh_email_sends`, +5 pts auto |

---

## 3. Système de gamification

### Niveaux

| Niveau | Score min | Leads / mois | Couleur UI |
|---|---|---|---|
| Standard | 0 | 5 | gris #71717a |
| Pro | 50 | 15 | bleu #0284c7 |
| Expert | 150 | 35 | violet #7c3aed |
| Master | 350 | ∞ | ambre #f59e0b |

### Actions qui rapportent des points

| Action | Points | Trigger |
|---|---|---|
| `email_sent` (mail recrutement envoyé) | +5 | Auto via EF `send-recruitment-email` |
| `social_post` (publication validée) | +10 | Auto via trigger DB |
| `rdv_completed` (RDV particulier attribué) | +10 | Auto via trigger DB sur INSERT brh_appointments |
| `partner_recruited` (partenaire signe charte) | +50 | Manuel admin (à automatiser dans une future phase) |
| `lead_converted` (lead transformé en chantier signé) | +25 | Manuel admin |
| `manual_admin` (ajustement) | variable | Manuel admin |

---

## 4. Mise en avant employé sur la prise de RDV publique

**Logique** :
1. Le particulier termine son `/diagnostic-express` et veut prendre RDV
2. `ContactRdvModal` ouvre, il choisit un créneau (ex: lundi matin)
3. `useEffect` appelle la RPC `brh_available_employees_for_slot(1, 'morning', 3)`
4. La RPC retourne jusqu'à 3 employés dispos sur ce créneau, **triés par `activity_score DESC`**
5. Le particulier voit "Avec qui souhaitez-vous l'entretien ?" + cards employés (option "Pas de préférence" + 3 employés max)
6. À la soumission, `brh_appointments.assigned_employee_id` = employé choisi (ou null si auto)
7. Le trigger DB incrémente le compteur de l'employé + +10 pts auto

**Conséquence stratégique** : un employé actif (score élevé) apparaît systématiquement en tête des choix proposés au particulier → cercle vertueux qui récompense l'engagement.

---

## 5. Sécurité & RLS

### EmployeGuard
- Source : `src/components/auth/EmployeGuard.tsx`
- Logic : `isBrhEmployee(user.email)` (registre statique `src/lib/brh-employees.ts`)
- Fallback : redirect vers `/tableau-de-bord` si non employé

### Policies RLS
- `brh_employees` : employé voit son profil, peut update sa signature ; admin manage all
- `brh_employee_actions` : employé voit ses actions ; admin manage all
- `brh_email_templates` : authenticated lit templates actifs ; admin manage all
- `brh_email_sends` : employé voit ses envois ; admin manage all (INSERT par EF service role)
- `brh_employee_calendar` : employé manage son calendrier ; admin manage all
- `brh_social_publications` : employé manage les siennes ; admin manage all
- `brh_social_post_templates` : authenticated lit ; admin manage all

---

## 6. Backlog — fonctionnalités futures

| Item | Effort | Priorité |
|---|---|---|
| Migration table `brh_employees` (vs registre statique JS) — peuplement auto au signup employé | 1h | Haute (quand 2e employé recruté) |
| Cron mensuel reset `brh_reset_employee_leads_counter()` (n8n / systemd timer) | 30 min | Haute (avant fin de mois) |
| Tracking ouverture mails Resend (webhook) → +2 pts si ouvert | 1h | Moyenne |
| Webhook clic mail (UTM tracking via redirect proxy) | 1h | Moyenne |
| Auto-attribution lead à employé le moins occupé si `assigned_employee_id` null | 2h | Moyenne |
| API LinkedIn / TikTok pour publication directe depuis l'app | 4h+ | Basse |
| Modération admin sur publications sociales (status=pending par défaut) | 1h | Basse |
| Stats hebdo/mensuelles par employé (CSV export) | 2h | Basse |
| Leaderboard interne employés (gamification poussée) | 1h | Basse |

---

## 7. Comment tester

1. Portail test : http://147.93.52.70:8950 (auth `brh` / `BrhTest2026Demo!`)
2. Card "Employé BRH (Pierre Collard)" → Magic link
3. Arrive sur `/employe` avec score 42 pts (niveau Standard)
4. Tester séquentiellement :
   - `/employe/mails` → envoi test → score passe à 47 pts
   - `/employe/social` → publier avec template LinkedIn → score 57 pts → **passe niveau Pro** → 15 leads/mois débloqués
   - `/employe/calendrier` → toggle créneaux
   - `/employe/leads` → quota mensuel visible
   - `/employe/foncier/carte` → carte cadastre Bretagne accessible
   - `/employe/prospection/bretagne` → top prospects DPE F/G

5. **Test fil conducteur public + assignment** :
   - Mode incognito : `/diagnostic-express` → simu → "Prendre RDV" → choisir lundi matin → voir Pierre Collard proposé → soumettre → `brh_appointments.assigned_employee_id` rempli → trigger incrémente le compteur de Pierre

---

## 8. Références code

- Guard : [src/components/auth/EmployeGuard.tsx](../../src/components/auth/EmployeGuard.tsx)
- Shell : [src/components/layout/EmployeShell.tsx](../../src/components/layout/EmployeShell.tsx)
- Registre statique : [src/lib/brh-employees.ts](../../src/lib/brh-employees.ts)
- API : [src/api/brh-employees.ts](../../src/api/brh-employees.ts), [src/api/email-templates.ts](../../src/api/email-templates.ts), [src/api/employee-calendar.ts](../../src/api/employee-calendar.ts), [src/api/social-publications.ts](../../src/api/social-publications.ts)
- Hook : [src/hooks/queries/brh-employees.ts](../../src/hooks/queries/brh-employees.ts)
- Pages : [src/pages/employe/EmployeDashboard.tsx](../../src/pages/employe/EmployeDashboard.tsx), [EmployeMails.tsx](../../src/pages/employe/EmployeMails.tsx), [EmployeCalendrier.tsx](../../src/pages/employe/EmployeCalendrier.tsx), [EmployeSocial.tsx](../../src/pages/employe/EmployeSocial.tsx), [EmployeLeads.tsx](../../src/pages/employe/EmployeLeads.tsx)
- Migrations :
  - [20260706700000_brh_employees_foundation.sql](../../supabase/migrations/20260706700000_brh_employees_foundation.sql)
  - [20260706710000_brh_email_templates.sql](../../supabase/migrations/20260706710000_brh_email_templates.sql)
  - [20260706720000_brh_employee_calendar.sql](../../supabase/migrations/20260706720000_brh_employee_calendar.sql)
  - [20260706730000_brh_social_publications.sql](../../supabase/migrations/20260706730000_brh_social_publications.sql)
  - [20260706740000_brh_employee_leads_progressive.sql](../../supabase/migrations/20260706740000_brh_employee_leads_progressive.sql)
- EF : [supabase/functions/send-recruitment-email/index.ts](../../supabase/functions/send-recruitment-email/index.ts)

---

## 9. Maintenance

À mettre à jour quand :
- Un nouvel employé est ajouté (registre statique `BRH_EMPLOYEES` ou table DB future)
- Une nouvelle action gamifiée est ajoutée (action_type CHECK constraint)
- Les seuils de niveau changent
- Une intégration externe (LinkedIn API, etc.) est ajoutée

**Process** : éditer cette page + entrée dans [log.md](log.md). Si migration DB → fichier dans `supabase/migrations/`.
