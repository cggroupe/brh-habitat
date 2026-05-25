# Bugs ouverts — BRH (page de suivi)

> Liste vivante des bugs UI/UX/perf de BRH Habitat. Mise à jour à chaque correction.
>
> Page extraite le 21/05 de `bugs-and-data-strategy-2026-05-21.md` lors de la Phase 0 de refonte.

---

## État au 2026-05-21

### Dette technique Phase C+D (2026-05-24) — data + perf/tests

| # | Item | Avant | Après | Status |
|---|------|-------|-------|--------|
| C1 | `brh_ext_commune` dept 44 | 0 / 207 communes | 207 communes (16/63 col remplies via seed-commune-bretagne) | 🟡 partiel — 47 col ad-hoc à part |
| C1 bis | Score V2 DPE 44 | avg 5 fixe, max 5 (E) | avg 13, max 25 (E), via INSEE commune | ✅ migration `20260524120000` |
| C2 | `adresse_ban_id` `brh_personnes_historique` | 0 / 18 571 | ~93% hit rate, batch 18 218 lancé | 🟡 finalise en background ~40 min |
| C3 | BDNB Bretagne ingestion | 0 / 1.5M | DEFERRED (40GB décompressé, sprint dédié) | 🟡 recette documentée |
| C4 | IRIS véritable pour DPE 44 | 0 / 38k | DEFERRED (shapefile IGN + PostGIS, sprint 4-6h) | 🟡 recette documentée |
| D1 | Bundle Vite warning > 600KB | warning permanent | seuil 1600KB justifié (react-pdf lazy chunk) | ✅ build vert |
| D2 | Tests coverage helpers BRH | 21 fichiers / 390 tests | 23 fichiers / 416 tests (+26) | ✅ format-fr + utils |

**Backlog à reprendre en sprints dédiés** (3 items reportés avec recettes complètes dans log.md) :
- C1 complet (47 colonnes commune 44 via ingestions ad-hoc Enedis/INSEE/LOVAC/Géorisques) — ~10-15h
- C3 BDNB Bretagne (instance PG locale + extract CSV minimal) — ~10-20h
- C4 IRIS shapefile IGN + PostGIS (point-in-polygon batch) — ~4-6h
- B4 résolution complète (193 erreurs TS sur 59 fichiers API) — ~10-15h sprint avec validation runtime

---

### Dette technique Phase B (2026-05-24) — anti-patterns code

| # | Item | Avant | Après | Status |
|---|------|-------|-------|--------|
| B4 (B01) | Client Supabase typé `<Database>` | non typé | hybride (`supabase` rétrocompat + `supabaseTyped` typé) | 🟡 partiel — sprint dédié requis pour 193 erreurs TS |
| B3 | `toISOString().slice(0,10)` (règle #13) | 6 occurrences | 0 (sauf commentaire helper) | ✅ |
| B1 | `as unknown as` (règle #4) | 53 occurrences | 26 légitimes (-51%) | ✅ batch + refactor FicheAdresseView |
| B2 | `USING (true)` (règle #8) — audit prod | 60+ policies, 1 vuln | vuln droppée, ~60 légitimes documentées | ✅ migration `20260524110000` |

**Vulnérabilité B2 détaillée** : `brh_agence_audits.agence_audits_respond_anon` permettait UPDATE anon avec `qual=true AND with_check=true` sans validation `response_token`. Aucune route frontend → policy inutilisée → DROP. **Résolu 25/05 (Phase 2)** : RPC SECURITY DEFINER `brh_audit_respond(p_token, p_feedback, p_feedback_message)` (migration `20260525120000`) + page publique `/audit/respond?token=xxx` ([src/pages/public/AuditRespondPage.tsx](../../src/pages/public/AuditRespondPage.tsx)) avec validation atomique (FOR UPDATE), enum feedback (5 valeurs), message max 2000 chars. GRANT EXECUTE TO anon. Test E2E happy path + replay + token invalide + feedback invalide tous passants.

---

### Bugs CORRIGÉS en local — 4 commits en attente de push

| # | Bug | Fix | Commit | Status |
|---|-----|-----|--------|--------|
| B1 | Fiche client "bodard francois" — nom en minuscules | `formatNameFr()` capitalise mots + tirets + apostrophes | `1bcd4e7` | ✅ Local, non pushé |
| B2 | Téléphone brut `0683533275` | `formatPhoneFr()` → `06 83 53 32 75` (gère +33) | `1bcd4e7` | ✅ Local, non pushé |
| B3 | Adresse dupliquée `14 rue bugeaud 29200 Brest France · 29200 Brest` | `formatFullAddress()` détecte CP/ville déjà présents | `1bcd4e7` | ✅ Local, non pushé |
| B4 | DPE 14 rue Bugeaud apparaît sur fiche Bodard sans tag, alors qu'il est détenu par SCI La Colline (Bodard n'est PAS dirigeant) | Tag "Occupant · SCI X détient" + calcul `dpe_role` (proprietaire/dirigeant/occupant) dans RPC v2 `brh_personne_360` | `7f4b724` | ✅ Local, non pushé + ⚠️ migration BD attente push |
| B5 | Postes DPE (isolation murs/plancher/toiture/ventilation/chauffage/ECS) non modifiables | `DpePostesEmployeePanel` + RPC `brh_dpe_employee_update` (7 postes whitelistés, 4 status, audit `employee_overrides` JSONB) | `7f4b724` | ✅ Local, non pushé + ⚠️ migration BD attente push |

**⚠️ Conflit timestamp détecté 21/05** : `20260520100000_brh_dpe_employee_overrides.sql` partage le même préfixe que `20260520100000_brh_prospect_letters.sql` (Phase 13 killer feature, déjà appliquée prod). Renommer en `20260520105000_*` avant push. Décision Philippe 21/05 : **suspendre push, fix au push final Phase 5**.

**✅ Dette `schema_migrations` refonte 21/05 — RÉSOLUE Phase 5** :
- 8 migrations Phase 2-4 (`20260521100000` → `20260521170000`) appliquées en prod via Management API et `supabase migration repair --status applied` → trackées
- 2 migrations Sprint 20/05 (`20260520105000_brh_dpe_employee_overrides` renommé depuis `20260520100000` pour fix conflit timestamp + `20260520110000_rpc_brh_personne_360_dpe_role`) appliquées via Management API + repair → trackées
- Smoke tests E2E OK : f_unaccent, brh_normalize_adresse, brh_dirigeant_sci (18 342 rows dept 29), autres_entreprises enrichi (5 300 dirigeants), brh_client_foncier_at_address, brh_dirigeants_search v3 (drop v2 inline pour propreté)

**✅ Dette technique HÉRITÉE — RÉSOLUE Phase A (2026-05-24)** :
- **76 migrations héritées** (17/05 → 06/07) auditées objet-par-objet via `scripts/audit-untracked-migrations.py` : verdict **65 SAFE_REPAIR + 7 SAFE_REPAIR seeds + 4 SAFE_REPAIR refonte ultérieure**.
- **Collision timestamp `20260706200000`** : `brh_artisan_phase_17_1.sql` renommé en `20260706200001` (Phase 17 logique après Phase 16 unified).
- **Batch repair** via `scripts/repair-untracked-migrations.py` (INSERT direct sur `supabase_migrations.schema_migrations`) : 77 versions tracked. **DB live : 155/155 migrations alignées avec les fichiers locaux** (0 untracked).
- **Drifts acceptés** (refontes ultérieures non bloquantes) : index `brh_ext_commune_basias` → renommé `basias_lourd` ; policy `agences_immo_select_signer` → 3 policies plus granulaires ; index `brh_companies_active_level` + `brh_ext_commune_sru_carencee` absents (pas de gain perf observé).
- **Migration corrective `20260524100000_add_employe_to_role_check`** : étend `profiles.role_check` à `'employe'` (29 RPCs filtrent dessus + frontend `ReseauPortalShell/ReseauGuard/ArtisanGuard` ; jusqu'ici workaround `role='admin'` pour les employés). Aucun backfill : Pierre Collard reste admin car `EmployeGuard` route via whitelist email (`brh_employees` table), pas via `profiles.role`. Futurs employés à créer directement avec `role='employe'`.

---

### Bugs ENCORE OUVERTS

| # | Bug | Diagnostic | Action requise | Phase plan |
|---|-----|------------|----------------|------------|
| ~~**B6**~~ | ~~Filtre "Propriétaire DPE BRH" page `/employe/dirigeants` paraît inopérant~~ | ✅ **RÉSOLU Phase 4 (21/05)** — RPC v3 `brh_dirigeants_search` ajoute param `p_order_by` (patrimoine / nom / sci_count). UI : sélecteur tri visible + bascule auto `nom → patrimoine` si filtre actif + bandeau "Filtré par : …" listant chaque filtre actif + bouton "Tout effacer". Migration `20260521170000_rpc_brh_dirigeants_search_v3.sql`. | Phase 4 ✅ |
| ~~**B7**~~ | ~~Fiche dirigeant SCI ne montre pas les éléments fonciers complets~~ | ✅ **RÉSOLU Phase 2D + 6B (21/05)** — Section "Autres entreprises (hors SCI)" + bandeau contact pro distingué Phase 2D. **Mini-carte des biens** ajoutée Phase 6B (RPC v2 retourne lat/lng + composant `DirigeantBienMiniMap` lazy avec markers CircleMarker couleur DPE + fitBounds auto). Reste P3 si demandé : score patrimoine agrégé, mutations DVF historique. | Phase 2D + 6B ✅ |
| ~~**B8**~~ | ~~"Leads BRH vue unifiée" mélange clients + prospects~~ | ✅ **RÉSOLU Phase 4 (21/05)** — Titres + sous-titres explicites : `/employe/leads-v2` = "Prospects DPE F/G — Vue unifiée · Adresses à conquérir (passoires). Pour vos contacts BRH historiques, voir Clients BRH." `/agence/leads-v2` = "Prospects Foncier · DPE F/G de votre zone — propriétaires anonymisés (RGPD)." Prop `subtitle` ajouté à `UnifiedLeadsView`. Confusion levée par sémantique métier sans changement data. | Phase 3 partiel + Phase 4 ✅ |
| ~~**B8bis**~~ | ~~Têtes de mort résiduelles dans segment "succession en cours"~~ | ✅ **RÉSOLU Phase 2D (21/05)** — Source identifiée : icône Lucide `Skull` utilisée dans 9 fichiers (8 composants + 1 page). Tous remplacés par `AlertTriangle` (ton pro). Avatar dirigeant : `User` normal même si décédé, contexte porté par badge texte. | Phase 2D ✅ |

---

### Bug PERFORMANCE silencieux

| # | Bug | Diagnostic | Phase plan |
|---|-----|------------|------------|
| ~~**B9**~~ | ~~RPC `brh_dirigeants_search` timeout (>8s) quand on combine filtre département + n'importe quel autre filtre~~ | ✅ **RÉSOLU Phase 2B (21/05)** — Table de liaison `brh_dirigeant_sci(dirigeant_id, siren, departement)` créée avec 3 index. Backfill 87 127 lignes. RPC `brh_dirigeants_search` v2 réécrit avec JOIN au lieu de `jsonb_array_elements`. **Perf : 841ms** (vs >8s avant) sur dept 29 + multi_sci + proprio_dpe combinés. Migrations `20260521130000` + `20260521140000`. | Phase 2B ✅ |

---

### Filtres "Mes leads" — bugs UX (issus du message Philippe 21/05)

Onglet `/agence/leads-v2` (et `/employe/leads-v2`) — composant [UnifiedLeadsView.tsx](../../src/components/leads/UnifiedLeadsView.tsx) lignes 45-76 :

| # | Problème | Action | Phase |
|---|----------|--------|-------|
| F1 | Segments incompréhensibles (ultra-chaud / MPR bleu / prio / standard / froid) | Renommer + tooltips explicatifs (ex. "Ultra-chaud → travaux probables <6 mois") | Phase 4 |
| F2 | Score non expliqué | Popover tooltip avec formule 3 lignes | Phase 4 |
| F3 | DPE figé F/G (toggle "passeport thermique") — impossible de sélectionner E | Multi-select F + G + **E** activés (décision D-3 du 21/05) | Phase 4 |
| F4 | Délais visibles mais pas sélectionnables | Activer filtre "Délai mutation DVF" (12m / 24m / 36m / 60m) | Phase 4 |
| F5 | Chargement lent (impact perf B9) | Audit React Query staleTime + pagination cursor sur `unified_leads` | Phase 4 (après fix B9) |

---

## Suivi par phase plan-refonte-2026-05-21

| Phase | Bugs couverts |
|-------|---------------|
| Phase 0 (en cours) | — documentation uniquement |
| Phase 1 | — spec matching (aucun bug direct) |
| Phase 2 | **B7** (fiche dirigeant enrichie) + ~~**B9**~~ ✅ (perf RPC résolu 21/05) |
| Phase 3 | **B8** partiel (séparer clients/prospects côté employé) |
| Phase 4 ✅ | B6 (résolu) + B8 (résolu) + B8bis (résolu Phase 2D) + F1/F2/F3/F5/F6 (résolus) |
| Phase 6 ✅ (post-refonte, backlog P3) | F4 délais 12/24/36/60m (résolu, filtre client-side `dvf_date`) + B7 final mini-carte dirigeant (RPC v2 lat/lng + composant Leaflet lazy) + Sitadel branché RPC v2 + UI permis (actif dès ingest) |
| Phase 5 | Push prod + résolution conflit timestamp `20260520100000` |

---

**Dernière maj** : 2026-05-21 (Phase 0 refonte) — Claude Opus 4.7
