# Portail Artisan — État livraison Phase 17.1 (2026-05-06)

> **Status** : 🟡 En cours — Step 1 (infra) + Step 2 (migration SQL) livrés. 7 pages restantes (skeletons cliquables prêts).
>
> Voir aussi : [agence-portal-status.md](agence-portal-status.md) (référence structurelle), [log.md](log.md#2026-05-06--phase-171--portail-artisan-enrichi-step-1--2)

---

## 1. Sidebar finale (13 entrées)

| # | Route | Page | Step | Status |
|---|-------|------|------|--------|
| 1 | `/artisan` | ArtisanDashboard | Phase R4 | ✅ existant |
| 2 | `/artisan/missions` | ArtisanMissions | Phase 13.6 | ✅ existant |
| 3 | `/artisan/simulateur` | ArtisanSimulateur | Step 3 | 🟡 skeleton |
| 4 | `/artisan/chiffrage` | ArtisanChiffrage | Step 4 | 🟡 skeleton |
| 5 | `/artisan/leads` | ArtisanLeads | Step 5 | 🟡 skeleton |
| 6 | `/artisan/reseau` | ArtisanReseau | Step 6 | 🟡 skeleton |
| 7 | `/artisan/reseaux-sociaux` | ArtisanReseauxSociaux | Step 7 | 🟡 skeleton |
| 8 | `/artisan/qr-code` | ArtisanQRCode | Step 8 | 🟡 skeleton |
| 9 | `/artisan/progression` | ArtisanProgression | Step 9 | 🟡 skeleton |
| 10 | `/artisan/agenda` | ArtisanAgenda | Phase R4 | ✅ existant |
| 11 | `/artisan/messages` | ArtisanMessages | Phase R4 | ✅ existant |
| 12 | `/artisan/factures` | ArtisanFactures | Phase R4 | ✅ existant |
| 13 | `/artisan/profil` | ArtisanProfil | Phase R4 | ✅ existant |

**Routes publiques liées (à venir Step 8)** :
- `/r/:artisanId` — vitrine publique QR code (RPC `brh_get_public_artisan`)
- `/inscription/artisan?ref=<artisanId>` — onboarding parrainé
- `/contact?artisan=<id>` — capte attribution lead vitrine

---

## 2. Modèle de données livré (Step 2)

### Migration `20260706200000_brh_artisan_phase_17_1.sql`

6 tables + 1 colonne ajoutée + 3 helpers SECURITY DEFINER + 3 triggers + RLS complète.

| Table | Rôle |
|-------|------|
| `brh_artisan_contributions` | Apport prospect porte-à-porte (calque agence) |
| `brh_artisan_progression` | Paliers bronze/silver/gold/platinum + bonus_leads |
| `brh_artisan_simulations` | Simulations énergétiques BAN/manuel sauvegardées |
| `brh_artisan_chiffrages` | Devis Batichiffrage (ouvrages JSONB + total HT/TTC cents) |
| `brh_artisan_social_posts` | Publications réseaux soumises (validation admin) |
| `brh_artisan_referral_commissions` | Parrainage 100€ HT/charte filleul (UNIQUE parrain+filleul) |

### Colonne ajoutée

| Table | Colonne | Step |
|-------|---------|------|
| `brh_artisans_rge` | `referred_by_artisan_id UUID` | Step 6 préparé |

### Helpers SECURITY DEFINER (`SET search_path = ''`)

| Fonction | Usage |
|----------|-------|
| `brh_user_artisan_id()` | UUID artisan_rge du user courant (NULL sinon) — utilisé par toutes les RLS artisan |
| `brh_artisan_recompute_progression(artisan_id)` | Recalcule tier + KPI sur changement |
| `brh_get_public_artisan(artisan_id)` | RPC publique vitrine `/r/:id` (filtre marketplace_active) |

### Triggers SQL

| Trigger | Fait quoi |
|---------|-----------|
| `trg_brh_artisan_contrib_progression` | Recalcule progression sur INSERT/UPDATE/DELETE contribution |
| `trg_brh_artisan_social_reward` | Sur `validee` → reward_leads selon plateforme + plafond 2/mois |
| `trg_brh_artisan_referral_commission` | Charte filleul `partner_type='artisan_rge'` + active = +100€ HT pending |

### Paliers (recalculés par trigger)

| Tier | Seuil (max signed OR filleuls) |
|------|--------------------------------|
| bronze | défaut |
| silver | 3 chantiers signés OR 1 filleul actif |
| gold | 10 chantiers signés OR 3 filleuls actifs |
| platinum | 25 chantiers signés OR 8 filleuls actifs |

**Bonus leads débloqués** : 5 × chantiers signés + bonus sociaux 30 derniers jours.

### Récompenses sociales (par publication validée)

| Plateforme | Reward leads |
|------------|--------------|
| TikTok | +8 |
| Facebook / Instagram / LinkedIn | +5 |
| Google | +3 |

Plafond : 2 publications validées / mois.

---

## 3. Boucles fonctionnelles (à compléter Steps 3-9)

### A — Boucle simulateur → contribution (Step 3 + Step 5)
1. Artisan saisit adresse client porte-à-porte sur `/artisan/simulateur`
2. Étude virtuelle BDNB + 3 scénarios + chiffrage Batichiffrage
3. Sauvegarde `brh_artisan_simulations` (label + inputs JSONB + result JSONB)
4. Bouton "Convertir en contribution" → pré-remplit `/artisan/leads` mode "Apporter prospect"
5. Submit → INSERT `brh_artisan_contributions` + lien `simulation_id` → trigger recalc progression

### B — Boucle parrainage artisan→artisan (Step 6)
1. Artisan A copie `…/inscription/artisan?ref=<idA>` sur `/artisan/reseau`
2. Share WhatsApp / Email / LinkedIn (3 boutons)
3. Artisan B onboarde → magic link → `referred_by_artisan_id = idA`
4. B signe charte → `brh_partner_contracts` (partner_type='artisan_rge', status='active')
5. Trigger `trg_brh_artisan_referral_commission` → INSERT 100€ HT pending pour A
6. A voit la commission dans `/artisan/reseau` (KPI cards + table)

### C — Boucle vitrine QR (Step 8)
1. Artisan sur `/artisan/qr-code` mode "Vitrine"
2. URL `…/r/<artisanId>` → QR PNG haute résolution
3. Imprime sur camionette / cartes / chantiers
4. Prospect scanne → page publique (RPC `brh_get_public_artisan` filtre marketplace_active)
5. CTA "Demander un devis" → `/contact?artisan=<id>`

### D — Boucle réseaux sociaux (Step 7)
1. Artisan soumet URL post + screenshot sur `/artisan/reseaux-sociaux`
2. Status `attente_validation`
3. Admin sur `/admin/artisan-social-posts` (à créer admin BRH plus tard) valide
4. Trigger `trg_brh_artisan_social_reward` calcule reward selon plateforme + plafond
5. Crédite `bonus_leads_unlocked` via recompute_progression

### E — Boucle leads porte-à-porte (Step 5)
1. Artisan sur `/artisan/leads` onglet "Porte-à-porte" → carte Leaflet zone RGE 30km
2. Clic prospect DPE F/G → `ProspectStudyPanel` (composant déjà mutualisé)
3. Bouton "Démarcher" → ajoute le prospect au carnet privé
4. OU onglet "Apporter prospect" → form physique → INSERT `brh_artisan_contributions`

---

## 4. ⏳ Reste à faire (Steps 3-9)

### Step 3 — Simulateur énergétique
- Wrapper de `AgenceSimulateur` qui sauvegarde dans `brh_artisan_simulations`
- Hook `useArtisanSimulation` (calque `useSimulation` agence)
- Module API `src/api/artisan-simulations.ts` (Zod schemas)

### Step 4 — Chiffrage travaux Batichiffrage
- Composant `ChiffrageWizard` extrait de `ProRapport` (sélecteur ouvrages multi-lots)
- Branchement EF `chiffrage-prices` (existant) en mode standalone
- Génération PDF @react-pdf/renderer (template à créer)

### Step 5 — Leads & porte-à-porte
- Onglet 1 : carte Leaflet limitée au rayon 30km autour de `brh_artisans_rge.{lat,lng}`
- Onglet 2 : form contribution (nom, tel, adresse, RGPD, contexte rencontre)
- Réutilisation `ProspectStudyPanel` existant

### Step 6 — Mon réseau
- KPI cards (filleuls signés, commissions pending/validated/paid)
- Lien `?ref=<id>` + 3 share buttons (whatsapp/email/linkedin)
- Table commissions (status, montant cents → euros, date)
- Onboarding `/inscription/artisan` doit lire `?ref=` et le poser dans `referred_by_artisan_id`

### Step 7 — Réseaux sociaux
- Form URL + upload screenshot Storage
- KPI mois courant (publications validées 0-2/2)
- Historique avec status attente/validee/refusee

### Step 8 — QR Code + vitrine
- Composant `QRCodeGenerator` (réutilisable, déjà sur agence)
- 2 modes (vitrine `/r/:id` + parrainage `?ref=`)
- Page publique `ArtisanVitrinePage` (calque `AgenceVitrinePage`)
- Download PNG haute résolution (qrcode.react ou similaire)

### Step 9 — Ma progression
- Affichage palier actuel + barre de progression vers next palier
- KPI cards (contributions, filleuls, chantiers, CA, leads bonus)
- Badge tier partagé sur vitrine publique

### Côté admin BRH (session dédiée plus tard)
- `/admin/artisan-contributions` (validation apports)
- `/admin/artisan-social-posts` (validation publications)
- `/admin/artisan-referrals` (validation commissions parrainage)
- `/admin/artisan-simulations` (audit usage)

---

## 5. Conformité 14 règles anti-bug

| # | Règle | Statut migration |
|---|-------|------------------|
| #2 | INTEGER cents | ✅ tous les montants en BIGINT cents |
| #5 | `if (error) throw error` | ⏳ côté hooks (Steps 3-9) |
| #6 | route guard | ✅ ArtisanGuard sur toutes les routes /artisan/* |
| #7 | RLS testée | ⏳ test en main propre attendu après push |
| #8 | pas de USING (true) | ✅ tous USING basés sur `brh_user_artisan_id()` ou admin |
| #11 | TIMESTAMPTZ | ✅ partout |
| #12 | `SET search_path = ''` | ✅ sur les 3 helpers SECURITY DEFINER + 3 triggers |

---

## 6. Test plan (à exécuter après push migration)

### Test artisan existant
- [ ] Login artisan RGE → `/artisan` charge sans flash
- [ ] Sidebar 13 entrées visibles, toutes cliquables
- [ ] 7 nouvelles pages affichent leur skeleton "Bientôt disponible — Step N"
- [ ] Aucune régression sur les 6 pages existantes (Accueil, Missions, Agenda, Messages, Factures, Profil)

### Test SQL après push (Supabase Dashboard)
- [ ] Les 6 tables `brh_artisan_*` apparaissent
- [ ] `brh_user_artisan_id()` retourne le bon UUID pour un user artisan
- [ ] `brh_get_public_artisan(<id>)` retourne row si marketplace_active, NULL sinon
- [ ] `brh_artisan_progression` initialisée à `bronze` pour tous les artisans avec profile_id
- [ ] RLS : un user non-artisan ne voit aucune ligne des 6 tables

---

## 7. Liens utiles

- Migration : [supabase/migrations/20260706200000_brh_artisan_phase_17_1.sql](../../supabase/migrations/20260706200000_brh_artisan_phase_17_1.sql)
- Shell : [src/components/layout/ArtisanShell.tsx](../../src/components/layout/ArtisanShell.tsx)
- Skeletons : [src/pages/artisan/](../../src/pages/artisan/)
- Référence structurelle : [agence-portal-status.md](agence-portal-status.md)
- Journal : [log.md](log.md)
