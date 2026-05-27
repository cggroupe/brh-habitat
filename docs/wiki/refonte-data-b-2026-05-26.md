# Refonte Data-B — Session 26-27 mai 2026

> **Date** : 2026-05-26 / 2026-05-27
> **Trigger** : Philippe a utilisé Data-B en immersion. Verdict initial : *« on n'est pas du tout pareil en termes d'information et de parcours utilisateur. On manque encore de rangement. On est loin d'arriver à leur cheville. »*
> **Cible** : reproduire la grammaire UI + UX de Data-B + boucher 3 trous data majeurs (parsing dirigeants, désync JSONB, enrichissement tel/email)
> **Pattern** : Karpathy LLM Wiki — cette page est la source de vérité de la session.
>
> **Pages wiki liées** : [index.md](index.md) · [log.md](log.md) (entrée 2026-05-26 + 2026-05-27) · [data-model.md](data-model.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md) · [foncier-pro-blueprint.md](foncier-pro-blueprint.md)

---

## 1. Vision : 12 patterns Data-B à reproduire

Identifiés via immersion site + doc.

1. **Triptyque vertical figé** sur fiche adresse (RDC / Étages / Occupants — même si vide)
2. **Squelette unique** de carte propriétaire (6 zones identiques toujours)
3. **Header entité sticky** + breadcrumb cliquable persistant
4. **Onglets contextuels** (swappent panneau, jamais URL)
5. **Compteur = bouton** (cliquable, drill-down)
6. **Score = catégorie sémantique** (pas chiffre brut)
7. **Trou de donnée = parcours** (jamais cul-de-sac)
8. **Distinction utility vs patrimoine** (badge typé)
9. **Sauvegarde inline** (bouton change d'état, pas toast)
10. **Mini-récap entité d'origine** sur drill-down
11. **Pagination intelligente** pour SCI géantes (résumé + filtres + virtualisé)
12. **Actions inline standardisées** partout

Plus 2 design references **Stitch** internes au repo (`.stitch/designs/`) :
- `liste-leads-v2.png` — table classique colonnes + tier pills + filtres pills
- `fiche-client-brh.png` — avatar + score tier + 2 colonnes (Suivi commercial / Profil psycho-IA) + Graphe Foncier 360°

---

## 2. Ce qui a été livré (14 commits + 10 migrations)

### 2.1 Composants UI — pattern Data-B / Editorial Habitat

| Composant | Pattern Data-B | Fichier |
|---|---|---|
| `StickyEntityHeader` | #3 — entité sticky avec KPI pills cliquables | `src/components/leads/fiche/StickyEntityHeader.tsx` |
| `OriginBanner` | #10 — mini-récap origine sur drill-down | `src/components/leads/fiche/OriginBanner.tsx` |
| `OwnerCard` (6 zones) | #2 — squelette unique propriétaire | `src/components/leads/fiche/OwnerCard.tsx` |
| `KpiHero` (4 cards) | #1 — 4 KPI hero en bandeau top | `src/components/leads/fiche/KpiHero.tsx` |
| `FicheEmptyState` | #7 — trou de donnée = parcours | `src/components/leads/fiche/FicheEmptyState.tsx` |
| `DgfipPivot` (Haversine) | #7 — 3 centres SIP/SIE proches si proprio anonyme | `src/components/leads/fiche/DgfipPivot.tsx` |
| `PatrimoineMassif` virtualisé | #11 — résumé + filtres + virtualisé @tanstack/react-virtual | `src/components/leads/fiche/PatrimoineMassif.tsx` |
| `Tabs` (Radix wrapper) | #4 — onglets persistés URL `?tab=X` | `src/components/ui/Tabs.tsx` |
| `TypedBadge` 6 variants | #6/#8 — score / dpe / entity-class / solvabilite | `src/components/ui/TypedBadge.tsx` |
| `ClickableCounter` | #5 — compteur = bouton (variantes inline/card) | `src/components/ui/ClickableCounter.tsx` |
| `PaginationInfo` | #11 — "X sur N" pour listes tronquées | `src/components/ui/PaginationInfo.tsx` |
| `DetailRow` (showEmpty) | #2 — toujours afficher zone même si "—" | `src/components/ui/DetailRow.tsx` |
| `StatBox` + `ProgressBar` | KPI compact + intent bars | `src/components/ui/*` |
| `navStackStore` Zustand 4 niveaux | #3 — breadcrumb persisté sessionStorage | `src/stores/navStackStore.ts` |
| `LeadRowItem` (TABLE Stitch) | grammaire `liste-leads-v2.png` | `src/components/leads/UnifiedLeadsView.tsx` |

### 2.2 Refonte des 3 fiches drill-down

**FicheAdresseView** : 3 Tabs (Propriétaire / Bâtiment & DPE / Voisinage) + Édition pour profil employé. OwnerCard pour SCI propriétaire. DgfipPivot si propriétaire anonyme.

**FicheEntrepriseView** : Sticky header + entity_class badge + solvabilité + KpiHero 4 stats + 4 Tabs Radix (Infos / Décideurs / Patrimoine / Activité) + `PatrimoineMassif` virtualisé si > 100 DPE.

**FichePersonneView** : Sticky + KpiHero distinguant patrimoine vs utility + 4-5 Tabs (Infos / Mandats / Patrimoine / **Activités pro** / Historique BRH). Nouveau tab "Activités pro" avec autres entreprises + contacts tel/email pro extraits.

### 2.3 Page `/agence/leads` — refonte design dashboard

- Layout `max-w-[1280px]`
- Header avec **font-display Epilogue 36px** + label tiny uppercase tracking
- **4 KPI cards** dashboard (Total / Ultra chauds / MPR Bleu / Standard) **avec vrais totaux DB** (RPC `brh_foncier_prospects_segment_counts`)
- Sidebar filtres `rounded-2xl` + accent `#00600a` + pleine hauteur
- **TABLE Stitch** (`<tr>` avec 8 colonnes : DPE / Adresse / Ville / Surface / Propriétaire / Segment / Score / chevron) au lieu de cards empilées
- Tag **"Particulier anonyme"** quand ni SCI ni client BRH

### 2.4 Bugs critiques corrigés

| Bug | Cause | Fix |
|---|---|---|
| **Henri Dorval / SCI 15 AV DE LA GARE** : fiche dirigeant vide | RPC `brh_sci_search_dirigeant` consulte uniquement table normalisée `brh_dirigeants`. 2007 SCI avaient leurs dirigeants seulement dans le JSONB `brh_sci_companies.dirigeants`, jamais synchronisés | Migration `20260527170000` : INSERT 6 663 dirigeants depuis JSONB + 9 209 liens `brh_dirigeant_sci` |
| **Parsing prénom/nom** (Alexandre Charles Jacques GINDRE) | `last = parts.slice(1).join(' ')` prenait `"CHARLES JACQUES GINDRE"` au lieu de `"GINDRE"` | Stratégie multi-essai dans `getFichePersonneByName` (last = 1, 2, 3 derniers mots) |
| **RPC `brh_foncier_prospects_unified` timeout 3s** sur 203k rows | `ORDER BY score_v2 DESC NULLS LAST` empêchait l'usage de l'index partiel + `count(*)` matérialisait les JOINs | Retire NULLS LAST + sépare le `cnt` CTE (count direct sans JOINs). **13s → 38ms** (×350) |
| **Filtre "Détenu par SCI"** timeout 6s | `WHERE owner_siren IS NOT NULL` forçait Parallel Seq Scan | Index composite partiel `brh_dpe_prospects_sci_score`. **6s → 54ms** (×111) |
| **KPI cards "0 ultra chauds, 14 MPR, 36 standard"** | Calcul sur 50 rows page courante au lieu du total DB | RPC `brh_foncier_prospects_segment_counts` (mig `20260527190000`) avec GROUP BY segment |
| **2 791 SCI "Entreprise introuvable"** | SIREN dans DPE mais absent du cache | Script `brh-ingest-sci-missing.py` → 1 924 ingest live. 467 throttle API à relancer |
| **React error #310** | `useEffect` après early returns | Hook remonté avec guard interne `if (!data) return` |
| **Erreur runtime preview Vercel** | Env vars Supabase non scopées Preview | Merge main + deploy prod direct |
| **4 erreurs ESLint CI rouge** | `_t` unused, `\"` inutiles, react-refresh export | Fix chirurgical par fichier |

### 2.5 Enrichissement data dirigeants

| Phase | Source | Volume |
|---|---|---|
| Resync `brh_dirigeants` depuis JSONB | mig `20260527170000` | +6 663 dirigeants (87 507 total), +9 209 liens SCI |
| Script `brh-ingest-sci-missing.py` | `recherche-entreprises.api.gouv.fr` | +1 924 SCI ingest (cache 38 815) |
| Script `brh-enrich-dirigeants-autres-entreprises.py --full-bzh` | `recherche-entreprises.api.gouv.fr` | **+61 091 dirigeants traités** (total 74 936) · **35 919 avec match** (47.5% hit rate) · **89 349 autres entreprises trouvées** |
| Script `brh-extract-tel-pro-entreprises.py` (Phase 2 Apify, en cours) | Apify Google Search | À ce stade : **1 254 tels pro** + **461 emails pro** extraits (6 200 / 15 000 SIREN scannés, ETA encore ~3h) |

### 2.6 Données nouvellement câblées dans les fiches

- `tel_pro_via_entreprise` → bouton vert cliquable `tel:` dans **sticky header** de la fiche personne + dans card "Activités pro"
- `email_pro_via_entreprise` → bouton stone cliquable `mailto:` (idem)
- `osint_telephone` / `osint_email` / `osint_linkedin` → section "Contacts pro extraits" du tab Activités pro
- `autres_entreprises[]` → tab dédié avec cards `rounded-2xl ring-1` (SIREN + dénom + activité + commune + tel/email Google si trouvé)
- `entity_class` (5 valeurs) → badge OwnerCard (SCI patrimoniale / Opérateur réseau / Bailleur social / Collectivité / Société)
- `solvabilite_estimee` (6 valeurs) → badge sticky header (Risque faible/modéré/élevé/Procédure/Cessée)

### 2.7 Palette Editorial Habitat (tokens)

- Plus aucun `emerald-*` clair fluo (`bg-emerald-50/100/200`)
- Vrai vert sombre `#00600a` UNIQUEMENT pour les accents (boutons primaires, signaux positifs)
- `bg-stone-50/100`, `ring-border-strong/20`, `text-text/text-muted/text-light` partout
- **rounded-2xl** (16px) au lieu de `rounded-lg`
- **font-display Epilogue** sur titres
- **Zéro émoji** (KPI cards utilisent dot couleur 1.5×1.5 au lieu de 📊🔥💧🏠)

---

## 3. Migrations Supabase appliquées (10)

| Version | Fichier | Effet |
|---|---|---|
| `20260527110000` | `brh_entity_class.sql` | colonne `entity_class` 5 valeurs + backfill |
| `20260527120000` | `brh_ext_dgfip_centres.sql` | table + RPC `brh_dgfip_nearest` Haversine |
| `20260527121000` | `brh_seed_dgfip_bzh.sql` | seed 35 centres SIP/SIE BZH |
| `20260527130000` | `rpc_brh_dpe_by_siren_paged.sql` | pagination serveur PatrimoineMassif |
| `20260527140000` | `brh_solvabilite_estimee.sql` | solvabilité 6 valeurs + backfill |
| `20260527150000` | `brh_foncier_prospects_unified_no_nulls_last.sql` | trace fix NULLS LAST |
| `20260527160000` | `rpc_foncier_prospects_fast.sql` | RPC fast streaming initial |
| `20260527170000` | `resync_brh_dirigeants_jsonb.sql` | resync 2007 SCI désync (bug Dorval) |
| `20260527180000` | `idx_sci_score_composite.sql` | index `brh_dpe_prospects_sci_score` |
| `20260527190000` | `rpc_foncier_prospects_segment_counts.sql` | KPI cards vrais totaux DB |

### Hot-patches sur RPC live (non versionnés en migration séparée)

- `brh_foncier_prospects_unified` : split `cnt` CTE (count sans JOINs) + retire NULLS LAST. **13s → 38ms**.
- `brh_sci_search_dirigeant` : reste inchangée, mais bénéficie du resync `brh_dirigeants` migration 20260527170000.

---

## 4. Ce qui reste à faire pour vraiment matcher Data-B

### 4.1 Patterns Stitch internes **PAS encore appliqués**

| Pattern Stitch | Statut | Effort estimé |
|---|---|---|
| **Avatar + Score tier visuel** sur fiche dirigeant (cf `fiche-client-brh.png`) | ❌ pas fait | 2-3h |
| **2 colonnes Suivi commercial / Profil psycho-commercial IA** | ❌ pas fait | 6-8h (nécessite IA prompt + RPC) |
| **Graphe Foncier 360° interactif** (relations visuelles avec arêtes) | ❌ pas fait | 12-15h (force-directed graph + RPC) |
| **Filtres pills horizontaux** style Stitch (`Tous départements / Avec téléphone / Avec email / Avec chiffre d'affaires / Avec RDV / DPE F ou G`) en haut de la liste | ❌ pas fait | 3-4h |
| **Colonne "Contacts" avec icônes tel/email** dans la TABLE leads | ❌ pas fait | 1-2h |
| **CA cumulé + dernier RDV** colonnes dans TABLE leads | ❌ pas fait | 2-3h |

### 4.2 Features Data-B propres **PAS encore implémentées**

| Feature Data-B | Statut | Effort |
|---|---|---|
| **Export CSV/XLSX** depuis liste leads | ❌ pas fait | 2-3h |
| **Génération courriers postaux automatiques** ("Écrire au propriétaire") | ❌ pas fait | 6-8h (intégration Merci Facteur ou La Poste API) |
| **Module Data SMS** (envoi SMS ciblé) | ❌ pas fait | 4-6h (Twilio ou Free SMS Gateway) |
| **Analyses IA "Analyser l'emplacement"** (commercialité + concurrents + points forts/faibles) | ❌ pas fait | 8-10h (Claude Sonnet + cache) |
| **Prédire le CA IA** depuis activité + nb salariés | ❌ pas fait | 6-8h (modèle régression simple) |
| **Listes sauvegardables** + tags + notes | ❌ partiel (favoris OK mais pas tags/notes) | 3-4h |

### 4.3 Dette technique cumulée

| Dette | Sévérité | Solution |
|---|---|---|
| **Workflow opposition art. 21 RGPD** (formulaire public + EF) | 🔴 bloquant légal grand public | 4-6h |
| Types Supabase pas re-générés (RPC en `as any`) | 🟡 moyen | 30 min : `supabase gen types typescript --project-id lygmmvxnmvlgynmrcpny` |
| Wiki Karpathy : `data-model.md`, `architecture-snapshot.md`, `hooks-reference.md` pas à jour | 🟡 moyen | 1-2h |
| Tests Playwright à enrichir avec rejeu des 11 cas audit 26/05 | 🟡 moyen | 2-3h |
| **MAJIC personnes morales open data** pas ingéré (~1-2M propriétaires nationaux) | 🟠 majeur (vrai pivot Data-B) | 8-10h (download data.gouv + ingest PostgreSQL) |
| **Dropcontact API** pas câblé (alternative légale enrichissement emails) | 🟡 moyen | 4-6h |
| **8 SCI résiduelles** non syncées (edge case dirigeants sans nom JSONB) | 🟢 négligeable | manuel |
| **467 SIREN throttle** Apify recherche-entreprises (retry plus tard) | 🟢 mineur | re-lancer le script `brh-ingest-sci-missing.py` |
| **34 146 SIREN** restants à scraper Apify Phase 2 (tel/email Google) | 🟡 moyen | $100 budget + 4-6h |
| **Score Vente Phase 16** pas affiché sur fiche dirigeant (existe en DB) | 🟡 moyen | 2-3h |
| **Tabs réfléchis** sur fiche entreprise/personne — l'utilisateur navigue via Tabs mais le contenu en dessous reste sections empilées dans certains tabs | 🟢 mineur | 2-3h |
| **PaginationInfo** dans tab Patrimoine SCI dirigeant : affichage tronqué à 100 sans "voir tout" | 🟡 moyen | 1-2h |

### 4.4 Sources data à ingérer pour rivaliser

| Source | Statut | Apport |
|---|---|---|
| MAJIC personnes morales DGFiP | ❌ | Pivot complet propriétaire foncier → entreprise (1-2M FR) |
| Pappers Premium API (49€/mois) | ❌ décision D-2 contre | Fraîcheur quotidienne SIRENE/INPI |
| Dropcontact API | ❌ | Enrichissement emails B2B RGPD-safe |
| RNB officiel (ID-RNB 12 caractères) | 🟠 partiel via BDNB | Standard inter-ministériel bâtiments |
| Tous départements France (actuel BZH only) | ❌ | Élargissement national |

---

## 5. Métriques avant/après session

| Métrique | Avant (26/05 matin) | Après (27/05 09h) | Delta |
|---|---|---|---|
| Dirigeants dans `brh_dirigeants` | 80 844 | **87 507** | +6 663 |
| Dirigeants avec autres entreprises enrichies | 6 872 | **35 919** | +29 047 (×5.2) |
| Total entreprises autres trouvées | 15 142 | **89 349** | +74 207 (×5.9) |
| Dirigeants avec tel pro | 779 | **1 254+** (en cours) | +475 |
| Dirigeants avec email pro | 0 | **461+** (nouveau, en cours) | +461 |
| SIREN cache `brh_sci_companies` | 36 491 | **38 815** | +2 324 |
| SCI désync JSONB ↔ table normalisée | 2 007 | **8** (edge case) | -1 999 |
| Migrations DB | 161 | **171** | +10 |
| Composants UI fiche/leads | 14 | **29** | +15 |
| Build prod (commit final) | n/a | **OK 22-31s** | green |
| Tests vitest | 426 | **470/470** | +44 |
| Lint+Typecheck CI | rouge (4 errors) | **green** | ✅ |
| RPC paginé timeout 3s | timeout | **38 ms** | ×350 plus rapide |
| Filtre "Détenu par SCI" | timeout 6s | **54 ms** | ×111 plus rapide |

---

## 6. Roadmap suggérée pour la suite

### Sprint suivant — Pattern Stitch interne (~25-30h)
1. Filtres pills horizontaux + colonne Contacts + CA + RDV dans TABLE leads (6-8h)
2. Avatar + Score tier sur fiche dirigeant (2-3h)
3. 2 colonnes Suivi commercial / Profil psycho-IA sur fiche dirigeant (8-10h)
4. Export CSV/XLSX (2-3h)
5. Génération courriers postaux (6-8h)

### Sprint critique RGPD (~6h)
1. Workflow opposition art. 21 (formulaire + EF + DPO mention)

### Sprint enrichissement data (~25-30h)
1. Ingest MAJIC personnes morales national (8-10h)
2. Câblage Dropcontact API (4-6h)
3. Phase 2 Apify sur 34 146 SIREN restants ($100 budget) (4-6h)
4. Score Vente Phase 16 sur fiche dirigeant (2-3h)

### Sprint Data-B IA (optionnel ~15-20h)
1. Analyses IA "Analyser l'emplacement" (Claude Sonnet) (8-10h)
2. Prédire le CA IA (6-8h)
3. Graphe Foncier 360° interactif (force-directed) (12-15h)

---

## 7. Liens utiles

- Repo : `/root/projects/site-claude-code/brh-habitat/app`
- Site prod : https://brh-habitat.vercel.app
- Plan source : `/root/.claude/plans/jaunty-snacking-cascade.md`
- Designs Stitch : `.stitch/designs/liste-leads-v2.png`, `.stitch/designs/fiche-client-brh.png`
- Doc Data-B référence : `compass_artifact_wf-7f3b691e-eb70-4413-aa7a-6f03dcb48c91_text_markdown.md` (chat conversation)
- Test compte : `pierrecollard@contact-brh.fr` / `Brh29200.@`
- Compte agence test : `agence@brh-test.fr` (Claire Pichon, profil agence)

## 8. Pattern Karpathy — comment retrouver l'info

Cette page est référencée depuis :
- [index.md](index.md) Partie 4 — Plans & roadmap actifs
- [log.md](log.md) entrées 2026-05-26 + 2026-05-27

Pour reprendre la suite :
1. Lire **cette page** (vue d'ensemble + reste à faire)
2. Lire les pages wiki des features impactées (`data-model.md`, `hub-sci-dirigeant.md`, `foncier-pro-blueprint.md`)
3. Vérifier l'état actuel des Phases en cours via `tail -5 /tmp/extract-tel-email.log`
4. Reprendre la roadmap section 6 par priorité
