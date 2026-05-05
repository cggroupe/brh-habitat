# Portail Agence — État livraison Phase 16.1 (2026-05-05)

> **Status** : ✅ portail agence côté front livré (5 steps + audit) · ⏳ côté admin BRH = session dédiée à venir.
>
> Voir aussi : [score-vente-agences.md](score-vente-agences.md) (algo Score Vente), [log.md](log.md#2026-05-05--phase-161--portail-agence-enrichi-étape-par-étape) (journal append).

---

## 1. 13 entrées du portail agence (sidebar finale)

Toutes opérationnelles depuis commit `6a577b9` (2026-05-05).

| # | Route | Page | Step livraison |
|---|-------|------|----------------|
| 1 | `/agence` | AgenceDashboard | Phase 16.0.6 |
| 2 | `/agence/simulateur` | AgenceSimulateur | Step 2 (cf. log) |
| 3 | `/agence/score-vente` | AgenceScoreVente | Phase 16.0.6 |
| 4 | `/agence/leads` | AgenceLeads | Phase 16.0.6 |
| 5 | `/agence/contributions` | AgenceContributions | Step 1 |
| 6 | `/agence/reseaux-sociaux` | AgenceSocial | Step 4 |
| 7 | `/agence/parrainage` | AgenceParrainage | Step 6 |
| 8 | `/agence/equipe` | AgenceEquipe | Step 7 |
| 9 | `/agence/qr-code` | AgenceQRCode | Step 8 |
| 10 | `/agence/messages` | AgenceMessages | Step 9 |
| 11 | `/agence/progression` | AgenceProgression | Step 1 |
| 12 | `/agence/abonnement` | AgenceAbonnement | Phase 16.0.6 |
| 13 | `/agence/profil` | AgenceProfil | Phase 16.0.6 |

Routes **publiques liées** :
- `/inscription/agence` — onboarding 6 étapes (Step 6 ajoute `?ref=` parrainage)
- `/a/:agenceId` — vitrine publique QR code (Step 8)
- `/contact?agence=<id>` — capte attribution lead (post-audit)

---

## 2. Modèle de données livré

### Tables créées Phase 16.1

| Table | Rôle |
|-------|------|
| `brh_agence_contributions` | Apport prospect par l'agence (Step 1) |
| `brh_agence_progression` | Paliers bronze/silver/gold/platinum + bonus_leads_unlocked |
| `brh_agence_simulations` | Simulations sauvegardées (inputs JSONB + result + lien lead) |
| `brh_agence_social_posts` | Publications réseaux + récompense leads (validées par admin) |
| `brh_agence_referral_commissions` | Commissions parrainage 100€ HT/charte signée |
| `brh_agence_members` | Équipe agence (signer + employees + permissions JSONB) |
| `brh_prospect_studies` | Cache études (utilisé par Mes leads + simulator) |

### Colonnes ajoutées

| Table | Colonne | Step |
|-------|---------|------|
| `brh_agences_immo` | `referred_by_agence_id UUID` | Step 6 |
| `brh_contacts` | `referred_by_agence_id UUID` | Audit P1 |
| `brh_message_threads` | CHECK étendu : `agence`, `artisan` | Step 9 |

### Triggers SQL

| Trigger | Fait quoi | Step |
|---------|-----------|------|
| `trg_brh_agence_contrib_progression` | Recalcule palier sur INSERT/UPDATE/DELETE contribution | Step 1 |
| `trg_brh_agence_social_reward` | Sur validee → +leads dans progression | Step 4 |
| `trg_brh_agence_referral_commission` | Charte parrainée → active = +100€ HT pending | Step 6 |
| `brh_agence_signer_to_member` | Charte active = signer auto-ajouté à `brh_agence_members` | Step 7 |

### Helpers SECURITY DEFINER

Tous avec `SET search_path = ''` (règle anti-bug #12).

| Fonction | Usage |
|----------|-------|
| `brh_user_is_active_agence_signer()` | Legacy (RLS Phase 16.0.6 — encore référencé sur `brh_agence_subscriptions` + autres) |
| `brh_user_has_agence_access()` | True si signer OR employee actif (utilisé par RLS élargies) |
| `brh_user_belongs_to_agence(agence_id)` | True si signer OR employee de l'agence cible |
| `brh_user_is_signer_of_agence(agence_id)` | True si signer uniquement (writes admin agence) |
| `brh_get_public_agence(agence_id)` | RPC public vitrine (filtre status='partenaire') |
| `brh_agence_invite_employee(email, perms)` | Invite par email d'un compte BRH existant |
| `brh_agence_set_member_permissions(member_id, perms)` | Edit permissions JSONB |
| `brh_agence_remove_member(member_id)` | Retrait employé |

### 5 permissions JSONB employé (`brh_agence_members.permissions`)

| Clé | Description |
|-----|-------------|
| `canManageLeads` | Voir + claim prospects scorés |
| `canSimulate` | Lancer simulateur + sauvegarder études |
| `canShareSocial` | Soumettre publications réseaux |
| `canViewCommissions` | Voir commissions, abonnement, parrainage |
| `canManageTeam` | Inviter / retirer / régler permissions des autres employés |

---

## 3. Boucles fonctionnelles end-to-end

### A — Boucle parrainage agences (Step 6)
1. Agence A va sur `/agence/parrainage` → copie son lien `…/inscription/agence?ref=<idA>`
2. Partage WhatsApp / Email / LinkedIn (3 boutons)
3. Agence B clique → onboarding 6 étapes → signe charte → `referred_by_agence_id = idA`
4. Trigger SQL `trg_brh_agence_referral_commission` (AFTER INSERT/UPDATE sur `brh_partner_contracts`) déclenche la commission 100 € HT pending
5. Agence A voit la commission dans `/agence/parrainage` (KPI cards + table)

### B — Boucle vitrine QR (Step 8 + audit P1)
1. Agence va sur `/agence/qr-code` → mode "Vitrine prospect"
2. URL générée = `…/a/<agenceId>` → QR PNG téléchargé / imprimé
3. Prospect scanne → arrive sur page publique vitrine (RPC `brh_get_public_agence` filtre partenaires actifs)
4. Clique "Demander ma simulation" → `/contact?agence=<id>`
5. ContactForm capte `?agence=` (regex UUID v4) → bandeau orange visible → INSERT avec `referred_by_agence_id`
6. ⏳ **Admin doit ensuite voir le lead avec attribution** (cf. § Reste admin)

### C — Boucle réseaux sociaux (Step 4 + Step 1 admin validation)
1. Agence va sur `/agence/reseaux-sociaux` → soumet URL + screenshot d'une publication
2. Status `attente_validation`
3. Admin sur `/admin/agence-social-posts` valide ou refuse (Step 5)
4. Validation → trigger SQL crédite +5 leads (FB/IG/LI), +8 (TikTok), +3 (Google) sur `brh_agence_progression.bonus_leads_unlocked`
5. Plafond 2 publications validées/mois (max +10 leads bonus mensuels)

### D — Boucle équipe agence (Step 7 + audit P0)
1. Signer va sur `/agence/equipe` → "Inviter un employé" (modal email + checkboxes permissions)
2. RPC `brh_agence_invite_employee` lookup profile.email → INSERT `brh_agence_members`
3. Employé se connecte → `useMyAgenceMembership` détecte la ligne → AgenceGuard accepte
4. Employé voit le portail mais permissions JSONB filtrent l'accès (V1 : RLS écritures restent signer-only via RPC)

### E — Boucle messagerie (Step 9)
1. Agence sur `/agence/messages` → "Nouveau message" → INSERT thread `participant_type='agence'`
2. Realtime préservé (existing publication `brh_messages`)
3. Admin BRH lit côté Supabase dashboard (cf. § Reste admin pour UI manquante)

---

## 4. ⏳ Reste à faire côté admin BRH (session dédiée à venir)

### Priorité 1 — Lecture & traitement leads attribués

#### `/admin/leads-agences` (à créer)
- Lister tous les leads `brh_contacts` filtrés sur `referred_by_agence_id IS NOT NULL`
- Afficher l'agence parrainante (JOIN `brh_agences_immo`)
- KPI : leads attribués 7j/30j/90j par agence + ROI vitrine QR
- Action : convertir un lead vers `brh_lead_assignments` (claim auto par l'agence d'origine)

#### Étendre `/admin/contacts` (existant)
- Ajouter colonne "Origine agence" sur la liste
- Filtre "Trafic direct" / "Via agence X"
- Lien clickable vers fiche agence

### Priorité 2 — Messagerie admin

#### `/admin/messagerie` (à créer)
- **Gap pré-existant** : aucune UI admin pour lire les threads. Vaut aussi pour Pro et Particulier.
- Cloner `MessagesPage.tsx` mais utiliser un nouvel RPC `get_admin_threads_enriched()` (lit tous les threads, pas filtré par participant_id)
- Filtre par participant_type (pro / particulier / agence / artisan)
- Quick reply inline
- Realtime déjà actif côté DB

### Priorité 3 — Validation & supervision

#### `/admin/agence-contributions` (à créer)
- Lister les apports prospects soumis par les agences
- Status (en_traitement, accepted, refused) + raison admin
- Notification automatique agence à chaque changement de status

#### `/admin/agence-referrals` (à créer)
- Cockpit des commissions parrainage agences
- Status (pending → validated → paid → cancelled)
- Bouton "Marquer payée" + génération facture
- Total dû par agence parrainante

#### `/admin/agence-simulations` (à créer ou widget admin)
- Voir toutes les simulations sauvegardées par les agences
- Filtre par agence + période
- Stats : N simulations / mois, taux conversion vers lead claimed

### Priorité 4 — Visualisation flotte agences

#### `/admin/carte-agences` (à créer)
- Carte Leaflet des `brh_agences_immo` (déjà avec lat/lng)
- Filtre status + tier abonnement + dernière activité
- Heatmap des leads attribués via QR vitrine

#### `/admin/equipes-agences` (à créer)
- Vue admin de tous les `brh_agence_members` (signer + employees)
- Audit : permissions accordées par signer
- Détection orphelins (employés dont l'agence est cancelled)

### Priorité 5 — Edge functions / Notifications

- EF `notify-new-lead-agence` : email auto à l'agence quand un lead arrive via son QR
- EF `notify-commission-validated` : email à l'agence quand commission 100€ devient `validated`
- EF `monthly-recap-agence` : récap mensuel chaque 1er du mois (leads claimed, simulations, commissions, ranking palier)

### Priorité 6 — Dette & migrations

- 5 colonnes NUMERIC violant règle #2 (commissions invoices) → décision Philippe attendue
- Régénérer `database-generated.ts` (manque les nouvelles tables Phase 16.1)
- Migration permission policies pour les **employés** sur `brh_agence_referral_commissions` + `brh_agence_subscriptions` (actuellement signer-only — lecture refusée employés)

---

## 5. Test plan pour Philippe

Pour valider en main propre le portail agence avant la session admin :

### Test signer (existant : `agence@brh-test.fr` ou compte réel)
- [ ] Login → `/agence` charge sans flash
- [ ] Sidebar 13 entrées visibles, toutes cliquables
- [ ] `/agence/simulateur` : adresse rapide BAN + manuel 6 étapes + sauvegarde + reprise via `?simId=`
- [ ] `/agence/leads` : carte Leaflet OK + clic sur prospect ouvre `ProspectStudyPanel` + bouton "Simuler"
- [ ] `/agence/score-vente` : 59 255 prospects affichés + claim fonctionne
- [ ] `/agence/contributions` : form complet + RGPD + soumission OK
- [ ] `/agence/reseaux-sociaux` : URL + screenshot upload + status `attente_validation`
- [ ] `/agence/parrainage` : copy lien + 3 share buttons + tables vides au démarrage
- [ ] `/agence/equipe` : "Inviter un employé" → modal + permissions toggles
- [ ] `/agence/qr-code` : 2 modes (vitrine / parrainage) + download PNG haute résolution
- [ ] `/agence/messages` : "Nouveau message" → thread créé + envoie message
- [ ] `/agence/progression` : palier affiché + bonus_leads
- [ ] `/agence/abonnement` : tier actuel
- [ ] `/agence/profil` : infos agence éditables (signer-only)

### Test vitrine publique
- [ ] `/a/<agenceId>` (id d'une agence partenaire active) → fiche + CTA
- [ ] `/a/inexistant-uuid` → page "Agence introuvable"
- [ ] `/a/<id-prospect>` (status≠partenaire) → page "Agence introuvable" (bonne sécurité)

### Test parrainage
- [ ] `/inscription/agence?ref=<agenceA>` → onboarding → signe charte → vérifier en DB `brh_agence_referral_commissions` row pending pour agenceA

### Test contact attribution
- [ ] `/contact?agence=<agenceId>` → bandeau orange visible
- [ ] Submit → vérifier en DB `brh_contacts.referred_by_agence_id` = agenceId

### Test employé (à créer manuellement via signer)
- [ ] Signer invite `employee@test.fr` (qui doit avoir un compte BRH)
- [ ] Employé login → `/agence` accessible (pas de redirect `/tableau-de-bord`)
- [ ] Employé voit `/agence/equipe` mais sans bouton "Inviter" (`isSigner = false`)

---

## 6. État qualité

- ✅ Tests : 353/353 verts
- ✅ TS strict : clean
- ✅ ESLint : clean
- ✅ Build prod : 24.89s, code-split OK
- ✅ 14 règles anti-bug respectées partout (cf. log.md)
- ✅ CI Github : verte sur `main` HEAD (commit 6a577b9)
- ✅ Vercel auto-deploy : déclenché sur chaque push main
- ✅ Wiki Karpathy : log.md à jour, cette page créée

---

## 7. Liens utiles

- Algo Score Vente : [score-vente-agences.md](score-vente-agences.md)
- Pre-mortem Phase 16 : [score-vente-amelioration-pre-build.md](score-vente-amelioration-pre-build.md)
- Architecture globale : [architecture-snapshot.md](architecture-snapshot.md)
- Modèle données : [data-model.md](data-model.md)
- Journal modifs : [log.md](log.md)
