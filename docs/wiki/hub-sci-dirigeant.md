# Hub SCI + Dirigeant — "second cerveau" (entité-pivot)

> **Hub fiche SCI + dirigeants** : tout ce qu'on sait sur une SCI et ses dirigeants, **sur une seule fiche**, zéro onglet caché.
> Inclut le pivot stratégique **dirigeant → autres entreprises** (commerce/artisanat) pour récupérer un contact joignable.
>
> Statut : ✅ **LIVRÉ Phase 2 (21/05/2026)** — migrations + script enrichissement + UI single-page.

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

## 5. Fix perf B9 ✅ RÉSOLU Phase 2B (21/05)

RPC `brh_dirigeants_search` timeout >8s sur combinaison filtre département + autre filtre.

**Cause identifiée** : `EXISTS (SELECT FROM jsonb_array_elements(d.sci_dirigees) JOIN brh_sci_companies …)` sans index. Sur 80 844 dirigeants × 1-N SCI, full scan.

**Solution livrée Phase 2B** :
- Migration `20260521130000_brh_dirigeant_sci_link.sql` : table de liaison `brh_dirigeant_sci(dirigeant_id, siren, denomination, qualite, is_active, departement, ...)` avec 3 index (composite dept+dirigeant, siren, partial active+dept) + RLS admin/pro/employe + fonction `brh_dirigeant_sci_rebuild()` pour reconstruction batch
- **Backfill : 87 127 lignes** générées depuis `jsonb_array_elements(sci_dirigees)` (80 844 dirigeants distincts, 35 290 SIREN, 94 départements)
- Migration `20260521140000_rpc_brh_dirigeants_search_v2.sql` : RPC réécrit avec `EXISTS (SELECT FROM brh_dirigeant_sci ds WHERE ...)` indexé. Signature INCHANGÉE → zéro breaking change UI.

**Perf mesurée via EXPLAIN ANALYZE** : 841 ms sur dept 29 + multi_sci + proprio_dpe combinés (vs >8s timeout avant). Gain ~10x.

---

## 6. UI livrée Phase 2D (21/05)

✅ **[src/pages/employe/EmployeDirigeantDetail.tsx](../../src/pages/employe/EmployeDirigeantDetail.tsx)** — fiche dirigeant single-page enrichie :
- Section **"Autres entreprises (hors SCI)"** entre SCI dirigées et DPE détenus, avec carte par société (SIREN, dénomination, NJ, activité, siège) + lien sortant annuaire-entreprises.data.gouv.fr
- Bandeau contact distinguant **tel/email perso** (gris) vs **tel/email pro via société** (ambre ring) avec icônes Phone/Mail/Briefcase
- Footer date d'enrichissement
- Toutes les Skull remplacées par AlertTriangle (B8bis)

✅ **9 fichiers UI** patchés pour B8bis (têtes de mort → AlertTriangle) :
- `EmployeDirigeantDetail.tsx`, `EmployeDirigeants.tsx`, `EmployeClientBrhDetail.tsx`, `LeadDetailModal.tsx`, `FichePersonneView.tsx`, `FicheEntrepriseView.tsx`, `FicheAdresseView.tsx`, `PersonneSignalsExternesPanel.tsx`, `PersonneGraphPanel.tsx`

**Type étendu** `src/api/brh-dirigeants.ts` :
- Interface `DirigeantAutreEntreprise` (10 champs)
- `Dirigeant360.identity` enrichi avec 5 nouveaux champs

**Build** : ✅ tsc strict + Vite 22s, 0 erreur.

**À envisager P3 si demandé** :
- Mini-carte des biens (DVF + DPE liés) — composant à réutiliser depuis `prospection-map`
- Refonte `FicheEntrepriseView.tsx` (côté public agence/pro) pour intégrer dirigeants étendus

---

## 7. Décision D-2 — scale gratuit ✅ LIVRÉ Phase 2C (21/05)

Philippe a écarté Pappers API 49€/mois. On **scale gratuit** via `recherche-entreprises.api.gouv.fr` (publique, no quota strict).

**Migration `20260521150000_brh_dirigeants_autres_entreprises.sql`** :
- 5 colonnes ajoutées sur `brh_dirigeants` : `autres_entreprises JSONB`, `tel_pro_via_entreprise`, `email_pro_via_entreprise`, `autres_entreprises_enriched_at`, `autres_entreprises_match_count`
- 2 index partiels : queue batch (`enriched_at IS NULL`) + filtre UI (`tel_pro NOT NULL`)

**Script `scripts/brh-enrich-dirigeants-autres-entreprises.py`** :
- Source : API `recherche-entreprises.api.gouv.fr` (gratuite)
- Cleaning nom BRH : retire parenthèses ("nom d'usage"), "épouse XYZ"
- Anti-homonyme : match `date_naissance` (YYYY-MM minimum)
- Filtre SCI (nature_juridique 6540/6541 exclues — déjà connues)
- Ciblage SCI familiales : 1 ≤ nb_sci_dirigees ≤ 5, 1 ≤ nb_dpe_total ≤ 30, Bretagne (4 dépts via `brh_dirigeant_sci`)
- Rate limit 20 req/s, perf 0.46s/dirigeant
- Modes `--sample` (log détaillé), `--dry-run` (no DB write)

**Résultats batch en cours (21/05 ~10h)** :
- Cible : 13 862 dirigeants SCI familiales bretonnes
- À 900 enrichis : **53.4% ont au moins 1 entreprise non-SCI trouvée** (481/900) → ~7 400 dirigeants attendus enrichis sur batch complet
- ETA fin batch : ~2h (~107 min total estimé)

**Exemples métier réels (sample) validant le pivot** :
- JACQUES OUAIRY → `SELARL DOCTEUR OUAIRY JACQUES` (cabinet médical) — contact pro public via cabinet
- VALERY MOAL → `GROUPE IMMOBILIER SIAM, LUXIOR FINANCES, CENTRE D AFFAIRES SIAM` (7 hits) — promoteur immobilier identifiable
- JEAN-PIERRE FESTOC → `GROUPEMENT FORESTIER DU LANGOUET, SOC HABITATION LOYER MODE` (3 hits) — sociétés sectorielles

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 2
- Inventaire data : [data-inventory.md](data-inventory.md) §2 + §7
- Matching adresse : [matching-adresse.md](matching-adresse.md)
- Hubs sœurs : [hub-client-brh.md](hub-client-brh.md) · [hub-lead-public.md](hub-lead-public.md)
- Bugs : [bugs-ouverts.md](bugs-ouverts.md) (B7 fiche dirigeant + B9 perf)
- Graphe entités : [entity-graph.md](entity-graph.md)

---

**Dernière maj** : 2026-05-21 (Phase 2 livrée — migrations + script + UI) — Claude Opus 4.7
