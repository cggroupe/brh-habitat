# Data Coverage — BRH (Pattern Karpathy)

> **Source de vérité** : pour chaque dataset aspiré sur le VPS, état d'intégration dans BRH Habitat (`brh_*`) et niveau de câblage UI. Évite de re-télécharger ou de re-faire un import déjà fait.
>
> Compagnon de [`osint-enrichment-registry.md`](osint-enrichment-registry.md) qui couvre les sources OSINT contact-par-contact. Cette page-ci couvre les **datasets de masse** (DVF, Sirene, BODACC, Sitadel, BDNB…).

---

## Légende

| Statut DB | Sens |
|---|---|
| 🟢 chargé + câblé UI | Table remplie ET utilisée dans une vue/fiche |
| 🟡 chargé sans UI | Table remplie mais aucun composant ne l'expose |
| 🟠 partiel | Table partiellement remplie (sous-périmètre, ou en cours d'import) |
| 🔴 vide | Table existe mais 0 rows |
| ⚫ absent | Pas de table — dataset uniquement sur disque (raw) |

---

## 1. Datasets ingérés dans Supabase BRH

| Table | Rows | Source | Statut UI | Notes câblage |
|---|--:|---|---|---|
| `brh_personnes_historique` | 16 607 | Import entity-hub | 🟢 `/employe/clients-brh` | RPC v5 |
| `brh_dpe_prospects` | 59 306 | ADEME DPE F/G | 🟢 vue Foncier | Source unifiée |
| `brh_prospect_studies` | 59 255 | Calculs internes | 🟡 | Pas affiché ailleurs |
| `brh_score_vente_v1` | 59 255 | Calc IA propension vente | 🟡 | Pas affiché ailleurs |
| `brh_dvf_archive` | 104 225 | data.gouv DVF | 🟢 fiche client + foncier | **2026-05-19** : ajout `prix_m2_calc`/`is_groupee`/`usable_for_brh` pour fix des 58% sans surface (VEFA/groupées). Câblé sur fiche client BRH via RPC `brh_personne_signals_externes`. |
| `brh_sci_companies` | 36 491 | Sirene SCI | 🟠 fiche SCI | Pas relié contact |
| `brh_sci_deces_matches` | 46 730 | Cross Sirene + INSEE décès | 🟢 fiche client BRH | **2026-05-19** : câblé via RPC `brh_personne_signals_externes` (héritiers potentiels = signal commercial chaud) |
| `brh_ext_rge_companies` | 14 810 | Liste artisans RGE | 🟡 | Pas affiché |
| `brh_intention_signals` | 13 000 | Calc internes | 🟢 fiche adresse | Relié à `dpe_id` |
| `brh_ext_immo_companies` | 6 887 | Agences immo | 🟡 | Pas affiché |
| `brh_bodacc_alerts` | 3 653 | data.gouv BODACC | 🟢 fiche client BRH | **2026-05-19** : câblé (cession fonds, modifs statut sociétés). Match par `denomination`. |
| `brh_artisans_rge` | 862 | Annuaire ADEME | 🟡 | Pas affiché |
| `brh_lead_pii_enriched` | 771 | OSINT manuel | 🟡 partiel | Affiché sur fiche adresse |
| `brh_permis_construire` | 0 | **Sitadel3** | 🟠 import en cours | **2026-05-19 06:00** : ingest Bretagne lancé (PID 1797418, dep 22/29/35/56) via `intentions-data/ingest/sitadel/run.py`. Cible : table `intentions.sitadel_permis` (entity-hub PG 5434) puis sync vers Supabase. |
| `brh_chantier_offers` | 0 | Workflow interne | 🔴 vide | Pas démarré |
| `brh_chantier_applications` | 0 | Workflow interne | 🔴 vide | Pas démarré |

---

## 2. Datasets bruts sur disque NON encore ingérés

| Dataset | Path | Taille | Statut | Priorité |
|---|---|---:|---|---|
| **BDNB Bretagne** (4 départements) | `/opt/stack/bdnb-bretagne/raw/dep{22,29,35,56}.pgdump.zip` | 2.4 GB | ⚫ pg_dump prêt | P2 — référence bâtiment FR |
| **Sirene Étab** complet FR | `/opt/stack/sci-immobilier/data/StockEtablissement_utf8.csv` | 9.1 GB | ⚫ | P4 — déjà partiellement ingéré via SCI |
| **Sirene UniteLegale** | `/opt/stack/sci-immobilier/data/StockUniteLegale_utf8.csv` | 3.9 GB | ⚫ | P4 |
| **DVF 2019-2023** | `/opt/stack/sci-immobilier/data/dvf_{2019..2023}.csv.gz` | ~500 MB | 🟠 partiel (2024 uniquement dans Supabase) | P3 — étendre historique sur 5 ans |
| **Sitadel raw** | `/opt/stack/intentions-data/raw/sitadel/2026-05/` | en cours | 🟠 download lancé | P1 (en cours) |

---

## 3. Couverture sur la fiche client BRH (`/employe/clients-brh`)

Au **2026-05-19** un contact BRH peut afficher :
- **Identité + commercial** : nom, société, tél, email, adresse, CA cumulé, RDV historiques, statut, DPE F/G lié
- **Enrichissement** : score 0-15 + tier gold/silver/bronze/none (cf. [osint-enrichment-registry](osint-enrichment-registry.md))
- **OSINT externes** : LinkedIn, Facebook, PagesJaunes, Apify Google hits, Intention immo (rose), Sociétés Pappers, Email actif (Holehe), Maigret comportements d'achat, Profil psy IA
- **Signaux externes (lazy, sur clic)** ⭐ NOUVEAU :
  - Historique foncier DVF (mutations à la même adresse, prix/m² uniquement quand fiable)
  - Succession potentielle (dirigeants SCI décédés avec même nom/prénom)
  - Alertes BODACC (cession fonds, modifs statut société)

Ce qui MANQUE encore sur la fiche client :
- ❌ Permis de construire (Sitadel — en cours d'import P1)
- ❌ Score IA de propension à vendre (`brh_score_vente_v1`)
- ❌ Données d'étude prospect (`brh_prospect_studies` : isolation, énergie, gain potentiel)
- ❌ DPE détaillé (énergie kWh/m², GES, type de chauffage…) — déjà lié via `linked_dpe_id` mais détails non remontés
- ❌ BDNB bâti (typologie, année construction, % vitrage…) — dataset à ingérer

---

## 4. Plan d'intégration (priorités)

| P | Action | Effort | Impact commercial |
|---|---|---|---|
| **P1** | Finir import Sitadel Bretagne → câbler sur fiche client | ~2h | Détecte permis travaux en cours → renforce besoin BRH |
| P2 | Bloc « Étude énergétique » sur fiche client (depuis `brh_prospect_studies`) | ~1h | Gain financier potentiel direct |
| P2 | Bloc « Score IA propension vente » (depuis `brh_score_vente_v1`) | ~30min | Priorisation appels commerciaux |
| P2 | Ingest BDNB Bretagne (4 pg_dump.zip) | ~2h | Typologie bâti exact |
| P3 | Étendre DVF historique 2019-2023 (vs 2024 only actuellement) | ~1h | Historique mutations sur 5 ans |
| P4 | Sirene complet (entreprises FR) | ~1h | Cross-référence dirigeants/SCI |

---

## 5. Bugs DVF identifiés et corrigés (2026-05-19)

**Problème** signalé par Philippe : la plateforme affichait parfois un prix global ET un prix au m², mais sans la surface — donc soit prix/m² faux, soit calcul invisible. Diagnostic :

- 104 225 mutations totales
- 103 638 avec prix (99.4 %)
- 43 484 avec prix + surface bâtie valide → **utilisables (38 %)**
- **60 154 avec prix mais SANS surface** → VEFA + ventes groupées d'immeubles entiers (c'est inhérent à DVF officiel, pas un bug d'import)

**Fix** (migration `20260519120000`) :
- `prix_m2_calc` = NULL si surface absente (ne calcule plus de prix/m² faux)
- `is_groupee` = TRUE pour les VEFA + ventes sans surface (badge "groupée" dans l'UI, prix/m² masqué)
- `usable_for_brh` = TRUE uniquement pour Vente + Maison/Apt + surface > 0 → **39 711 mutations exploitables BRH**
- Index `(usable_for_brh)` partiel + `(code_postal, lower(adresse_voie))`

---

## Liens

- Migration DVF qualité : [`20260519120000_brh_dvf_quality_columns.sql`](../supabase/migrations/20260519120000_brh_dvf_quality_columns.sql)
- RPC signaux externes : [`20260519130000_rpc_brh_personne_signals_externes.sql`](../supabase/migrations/20260519130000_rpc_brh_personne_signals_externes.sql)
- UI panel : [`src/components/leads/PersonneSignalsExternesPanel.tsx`](../../src/components/leads/PersonneSignalsExternesPanel.tsx)
- Registry OSINT : [`osint-enrichment-registry.md`](osint-enrichment-registry.md)
- Log Karpathy : [`log.md`](log.md)

---

**Dernière maj** : 2026-05-19 06:05 — Claude Opus 4.7 (1M ctx)
