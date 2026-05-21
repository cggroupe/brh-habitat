# Matching adresse — spec stricte (page centrale)

> **Source de vérité** : règle de match adresse utilisée pour croiser `brh_personnes_historique` ↔ `brh_dpe_prospects` ↔ `brh_dvf_archive` ↔ `brh_permis_construire` ↔ `brh_bdnb_*` ↔ `brh_sci_companies` (siège).
>
> Statut : 🟡 **SPEC À RÉDIGER en Phase 1** — ce fichier est un squelette créé en Phase 0 (21/05).

---

## 1. Règle "match parfait" (formulée par Philippe le 21/05)

> « un match absolument parfait numéro de rue, nom de rue, code postal »

Pas de fuzzy matching pour valider une affiliation client/DPE/permis. Normalisation oui, similarité non.

---

## 2. Sections à compléter Phase 1

### 2.1 Normalisation source
- Casse : `lower()`
- Accents : `ASCII fold` (unaccent extension Postgres)
- Espaces multiples : collapse en 1
- Virgules et points : retirés
- Abréviations à normaliser :
  - `rue` ↔ `r` ↔ `r.`
  - `avenue` ↔ `av` ↔ `av.`
  - `boulevard` ↔ `bd` ↔ `bld`
  - `place` ↔ `pl`
  - `impasse` ↔ `imp`
  - `chemin` ↔ `ch`
  - `allée` ↔ `all`
  - `route` ↔ `rte`
  - `square` ↔ `sq`

### 2.2 Clé finale
`(numero TEXT, voie_norm TEXT, code_postal CHAR(5))`

### 2.3 Cas ambigus à trancher Phase 1
- `14bis`, `14 ter`, `14 A`, `14-16` : conserver suffixe ? séparer ?
- Lieu-dit sans numéro
- Adresses BAN multi-libellés (alias)
- Adresses non normalisées en source (utilisateur saisi libre)

### 2.4 Stratégie d'index Postgres
- Index composite `(code_postal, voie_norm, numero)` sur chaque table cible
- Vue matérialisée optionnelle si jointures multiples lentes

### 2.5 Tables cibles à indexer
- `brh_dpe_prospects` (59 306)
- `brh_dvf_archive` (104 225)
- `brh_permis_construire` (0 — import en cours)
- `brh_bdnb_*` (à créer en P3)
- `brh_personnes_historique` (18 571)
- `brh_sci_companies` (36 491, siège)

### 2.6 Algorithme "DPE rattaché à un client"
À spécifier Phase 1. Logique :
1. Normaliser adresse client
2. Lookup `brh_dpe_prospects` par clé `(code_postal, voie_norm, numero)`
3. Si match unique → rattachement direct
4. Si match multiple → désambiguïsation (numéro de logement, étage, surface)
5. Si `dpe.owner_siren IS NOT NULL` ET client n'est PAS dirigeant SCI → badge "Locataire — SCI X propriétaire" (cas B4 Bodard)

---

## 3. Audit volumétrique à faire Phase 1

Sur échantillon 1 000 clients des 4 dépts (22/29/35/44/56) :
- Taux de match DPE (clé stricte)
- Taux de match permis (Sitadel quand chargé)
- Taux de match BDNB (quand chargé)
- Taux de match DVF
- Taux de match Sirene (siège société = adresse client)
- Taux "locataire SCI" (client occupant, SCI propriétaire)

---

## Liens

- Plan refonte : [plan-refonte-2026-05-21.md](plan-refonte-2026-05-21.md) Phase 1
- Inventaire data : [data-inventory.md](data-inventory.md)
- Hubs métier qui utilisent cette règle : [hub-client-brh.md](hub-client-brh.md) · [hub-lead-public.md](hub-lead-public.md) · [hub-sci-dirigeant.md](hub-sci-dirigeant.md)

---

**Dernière maj** : 2026-05-21 (squelette Phase 0) — Claude Opus 4.7
