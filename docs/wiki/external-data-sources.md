# BRH Habitat — Sources de données externes (Phase 11)

> Source : 89 bases publiques recensées + plan d'intégration `2026-05-01-research`
> Dernière mesure : 2026-05-01
> Rôle : Enrichir `brh_dpe_prospects` (59 306 rows) avec 27 sources publiques gratuites pour scoring composite v2 et qualification automatique des leads de prospection rénovation Bretagne.

## Vue d'ensemble

Phase 11 du moteur BRH = **enrichissement systématique des prospects DPE** avec données publiques gratuites accessibles par API ou téléchargement. L'objectif est triple :

1. **Scoring composite v2 sur 100** (vs scoring v1 binaire actuel) — qualifier les ~3 500 leads ultra-chauds (mutation DVF récente + DPE F/G), ~12 000 leads MPR Bleu prioritaires, ~8 000 leads premium (D6-D8 + PV existant).
2. **Décile MaPrimeRénov auto-détecté** par IRIS Filosofi (vs déclaratif foyer dans simulateur).
3. **USP technique vs Kelvin°** : LiDAR HD pour analyse toiture/PV + données climat Météo-France réelles vs DJU théorique zone H2a.

Périmètre Bretagne uniquement (départements 22/29/35/56), conforme à la stratégie "Kelvin-parity" du 29/04/2026.

## Catalogue des 27 sources prioritaires (4 tiers)

### Tier 1 — Impact scoring direct (J+7)

| Source | Producteur | Granularité | Accès | Apport scoring |
|--------|-----------|-------------|-------|----------------|
| Annuaire RGE | ADEME | SIRET / commune | API quotidienne | Concurrence locale (-5 si <5 RGE) |
| Enedis conso résidentielle | Enedis | Adresse ≥10 PDL | API Opendatasoft | Confirme passoire (+15 si >250 kWh/m²) |
| Enedis thermosensibilité IRIS | Enedis | IRIS | API Opendatasoft | Détection chauffage électrique dominant |
| GRDF conso gaz IRIS | GRDF | IRIS | API Opendatasoft | Cible chaudière gaz vieillissante |
| INSEE Filosofi 2021 | INSEE | IRIS (~2800 BZH) | CSV | **Décile MPR auto** (+20) |
| API Géorisques | BRGM/MTE | Adresse / commune | REST JSON | RGA fort (+10), radon zone 3 (+10) |
| DVF géolocalisées | DGFiP | Parcelle | data.gouv semestriel | Mutation 24m + F/G = +35 |
| OEB TerriSTORY Bretagne | OEB GIP | EPCI / commune | API Opendatasoft | Mix énergétique local |

### Tier 2 — Enrichissement contextuel (J+15)

| Source | Apport |
|--------|--------|
| INSEE Recensement Logement IRIS | % propriétaires, % avant 1975 |
| LOVAC commune ≥11 logts | Densité vacance |
| Sit@del2 permis (mensuel) | Effet voisinage chantiers |
| GPU + API Carto IGN | Flag ABF (SUP AC1) → bascule ITI |
| ANAH OPAH/PIG | Bonus aides locales 78% BZH |
| ANIL Bretagne 84 aides locales | Simulateur cumul aides EPCI (scraping) |
| DRIAS Climat 2050 | Argument PAC réversible |

### Tier 3 — Régional Bretagne (J+30)

| Source | Apport |
|--------|--------|
| DPE Rennes Métropole enrichi | 43 communes RM, géom XY |
| PLUi Rennes Métropole MJ8 | Geopackage CNIG zonage parcellaire |
| Datarmor (CD22) | 395 jeux multi-collectivités |
| INSEE RS Bretagne | 12% RS — MPR RS depuis 2025 |
| Cadastres solaires bretons | Liens sortants UI client |

### Tier 4 — Technique avancé (J+60)

| Source | Apport |
|--------|--------|
| LiDAR HD IGN | Pente/orientation toiture, surface PV |
| BD TOPO IGN | Validation hauteur bâti BDNB |
| Audit énergétique ADEME | Comparaison vs moteur 3CL maison |
| Météo-France DJU | DJU réel station vs théorique 2424 |
| SPR + Atlas Patrimoines | Surcoût ABF +15-25% |
| Emmy CEE + EPCI | Saturation aides locale |

## Architecture d'intégration

### Modèle de données (5 nouvelles tables Supabase)

**Convention** : préfixe `brh_ext_*` pour distinguer des référentiels métier `brh_dpe_*` (figés CapRénov+) et des données business `brh_*`.

```sql
-- 1. Cache générique des appels APIs externes (TTL 30j par défaut)
CREATE TABLE brh_ext_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,              -- 'enedis', 'georisques', 'filosofi', etc.
  cache_key TEXT NOT NULL,           -- ex: 'commune:35238' ou 'addr:12_rue_x_35000'
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INT NOT NULL DEFAULT 2592000,
  UNIQUE(source, cache_key)
);
CREATE INDEX brh_ext_cache_lookup ON brh_ext_cache(source, cache_key, fetched_at);

-- 2. Données IRIS pré-jointes (évite N+1 sur 59k prospects)
CREATE TABLE brh_ext_iris (
  iris_code CHAR(9) PRIMARY KEY,
  commune_insee CHAR(5) NOT NULL,
  -- Filosofi
  med21 NUMERIC(8,2),                -- médiane revenu UC
  d121 NUMERIC(8,2),                 -- 1er décile
  d921 NUMERIC(8,2),                 -- 9e décile
  decile_estime SMALLINT,            -- 1-10 (calculé depuis med21 vs barème INSEE)
  couleur_mpr TEXT,                  -- 'bleu'|'jaune'|'violet'|'rose'
  -- Recensement Logement 2022
  tx_proprio NUMERIC(4,3),
  tx_avant_1975 NUMERIC(4,3),
  -- Enedis IRIS
  thermosens_kwh_dj NUMERIC(8,2),
  conso_resid_kwh_an BIGINT,
  -- GRDF IRIS
  conso_gaz_mwh_an BIGINT,
  pdl_gaz_resid INT,
  -- Méta
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX brh_ext_iris_commune ON brh_ext_iris(commune_insee);

-- 3. Données commune-level (pour fallback rural sans IRIS exploitable)
CREATE TABLE brh_ext_commune (
  insee CHAR(5) PRIMARY KEY,
  -- Géorisques
  radon_categorie SMALLINT,           -- 1, 2, 3
  rga_alea TEXT,                      -- 'faible'|'moyen'|'fort'
  ppri_present BOOLEAN DEFAULT false,
  sismique_zone SMALLINT,
  -- ANAH
  opah_active BOOLEAN DEFAULT false,
  opah_type TEXT,                     -- 'OPAH'|'OPAH-RU'|'PIG'
  opah_operateur TEXT,
  opah_fin_validite DATE,
  -- LOVAC
  tx_vacance_struct NUMERIC(4,3),
  -- Concurrence
  nb_rge_isolation SMALLINT,
  nb_rge_pac SMALLINT,
  -- Sit@del2 (12 derniers mois agrégés)
  nb_dp_logements_existants_12m INT,
  -- Météo-France
  station_dju_id TEXT,                -- ex: 'BREST-GUIPAVAS'
  dju_18_normal NUMERIC(6,1),         -- DJU réel station vs 2424 théorique H2a
  -- Climat futur DRIAS
  delta_dju_2050 NUMERIC(5,2),
  -- Méta
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Risques par adresse/parcelle (granularité fine Géorisques)
CREATE TABLE brh_ext_risques_adresse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  adresse_norm TEXT NOT NULL,
  rga_local TEXT,
  inondation_zone TEXT,
  cavites_proches INT DEFAULT 0,
  abf_zone BOOLEAN DEFAULT false,
  abf_type TEXT,                      -- 'SPR'|'AVAP'|'MH-500m'|'PSMV'
  fetched_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX brh_ext_risques_prospect ON brh_ext_risques_adresse(prospect_id);

-- 5. Aides locales scrappées ANIL Bretagne (étend brh_aides_locales seedé)
CREATE TABLE brh_ext_aides_anil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niveau TEXT NOT NULL,               -- 'commune'|'epci'|'departement'|'region'
  code_geo TEXT NOT NULL,
  nom_aide TEXT NOT NULL,
  organisme TEXT,
  geste_concerne TEXT[],              -- ['isolation_combles', 'pac_air_eau', ...]
  montant_max_eur NUMERIC(10,2),
  conditions TEXT,
  url_source TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX brh_ext_aides_anil_geo ON brh_ext_aides_anil(niveau, code_geo);
```

**Extensions de `brh_dpe_prospects`** (colonnes ajoutées, vs création de tables séparées) :

```sql
ALTER TABLE brh_dpe_prospects
  ADD COLUMN iris_code CHAR(9),                    -- jointure brh_ext_iris
  ADD COLUMN score_v2 SMALLINT,                    -- nouveau scoring composite 0-100
  ADD COLUMN score_v2_detail JSONB,                -- breakdown par règle
  ADD COLUMN score_v2_calculated_at TIMESTAMPTZ,
  ADD COLUMN enedis_kwh_logt NUMERIC(8,1),         -- conso annuelle Enedis adresse (si dispo)
  ADD COLUMN dvf_mutation_24m BOOLEAN DEFAULT false,
  ADD COLUMN has_pv_36kw BOOLEAN DEFAULT false,
  ADD COLUMN abf_required BOOLEAN DEFAULT false;

CREATE INDEX brh_dpe_prospects_score_v2 ON brh_dpe_prospects(score_v2 DESC) WHERE score_v2 IS NOT NULL;
CREATE INDEX brh_dpe_prospects_iris ON brh_dpe_prospects(iris_code);
```

**RLS** (cohérent avec `brh_dpe_prospects` actuel) :

```sql
-- Lecture pro+admin (anon interdit) sur toutes les tables brh_ext_*
ALTER TABLE brh_ext_iris ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_commune ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_risques_adresse ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_aides_anil ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_ext" ON brh_ext_iris FOR SELECT
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pro','admin')));
-- (idem brh_ext_commune, brh_ext_risques_adresse, brh_ext_aides_anil)

-- brh_ext_cache : service_role uniquement (manipulé via EF)
CREATE POLICY "service_only_cache" ON brh_ext_cache FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### Edge Functions (4 nouvelles, pattern rate-limit existant)

**Convention** : suivre `_shared/cors.ts` + `_shared/rate-limit.ts` déjà en place dans les 14 EF actuelles.

| EF | Input | Output | Rate limit | Rôle |
|----|-------|--------|------------|------|
| `enrich-prospect` | `{prospectId}` | `{score_v2, breakdown, enriched_fields[]}` | 20/min/IP | Enrichit 1 prospect (lookup cache → API → store) |
| `batch-enrich-iris` | `{communeInsee}` (admin) | `{iris_processed, errors[]}` | 5/min/IP | Batch enrichissement IRIS d'une commune entière |
| `georisques-lookup` | `{lat, lng, codeInsee}` | Risques agrégés | 30/min/IP | Wrapper API Géorisques + cache 90j |
| `anil-aides-scrape` | `{epci\|commune}` (admin) | Aides locales | 1/min/IP | Scraping ANIL Bretagne (HTML) |

**Edge Function principale** `enrich-prospect/index.ts` (squelette) :

```typescript
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EnrichRequest { prospectId: string }

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const rl = checkRateLimit(req, 'enrich-prospect', { maxRequests: 20, windowSeconds: 60 })
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'Too many requests' }),
    { status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' }})

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { prospectId }: EnrichRequest = await req.json()

  // 1. Charger prospect + IRIS
  const { data: prospect } = await supa.from('brh_dpe_prospects')
    .select('*, brh_ext_iris!inner(*)').eq('id', prospectId).single()

  // 2. Lookup parallèle (cache d'abord, puis API)
  const [risques, dvf, enedisAddr] = await Promise.all([
    fetchGeorisquesCached(supa, prospect.latitude, prospect.longitude, prospect.code_insee),
    fetchDVFRecent(supa, prospect.code_postal, prospect.adresse_norm),
    fetchEnedisAdresseCached(supa, prospect.adresse_ban),
  ])

  // 3. Calcul score composite v2
  const breakdown = computeScoreV2({ prospect, iris: prospect.brh_ext_iris, risques, dvf, enedisAddr })

  // 4. Persister
  await supa.from('brh_dpe_prospects').update({
    score_v2: breakdown.total,
    score_v2_detail: breakdown,
    score_v2_calculated_at: new Date().toISOString(),
    iris_code: prospect.brh_ext_iris?.iris_code,
    enedis_kwh_logt: enedisAddr?.kwh_par_logt,
    dvf_mutation_24m: !!dvf?.mutation_24m,
    abf_required: risques.abf_zone,
  }).eq('id', prospectId)

  return new Response(JSON.stringify(breakdown), { headers: { ...cors, 'Content-Type': 'application/json' }})
})
```

### Modules TypeScript (extension `src/lib/dpe-engine/external/`)

**Convention** : nouveau sous-dossier `external/` cohérent avec `aides/`, `bati/`, `equipements/`.

```
src/lib/dpe-engine/external/
├── enedis.ts                 # fetch + parse conso adresse + IRIS
├── grdf.ts                   # fetch + parse conso gaz IRIS
├── georisques.ts             # wrapper API Géorisques (RGA, radon, PPRi)
├── filosofi.ts               # mapping decile_revenu → couleur MPR
├── insee-recensement.ts      # tx_proprio, tx_avant_1975 par IRIS
├── dvf.ts                    # détection mutation 24m parcelle
├── sitadel2.ts               # parse CSV mensuel SDES
├── anil-aides.ts             # scraper HTML ANIL Bretagne
├── lidar-toiture.ts          # extraction pente/orientation (Phase 4)
├── meteo-france.ts           # DJU station la plus proche
├── score-v2.ts               # **score composite final** (orchestre tout)
└── tests/
    ├── score-v2.test.ts
    ├── filosofi-decile.test.ts
    └── fixtures/
        └── prospect-rennes.ts
```

**`score-v2.ts`** — règle pivot, basée sur recherche du 01/05/2026 :

```typescript
import type { BrhDpeProspectRow, BrhExtIrisRow, BrhExtRisquesAdresseRow } from '@/types/database'

export interface ScoreBreakdown {
  total: number
  rules: { rule: string; points: number; trigger: string }[]
  segment: 'ultra_chaud' | 'mpr_bleu_prio' | 'premium' | 'standard' | 'cold'
}

export function computeScoreV2(input: {
  prospect: BrhDpeProspectRow
  iris: BrhExtIrisRow | null
  risques: BrhExtRisquesAdresseRow | null
  dvf: { mutation_24m: boolean; prix_m2_growth_3y: number | null } | null
  enedisAddr: { kwh_par_logt: number | null } | null
  commune: { nb_rge_isolation: number; opah_active: boolean }
}): ScoreBreakdown {
  const r: ScoreBreakdown['rules'] = []
  let total = 0
  const fg = ['F', 'G'].includes(input.prospect.etiquette_dpe)

  // Règle #1 — mutation 24m + F/G (signal achat)
  if (input.dvf?.mutation_24m && fg) { total += 35; r.push({ rule: 'mutation_24m_FG', points: 35, trigger: 'DVF mutation < 24m' }) }

  // Règle #2 — décile MPR auto
  if (input.iris?.couleur_mpr === 'bleu') { total += 20; r.push({ rule: 'mpr_bleu', points: 20, trigger: `IRIS ${input.iris.iris_code} D1-D3` }) }
  else if (input.iris?.couleur_mpr === 'jaune') { total += 15; r.push({ rule: 'mpr_jaune', points: 15, trigger: `IRIS ${input.iris.iris_code} D4-D5` }) }

  // Règle #3 — sur-conso Enedis adresse
  if (input.enedisAddr?.kwh_par_logt && input.enedisAddr.kwh_par_logt > 250) {
    total += 15; r.push({ rule: 'enedis_overuse', points: 15, trigger: `${input.enedisAddr.kwh_par_logt} kWh/logt > 250` })
  }

  // Règle #4 — IRIS propriétaires occupants ancien
  if ((input.iris?.tx_proprio ?? 0) > 0.70 && (input.iris?.tx_avant_1975 ?? 0) > 0.60) {
    total += 10; r.push({ rule: 'iris_proprio_ancien', points: 10, trigger: 'tx_prop>70% & avant_1975>60%' })
  }

  // Règle #5 — Géorisques RGA fort = entrée ITE/fissures
  if (input.risques?.rga_local === 'fort') { total += 10; r.push({ rule: 'rga_fort', points: 10, trigger: 'Géorisques RGA fort' }) }

  // Règle #6 — Radon zone 3 = upsell VMC double-flux
  if ((input.commune as any)?.radon_categorie === 3) { total += 10; r.push({ rule: 'radon_z3', points: 10, trigger: 'Radon catégorie 3' }) }

  // Règle #7 — faible concurrence locale
  if ((input.commune?.nb_rge_isolation ?? 99) < 5) { total += 5; r.push({ rule: 'low_concurrence', points: 5, trigger: '<5 RGE isolation commune' }) }

  // Règle #8 — gentrification commune
  if ((input.dvf?.prix_m2_growth_3y ?? 0) > 0.15) { total += 7; r.push({ rule: 'gentrif', points: 7, trigger: '+15% prix m² 3y' }) }

  // Règle #9 — exclusion PV existant ≥36kW
  if (input.prospect.has_pv_36kw) { total -= 10; r.push({ rule: 'pv_existing', points: -10, trigger: 'PV ≥36kW déjà installé' }) }

  // Bonus précarité : décile 1 + chauffage élec dominant IRIS
  if (input.iris?.decile_estime === 1 && (input.iris?.thermosens_kwh_dj ?? 0) > 8000) {
    total += 15; r.push({ rule: 'precarite_max', points: 15, trigger: 'D1 + thermosens élevée → MPR Bleu prio ANAH' })
  }

  total = Math.max(0, Math.min(100, total))
  const segment =
    total >= 80 ? 'ultra_chaud' :
    input.iris?.couleur_mpr === 'bleu' && total >= 50 ? 'mpr_bleu_prio' :
    input.iris?.couleur_mpr === 'rose' && total >= 60 ? 'premium' :
    total >= 40 ? 'standard' : 'cold'

  return { total, rules: r, segment }
}
```

### Hooks React Query (pattern existant doublé `api/X.ts` + `hooks/queries/X.ts`)

```typescript
// src/api/external-data.ts
export const externalDataApi = {
  async enrichProspect(prospectId: string): Promise<ScoreBreakdown> {
    const { data, error } = await supabase.functions.invoke('enrich-prospect', { body: { prospectId }})
    if (error) throw error
    return scoreBreakdownSchema.parse(data)
  },
  async batchEnrichCommune(communeInsee: string) { /* ... */ },
  async listAidesAnil(epci: string): Promise<BrhExtAidesAnil[]> { /* ... */ },
}

// src/hooks/queries/external-data.ts
export const EXT_DATA_KEY = ['external-data'] as const
export function useEnrichProspect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: externalDataApi.enrichProspect,
    onSuccess: (_, prospectId) => {
      qc.invalidateQueries({ queryKey: ['prospects', prospectId] })
      qc.invalidateQueries({ queryKey: ['prospects', 'list'] })
    },
  })
}
```

### Scripts d'ingestion batch (`scripts/external/`)

```
scripts/external/
├── seed-iris-bretagne.ts       # 1-shot : ~2800 IRIS BZH (Filosofi+Recensement+Enedis+GRDF)
├── seed-commune-bretagne.ts    # 1-shot : ~1208 communes BZH (Géorisques+ANAH+RGE+Sit@del2)
├── nightly-rge-refresh.ts      # Daily : refresh RGE par EPCI muté
├── monthly-sitadel2-import.ts  # Monthly : permis 22/29/35/56
├── monthly-dvf-refresh.ts      # Bi-annuel : DVF géolocalisées avr+oct
├── batch-score-v2-all.ts       # Recalcule score_v2 sur 59k prospects (utilise EF en parallèle)
└── scrape-anil-bretagne.ts     # Scraper HTML 84 aides locales
```

**Pattern type** (basé sur `migrate-dpe-prospects.ts` existant — chunks 500) :

```typescript
// scripts/external/seed-iris-bretagne.ts
import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'

const CHUNK = 500
const BZH_DEPTS = ['22', '29', '35', '56']

async function main() {
  const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 1. Filosofi 2021 (téléchargé depuis insee.fr/fr/statistiques/7233950)
  const filo = parse(readFileSync('./data/filosofi-iris-2021.csv'), { columns: true })
  const filoBzh = filo.filter((r: any) => BZH_DEPTS.includes(r.IRIS.slice(0, 2)))

  // 2. Joindre Recensement Logement IRIS 2022
  const reco = parse(readFileSync('./data/recensement-logement-iris-2022.csv'), { columns: true })
  const recoMap = new Map(reco.map((r: any) => [r.IRIS, r]))

  // 3. Joindre Enedis IRIS thermosensibilité (API Opendatasoft)
  const enedisIris = await fetchEnedisIrisAll(BZH_DEPTS)

  // 4. Joindre GRDF IRIS gaz
  const grdfIris = await fetchGrdfIrisAll(BZH_DEPTS)

  // 5. Calculer décile MPR auto via barème INSEE 2024-2026
  const records = filoBzh.map((row: any) => ({
    iris_code: row.IRIS,
    commune_insee: row.IRIS.slice(0, 5),
    med21: parseFloat(row.MED21),
    d121: parseFloat(row.D121),
    d921: parseFloat(row.D921),
    decile_estime: estimateDecile(row.MED21),
    couleur_mpr: decileToCouleur(estimateDecile(row.MED21)),
    tx_proprio: parseFloat(recoMap.get(row.IRIS)?.P21_RP_PROP ?? 0) / parseFloat(recoMap.get(row.IRIS)?.P21_RP ?? 1),
    tx_avant_1975: /* ... */,
    thermosens_kwh_dj: enedisIris.get(row.IRIS)?.thermosens,
    conso_resid_kwh_an: enedisIris.get(row.IRIS)?.conso,
    conso_gaz_mwh_an: grdfIris.get(row.IRIS)?.conso,
    pdl_gaz_resid: grdfIris.get(row.IRIS)?.pdl,
  }))

  // 6. Insert par chunks 500 avec retry
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = records.slice(i, i + CHUNK)
    const { error } = await supa.from('brh_ext_iris').upsert(batch, { onConflict: 'iris_code' })
    if (error) console.error(`Chunk ${i}: ${error.message}`)
    else console.log(`✅ ${i + batch.length}/${records.length}`)
  }
}
```

### UI Pro — page de qualification batch

```
src/pages/pro/
├── prospects-bretagne.tsx        # ★ NEW : liste 59k filtrée par score_v2 + segment + IRIS
└── prospects-bretagne-detail.tsx # ★ NEW : popup détail score breakdown + carte risques
```

**`prospects-bretagne.tsx`** — vue principale :
- Filtres : segment (`ultra_chaud`/`mpr_bleu_prio`/`premium`/`standard`/`cold`), département, score min, OPAH active, ABF requis, conso Enedis > seuil
- Tableau virtualisé (59k rows, react-window)
- Bouton "Recalculer score" → `useEnrichProspect` (1 prospect) ou `useBatchEnrichCommune` (admin)
- Export CSV filtré pour campagnes courriers

### Tests Vitest

Cohérent avec `src/lib/dpe-engine/tests/` existant (6 fichiers, 146 tests passants) :

```typescript
// src/lib/dpe-engine/external/tests/score-v2.test.ts
import { describe, it, expect } from 'vitest'
import { computeScoreV2 } from '../score-v2'
import { prospectRennesUltraChaud, prospectStandard } from './fixtures/prospect-rennes'

describe('score-v2', () => {
  it('mutation 24m + F/G + IRIS Bleu = ultra_chaud', () => {
    const r = computeScoreV2(prospectRennesUltraChaud)
    expect(r.total).toBeGreaterThanOrEqual(80)
    expect(r.segment).toBe('ultra_chaud')
    expect(r.rules.find(rule => rule.rule === 'mutation_24m_FG')).toBeDefined()
  })

  it('exclusion PV existant retire 10 pts', () => {
    const r = computeScoreV2({ ...prospectStandard, prospect: { ...prospectStandard.prospect, has_pv_36kw: true }})
    expect(r.rules.find(rule => rule.rule === 'pv_existing')?.points).toBe(-10)
  })

  it('décile 1 + thermosens élevée → bonus précarité +15', () => {
    const r = computeScoreV2(prospectStandard)
    if (prospectStandard.iris?.decile_estime === 1) {
      expect(r.rules.find(rule => rule.rule === 'precarite_max')?.points).toBe(15)
    }
  })
})
```

## Plan d'implémentation par phase

### Phase 11.1 — Tier 1 socle scoring (J+7, ~25h)

1. **Migration** `20260507100000_brh_ext_tier1.sql` — `brh_ext_cache`, `brh_ext_iris`, `brh_ext_commune`, ALTER `brh_dpe_prospects`
2. **Modules TS** : `enedis.ts`, `grdf.ts`, `georisques.ts`, `filosofi.ts`, `score-v2.ts` + tests
3. **EF** : `enrich-prospect`, `georisques-lookup`
4. **Scripts seed** : `seed-iris-bretagne.ts` (2800 IRIS), `seed-commune-bretagne.ts` (1208 communes), `batch-score-v2-all.ts` (59k prospects)
5. **API/hooks** : `external-data.ts` côté `api/` + `hooks/queries/`
6. **Wiki** : entrée `log.md` antéchrono "Phase 11.1 — Tier 1 socle scoring"

**Livrable mesurable** : 59 306 prospects avec `score_v2` calculé + segment attribué, breakdown JSONB consultable.

### Phase 11.2 — Tier 2 contextualisation (J+15, ~20h)

1. **Migration** `20260514100000_brh_ext_tier2.sql` — `brh_ext_aides_anil`, ALTER `brh_ext_commune` (Sit@del2, OPAH)
2. **Modules TS** : `insee-recensement.ts`, `sitadel2.ts`, `anil-aides.ts`, `dvf.ts`
3. **EF** : `anil-aides-scrape` + parser HTML ANIL
4. **Scripts** : `monthly-sitadel2-import.ts`, `monthly-dvf-refresh.ts`, `scrape-anil-bretagne.ts`
5. **UI Pro** : `prospects-bretagne.tsx` (page principale) + `prospects-bretagne-detail.tsx`
6. **Wiki** : update `external-data-sources.md` § Tier 2 + log antéchrono

**Livrable mesurable** : 84 aides locales ANIL ingérées, page `/pro/prospects-bretagne` opérationnelle avec filtres avancés.

### Phase 11.3 — Régional Bretagne (J+30, ~15h)

1. **Modules TS** : `dpe-rennes-metropole.ts` (43 communes), `cadastres-solaires.ts` (4 webmaps liens sortants)
2. **Migration** `20260521100000_brh_ext_regional.sql` — table `brh_ext_residences_secondaires` (commune-level)
3. **Script** : `seed-rs-bretagne.ts` (depuis INSEE 7614647)
4. **UI** : injection lien cadastre solaire pertinent par EPCI dans `/audit-energetique/:id`
5. **Wiki** : update + log

### Phase 11.4 — Technique avancé (J+60, ~30h, USP vs Kelvin)

1. **Module LiDAR** : pipeline à la demande PDAL (extraction pente/orientation par parcelle)
2. **Module BD TOPO** : validation hauteur bâti BDNB (rapprochement par parcelle)
3. **Module Audit ADEME** : import 250+ champs audits existants par adresse
4. **Module Météo-France** : DJU station la plus proche (remplace 2424 théorique H2a)
5. **EF** : `lidar-roof-analysis` (long-running, ≤120s timeout)
6. **Migration** `20260605100000_brh_ext_tech.sql` — `brh_ext_toiture` (par parcelle), `brh_ext_meteo_dju` (commune)
7. **Wiki** : nouvelle note `lidar-toiture-pipeline.md` + log

**Livrable mesurable** : moteur 3CL recalibré avec DJU réel, 1ère démo PV potentiel sur 100 parcelles RM.

## Conformité RGPD

- ✅ Toutes données publiques (Licence Ouverte 2.0 ou ODbL)
- ✅ Pas de données personnelles propriétaires (DGFIP filtré aux personnes morales SCI/SARL)
- ✅ Cache TTL 30j (90j Géorisques) — refresh transparent, pas de stockage durable de données externes obsolètes
- ✅ RLS pro+admin uniquement sur `brh_ext_*` (anon utilisera toujours `dpe-express-lookup` côté simulateur)
- ✅ Anti-spam EF (rate-limit existant `_shared/rate-limit.ts`)

## Points d'attention

- **Filosofi 2022 inexistant** (annulé INSEE) → rester sur 2021 jusqu'à 2027 minimum
- **Enedis seuil 10 PDL/adresse** → ~90% rural BZH non couvert nominativement, fallback IRIS systématique
- **Fichiers Fonciers Cerema MAJIC** : convention DGALN obligatoire → BRH non éligible (privé). Phase 11.5 = monter convention via collectivité bretonne ou EPF Bretagne pour débloquer LOVAC détaillé adresse
- **DPE Rennes Métropole** = format ADEME identique mais enrichi géom XY → privilégier sur les 43 communes RM, fallback ADEME national ailleurs

## Statut d'implémentation

- 🟡 Phase 11.0 : Plan rédigé (ce document) — 2026-05-01
- ❌ Phase 11.1 : Tier 1 socle scoring — à démarrer
- ❌ Phase 11.2 : Tier 2 contextualisation
- ❌ Phase 11.3 : Régional Bretagne
- ❌ Phase 11.4 : Technique avancé (USP vs Kelvin)
- ❌ Phase 11.5 : Convention collectivité MAJIC/LOVAC (long terme)

## Mises à jour de cette page

- **2026-05-01** : Création (recherche 89 sources + plan d'intégration 4 phases)
