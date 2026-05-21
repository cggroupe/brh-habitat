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
| **B6** | Filtre "Propriétaire DPE BRH" page `/employe/dirigeants` paraît inopérant | Faux bug technique : RPC fonctionne, 80 844 → 17 403. Mais tri par défaut `nb_dpe_total DESC` met déjà tous les propriétaires en tête → top 5 identique avec/sans filtre. Seul le compteur change. | Tri conditionnel (nom A→Z par défaut, patrimoine DESC si filtre coché) + compteur + bandeau "Filtré par : …" | Phase 4 |
| **B7** | Fiche dirigeant SCI ne montre pas les éléments fonciers complets | Aujourd'hui : liste DPE détenus + BODACC + détails SCI. Manque : mutations DVF, mini-carte des biens, score patrimoine agrégé, carnet de bord BRH, autres entreprises du dirigeant (pivot P-C) | Décision Philippe nécessaire — voir [hub-sci-dirigeant.md](hub-sci-dirigeant.md) | Phase 2 |
| **B8** | "Leads BRH vue unifiée" mélange clients + prospects | Confusion utilisateur : on voit des contacts BRH (déjà facturés) et des prospects DPE F/G (jamais contactés) sans distinction. | Investiguer routes `/agence/leads-v2` vs `/employe/clients-brh`, identifier doublon. Séparer clairement les 2 segments. | Phase 3 + Phase 4 |
| **B8bis** | Têtes de mort résiduelles dans segment "succession en cours" | Grep ☠/💀 dans `src/` = 0 occurrence → source probable : icône Lucide `Skull`, caractère UTF-8 alternatif, ou rendu côté Postgres | Localiser et supprimer | Phase 4 (début) |

---

### Bug PERFORMANCE silencieux

| # | Bug | Diagnostic | Phase plan |
|---|-----|------------|------------|
| **B9** | RPC `brh_dirigeants_search` timeout (>8s) quand on combine filtre département + n'importe quel autre filtre | Cause : `EXISTS (SELECT FROM jsonb_array_elements(d.sci_dirigees) JOIN brh_sci_companies …)` sans index. Sur 80 844 dirigeants × 1-N SCI chacun, full scan. **Fix proposé** : matérialiser une colonne `departements text[]` sur `brh_dirigeants` + index GIN. Ou créer table de liaison `brh_dirigeant_sci(dirigeant_id, siren, departement)` avec index. | Phase 2 (bloquant pour Phase 4 où on étend les filtres) |

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
| Phase 2 | **B7** (fiche dirigeant enrichie) + **B9** (perf RPC) |
| Phase 3 | **B8** partiel (séparer clients/prospects côté employé) |
| Phase 4 | **B6** + **B8** (final) + **B8bis** + **F1** à **F5** |
| Phase 5 | Push prod + résolution conflit timestamp `20260520100000` |

---

**Dernière maj** : 2026-05-21 (Phase 0 refonte) — Claude Opus 4.7
