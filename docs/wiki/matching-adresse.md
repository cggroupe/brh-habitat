# Matching adresse — spec stricte

> **Source de vérité** : règle de match adresse utilisée pour croiser `brh_personnes_historique` ↔ `brh_dpe_prospects` ↔ `brh_dvf_archive` ↔ `brh_permis_construire` ↔ `brh_bdnb_*` ↔ `brh_sci_companies` (siège).
>
> **Statut** : ✅ Spec complète Phase 1 (21/05) — implémentation prévue Phase 2.

---

## 1. Constat de l'audit Phase 1 (21/05)

### Verdict
Le **match strict naïf** (`lower(adresse) + code_postal`) sur l'échantillon dept 35 donne **0.8% de hits** (4 sur 528 clients). Inopérant en l'état.

### Raisons
1. **Sources non normalisées** :
   - DPE ADEME : `"14 RUE DE BUGEAUD"` (capitales, particule "de" présente, sans CP/ville)
   - Client BRH legacy : `"14 Rue Bugeaud"` (mixte, sans particule)
   - Client BRH PPO 44 : `"16 RUE DE LA MAISON NEUVE  35720 BONNEMAIN France"` (CP + ville + pays embedded)
   - Forme abrégée : `"1 r Quatre Vents"` (`r` au lieu de `rue`)
2. **Extension `unaccent` PAS installée** sur `lygmmvxnmvlgynmrcpny` → accents non normalisables côté Postgres
3. **Aucun index `(code_postal, adresse)`** sur `brh_dpe_prospects` → 18 index existants mais aucun pour matcher l'adresse (impact perf Phase 2)

### Volumétrie de référence (utile pour estimer le gain attendu)

Clients par dept (sur `brh_personnes_historique`) :
| Dept | Clients | Adresse | Tel | Email | DPE en base |
|------|--------:|--------:|----:|------:|------------:|
| 22 | 3 369 | 100% | 71% | 2.6% | 14 115 |
| 29 | 10 045 | 97% | 79% | **43%** | 18 012 |
| 35 | 528 | 100% | 89% | 2.5% | 14 492 |
| 44 | 1 518 | 100% | 97% | 0.3% | **0 ⚠️** |
| 56 | 2 492 | 100% | 63% | 3% | 12 687 |

⚠️ **Dept 44** : 0 DPE en base. BRH a importé les DPE F/G **Bretagne uniquement** (4 dépts) — la Loire-Atlantique n'est pas couverte. Pour les 1 518 clients PPO 44 : aucun match DPE attendu tant que les DPE F/G 44 ne sont pas ingérés.

Qualité de parsing adresse :
- 88-97% des adresses clients commencent par un numéro
- 55-91% contiennent un mot-clé de voie (rue/avenue/etc.)
- Lieu-dits sans voie typique : ~10-45% selon dépt (ex. `"5 Kervennou"` 22, `"45 LA LAVANDERIE"` 44)

---

## 2. Règle métier formulée par Philippe (21/05)

> « un match absolument parfait numéro de rue, nom de rue, code postal »

→ **Égalité stricte sur la clé normalisée**. Pas de fuzzy matching. Pas de Levenshtein. Pas de Trigram. Si la clé normalisée des deux côtés ne correspond pas exactement, pas de match.

---

## 3. Pipeline de normalisation (canonique)

### 3.1 Nettoyage préalable (côté texte brut)

Étape exécutée AVANT extraction de la clé. Élimine les bruits courants observés en source.

| Étape | Pattern | Effet |
|-------|---------|-------|
| 1 | `\s{2,}` → ` ` | Espaces multiples → 1 espace |
| 2 | `^\s+|\s+$` → `""` | Trim |
| 3 | Suppression suffixes pays | `(?i),?\s*(france|fr)\s*$` |
| 4 | Suppression CP + ville embedded | Si `adresse` contient déjà le `code_postal` (`\d{5}`) ou un nom de ville, retirer cette portion |
| 5 | Suppression ponctuation parasite | `[,;]+` → `" "` (pas les apostrophes !) |
| 6 | `\s{2,}` → ` ` (deuxième pass) + Trim | Final tidy |

### 3.2 Normalisation (casse + accents)

| Étape | Transformation |
|-------|----------------|
| 1 | `lower()` |
| 2 | `unaccent()` — accents → ASCII (⚠️ requiert extension Postgres `unaccent`, voir Migration M-1 §5.1) |
| 3 | `'` → `' '` (apostrophes → espace) — `l'argoat` → `l argoat` |

### 3.3 Expansion abréviations voie (dictionnaire fermé)

Remplacement par mot canonique en début ou après numéro. Match insensible aux limites de mots si suivi d'un espace.

| Forme abrégée | Canonique |
|---------------|-----------|
| `r`, `r.` | `rue` |
| `av`, `av.` | `avenue` |
| `bd`, `bld`, `boul`, `boul.` | `boulevard` |
| `pl`, `pl.` | `place` |
| `imp`, `imp.` | `impasse` |
| `ch`, `ch.` | `chemin` |
| `all`, `all.` | `allee` (après unaccent) |
| `rte` | `route` |
| `sq` | `square` |
| `lot`, `lot.` | `lotissement` |
| `chem`, `chem.` | `chemin` |
| `lieu-dit`, `lieudit` | `lieu dit` |

⚠️ **Pas d'expansion d'éléments toponymiques** (saint-, ste-, dr-) — ils peuvent faire partie du nom de voie ("Rue Saint-Pierre").

### 3.4 Particules

Question délicate : conserver ou non `de`, `du`, `la`, `le`, `les`, `aux` ?

**Décision** : **conserver** (les sources ADEME et clients BRH les conservent toutes deux la plupart du temps). Suppression = trop de risque de faux positifs ("rue de la mer" ≠ "rue mer").

### 3.5 Extraction de la clé canonique

Après nettoyage + normalisation :

```
adresse_norm  = <texte normalisé complet>
numero_norm   = SUBSTRING(adresse_norm FROM '^(\d+\s*(?:bis|ter|quater|[a-z])?)')
voie_norm     = TRIM(REGEXP_REPLACE(adresse_norm, '^\d+\s*(?:bis|ter|quater|[a-z])?\s*', ''))
```

**Clé finale** : `(code_postal, numero_norm, voie_norm)`

Variante alternative : `(code_postal, adresse_norm)` pour les lieux-dits sans numéro initial.

---

## 4. Cas ambigus (décisions)

| Cas | Exemple | Décision |
|-----|---------|----------|
| Suffixe lettré | `14bis`, `14 ter`, `14 A` | **Conservé** dans `numero_norm`. `"14bis"` ≠ `"14 ter"` ≠ `"14"` |
| Plage de numéros | `14-16 rue X` | `numero_norm` = `"14-16"`. **Pas de découpage en 2 lignes.** |
| Lieu-dit sans numéro | `Kervennou`, `La Lavanderie` | `numero_norm = NULL`. Match sur `(code_postal, voie_norm)` uniquement. |
| Voie sans numéro mais avec prefix non numérique | `Place du Marché` | Idem. `numero_norm = NULL`. |
| Adresse avec étage/apt | `14 rue X, 3e étage` | Étape 5 nettoyage virgule → mot `3e étage` reste dans `voie_norm` puis matching strict échouera. **Acceptable** : la spec ne gère pas la précision intérieure. |
| Adresses BAN multi-libellés | (alias variants même ID BAN) | **Non pris en compte v1**. À envisager si on ingère `adresse_ban` officiel (BAN ID) en clé alternative — voir §6. |
| Numéro avec espace décimal | `14 000 rue X` (rare, type cadastre lieu-dit) | Garder tel quel. `numero_norm` extrait `"14"`. |
| Accent sur initiale | `École de la Plage` | unaccent → `ecole de la plage`. OK. |

---

## 5. Stratégie d'index Postgres

### Plan de migration Phase 2

#### M-1 — Extensions
```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
```

#### M-2 — Colonnes générées + index
Sur `brh_dpe_prospects`, `brh_dvf_archive`, `brh_permis_construire`, `brh_personnes_historique`, `brh_sci_companies` (siège) :

```sql
ALTER TABLE brh_dpe_prospects
  ADD COLUMN adresse_norm TEXT
    GENERATED ALWAYS AS (
      lower(unaccent(
        regexp_replace(
          regexp_replace(adresse, '\s{2,}', ' ', 'g'),
          '\s*(france|fr)\s*$', '', 'i'
        )
      ))
    ) STORED,
  ADD COLUMN numero_norm TEXT
    GENERATED ALWAYS AS (
      substring(
        lower(unaccent(adresse))
        FROM '^(\d+\s*(?:bis|ter|quater|[a-z])?)'
      )
    ) STORED,
  ADD COLUMN voie_norm TEXT
    GENERATED ALWAYS AS (
      trim(regexp_replace(
        lower(unaccent(
          regexp_replace(adresse, '\s{2,}', ' ', 'g')
        )),
        '^\d+\s*(?:bis|ter|quater|[a-z])?\s*', ''
      ))
    ) STORED;

CREATE INDEX idx_brh_dpe_prospects_match
  ON brh_dpe_prospects (code_postal, numero_norm, voie_norm);

CREATE INDEX idx_brh_dpe_prospects_voie_only
  ON brh_dpe_prospects (code_postal, voie_norm)
  WHERE numero_norm IS NULL;
```

Idem pour les autres tables avec adaptations colonnes (`adresse_voie` au lieu de `adresse` pour DVF, etc.).

#### M-3 — Expansion abréviations dans `voie_norm`
La transformation Postgres pure ne fait pas l'expansion d'abréviations (`r` → `rue`) — limites des colonnes générées. Solution :

- **Option A (recommandée)** : trigger BEFORE INSERT/UPDATE qui appelle une fonction `brh_expand_voie(text)` qui fait la substitution mot-à-mot avec une table de référence `brh_voie_abbreviations`.
- **Option B** : ne pas faire l'expansion côté table, mais l'appliquer **à la volée** dans le RPC `brh_match_adresse(text, text)` qui prend un texte et applique la chaîne complète.

Décision : **Option B** v1 (moins invasif, fonction unique testable). Migration Option A si perfs insuffisantes.

#### M-4 — RPC de matching
```sql
CREATE OR REPLACE FUNCTION brh_normalize_adresse(adresse TEXT)
RETURNS TABLE(adresse_norm TEXT, numero_norm TEXT, voie_norm TEXT) AS $$ ... $$
LANGUAGE plpgsql IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION brh_match_dpe_by_address(
  p_adresse TEXT,
  p_code_postal TEXT
) RETURNS TABLE(dpe_id BIGINT, score INT) AS $$ ... $$
LANGUAGE plpgsql STABLE;
```

---

## 6. Stratégie alternative : pivot par adresse BAN ID

Si la BAN (Base Adresse Nationale) est utilisée en amont à l'ingestion, chaque adresse a un identifiant officiel (`adresse_ban_id` UUID ou string). Le matching devient alors :

```sql
WHERE c.adresse_ban_id = d.adresse_ban_id
```

→ Trivial, indexable en B-Tree, 100% fiable.

**État actuel** :
- `brh_dpe_prospects.adresse_ban` rempli à 99.97% (14 110 / 14 115 sur dept 22)
- `brh_personnes_historique` n'a PAS de colonne `adresse_ban` ni d'API call BAN à l'ingestion

**Action Phase 2 candidate** : enrichir `brh_personnes_historique` avec un appel API BAN (geocoder gratuit data.gouv.fr) au moment de l'ingestion. Stockage : `adresse_ban_id TEXT` + `adresse_ban_score NUMERIC` (score de confiance BAN).

Une fois enrichis, le matching strict via BAN ID donnera ~95%+ vs ~30-50% via normalisation textuelle.

---

## 7. Tables cibles à indexer (Phase 2)

| Table | Volume | Clé matching cible |
|-------|-------:|---------------------|
| `brh_dpe_prospects` | 59 306 | `(code_postal, numero_norm, voie_norm)` OU `adresse_ban_id` |
| `brh_dvf_archive` | 104 225 | `(code_postal, voie_norm)` — déjà indexé `(code_postal, lower(adresse_voie))` |
| `brh_permis_construire` | 0 (import en cours) | `(code_postal, numero_norm, voie_norm)` |
| `brh_bdnb_*` | À créer P3 | clé BAN ID (BDNB fournit `bdnb_id`) |
| `brh_personnes_historique` | 18 571 | enrichir avec `adresse_ban_id` à l'ingestion + colonnes normalisées |
| `brh_sci_companies` (siège) | 36 491 | idem |

---

## 8. Algorithme "DPE rattaché à un client"

```
INPUT  : client_id (UUID)
OUTPUT : { dpe_ids: [...], role_per_dpe: { dpe_id → 'proprietaire'|'occupant' } }

1. Récupérer client.code_postal + client.adresse
2. Normaliser via brh_normalize_adresse(client.adresse) → (numero_norm_c, voie_norm_c)
3. Lookup dans brh_dpe_prospects où code_postal = client.code_postal
   ET (
     (numero_norm = numero_norm_c ET voie_norm = voie_norm_c)
     OU
     (numero_norm_c IS NULL ET voie_norm = voie_norm_c)  -- lieu-dit
   )
4. Pour chaque DPE matché :
   a. Si dpe.owner_siren IS NULL → propriétaire (particulier)
      → role = 'proprietaire'
   b. Si dpe.owner_siren IS NOT NULL :
      i. Vérifier si client est dirigeant SCI via brh_entity_links
         (link_type='dirige', from_id=client_id, to_id=siren)
      ii. Si OUI → role = 'dirigeant' (donc propriétaire)
      iii. Si NON → role = 'occupant' (locataire SCI)
5. RETURN { dpe_ids, role_per_dpe }
```

Implémentation : RPC `brh_client_360` v2 (cf [hub-client-brh.md](hub-client-brh.md) §4).

---

## 9. Audit volumétrique attendu (à mesurer Phase 2 après création index)

À mesurer post-migration :
- Match rate par dépt (cible : >50% via normalisation, >90% si BAN ID enrichi)
- Taux de clients locataires SCI (cas Bodard)
- Distribution match `(num+voie)` vs `(voie only — lieu-dit)`
- Distribution clients avec 0 / 1 / 2+ DPE matchés (cas multi-logements même adresse)

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 1 (audit) + Phase 2 (implémentation)
- Inventaire data : [data-inventory.md](data-inventory.md)
- Hubs qui consomment cette spec : [hub-client-brh.md](hub-client-brh.md) · [hub-lead-public.md](hub-lead-public.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)
- Bug B9 perf (même cause : pas d'index sur entité-pivot) : [bugs-ouverts.md](bugs-ouverts.md)
- Migration BAN candidate : [external-data-sources.md](external-data-sources.md)

---

**Dernière maj** : 2026-05-21 (Phase 1 — spec complète + audit volumétrique) — Claude Opus 4.7
