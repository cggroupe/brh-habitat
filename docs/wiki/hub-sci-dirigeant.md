# Hub SCI + Dirigeant — "second cerveau" (entité-pivot)

> **Hub fiche SCI + dirigeants** : tout ce qu'on sait sur une SCI et ses dirigeants, **sur une seule fiche**, zéro onglet caché.
> Inclut le pivot stratégique **dirigeant → autres entreprises** (commerce/artisanat) pour récupérer un contact joignable.
>
> Statut : 🟡 **SQUELETTE Phase 0** — contenu rempli Phase 2 (cf [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md)).

---

## 1. Vision Philippe 21/05 (vocal)

> « Tout doit être relié comme un chemin neuronal, comme un second cerveau sur la plateforme, pour éviter tous bugs, tout mélange d'informations et valoriser au mieux la data. »

> « Lorsqu'on clique sur une SCI, on doit voir toutes les informations et pas cliquer sur un nouvel onglet, être perdu etc. Tout doit être simple, centralisé dans des fiches : telle adresse appartient à telle personne, telle personne a aussi telle et telle entreprise, ou tel permis de construire à son nom ou alors au nom de la SCI. »

### Le pivot rentable

> « Si un dirigeant de SCI a plusieurs sociétés, dont une boulangerie, peut-être qu'on peut le contacter avec un mail ou un numéro de téléphone sur ce commerce. On n'a pas son numéro de téléphone personnel, mais on a peut-être le numéro de téléphone d'une autre de ces entreprises — donc ça veut dire qu'on peut le contacter pour faire la rénovation de son bien qui est classé en DPE G par exemple. »

---

## 2. Blocs à afficher sur la fiche SCI

1. **Identité SCI** : dénomination, SIREN, siège, date création, statut
2. **Dirigeants** (consolidés via `brh_dirigeants`) : nom, prénom, date naissance, qualité (gérant/associé)
3. **DPE détenus** : tous les `brh_dpe_prospects` avec `owner_siren = SIREN`
4. **Adresses des biens** : mini-carte des biens (DVF + DPE liés)
5. **BODACC** : alertes (radiations, cessions, modifs statut)
6. **Succession** : dirigeants décédés (`brh_sci_deces_matches`) + co-mandataires non-décédés = héritiers probables
7. **Pivot OSINT — autres entreprises des dirigeants** ⭐ : pour chaque dirigeant, lookup Sirene/Annuaire-entreprises gratuit (D-2 21/05) :
   - Autres SCI où il est mandataire
   - Commerce / artisanat / cabinet où il est dirigeant (tel/email pro public)
   - Cross BODACC sur ses autres entreprises (cession fonds, liquidation = capital liquide)

### Single-page obligatoire

Tous les blocs sur une seule fiche. Pas d'onglets cachés. Si un dirigeant a 8 entreprises annexes, elles s'affichent toutes dans le bloc 7, déroulables mais sans changement de page.

---

## 3. 6 pivots OSINT actionables (transversaux fiche SCI / dirigeant)

| # | Pivot | Use case | État |
|---|-------|----------|------|
| **1** | SCI → autres entreprises du dirigeant ⭐ | Tel/email pro via boulangerie/artisanat | À câbler Phase 2 (D-2 : scale gratuit Sirene/Annuaire-entreprises) |
| **2** | Cross-match BDD interne | Dirigeant SCI déjà client BRH → contact dans `brh_personnes_historique` | ✅ Validé 19/05 (110 dirigeants enrichis gratuit) |
| **3** | DPE adresse → propriétaire vs occupant | Pour les travaux, contacter le propriétaire (SCI ou particulier), pas le locataire | ✅ Livré 20/05 (RPC `brh_dpe_role_for_personne`, badge "Occupant · SCI X détient") |
| **4** | Succession SCI → héritiers actionnables | Dirigeant décédé → contacter co-mandataires (enfants/conjoint) | ✅ Câblé 19/05 sur fiche client BRH |
| **5** | BODACC cession fonds → capital liquide | Dirigeant a touché X € net de cession → prospect chaud rénovation lourde | ✅ Câblé 19/05 sur fiche client BRH |
| **6** | DVF récent → travaux probables 12-24m | Acquéreur récent fait souvent travaux dans les 18 mois | ✅ Câblé 19/05 sur fiche client BRH et `/agence/leads-v2` |

---

## 4. Sources data utilisées

| Source | Table | Pivot |
|--------|-------|-------|
| SCI | `brh_sci_companies` (36 491) | `siren` |
| Dirigeants consolidés | `brh_dirigeants` (80 844 dont 17 403 propriétaires DPE) | `id` UUID + clé `(nom_norm, prenom_norm, dob)` |
| DPE détenus | `brh_dpe_prospects` (59 306) | `owner_siren` |
| BODACC | `brh_bodacc_alerts` (3 653) | `siren`, `denomination` |
| Décès matchs | `brh_sci_deces_matches` (46 730) | `siren` + `(nom, prenom, dob)` |
| DVF | `brh_dvf_archive` (104 225) | `(cp, voie_norm)` |
| Graphe entités | `brh_entity_links` (2 729) | `from/to_type+id` |
| Autres entreprises (à enrichir) | colonne `autres_entreprises JSONB` à ajouter sur `brh_dirigeants` | batch Sirene/Annuaire-entreprises |

---

## 5. Fix perf B9 (bloquant — Phase 2)

RPC `brh_dirigeants_search` timeout >8s sur combinaison filtre département + autre filtre.

**Cause** : `EXISTS (SELECT FROM jsonb_array_elements(d.sci_dirigees) JOIN brh_sci_companies …)` sans index. Sur 80 844 dirigeants × 1-N SCI, full scan.

**Fix proposé Phase 2** :
- Migration : table de liaison `brh_dirigeant_sci(dirigeant_id, siren, departement)` avec index `(departement, siren)` + `(dirigeant_id)`
- Backfill depuis `brh_sci_companies.dirigeants JSONB`
- Réécriture RPC avec JOIN au lieu de `EXISTS jsonb_array_elements`
- Critère succès : <500ms sur dept + 3 filtres combinés

---

## 6. UI cibles (Phase 2)

- [src/pages/employe/EmployeDirigeantDetail.tsx](../../src/pages/employe/EmployeDirigeantDetail.tsx) — fiche dirigeant 360°
- [src/components/leads/fiche/FicheEntrepriseView.tsx](../../src/components/leads/fiche/FicheEntrepriseView.tsx) — fiche entreprise/SCI publique
- Composant mini-carte à réutiliser depuis `prospection-map`

---

## 7. Décision D-2 (21/05) — scale gratuit

Philippe a écarté Pappers API 49€/mois. On **scale gratuit** via :
- Sirene API Open Data data.gouv.fr (publique, 30 req/s)
- Annuaire-entreprises.data.gouv.fr (lookup dirigeant → mandats)
- Cross BODACC déjà ingéré

Implémentation batch script Phase 2 sur 17 403 dirigeants propriétaires DPE prioritaires.

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 2
- Inventaire data : [data-inventory.md](data-inventory.md) §2 + §7
- Matching adresse : [matching-adresse.md](matching-adresse.md)
- Hubs sœurs : [hub-client-brh.md](hub-client-brh.md) · [hub-lead-public.md](hub-lead-public.md)
- Bugs : [bugs-ouverts.md](bugs-ouverts.md) (B7 fiche dirigeant + B9 perf)
- Graphe entités : [entity-graph.md](entity-graph.md)

---

**Dernière maj** : 2026-05-21 (squelette Phase 0) — Claude Opus 4.7
