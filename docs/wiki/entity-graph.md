# Entity Graph — BRH (Pattern Karpathy)

> **Source de vérité** du graphe d'entités BRH : table pivot `brh_entity_links` + algos de matching + RPC d'exploration.
>
> Objectif : transformer la data dispersée (16 607 personnes BRH + 36 491 SCI + 59 306 DPE + 104 225 mutations DVF + 3 653 BODACC + Sitadel à venir) en **système relié et navigable**.

---

## 1. Modèle

```
brh_entity_links
─────────────────────────────────────────────────────────
from_type  from_id   →   to_type        to_id    link_type      confidence  evidence
─────────────────────────────────────────────────────────
personne_brh  <uuid>      sci            <siren>  dirige         0.85-0.95   {rule, dept_match}
personne_brh  <uuid>      adresse_dpe    <id>     habite         0.65-0.90   {rule}
adresse_dpe   <id>        mutation_dvf   <uuid>   a_mute         0.70-0.95   {rule}
adresse_dpe   <id>        permis_sitadel <id>     a_permis       (à venir)
```

**Types d'entités** : `personne_brh`, `sci`, `adresse_dpe`, `mutation_dvf`, `permis_sitadel` (futur)
**Types de liens** : `dirige`, `habite`, `a_mute`, `a_permis` (futur), `detient` (futur)

---

## 2. Algorithmes de matching (`brh_entity_links_recompute()`)

### Règle 1 — personne_brh ↔ SCI (`dirige`)
```sql
match: lower(p.nom) = lower(d.dirigeants[].nom)
    AND lower(p.prenom) = lower(d.dirigeants[].prenom)
    AND length(p.nom) >= 2 AND length(p.prenom) >= 2
confidence: 0.95 si dept_sci == dept_personne, sinon 0.85
```
**Résultat 2026-05-19** : 219 liens.

### Règle 2 — personne_brh ↔ adresse_dpe (`habite`)
**Source A** : `personne.linked_dpe_id` déjà rempli → confiance **0.90**, evidence = `{rule: 'linked_dpe_id'}`
**Source B** : match heuristique CP + voie normalisée → confiance **0.65**
```sql
WHERE d.code_postal = p.code_postal
  AND lower(regexp_replace(d.adresse,'^[0-9]+\s*','')) = lower(regexp_replace(p.adresse,'^[0-9]+\s*',''))
```
**Résultat 2026-05-19** : 7 321 liens.

### Règle 3 — adresse_dpe ↔ mutation_dvf (`a_mute`)
```sql
match: v.code_postal = d.code_postal
   AND lower(v.adresse_voie) = lower(regexp_replace(d.adresse,'^[0-9]+\s*',''))
   AND v.usable_for_brh = TRUE
confidence: 0.70 (heuristique CP + voie, brh_dpe_prospects n'a pas parcelle_idu)
```
**Résultat 2026-05-19** : 22 779 liens.

### Règle 4 — adresse_dpe ↔ permis_sitadel (`a_permis`) — **TODO**
Sera ajoutée dès que l'import Sitadel Bretagne est dans Supabase (en cours, PID 1797418).

---

## 3. Idempotence

La fonction `brh_entity_links_recompute()` utilise `ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE` → relançable à volonté sans doublon. Évidence et confidence sont mises à jour. À appeler après chaque nouvelle ingest (DVF, Sitadel, SCI, personnes).

---

## 4. RPC d'exploration

### `brh_personne_360(p_personne_id uuid)`
Une seule RPC retourne pour un contact BRH :
- `identity` (jsonb) — fiche personne complète (psy_profile inclus)
- `sci_dirigees` (jsonb[]) — SCI dirigées avec confidence
- `adresses_liees` (jsonb[]) — adresses DPE habitées
- `mutations_dvf` (jsonb[]) — mutations DVF transitives via adresses
- `bodacc_alerts` (jsonb[]) — alertes BODACC sur les SCI
- `sci_deces_pairs` (jsonb[]) — héritiers potentiels (décès SCI match nom/prénom)
- `links_summary` (jsonb) — compteurs par type de lien

SECURITY DEFINER + check role (admin/pro/employe).

### `brh_entity_neighbors(p_type, p_id)` — **futur**
Symétrique pour SCI et adresse_dpe (à créer au Sprint C).

---

## 5. UI — `PersonneGraphPanel`

Composant lazy dans `ClientsBrhView` (clic « Graphe 360° »). 5 blocs colorés :
- 🟣 SCI dirigées (indigo) — avec badges `radiée`, `succession`, lien vers fiche entreprise
- 🔵 Adresses DPE liées (sky) — DPE F/G en rouge, lien vers fiche adresse
- 🟡 Mutations DVF (ambre) — filtre par défaut `usable_for_brh`, badge `groupée` pour VEFA
- 🟪 BODACC sur SCI (purple) — cessions, modifs
- 🌹 Succession potentielle (rose) — décès dirigeants SCI avec match nom/prénom

Confiance affichée par lien (badge emerald « conf. 85% »).

---

## 6. Distribution actuelle (2026-05-19 matin)

```
total_links = 30 319
  ├─ a_mute      22 779  (adresse_dpe → mutation_dvf)
  ├─ habite       7 321  (personne_brh → adresse_dpe)
  └─ dirige         219  (personne_brh → sci)
```

**Couverture sur les contacts BRH** :
- 7 321 / 16 607 = 44 % ont au moins une adresse DPE liée
- 219 / 16 607 = 1.3 % sont dirigeants d'une SCI

---

## 7. Roadmap

| Sprint | Action | Statut |
|---|---|---|
| A | Table `brh_entity_links` + 3 règles + recompute | ✅ DONE |
| B | RPC `brh_personne_360` + UI `PersonneGraphPanel` | ✅ DONE |
| C | RPC `brh_entity_neighbors` (générique) + standardisation FicheAdresse/SCI/Personne avec panel commun | 🟡 Pending |
| D | Wiki `entity-graph.md` (cette page) | ✅ DONE |
| E | Règle 4 Sitadel après import | 🟡 Pending (import en cours) |
| F | Matching par date de naissance (réduire faux positifs SCI) | Pending |
| G | Mini-graphe visuel sur fiche (force-directed) | Pending |

---

## 8. Liens

- Migration table + algos : [`20260519140000_brh_entity_links_pivot.sql`](../supabase/migrations/20260519140000_brh_entity_links_pivot.sql)
- RPC 360 : [`20260519150000_rpc_brh_personne_360.sql`](../supabase/migrations/20260519150000_rpc_brh_personne_360.sql)
- API : [`src/api/brh-personne-360.ts`](../../src/api/brh-personne-360.ts)
- UI : [`src/components/leads/PersonneGraphPanel.tsx`](../../src/components/leads/PersonneGraphPanel.tsx)
- Data coverage globale : [data-coverage.md](data-coverage.md)
- OSINT registry : [osint-enrichment-registry.md](osint-enrichment-registry.md)
- Log : [log.md](log.md)

---

**Dernière maj** : 2026-05-19 06:15 — Claude Opus 4.7 (1M ctx)
