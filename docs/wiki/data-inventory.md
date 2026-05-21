# Data Inventory — BRH (page canonique)

> **Source de vérité unique** de tous les datasets BRH. Pour chaque table `brh_*` :
> volume réel, source d'origine, statut UI, pivot principal.
>
> Pages compagnes :
> - [bugs-ouverts.md](bugs-ouverts.md) — bugs UI/perf en cours
> - [osint-enrichment-registry.md](osint-enrichment-registry.md) — campagnes OSINT contact-par-contact (Apify/Holehe/Maigret/Claude psy)
> - [hub-client-brh.md](hub-client-brh.md) / [hub-lead-public.md](hub-lead-public.md) / [hub-sci-dirigeant.md](hub-sci-dirigeant.md) — pivots métier
>
> Cette page remplace : `data-coverage.md` (fusionnée 21/05) + section inventaire de `bugs-and-data-strategy-2026-05-21.md`.

---

## Légende statut UI

| Statut | Sens |
|---|---|
| 🟢 chargé + câblé UI | Table remplie ET utilisée dans une vue/fiche |
| 🟡 chargé sans UI | Table remplie mais aucun composant ne l'expose |
| 🟠 partiel | Table partiellement remplie (sous-périmètre ou import en cours) |
| 🔴 vide | Table existe mais 0 rows |
| ⚫ absent | Pas de table — dataset uniquement sur disque (raw) |

Rowcounts vérifiés **psql direct sur `lygmmvxnmvlgynmrcpny` au 2026-05-21**.

---

## 1. Foncier & énergie (gisement national / régional)

| Table | Rows | Couverture | Pivot principal | Source | Statut UI | Notes |
|---|--:|---|---|---|---|---|
| `brh_dpe_prospects` | **59 306** | DPE F/G Bretagne (4 dépts) + extension nationale partielle | `numero_dpe` (ADEME), `owner_siren` (SCI), `code_postal+adresse` (BAN) | ADEME DPE 3CL 2021 | 🟢 vue Foncier + fiche adresse | Source unifiée |
| `brh_dvf_archive` | **104 225** | Mutations 10 ans (DVF data.gouv) — 2 869 sur Brest seul | `code_postal+lower(adresse_voie)` | data.gouv DVF | 🟢 fiche client + foncier | 39 711 `usable_for_brh=TRUE` après fix 19/05 (cf §5) |
| `brh_intention_signals` | **13 000** | Signaux travaux/vente par DPE | `dpe_id` | Calc interne (DVF + permis + BODACC) | 🟢 fiche adresse | Relié `dpe_id` |
| `brh_score_vente_v1` | **59 255** | Score propension vente par DPE | `dpe_id` | Heuristique 13 règles | 🟡 | Pas affiché ailleurs que `/agence/leads-v2` |
| `brh_prospect_studies` | **59 248** | Étude énergétique par DPE (isolation, gains potentiels) | `dpe_id` | Calc interne | 🟡 | Pas affiché — gain BRH potentiel grand |
| `brh_permis_construire` | **0** ⚠️ | Sitadel Bretagne — import en cours | `code_insee+date` | data.gouv Sitadel3 | 🟠 import en cours | PID 1797418 lancé 19/05 06:00 sur dep 22/29/35/56 |

---

## 2. Entreprises & dirigeants (Sirene / Pappers)

| Table | Rows | Couverture | Pivot principal | Source | Statut UI | Notes |
|---|--:|---|---|---|---|---|
| `brh_sci_companies` | **36 491** | SCI Bretagne + tout détenteur DPE F/G | `siren` (9) | Sirene/Pappers | 🟠 fiche SCI | Pas relié contact joignable — voir [hub-sci-dirigeant.md](hub-sci-dirigeant.md) |
| `brh_dirigeants` | **80 844** | Dirigeants consolidés (cross-SCI) — dont 17 403 propriétaires DPE, 4 470 multi-SCI, 515 succession ouverte | `id` (UUID), clé naturelle `(nom_norm, prenom_norm, date_naissance)` | Cross brh_sci_companies + dédoublonnage | 🟠 `/employe/dirigeants` | RPC `brh_dirigeants_search` souffre du timeout B9 (cf [bugs-ouverts.md](bugs-ouverts.md)) |
| `brh_sci_deces_matches` | **46 730** | Match nom+prénom dirigeants ↔ INSEE décès (591 stricts Bretagne) | `siren` + `(nom, prenom, date_naissance)` | INSEE Décès + Sirene | 🟢 fiche client BRH | Câblé 19/05 via RPC `brh_personne_signals_externes` |
| `brh_bodacc_alerts` | **3 653** | Annonces BODACC (1 765 radiations, 1 128 collectives, 760 commerciales) | `siren`, `denomination` | data.gouv BODACC | 🟢 fiche client BRH | Cession fonds + modifs statut. Match par `denomination`. |

---

## 3. Marché pro (artisans, agences)

| Table | Rows | Couverture | Pivot principal | Source | Statut UI |
|---|--:|---|---|---|---|
| `brh_ext_rge_companies` | **14 810** | Annuaire RGE FR | `siret`, `denomination` | ADEME RGE | 🟡 pas affiché |
| `brh_artisans_rge` | **862** | Sous-ensemble RGE actif BRH | `siret` | Curation interne | 🟡 pas affiché |
| `brh_ext_immo_companies` | **6 887** | Agences immo FR | `siret` | Annuaire/Sirene | 🟡 pas affiché |
| `brh_agences_immo` | **13** | Agences partenaires BRH | `id` | Saisie BRH | 🟢 admin |
| `brh_companies` | **64** | Sociétés clientes plateforme | `id`, `siret` | Inscription | 🟢 admin |

---

## 4. Contacts & terrain BRH (interne employé)

| Table | Rows | Couverture | Pivot principal | Source | Statut UI |
|---|--:|---|---|---|---|
| `brh_personnes_historique` | **18 571** | Contacts BRH consolidés (14 372 Bretagne, 4 505 emails) | `id` UUID, `fingerprint_hash` | Imports BRH legacy + PPO 44 + Base44 | 🟢 `/employe/clients-brh` |
| `brh_lead_pii_enriched` | **771** | PII rattachée à un DPE (CA cumulé, tel/email enrichis) | `dpe_id` | OSINT manuel + matching adresse | 🟡 partiel fiche adresse |
| `brh_personne_visits` | **1 773** | Visites terrain par contact | `personne_id` | Saisie employé | 🟢 fiche client |
| `brh_personne_travaux` | **2 900** | Postes travaux observés terrain | `personne_id, poste` | Saisie employé | 🟢 fiche client |
| `brh_entity_links` | **2 729** | Graphe pivot (personne ↔ SCI ↔ adresse DPE ↔ mutation DVF) | `from_type, from_id, link_type, to_type, to_id` | Calc batch | 🟢 RPC `brh_personne_360` |

---

## 5. Tables OSINT / archive (référencement campagnes)

> Détail complet des campagnes : [osint-enrichment-registry.md](osint-enrichment-registry.md).

| Table | Rows | Rôle |
|---|--:|---|
| `brh_osint_full_purge_archive` | 6 010 | Historique enrichissements OSINT par personne |
| `brh_osint_apify_homonyme_archive` | 4 734 | Hits Apify Google sur dirigeants — homonymes filtrés |
| `brh_osint_maigret_archive` | 329 | Sherlock/Maigret usernames matches |
| `brh_psy_profile_archive` | 3 414 | Profils psychologiques générés par IA |
| `brh_entity_links_archive` | 5 188 | Anciens liens entity-graph |
| `brh_linked_dpe_purge_archive` | 2 156 | Anciens liens linked_dpe_id corrigés |

---

## 6. Datasets bruts sur disque (non encore ingérés Supabase)

| Dataset | Path VPS | Taille | Statut | Priorité |
|---|---|--:|---|---|
| **BDNB Bretagne** (4 départements) | `/opt/stack/bdnb-bretagne/raw/dep{22,29,35,56}.pgdump.zip` | 2.4 GB | ⚫ pg_dump prêt | P3 — typologie bâti FR |
| **Sirene Étab** complet FR | `/opt/stack/sci-immobilier/data/StockEtablissement_utf8.csv` | 9.1 GB | ⚫ | P4 (partiel via SCI) |
| **Sirene UniteLegale** | `/opt/stack/sci-immobilier/data/StockUniteLegale_utf8.csv` | 3.9 GB | ⚫ | P4 |
| **DVF 2019-2023** | `/opt/stack/sci-immobilier/data/dvf_{2019..2023}.csv.gz` | ~500 MB | 🟠 partiel (2024 only) | P3 |
| **Sitadel raw** | `/opt/stack/intentions-data/raw/sitadel/2026-05/` | en cours | 🟠 download lancé | P2 |

---

## 7. Sources de pivot encore non câblées (priorités stratégiques)

| Priorité | Source | Volume estimé | Pivot apporté | Coût |
|---|---|---|---|---|
| **P1** | **Pivot dirigeant → autres entreprises** (Sirene + Annuaire-entreprises gratuit) | 17 403 dirigeants propriétaires DPE | Tel/email pro via commerce/artisanat du dirigeant SCI | 0 € (scale gratuit validé D-2 du 21/05) |
| **P2** | **Permis de construire Sitadel** (en cours) | ~5-10 k/an Bretagne | Adresses avec travaux récemment autorisés → prospect chaud | 0 € |
| **P3** | **BDNB Bretagne** (2.4 GB pg_dump) | ~1.5 M bâtiments | Typologie bâti exacte (% vitrage, matériaux, étages) — affine score travaux | 0 € |
| **P3** | **DVF historique 2019-2023** | ~250 k mutations supplémentaires | Élargit fenêtre acquéreurs récents 24m → 60m | 0 € |
| **P4** | **Registres meublés tourisme** (Loi Le Meur mai 2026) | Limité aux communes contraintes (Saint-Malo, Quiberon, Crozon…) | Identifie loueurs Airbnb → DPE F/G interdits de location nue → prospect travaux URGENT | 0 € |
| **P4** | **Sous-traitants RGE bretons** (Tinergie, Heol, SOLIHA) | ~150 artisans qualifiés | Partenariats sous-traitance | 0 € |

> Note D-2 (21/05/2026) : Philippe a tranché contre Pappers payant 49€/mois — on **scale gratuit** via Sirene Open Data + Annuaire-entreprises. Implémentation détaillée à venir dans [hub-sci-dirigeant.md](hub-sci-dirigeant.md).

---

## 8. Fix DVF 19/05 (référencement)

**Problème** : 60 154 mutations avec prix mais sans surface (VEFA + ventes groupées d'immeubles) → prix/m² incohérent.

**Fix** (migration `20260519120000_brh_dvf_quality_columns.sql`) :
- `prix_m2_calc` = NULL si surface absente
- `is_groupee` = TRUE pour VEFA + ventes sans surface
- `usable_for_brh` = TRUE uniquement pour Vente + Maison/Apt + surface > 0 → **39 711 mutations exploitables**
- Index `(usable_for_brh)` partiel + `(code_postal, lower(adresse_voie))`

---

## Liens

- Migrations Supabase : [supabase/migrations/](../../supabase/migrations/)
- Bugs en cours : [bugs-ouverts.md](bugs-ouverts.md)
- Pivots métier : [hub-client-brh.md](hub-client-brh.md) · [hub-lead-public.md](hub-lead-public.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)
- Règle de match adresse : [matching-adresse.md](matching-adresse.md)
- Campagnes OSINT : [osint-enrichment-registry.md](osint-enrichment-registry.md)
- Modèle de données complet : [data-model.md](data-model.md)

---

**Dernière maj** : 2026-05-21 (Phase 0 refonte) — Claude Opus 4.7
