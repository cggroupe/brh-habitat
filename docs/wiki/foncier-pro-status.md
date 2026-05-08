# Foncier Pro Agence — Status livraison Phase 19

> **Status global** : 🟡 Sprint A en cours (livraison foundation cadastre + carte + favoris).
>
> Voir : [foncier-pro-blueprint.md](foncier-pro-blueprint.md) (architecture cible) · [log.md](log.md) (journal append).

---

## 1. Tableau de livraison (8 sprints)

| Sprint | Contenu | Durée prévue | Status | Date livraison |
|---|---|---|---|---|
| **A** | Foundation : cadastre IGN + carte agence + favoris | 5-7 j | ✅ DONE | 2026-05-06 |
| **B** | SCI enrichi : recherche-entreprises + dirigeants + décès INSEE matchid.io | 8-10 j | ✅ DONE | 2026-05-06 |
| **C** | DVF archive + sociodémo (loyers + gentrification + RPC stats) | 6-8 j | ✅ DONE | 2026-05-06 |
| **D** | PLU IA Claude + Vision IA toiture (BD ORTHO crop + Claude Sonnet 4.6) | 12-15 j | ✅ DONE | 2026-05-06 |
| **E** | BODACC tertiaire + permis Sit@del2 (V1 cache lecture) | 6-8 j | ✅ DONE | 2026-05-06 |
| **F** | UX intégrée (DPE markers A-G colorés + page détail parcelle complète) | 5-7 j | ✅ DONE | 2026-05-06 |
| **G** | Seed data Bretagne : DVF 104k + PLU Brest cache + 4 bugs API gouv | — | ✅ DONE | 2026-05-07 |
| **H** | Filtre date décès + tri "succession récente" + badges TRÈS RÉCENT | — | ✅ DONE | 2026-05-07 |

**🎉 Phase 19 100% livrée — 8/8 sprints sur 2 sessions (06+07/05/2026)**

**Total estimé** : 42-55 jours dev compressés.

### État data Bretagne en prod (08/05/2026 — Phase 11.2 livrée)

| Source | Volume | État |
|---|---|---|
| DVF mutations 2024 | 104 225 | ✅ Bretagne complète (5 dépts) |
| SCI / dirigeants | 29 502 | ✅ ~60% du max API gouv (50k théorique) |
| SCI avec décès détecté | 522 | ✅ dont 27 < 6 mois, 47 < 1 an |
| PLU communal pré-cache | 1 (Brest) | 🟡 V2 : Rennes/Nantes/Vannes/Quimper |
| RGE artisans Bretagne | 5 335 / 14 810 qualifs | ✅ 663 communes couvertes |
| Géorisques | EF cache à la demande + 1202 communes snapshotées | ✅ |
| **Filosofi 2021 IRIS** | **577 IRIS BZH** | ✅ débloqué (typo slug INSEE corrigée) |
| **Enedis conso 2024** | **1 767 IRIS BZH** | ✅ via Opendatasoft v2.1 |
| **GRDF conso 2024** | **912 IRIS BZH** | ✅ rural sans gaz exclu (normal) |
| **ANAH OPAH/PIG actifs** | **643 communes BZH (101 OPAH + 19 OPAH-RU + 523 PIG)** | ✅ NEW Tier 2 |
| **Sit@del2 logements 2022-2023** | **35 997 logts / 1 080 communes BZH** | ✅ NEW Tier 2 |
| **iris_code prospects DPE** | **59 285 / 59 306 (99.96%)** | ✅ point-in-polygon WFS IGN |
| **score_v2 distribution** | 28 ultra_chaud · 2 005 mpr_bleu_prio · 14 890 standard · 42 383 cold | ✅ Phase 11.1 (12 règles) |
| **Recensement Logement IRIS 2021** | **1 739 IRIS BZH** (tx_proprio + tx_avant_1975 + tx_vacance) | ✅ Phase 11.2 |
| **BODACC tertiaire 90j** | **3 653 alertes BZH** (727 ventes + collective + radiation) | ✅ Phase 11.2 batch |
| **Météo-France DJU 1991-2020** | **1 195 communes BZH** (1913-2924, USP vs DJU théorique) | ✅ Phase 11.2 |
| **TRACC climat futur 2050/2080/2100** | **1 202 communes BZH** (5 indicateurs × 4 horizons) | ✅ Phase 11.2 OEB officiel |
| **Entreprises immo BZH** | **6 887 SIREN** (1704 agences, 609 marchands biens, 343 promoteurs, 832 syndics, etc.) | ✅ Phase 11.2 NEW table |
| **PLU/PLUi top 20 communes** | 18 + Brest pré-cachés (URL PDF + doc_id) | ✅ Phase 11.2 |
| **score_v2 distribution finale** | **29 ultra_chaud · 2 123 mpr_bleu_prio · 17 747 standard · 39 407 cold** | ✅ Phase 11.2 (14 règles + climat futur) |

---

## 2. Sprint A — détail prévisionnel

### Étapes A.1 → A.6

| # | Étape | Status |
|---|---|---|
| A.0 | Wiki blueprint + status (Karpathy AVANT code) | 🟡 EN COURS |
| A.1 | Migration SQL `brh_parcelles_cache` + `brh_agence_favoris_parcelles` + RLS + push prod | ⏸ |
| A.2 | EF Deno `cadastre-fetch` (proxy api-carto IGN + cache 90j + rate limit) | ⏸ |
| A.3 | API + hooks `foncier-parcelles` + `foncier-favoris` (pattern Tanstack) | ⏸ |
| A.4 | Page `/agence/foncier/carte` (Leaflet + WMS cadastre + clic parcelle + favoris) | ⏸ |
| A.5 | Page `/agence/foncier/favoris` + entrée sidebar AgenceShell | ⏸ |
| A.6 | Wiki Karpathy update : log + status + index + tests | ⏸ |

### Périmètre fonctionnel A
- Recherche parcelle par : adresse (BAN), commune INSEE + section/numéro, ou clic carte
- Affichage GeoJSON polygone parcelle + métadonnées (idu, surface, propriétaire si DGFIP)
- Bouton "Ajouter aux favoris" avec tags personnalisés + notes
- Liste latérale favoris (zoom direct sur clic)
- Cache 90 jours côté Supabase (réduit appels api-carto IGN)

---

## 3. Métriques cibles

### Techniques
- Vitest 390 → ~430 (au moins +40 nouveaux tests pure functions)
- Playwright E2E : 1 smoke par sprint
- Type-check + ESLint exit 0 à chaque étape
- CI GitHub Actions verte

### Produit (post-prospection — quelques semaines)
- N agences immo bretonnes onboardées V1
- Adoption foncier (sessions/sem par agence)
- Conversion lead BRH apporté depuis foncier (DVF F/G + DPE rénovation)

---

## 4. Dépendances & bloquants

| Bloquant | Impact | Action |
|---|---|---|
| api-carto IGN rate limit (gratuit mais limité) | Cache 90j obligatoire | Implémenté Sprint A.2 |
| GPU Géoportail Urbanisme PDF | Volume PDF parfois lourd | Storage cache + Claude Sonnet streaming Sprint D |
| Décès INSEE matching (homonymes) | Faux positifs succession | Score de confiance matching nom+prénom+dob+commune Sprint B |
| Aérien IGN BD ORTHO 5m | Crop intensif si nombreuses parcelles | Cache `brh_satellite_analyses` Sprint D |
| Sit@del2 mensuel | Pas temps réel | Cron mensuel + flag `mois_publication` Sprint E |

---

## 5. Refs

- **Blueprint** : [foncier-pro-blueprint.md](foncier-pro-blueprint.md)
- **Mémoire projet** : `/root/.claude/projects/-root/memory/brh-foncier-pro-phase19-2026-05-06.md`
- **Sources data** : [external-data-sources.md](external-data-sources.md) (89 sources Phase 11.0)
- **Phase 16 Score Vente** : [score-vente-agences.md](score-vente-agences.md) (réutilisé)
- **Phase 18 Réseau** : [reseau-social-status.md](reseau-social-status.md) (🟡 PAUSE)
