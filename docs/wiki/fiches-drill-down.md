# Fiches drill-down — graph navigable BRH

> Architecture cible : un graphe d'entités (adresse / entreprise / personne) où chaque nœud est cliquable et où toute information est reliée.
> Décision : 2026-05-18 ([brh_graph_navigable_decisions](../../.claude/memory/brh_graph_navigable_decisions.md)).
> Status : Sprint 1 livré (MVP Supabase). Sprint 3 enrichira via entity-hub.

## Pourquoi

Avant Sprint 1, l'utilisateur cliquait sur un lead → un **modal slide-in** s'ouvrait avec toutes les infos en vrac, sans navigation possible vers le propriétaire, la SCI ou les biens voisins. Philippe a explicitement rejeté ce design le 18/05 :

> « il faut que tout soit relié, que ce soit valable pour tous les profils (sauf particuliers), et que ça ressemble à une fiche client style CRM »

Le pattern modal isolait l'utilisateur sur un lead unique : c'était toujours un cul-de-sac, jamais un point de départ pour explorer.

## Architecture cible

3 entités, 3 routes deep-linkables, 1 hop direct par défaut :

```
/agence/leads/adresse/:dpeId      → fiche adresse
/agence/leads/entreprise/:siren   → fiche entreprise (SCI / SAS / SARL)
/agence/leads/personne/:nameOrId  → fiche personne (dirigeant / particulier)
```

Les mêmes routes existent pour `/employe/leads/...`, `/artisan/leads/...` (en attente : `/notaire/leads/...`).

### Pivot principal : `/agence/recherche`

Page route dédiée avec un champ unique (adresse / SIREN / SCI / nom / ville / CP) qui retourne 3 colonnes résultats groupées → pivot vers les fiches drill-down. Voir [recherche-multi.md](recherche-multi.md) (à créer).

## Liens du graphe

Toute fiche affiche les nœuds connectés sous forme de chips ou rows cliquables :

| Source | Lien sortant | Cible |
|---|---|---|
| Adresse | Propriétaire (SIREN) | Entreprise |
| Adresse | Propriétaire (particulier) | Personne |
| Adresse | Voisinage (10 max même CP) | Adresses |
| Entreprise | Dirigeants (chips JSONB) | Personnes |
| Entreprise | Adresses détenues (`owner_siren = SIREN`) | Adresses |
| Personne | Rôles entreprises (matching dirigeants JSONB) | Entreprises |
| Personne | Patrimoine direct (Sprint 3) | Adresses |

Sections supplémentaires non-cliquables (data only) : DPE technique, DVF mutations, BODACC alertes, succession score, contacts (BRH interne).

## Profondeur affichée

Décision 2026-05-18 : **1 hop direct + sections dépliables lazy**.

Les sections "Voisinage", "Adresses détenues", "Rôles entreprises", etc. sont rendues dans un `<FicheSection defaultOpen={false}>` qui n'instancie le contenu qu'au premier click. Permet de garder la fiche performante même pour un dirigeant qui possède 50 SCI.

Tout-déplié type Linkurious (vue graphe D3/Cytoscape) = pas pour ce sprint.

## Composants

| Composant | Fichier | Rôle |
|---|---|---|
| `FicheBreadcrumb` | [`src/components/leads/fiche/FicheBreadcrumb.tsx`](../../src/components/leads/fiche/FicheBreadcrumb.tsx) | Fil d'Ariane + bouton retour. |
| `FicheSection` | [`src/components/leads/fiche/FicheSection.tsx`](../../src/components/leads/fiche/FicheSection.tsx) | Section dépliable lazy. |
| `FicheEntityLink` | [`src/components/leads/fiche/FicheEntityLink.tsx`](../../src/components/leads/fiche/FicheEntityLink.tsx) | Chip (small) ou Row (full-width) cliquable vers une autre fiche. Encode le `profile` dans la route. |
| `FicheAdresseView` | [`src/components/leads/fiche/FicheAdresseView.tsx`](../../src/components/leads/fiche/FicheAdresseView.tsx) | Vue principale fiche adresse. |
| `FicheEntrepriseView` | [`src/components/leads/fiche/FicheEntrepriseView.tsx`](../../src/components/leads/fiche/FicheEntrepriseView.tsx) | Vue principale fiche entreprise. |
| `FichePersonneView` | [`src/components/leads/fiche/FichePersonneView.tsx`](../../src/components/leads/fiche/FichePersonneView.tsx) | Vue principale fiche personne. |

Les pages routes ([`src/pages/leads/Fiche{Adresse,Entreprise,Personne}Page.tsx`](../../src/pages/leads/)) ne sont que des wrappers qui lisent les params URL et injectent le `profile` selon la route.

## Sources de données

| Vue | Source primaire | Source secondaire | Sprint |
|---|---|---|---|
| Adresse | `brh_dpe_prospects` | `brh_sci_companies` (LEFT JOIN owner_siren), voisinage par `code_postal` | 1 ✅ |
| Entreprise | `brh_sci_companies` | `brh_dpe_prospects` WHERE `owner_siren`, `brh_bodacc_alerts` | 1 ✅ |
| Personne | `brh_sci_companies.dirigeants` JSONB ILIKE | — | 1 ✅ MVP |
| Personne (canonique) | entity-hub `core.person` UUID | `core.contact`, `signals.intention_*`, `core.event` (RDV BRH) | 3 🟡 |
| Adresse signaux | entity-hub `signals.intention_travaux` | `signals.intention_vente` | 3 🟡 |
| Personne historique BRH | entity-hub `staging.brh_clients_v2` (CA + facturation + enfants) | `staging.brh_rdv` timeline | 3 🟡 |

API : composition côté client de queries Supabase simples ([`src/api/brh-fiches.ts`](../../src/api/brh-fiches.ts)), pas de RPC SQL.

Décision 18/05 : éviter le pattern RPC unique qui agrège tout côté Postgres (cf retex §2.3 du 17/05 — 2 bugs typage sur `brh_foncier_prospects_unified`). La composition client est plus debuggable et plus modulable.

## Matrice RGPD par profil

Chaque section est gated par `canSee(profile, field)` (cf [lead-visibility.ts](../../src/lib/rgpd/lead-visibility.ts) et [lead-visibility-rgpd.md](lead-visibility-rgpd.md) — à créer).

| Section | Employé BRH | Agence | Artisan RGE | Notaire |
|---|---|---|---|---|
| Identité personne | ✅ tout | nom pro / anonymisé particulier | idem agence | ✅ |
| Contacts tél/email | ✅ | pro / particulier opt-in only | ❌ | ✅ |
| DPE technique détaillé | ✅ | étiquette+surface | ✅ chantier | ❌ |
| Rôles entreprises | ✅ | ✅ public Sirene | ❌ | ✅ |
| Patrimoine adresses | ✅ | ✅ | ❌ | ✅ |
| Historique BRH | ✅ | ❌ (privé BRH) | ❌ | ❌ |
| Signaux intention | ✅ | score agrégé only | ❌ | succession only |

Profil **particulier** : **n'a PAS accès aux fiches drill-down**. Les routes `/.../leads/personne/...` ne lui sont pas exposées. Confirmé 18/05.

## Anti-patterns à ne pas reproduire

- ❌ Modal slide-in qui écrase la navigation (le défaut du V2 du 17/05)
- ❌ Émojis (🔥 💀 ⭐ 💙) dans UI ou data — cf [feedback-brh-pas-d-emojis](../../.claude/memory/feedback_brh_pas_d_emojis.md)
- ❌ Segment `'premium'` qui n'existe pas en BDD — les vrais segments sont `ultra_chaud`/`mpr_bleu_prio`/`cold`/`standard`
- ❌ Filtre succession via `dpe_saut_s1 IS NOT NULL` — utiliser `brh_sci_companies.has_deceased_dirigeant = TRUE` ou `core.person.death_date IS NOT NULL`
- ❌ Supprimer des fonctionnalités V1 sans les porter en V2 — cf [feedback-brh-enrichir-jamais-ecraser](../../.claude/memory/feedback_brh_enrichir_jamais_ecraser.md)

## Roadmap

- Sprint 1 ✅ — pages routes drill-down (commit `fdcebd5`)
- Sprint 2 ✅ — page recherche `/agence/recherche` (commit `f36fa3f`)
- Sprint 3 🟡 — Branchement entity-hub (8 624 SCI fill-gaps en cours, signaux d'intention, historique RDV/CA)
- Sprint 4 ⏳ — Update `data-model.md` + `index.md` + `lead-visibility-rgpd.md`
- Sprint 5 (futur) — `/notaire/leads/...` (4e profil)
- Sprint 6 (futur) — vue graphe D3/Cytoscape pour exploration libre multi-hop
