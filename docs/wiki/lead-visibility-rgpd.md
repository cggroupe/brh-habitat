# Matrice RGPD `lead-visibility.ts`

> Source : [src/lib/rgpd/lead-visibility.ts](../../src/lib/rgpd/lead-visibility.ts)
> Décisions : 2026-05-18 ([brh_graph_navigable_decisions](../../.claude/memory/brh_graph_navigable_decisions.md))

## Principe

Chaque section des fiches drill-down ([fiches-drill-down.md](fiches-drill-down.md)) est gated côté front par :

```ts
import { canSee, displayName } from '@/lib/rgpd/lead-visibility'

{canSee(profile, 'particulier_phone') === true && <TelephoneSection />}
```

Le typage `canSee(profile, field): boolean | 'masked'` permet trois états :
- `true` → afficher
- `'masked'` → afficher en placeholder anonymisé (ex : "M. D***")
- `false` → ne pas rendre du tout

## Profils

| Profil | Définition | Source d'authentification |
|---|---|---|
| `employe` | Salarié interne BRH (commercial, gestionnaire, direction) | Compte `brh_employees` |
| `agence` | Agence immobilière partenaire | `brh_agences_immo` + invitations |
| `artisan` | Artisan RGE marketplace | `brh_artisans_rge` + invitations |
| `notaire` | Notaire pour études de succession (V2 — pas encore en prod) | À implémenter |

**Profil `particulier`** : volontairement hors-périmètre des fiches drill-down. Les particuliers utilisent les portails diagnostic / simulateur / RDV, pas l'exploration graphe BRH.

## Champs (`VisibilityField`)

| Champ | Description | Source data |
|---|---|---|
| `particulier_nom_complet` | Nom + prénom propriétaire particulier | `brh_dpe_prospects.particulier_name` |
| `particulier_phone` | Téléphone particulier | entity-hub `core.contact[kind=phone]` |
| `particulier_email` | Email particulier | entity-hub `core.contact[kind=email]` |
| `dpe_basic` | Étiquette, surface, année, type bâti | `brh_dpe_prospects` |
| `dpe_details_techniques` | Ubat, isolation, ventilation, chauffage, ECS | `brh_dpe_prospects` colonnes JSONB + déperditions |
| `dpe_personne_morale` | Propriétaire SIREN + dénomination (public Sirene) | `brh_dpe_prospects.owner_*` |
| `sci_info` | Identité Sirene SCI (denomination, capital, activité) | `brh_sci_companies` |
| `sci_dirigeants` | Liste dirigeants JSONB + qualité | `brh_sci_companies.dirigeants` |
| `sci_succession` | Score succession + dirigeants décédés | `brh_sci_companies.has_deceased_dirigeant` |
| `dvf_mutations` | Mutations historiques DVF (prix, date) | `brh_dvf_archive` |
| `osint_holehe` / `osint_sherlock` / `osint_apify_social` / `osint_searx` / `osint_emailrep` | Sources OSINT internes | entity-hub `core.contact.source_records` |
| `score_intention_travaux` | Score composite v2 sur 100 | `brh_dpe_prospects.score_v2` |
| `score_intention_vente_personnel` | Score vente perso BRH | `brh_score_vente_v1` |

## Matrice par profil

| Section / champ | Employé BRH | Agence | Artisan RGE | Notaire |
|---|---|---|---|---|
| `particulier_nom_complet` | ✅ | `masked` | `masked` | ✅ |
| `particulier_phone` | ✅ | ❌ | ❌ | ✅ |
| `particulier_email` | ✅ | ❌ | ❌ | ✅ |
| `dpe_basic` | ✅ | ✅ | ✅ | ❌ |
| `dpe_details_techniques` | ✅ | ❌ | ✅ | ❌ |
| `dpe_personne_morale` | ✅ | ✅ | ✅ | ✅ |
| `sci_info` | ✅ | ✅ | ❌ | ✅ |
| `sci_dirigeants` | ✅ | ✅ | ❌ | ✅ |
| `sci_succession` | ✅ | ✅ | ❌ | ✅ |
| `dvf_mutations` | ✅ | ✅ | ❌ | ✅ |
| `osint_*` (5 champs) | ✅ | ❌ | ❌ | ❌ |
| `score_intention_travaux` | ✅ | ✅ (agrégé) | ✅ | ❌ |
| `score_intention_vente_personnel` | ✅ | ❌ | ❌ | ❌ |

**Règles structurantes** :

1. **Particuliers protégés** : pas d'agences/artisans qui voient un téléphone particulier directement. Passage obligé par BRH (mise en relation) pour respect RGPD + maîtrise du flywheel.
2. **DPE technique** = `employe` + `artisan` only (artisan chantier sait travailler avec, agence n'en a pas besoin pour vendre).
3. **OSINT** = `employe` only. Pas d'externalisation des sources d'enrichissement.
4. **Historique BRH** (RDV, CA, statut Prospect/Client de `staging.brh_clients_v2`) = `employe` only. Privé.

## Helpers

```ts
canSee(profile: LeadProfile, field: VisibilityField): boolean | 'masked'
displayName(profile: LeadProfile, name: string | null, isPersonneMorale: boolean): string
anonymizeName(name: string): string  // "Jean Pierre DUPONT" → "M. D***"
```

`displayName` retourne :
- nom intact si personne morale (info Sirene publique)
- nom anonymisé si particulier + profil non-employé
- nom complet si particulier + employé BRH

## Évolutions futures

- Sprint 3 : extension OSINT à plus de champs (entity-hub `core.contact` kinds : `linkedin`, `facebook`, `instagram`, `tiktok`)
- Sprint 5 : profil `notaire` à terminer (V1 livrée mais pas en prod)
- Optionnel : opt-in particuliers via formulaire RGPD pour autoriser une agence à voir leurs contacts (state stocké dans `brh_consents_rgpd`)
