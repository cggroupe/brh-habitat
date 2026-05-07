# Foncier Pro Agence — Status livraison Phase 19

> **Status global** : 🟡 Sprint A en cours (livraison foundation cadastre + carte + favoris).
>
> Voir : [foncier-pro-blueprint.md](foncier-pro-blueprint.md) (architecture cible) · [log.md](log.md) (journal append).

---

## 1. Tableau de livraison (6 sprints)

| Sprint | Contenu | Durée prévue | Status | Date livraison |
|---|---|---|---|---|
| **A** | Foundation : cadastre IGN + carte agence + favoris | 5-7 j | ✅ DONE | 2026-05-06 |
| **B** | SCI enrichi : INPI + âge dirigeants + décès INSEE | 8-10 j | ⏸ PENDING (dépend A) | — |
| **C** | DVF archive + sociodémo | 6-8 j | ⏸ PENDING (dépend A) | — |
| **D** | PLU IA Claude + Vision IA toiture | 12-15 j | ⏸ PENDING (dépend A) | — |
| **E** | BODACC tertiaire + permis Sit@del2 | 6-8 j | ⏸ PENDING (dépend A) | — |
| **F** | UX intégrée + page détail parcelle complète | 5-7 j | ⏸ PENDING (dépend A-E) | — |

**Total estimé** : 42-55 jours dev compressés.

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
