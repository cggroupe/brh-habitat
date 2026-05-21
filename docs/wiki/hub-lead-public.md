# Hub Lead Public — fiche prospect agence/pro (entité-pivot)

> **Hub fiche prospect/lead** accessible aux **agences immobilières** et **professionnels du BTP**.
> Toutes infos DPE + cross publiques, **zéro PII** côté public.
>
> Statut : 🟡 **SQUELETTE Phase 0** — contenu rempli Phase 4 (cf [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md)).

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

### Anti-leakage PII

- Si DPE détenu par particulier reconnu dans BRH (`brh_lead_pii_enriched` ou `brh_personnes_historique`) → **côté public, masquer nom/tel/email**. Visible uniquement employé BRH.
- Si DPE détenu par SCI → afficher dénomination + dirigeants publics (Sirene/Pappers Open Data, donc OK)

---

## 2. Filtres "Mes leads" — refonte UX (Phase 4)

Fichier : [src/components/leads/UnifiedLeadsView.tsx](../../src/components/leads/UnifiedLeadsView.tsx) lignes 45-76.

### F1 — Segments renommés + tooltips

| Segment actuel | Tooltip à ajouter |
|----------------|-------------------|
| Ultra-chaud | Travaux probables <6 mois |
| MPR bleu | Éligible MaPrimeRénov' tranche bleu (revenus modestes) |
| Prio | Score >70 |
| Standard | Score 40-70 |
| Froid | Score <40 |

### F2 — Tooltip score
Popover avec formule en 3 lignes (à finaliser Phase 4 selon `brh_score_vente_v1`).

### F3 — Filtre DPE (décision D-3 du 21/05)
Multi-select : **E + F + G** (au lieu du toggle binaire "passeport thermique").

### F4 — Filtre délais
Activer sélection : 12m / 24m / 36m / 60m (mutation DVF récente).

### F5 — Perf
- Audit React Query `staleTime`
- Pagination cursor sur `unified_leads`
- ⚠️ Bloqué par fix B9 (Phase 2)

### F6 — Têtes de mort résiduelles (B8bis)
À localiser début Phase 4. Grep ☠/💀 dans `src/` = 0 occurrence → source probable : icône Lucide `Skull` ou rendu côté Postgres.

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

**Dernière maj** : 2026-05-21 (squelette Phase 0) — Claude Opus 4.7
