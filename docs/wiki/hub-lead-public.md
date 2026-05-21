# Hub Lead Public — fiche prospect agence/pro (entité-pivot)

> **Hub fiche prospect/lead** accessible aux **agences immobilières** et **professionnels du BTP**.
> Toutes infos DPE + cross publiques, **zéro PII** côté public.
>
> Statut : ✅ **LIVRÉ Phase 4 (21/05/2026)** — filtres refondus + B6 + B8 + P-B vérifié OK.

---

## 1. Ce que l'agence/pro BTP doit voir

Demande Philippe 21/05 (vocal) :

> « On doit faire en sorte, d'après la base de données de l'ADEME et les DPE, de recenser toutes ces informations, toutes ces adresses avec les DPE et toutes les informations possibles du DPE : sa date de réalisation, tous les éléments énergétiques, tous les éléments qui ne sont pas énergétiques aussi, s'il y a eu des recherches spécifiques sur le DPE. On veut toutes les informations dans la fiche Prospect Leads de l'adresse. On n'a pas forcément pour les particuliers de nom, de prénom ou de moyen de contact — à part s'ils sont reliés à BRH, mais ça on ne les met pas dans la partie visible agence immobilière par exemple. »

> « Pour les particuliers, on recherche si on a des données de permis de construire à ces mêmes adresses. On recherche si on a des données BDNB/CSTB. On recherche si on a des permis de construire à cette adresse. On essaye de relier toutes les informations qu'on peut avoir dans les données qu'on possède. On a énormément de données. On recherche si l'adresse n'est pas un siège social d'une entreprise. »

### Blocs à afficher

1. **Adresse** (anonyme pour particulier, identifiée pour SCI)
2. **DPE complet ADEME** :
   - Date de réalisation
   - Lettre énergétique (A → G)
   - kWh/m²/an + GES kg CO₂eq/m²/an
   - Type de chauffage / ECS
   - Type de ventilation
   - Surface habitable
   - Année construction bâtiment
   - Tous postes énergétiques (isolation murs/toiture/plancher/menuiseries)
   - Tous postes NON-énergétiques (matériaux, exposition…)
   - Estimation gains potentiels (`brh_prospect_studies`)
3. **Permis de construire** à l'adresse (Sitadel quand chargé)
4. **BDNB / CSTB** (typologie bâti — quand chargé P3)
5. **DVF** (mutations à l'adresse — uniquement `usable_for_brh=TRUE`)
6. **Vérif "adresse = siège social ?"** : lookup `brh_sci_companies.siege_adresse` + `brh_ext_immo_companies` + `brh_ext_rge_companies`
7. **Score IA propension vente** (`brh_score_vente_v1`) — explicable (popover formule)

### Anti-leakage PII ✅ déjà conforme

Vérifié Phase 4.5 : la matrice [src/lib/rgpd/lead-visibility.ts](../../src/lib/rgpd/lead-visibility.ts) gère déjà correctement la séparation PII via `canSee(profile, field)`. Champs sensibles :
- `particulier_phone`, `particulier_email`, `particulier_nom_complet` : visibles uniquement profil **employe**
- `osint_*` (Holehe/Sherlock/Apify/...) : visibles uniquement employe
- `score_intention_vente_personnel` : employe only
- `dpe_basic`, `dpe_details_techniques`, `sci_*`, `dvf_mutations`, `score_intention_travaux` : visibles agence/artisan (sans PII)

[src/components/leads/fiche/FicheAdresseView.tsx](../../src/components/leads/fiche/FicheAdresseView.tsx) consomme cette matrice via `canSee()` à chaque section. Aucune refonte nécessaire en Phase 4 — l'architecture v2 17/05 est déjà conforme RGPD.

### Si DPE détenu par SCI
- Côté public : affichage dénomination + dirigeants Sirene (données Open Data publiques)
- Côté employe : + cross BODACC, succession, contact pro via autres entreprises (Phase 2C)

---

## 2. Filtres "Mes leads" — refonte UX ✅ LIVRÉ Phase 4 (21/05)

Fichier : [src/components/leads/UnifiedLeadsView.tsx](../../src/components/leads/UnifiedLeadsView.tsx)

### F1 — Segments tooltips ✅
Chaque segment a maintenant un `title=` HTML natif explicatif :
- Ultra-chaud → "Travaux probables dans les 6 mois (score ≥ 80, signaux DVF+permis+intention)"
- MPR Bleu prio → "Éligible MaPrimeRénov' tranche bleu (revenus modestes — aides maximales)"
- Standard → "Score 40-79 — Prospect à qualifier, signaux moyens"
- Froid → "Score < 40 — Faible probabilité de conversion à court terme"

+ Pastille latérale `< 6m / MPR bleu / 40-79 / < 40` directement dans le bouton segment pour lisibilité immédiate.

### F2 — Tooltip score ✅
Lien "comment c'est calculé ?" en sous-libellé du slider Score, avec popover natif (constant `SCORE_FORMULA_LINES`) :
```
Score V2 = 0-100 calculé sur :
• Note énergétique DPE (40 %)
• Mutations DVF récentes (25 %)
• Détention SCI / succession (15 %)
• Permis Sitadel + intention travaux (20 %)
```

### F3 — Filtre DPE multi-select (D-3) ✅
Remplacement du toggle binaire "F/G uniquement" par 3 boutons-bascule couleur **E / F / G** :
- E (orange 500) — "DPE E : interdit location nue dès 2034 (anticipation prospective)"
- F (orange 700) — "DPE F : interdit location nue depuis 2028"
- G (red 700) — "DPE G : interdit location nue depuis 2025"

État interne `dpeClasses: Set<string>`. Défaut `{F, G}`. Cocher E élargit la sélection. Si tous décochés → "Toutes classes A→G". Cohérence avec le `etiquetteFilter` (select classe précise) : si l'utilisateur choisit une classe hors du multi-select, on vide le multi-select pour rendre la sélection effective.

### F4 — Délais sélectionnables ⏳ P3
Le filtre actuel reste binaire (`< 24 mois`) car la RPC `brh_foncier_prospects_unified` ne supporte qu'un flag `dvf_mutation_24m`. Élargissement 12m/36m/60m = nécessite migration RPC. Reporté P3 (peu de demande métier vs autres priorités).

### F5 — Perf ✅ (indirect)
Le fix B9 Phase 2B (table `brh_dirigeant_sci` + RPC v2) a réduit les jointures `jsonb_array_elements`. Pas de regression mesurée côté `unified_leads`.

### F6 — Têtes de mort ✅
Résolu Phase 2D. 9 fichiers patchés (Skull → AlertTriangle).

---

## 3. Sources data utilisées

| Source | Table | Statut |
|--------|-------|--------|
| DPE | `brh_dpe_prospects` (59 306) | 🟢 |
| Étude énergétique | `brh_prospect_studies` (59 248) | 🟡 pas affiché — à câbler Phase 4 |
| Score propension vente | `brh_score_vente_v1` (59 255) | 🟡 partiel |
| Intentions travaux | `brh_intention_signals` (13 000) | 🟢 |
| Permis | `brh_permis_construire` (0) | 🟠 import en cours |
| BDNB | à créer P3 | ⚫ |
| DVF | `brh_dvf_archive` (104 225, 39 711 usable) | 🟢 |
| Détection siège société | `brh_sci_companies` + `brh_ext_*` | 🟡 pas câblé |

---

## 4. UI cibles (Phase 4)

- [src/components/leads/UnifiedLeadsView.tsx](../../src/components/leads/UnifiedLeadsView.tsx) — refonte filtres
- [src/components/leads/fiche/FicheAdresseView.tsx](../../src/components/leads/fiche/FicheAdresseView.tsx) — fiche prospect publique
- [src/pages/agence/AgenceLeadsV2.tsx](../../src/pages/agence/AgenceLeadsV2.tsx) — page liste agence

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 4
- Inventaire data : [data-inventory.md](data-inventory.md)
- Matching adresse : [matching-adresse.md](matching-adresse.md)
- Hubs sœurs : [hub-client-brh.md](hub-client-brh.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)
- Bugs filtres : [bugs-ouverts.md](bugs-ouverts.md) (F1 à F6)
- Visibilité RGPD : [lead-visibility-rgpd.md](lead-visibility-rgpd.md)

---

**Dernière maj** : 2026-05-21 (Phase 4 livrée — filtres + B6 + B8 + P-B vérifié) — Claude Opus 4.7
