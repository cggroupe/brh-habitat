# Bugs ouverts — BRH (page de suivi)

> Liste vivante des bugs UI/UX/perf de BRH Habitat. Mise à jour à chaque correction.
>
> Page extraite le 21/05 de `bugs-and-data-strategy-2026-05-21.md` lors de la Phase 0 de refonte.

---

## État au 2026-05-21

### Bugs CORRIGÉS en local — 4 commits en attente de push

| # | Bug | Fix | Commit | Status |
|---|-----|-----|--------|--------|
| B1 | Fiche client "bodard francois" — nom en minuscules | `formatNameFr()` capitalise mots + tirets + apostrophes | `1bcd4e7` | ✅ Local, non pushé |
| B2 | Téléphone brut `0683533275` | `formatPhoneFr()` → `06 83 53 32 75` (gère +33) | `1bcd4e7` | ✅ Local, non pushé |
| B3 | Adresse dupliquée `14 rue bugeaud 29200 Brest France · 29200 Brest` | `formatFullAddress()` détecte CP/ville déjà présents | `1bcd4e7` | ✅ Local, non pushé |
| B4 | DPE 14 rue Bugeaud apparaît sur fiche Bodard sans tag, alors qu'il est détenu par SCI La Colline (Bodard n'est PAS dirigeant) | Tag "Occupant · SCI X détient" + calcul `dpe_role` (proprietaire/dirigeant/occupant) dans RPC v2 `brh_personne_360` | `7f4b724` | ✅ Local, non pushé + ⚠️ migration BD attente push |
| B5 | Postes DPE (isolation murs/plancher/toiture/ventilation/chauffage/ECS) non modifiables | `DpePostesEmployeePanel` + RPC `brh_dpe_employee_update` (7 postes whitelistés, 4 status, audit `employee_overrides` JSONB) | `7f4b724` | ✅ Local, non pushé + ⚠️ migration BD attente push |

**⚠️ Conflit timestamp détecté 21/05** : `20260520100000_brh_dpe_employee_overrides.sql` partage le même préfixe que `20260520100000_brh_prospect_letters.sql` (Phase 13 killer feature, déjà appliquée prod). Renommer en `20260520105000_*` avant push. Décision Philippe 21/05 : **suspendre push, fix au push final Phase 5**.

**⚠️ Dette `schema_migrations` Phase 2A** : 3 migrations Phase 2A (`20260521100000_brh_unaccent_extension`, `20260521110000_brh_adresse_normalized_columns`, `20260521120000_brh_adresse_match_rpc`) appliquées en prod via Management API directement (raison : besoin d'auditer le taux de match en place + accélérer Phase 2B/C/D qui dépendent des colonnes normalisées). Ces 3 migrations existent dans `supabase/migrations/` localement mais ne sont PAS dans `schema_migrations` côté Supabase. **À réparer Phase 5** :
```bash
supabase migration repair --status applied 20260521100000 20260521110000 20260521120000
# puis supabase db push pour les autres migrations en attente
```

---

### Bugs ENCORE OUVERTS

| # | Bug | Diagnostic | Action requise | Phase plan |
|---|-----|------------|----------------|------------|
| ~~**B6**~~ | ~~Filtre "Propriétaire DPE BRH" page `/employe/dirigeants` paraît inopérant~~ | ✅ **RÉSOLU Phase 4 (21/05)** — RPC v3 `brh_dirigeants_search` ajoute param `p_order_by` (patrimoine / nom / sci_count). UI : sélecteur tri visible + bascule auto `nom → patrimoine` si filtre actif + bandeau "Filtré par : …" listant chaque filtre actif + bouton "Tout effacer". Migration `20260521170000_rpc_brh_dirigeants_search_v3.sql`. | Phase 4 ✅ |
| **B7** | Fiche dirigeant SCI ne montre pas les éléments fonciers complets | ✅ **PARTIEL Phase 2D** — Section "Autres entreprises (hors SCI)" + bandeau contact pro distinguant perso/pro ajoutés. Reste P3 si Philippe le demande : mini-carte des biens (DVF+DPE), score patrimoine agrégé, mutations DVF historique. | Phase 2D (partiel) |
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
| Phase 4 ✅ | B6 (résolu) + B8 (résolu) + B8bis (résolu Phase 2D) + F1/F2/F3/F5/F6 (résolus). F4 délais reporté P3. |
| Phase 5 | Push prod + résolution conflit timestamp `20260520100000` |

---

**Dernière maj** : 2026-05-21 (Phase 0 refonte) — Claude Opus 4.7
