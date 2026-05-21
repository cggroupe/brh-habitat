# Bugs ouverts + Stratégie data BRH (21/05/2026)

> **Source de vérité commerciale** : pour chaque entité (DPE, SCI, dirigeant, particulier, artisan, agence), qu'est-ce qu'on a, comment on l'utilise, et **comment on pivote** pour récupérer un contact joignable.
>
> Compagnon de [`data-coverage.md`](data-coverage.md) (datasets de masse) et [`osint-enrichment-registry.md`](osint-enrichment-registry.md) (enrichissement contact-par-contact).

---

## 1. Bugs ouverts (état au 21/05/2026)

### Bugs CORRIGÉS en local (commits non pushés — attente GO Philippe)

| # | Bug | Fix | Commit |
|---|-----|-----|--------|
| B1 | Fiche client "bodard francois" — nom en minuscules | `formatNameFr()` capitalise mots + tirets + apostrophes | `1bcd4e7` |
| B2 | Téléphone brut `0683533275` | `formatPhoneFr()` → `06 83 53 32 75` (gère +33) | `1bcd4e7` |
| B3 | Adresse dupliquée `14 rue bugeaud 29200 Brest France · 29200 Brest` | `formatFullAddress()` détecte CP/ville déjà présents | `1bcd4e7` |
| B4 | DPE 14 rue Bugeaud apparaît sur fiche Bodard sans tag, alors qu'il est détenu par SCI La Colline (Bodard n'est PAS dirigeant) | Tag "Occupant · SCI X détient" + calcul `dpe_role` (proprietaire/dirigeant/occupant) dans RPC v2 `brh_personne_360` | `7f4b724` |
| B5 | Postes DPE (isolation murs/plancher/toiture/ventilation/chauffage/ECS) non modifiables | `DpePostesEmployeePanel` + RPC `brh_dpe_employee_update` (7 postes whitelistés, 4 status, audit `employee_overrides` JSONB) | `7f4b724` |

### Bugs ENCORE OUVERTS

| # | Bug | Diagnostic | Action requise |
|---|-----|------------|----------------|
| **B6** | Filtre "Propriétaire DPE BRH" page `/employe/dirigeants` paraît inopérant | Faux bug technique : RPC fonctionne, 80 844 → 17 403. Mais tri par défaut `nb_dpe_total DESC` met déjà tous les propriétaires en tête → top 5 identique avec/sans filtre. Seul le compteur change. | Tri conditionnel (nom A→Z par défaut, patrimoine DESC si filtre coché) + compteur + bandeau "Filtré par : …" |
| **B7** | Fiche dirigeant SCI ne montre pas les éléments fonciers complets | Aujourd'hui : liste DPE détenus + BODACC + détails SCI. Manque : mutations DVF, mini-carte des biens, score patrimoine agrégé, carnet de bord BRH | Décision Philippe nécessaire sur lesquels ajouter |
| **B8** | "Leads BRH vue unifiée" mélange clients + prospects | Confusion utilisateur : on voit des contacts BRH (déjà facturés) et des prospects DPE F/G (jamais contactés) sans distinction. Détail à clarifier avec Philippe | Investiguer routes `/agence/leads` vs `/employe/clients-brh`, identifier doublon |

### Bug PERFORMANCE silencieux

| # | Bug | Diagnostic |
|---|-----|------------|
| **B9** | RPC `brh_dirigeants_search` timeout (>8s) quand on combine filtre département + n'importe quel autre filtre | Cause : `EXISTS (SELECT FROM jsonb_array_elements(d.sci_dirigees) JOIN brh_sci_companies …)` sans index. Sur 80 844 dirigeants × 1-N SCI chacun, full scan. **Fix proposé** : matérialiser une colonne `departements text[]` sur `brh_dirigeants` + index GIN. Ou créer table de liaison `brh_dirigeant_sci(dirigeant_id, siren, departement)` avec index. |

---

## 2. Inventaire data — qu'est-ce qu'on a aujourd'hui

> Chiffres réels au **2026-05-21** via psql sur `lygmmvxnmvlgynmrcpny`.

### A. Foncier & énergie (gisement national / régional)

| Table | Rows | Couverture | Pivot principal | Sources |
|-------|-----:|------------|-----------------|---------|
| `brh_dpe_prospects` | **59 306** | DPE F/G Bretagne (4 dépts) + extension nationale partielle | `numero_dpe` (ADEME), `owner_siren` (SCI), `code_postal+adresse` (BAN) | ADEME DPE 3CL 2021 |
| `brh_dvf_archive` | **104 225** | Mutations 10 ans (DVF data.gouv) — 2 869 sur Brest | `code_postal+lower(adresse_voie)` | data.gouv DVF |
| `brh_intention_signals` | **13 000** | Signaux travaux/vente par DPE | `dpe_id` | Calc interne (DVF + permis + BODACC) |
| `brh_score_vente_v1` | **59 255** | Score propension vente par DPE | `dpe_id` | Heuristique 13 règles |
| `brh_prospect_studies` | **59 248** | Étude énergétique par DPE | `dpe_id` | Calc internes |
| `brh_permis_construire` | **0** ⚠️ | Sitadel Bretagne — import en cours | `code_insee+date` | data.gouv Sitadel3 |

### B. Entreprises & dirigeants (Sirene/Pappers)

| Table | Rows | Couverture | Pivot principal | Sources |
|-------|-----:|------------|-----------------|---------|
| `brh_sci_companies` | **36 491** | SCI Bretagne + tout détenteur DPE F/G | `siren` (9) | Sirene/Pappers |
| `brh_dirigeants` | **80 844** | Dirigeants consolidés (cross-SCI) — 17 403 propriétaires DPE, 4 470 multi-SCI, 515 succession ouverte | `id` (UUID), clé naturelle `(nom_norm, prenom_norm, date_naissance)` | Cross brh_sci_companies + déduplication |
| `brh_sci_deces_matches` | **46 730** | Match nom+prénom dirigeants ↔ INSEE décès (591 matches confirmés Bretagne) | `siren` + `(nom, prenom, date_naissance)` | INSEE Décès + Sirene |
| `brh_bodacc_alerts` | **3 653** | Annonces BODACC (1 765 radiations, 1 128 collectives, 760 commerciales) | `siren`, `denomination` | data.gouv BODACC |

### C. Marché pro (artisans, agences)

| Table | Rows | Couverture | Pivot principal | Sources |
|-------|-----:|------------|-----------------|---------|
| `brh_ext_rge_companies` | **14 810** | Annuaire RGE FR | `siret`, `denomination` | ADEME RGE |
| `brh_artisans_rge` | **862** | Sous-ensemble RGE actif BRH | `siret` | Curation interne |
| `brh_ext_immo_companies` | **6 887** | Agences immo FR | `siret` | Annuaire/Sirene |
| `brh_agences_immo` | **13** | Agences partenaires BRH | `id` | Saisie BRH |
| `brh_companies` | **64** | Sociétés clientes plateforme | `id`, `siret` | Inscription |

### D. Contacts & terrain BRH

| Table | Rows | Couverture | Pivot principal | Sources |
|-------|-----:|------------|-----------------|---------|
| `brh_personnes_historique` | **18 571** | Contacts BRH consolidés (14 372 en Bretagne, 4 505 emails connus) | `id` UUID, `fingerprint_hash` | Imports clients (BRH legacy + PPO 44 + Base44) |
| `brh_lead_pii_enriched` | **771** | PII rattachée à un DPE (CA cumulé, tel/email enrichis) | `dpe_id` | OSINT manuel + matching adresse |
| `brh_personne_visits` | **1 773** | Visites terrain par contact | `personne_id` | Saisie employé |
| `brh_personne_travaux` | **2 900** | Postes travaux observés terrain | `personne_id, poste` | Saisie employé |
| `brh_entity_links` | **2 729** | Graphe pivot (personne ↔ SCI ↔ adresse DPE ↔ mutation DVF) | `from_type, from_id, link_type, to_type, to_id` | Calc batch |

### E. Tables OSINT / archive

| Table | Rows | Rôle |
|-------|-----:|------|
| `brh_osint_full_purge_archive` | 6 010 | Historique enrichissements OSINT par personne |
| `brh_osint_apify_homonyme_archive` | 4 734 | Hits Apify Google sur dirigeants — homonymes filtrés |
| `brh_osint_maigret_archive` | 329 | Sherlock/Maigret usernames matches |
| `brh_psy_profile_archive` | 3 414 | Profils psychologiques générés par IA |
| `brh_entity_links_archive` | 5 188 | Anciens liens entity-graph |
| `brh_linked_dpe_purge_archive` | 2 156 | Anciens liens linked_dpe_id corrigés |

---

## 3. Principes de pivot OSINT — comment on remonte un contact joignable

> Une personne = une intersection. Quand on tient un seul fil (nom, SIREN, adresse), on peut tirer toute la pelote en croisant nos tables. Voici les **6 pivots les plus rentables** identifiés.

### Pivot 1 — SCI → autres entreprises du dirigeant (LE PLUS RENTABLE)

**Use case** : la SCI ne donne ni tel ni email (entité passive). Mais son dirigeant possède souvent un **petit commerce / artisanat / cabinet** qui, lui, est référencé avec un téléphone pro public.

**Comment** :
1. Partir d'une SCI (`brh_sci_companies.siren`)
2. Récupérer ses dirigeants (`brh_sci_companies.dirigeants` JSONB)
3. Pour chaque dirigeant (nom + prénom + DOB), chercher dans :
   - `brh_ext_rge_companies` où il est dirigeant → artisan RGE → tel pro
   - `brh_ext_immo_companies` → agent immo → tel pro
   - `brh_sci_companies` autres SCI où il est dirigeant (multi-SCI 4 470 cas) → siège commercial éventuel
4. **Si match Sirene/Pappers** avec une autre entité non-SCI → tél/email pro via Pappers Open Data

**Verdict** : ce pivot est **conceptuellement validé** mais pas encore câblé. Étape suivante : enrichir `brh_dirigeants.autres_entreprises jsonb` via batch Pappers (49 €/mois plan API).

### Pivot 2 — Cross-match BDD interne (déjà validé 19/05)

**Use case** : un dirigeant SCI a déjà été client BRH ou contacté → son contact est dans `brh_personnes_historique`.

**Comment** :
- Match strict `(nom_norm, prenom_norm)` + validation département (SCI principale ↔ CP contact) → premiers 2 chars égaux
- Si validé : copier `telephone` + `email` du contact BRH vers le dirigeant

**Résultats** (sprint 19/05) : 209 matches nom+prenom, **121 validés strict** (58 % avec dept match), **110 dirigeants enrichis** gratuitement.

### Pivot 3 — Adresse DPE → propriétaire vs occupant

**Use case** : un DPE est physiquement à une adresse, mais qui le détient ?

**Comment** (RPC `brh_dpe_role_for_personne`, livré 20/05) :
1. Si `brh_dpe_prospects.owner_siren IS NULL` → propriétaire particulier → DPE rattaché via `linked_dpe_id`
2. Si `owner_siren` ≠ NULL → DPE détenu par SCI → vérifier si la personne est dirigeante (via `brh_entity_links.link_type='dirige'`)
3. Sinon → c'est un **occupant** (locataire). Le DPE reste visible sur sa fiche mais avec le badge "Occupant · SCI X détient"

**Implication métier** : pour les travaux, on contacte le **propriétaire** (SCI ou particulier), pas le locataire.

### Pivot 4 — Succession SCI → héritiers actionnables

**Use case** : un dirigeant SCI décédé → la SCI peut être en succession ouverte → contacter les enfants/conjoint pour racheter ou rénover.

**Comment** :
1. `brh_sci_deces_matches.match_found = TRUE` (46 730 matches, 591 stricts Bretagne)
2. `brh_sci_companies.has_deceased_dirigeant = TRUE` (522 SCI Bretagne)
3. Cross avec `brh_dirigeants` co-mandataires non-décédés → c'est probablement un héritier (conjoint ou enfant)
4. Ou recherche BODACC `radiations` (1 765 alertes) sur la SCI

**État** : câblé sur fiche client BRH via `brh_personne_signals_externes` RPC.

### Pivot 5 — BODACC → cession fonds = patrimoine liquide

**Use case** : une cession de fonds de commerce ou liquidation = capital cash récent disponible chez le dirigeant → potentiel d'investissement immo / travaux.

**Comment** :
- `brh_bodacc_alerts.famille_avis = 'commerciales'` (760 cas) + `prix_cession_cents NOT NULL`
- Match par `siren` ou `denomination` avec `brh_sci_companies.dirigeants`
- Le dirigeant a touché X € net de cession → prospect chaud rénovation lourde ou patrimoine

**État** : câblé sur fiche client BRH (cession + radiations + modifs statut).

### Pivot 6 — DVF → mutation récente = travaux probables 12-24 mois

**Use case** : une vente récente DVF sur une adresse F/G → l'acquéreur fait souvent travaux dans les 18 mois (relogement, mise aux normes, rénovation énergétique).

**Comment** :
- `brh_dvf_archive.usable_for_brh = TRUE` (39 711 exploitables) + `date_mutation > NOW() - INTERVAL '24 months'`
- Match par adresse `(code_postal, lower(adresse_voie))` → `brh_dpe_prospects.adresse`
- Score d'intention `brh_intention_signals.score_travaux` consolidé

**État** : câblé sur fiche client BRH et `/agence/leads` V2.

---

## 4. Sources de pivot encore non câblées (priorités)

| Priorité | Source | Volume estimé | Pivot apporté |
|----------|--------|---------------|---------------|
| **P1** | **Pappers API** (49 €/mois) | 17 403 dirigeants propriétaires DPE | Tel/email pro + autres entreprises de chaque dirigeant |
| **P2** | **Permis de construire Sitadel** (en cours) | ~5-10 k/an Bretagne | Adresses avec travaux récemment autorisés → prospect chaud rénovation |
| **P3** | **BDNB Bretagne** (2.4 GB pg_dump) | ~1.5 M bâtiments | Typologie bâti exacte (% vitrage, matériaux, étages) — affine score travaux |
| **P3** | **DVF historique 2019-2023** | ~250 k mutations supplémentaires | Élargit fenêtre acquéreurs récents 24m → 60m |
| **P4** | **Annuaire mairies / registres meublés tourisme** (Loi Le Meur mai 2026) | Limité aux communes contraintes (Saint-Malo, Quiberon, Crozon…) | Identifie loueurs Airbnb → DPE F/G interdits de location nue → prospect travaux URGENT |
| **P4** | **Sous-traitants RGE bretons** (Tinergie, Heol, SOLIHA) | ~150 artisans qualifiés | Partenariats sous-traitance |

---

## 5. À retenir (résumé en 3 phrases)

1. **Sur 80 844 dirigeants SCI**, on ne joindra jamais 90 % via leur SCI elle-même. La piste qui rapporte = **les autres entreprises où ils sont mandataires** (commerces, artisanats, autres SCI). C'est Pappers API payante.
2. **Sur 17 403 propriétaires DPE BRH**, 121 sont déjà des contacts BRH historiques avec tel/email — c'est gratuit, à étendre par fingerprint d'adresse.
3. **Sur un DPE détenu par une SCI**, le contact actionnable est le **dirigeant** (ou un héritier si décès), jamais l'occupant. Le tag "Occupant" sur la fiche particulier sert à ne pas faire l'erreur Bodard.

---

## Liens

- Bugs corrigés en local : commits `1bcd4e7` (formatage français) + `7f4b724` (DPE éditable + rôles)
- Migrations : `20260520100000_brh_dpe_employee_overrides.sql` + `20260520110000_rpc_brh_personne_360_dpe_role.sql`
- Registry OSINT : [`osint-enrichment-registry.md`](osint-enrichment-registry.md)
- Coverage datasets : [`data-coverage.md`](data-coverage.md)
- Sources externes : [`external-data-sources.md`](external-data-sources.md)
- Graphe entités : [`entity-graph.md`](entity-graph.md)

**Dernière maj** : 2026-05-21 — Claude Opus 4.7
