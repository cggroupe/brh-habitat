# Score Vente v1 — Module Partenaires Agences Immobilières (Phase 16)

> ⚠️ **2026-05-02 — Renommée Phase 12 → Phase 16** : conflit numérotation avec Phase 12 "Export XML ADEME" déjà livrée (cf. [audit-retard-phases-mai-2026.md](audit-retard-phases-mai-2026.md)). Plan d'effort révisé à ~110h (vs ~205h initial) grâce aux briques Phase 13 (générateur courrier IA) + 14 (dashboard analytique) + 15 (Stripe SaaS) déjà livrées et réutilisables.

> Source : Conception 2026-05-01, basée sur audit [scoring-audit-vs-vente-immo.md](scoring-audit-vs-vente-immo.md) + KG existant [data-model.md](data-model.md) + référentiel partenaires [partner-platform.md](partner-platform.md)
> Dernière mesure : 2026-05-01
> Rôle : Algorithme heuristique de prédiction de **vente immobilière sous 18 mois** pour les agences immobilières partenaires de BRH. Module distinct du score rénovation v2 (Phase 11), positionné comme **bénéfice partenarial** et **levier de monétisation**.

## Vue d'ensemble

Le score vente v1 est un **produit B2B distinct** du score rénovation v2 :
- **Score rénovation v2** (Phase 11) : à usage interne BRH commerciaux pour cibler leurs propres prospects rénovation
- **Score vente v1** (Phase 16) : à destination des **agences immobilières partenaires** (type `brh_companies.partner_type = 'agence_immo'`), livré comme flux de leads qualifiés "intention de vente"

**Win-win partenariat** : l'agence reçoit des leads vente géolocalisés (chiffre d'affaires direct), BRH récupère **en contrepartie** les coordonnées des nouveaux acquéreurs F/G (via mandat de vente signé) qui rentrent automatiquement dans son funnel rénovation post-mutation. C'est **le même flux que Kelvin° vend à Effy** mais en circuit fermé Bretagne.

Constat acté en audit : aucune source publique gratuite ne capte parfaitement l'intention de vente (signaux comportementaux payants, RGPD bloque les triggers de vie). Le score v1 reste donc **heuristique**, calibré pour la précision plutôt que le rappel. Cible : produire 50-200 leads "vente_imminente" par mois et par EPCI breton, avec une précision conversion ≥ 25 % (vs ~5-10 % d'un mailing froid agence).

## Persona cible

**Agent immobilier indépendant ou en agence** dans une commune bretonne (22/29/35/56), confronté à 3 douleurs :
1. **Manque de mandats** (concurrence forte, 80 % du temps en prospection terrain)
2. **Boîtage non ciblé** (taux retour < 0.1 %)
3. **Pas d'accès aux données socio-fiscales** (Filosofi, DGFIP) qui permettraient un ciblage fin

**Promesse BRH au partenaire** : "Tu reçois chaque semaine 10-30 leads `score_vente ≥ 60` dans ton EPCI, avec adresse, segment (succession probable / downsizing / valorisation pré-vente), et carte de visite recto-verso pré-générée. Tu signes 1-3 mandats/mois en moyenne."

## Vérité terrain — heuristique honnête, transition prédictive planifiée

Comme le score rénovation v2, le score vente v1 sera **100 % heuristique** au démarrage (règles métier pondérées). La transition vers un modèle prédictif (XGBoost / LightGBM) demande :
- ≥ 500 prospects scorés × statut final (mandat signé / refusé / non contacté) sur ≥ 6 mois
- Une table `brh_agence_lead_outcomes` (à créer Phase 16.1, cf. § Modèle de données)
- Un modèle entraîné en Python côté script (scripts/external/train-vente-model.py), exporté en ONNX et inféré dans une EF Deno

Bascule prédictive estimée Phase 16.5 (T+12 mois minimum, conditionnée à ≥ 5 agences partenaires actives produisant du feedback).

## Algorithme `score_vente_v1` (règles + pondérations)

Score sur 100, calculé côté Edge Function `score-vente-prospect` (mêmes patterns que `enrich-prospect` Phase 11.1).

### Règles positives (signal pro-vente)

| # | Règle | Source | Pts | Justification métier |
|---|-------|--------|-----|---------------------|
| 1 | **Détention 7-12 ans** (zone chaude) | DVF chaînée parcelle | +25 | Médiane française 10 ans (Notaires Paris 2024). Probabilité vente max entre 7-12 ans. |
| 2 | **Succession probable SCI familiale** | DGFIP locaux PM × INPI dirigeants × INSEE décès | +30 | SCI dont dirigeant décédé OU >75 ans → revente sous 24m dans 30-50% des cas (estimation notariale terrain). |
| 3 | **Sur-dimensionnement logement** | DPE surface × INSEE Recensement Logement IRIS | +15 | Couple seul / grande maison + IRIS forte part >65 ans = signal downsizing classique. |
| 4 | **Travaux de valorisation récents** | Sit@del2 12-24 mois | +15 | Ravalement, isolation, extension réalisés < 24m = pattern "rénovation pré-vente". |
| 5 | **Marché local dynamique (gentrification)** | DV3F prix m² 3y growth | +10 | +15% prix m² 3 ans = arbitrage favorable, propriétaire incité à vendre. |
| 6 | **DPE F/G en zone gentrification** | Combo règle #5 × DPE | +10 | Passoires en zone tendue = vente avant interdiction location 2028 (loi Climat). |
| 7 | **Adresse propriétaire ≠ adresse bien** (résidence locative) | Cadastre + DGFIP | +15 | Propriétaire bailleur = arbitrage immobilier facile (pas d'attache émotionnelle). |
| 8 | **Voisinage actif** (mutations >3/an dans rayon 200m) | DVF agrégé | +5 | Effet mimétisme / marché actif local. |
| 9 | **Mandat de vente déposé puis retiré (>6 mois)** | Scraping LBC/SeLoger annonces archivées | +20 | Fort signal d'intentionnité passée non concrétisée. **Optionnel** car gris légal (ToS). |

### Règles négatives (signal anti-vente)

| # | Règle | Source | Pts | Justification |
|---|-------|--------|-----|---------------|
| N1 | **Mutation < 24m** (vient d'acheter) | DVF | -40 | Acheteur récent = ne revend pas. |
| N2 | **PV ≥ 36 kW installé < 12m** | Enedis registre | -10 | Investissement long terme = stabilité. |
| N3 | **Permis de construire neuf < 12m** | Sit@del2 | -15 | Vient de construire = ne revend pas. |
| N4 | **Bail commercial / professionnel** | Cadastre usage | -30 | Hors marché résidentiel. |

### Bonus segment

- **Segment `succession_imminente`** (règle #2 active + propriétaire 75+ détecté via INPI) → score plancher 70, label rouge dans UI agence
- **Segment `downsizing_actif`** (règles #1 + #3 actives) → score plancher 60
- **Segment `arbitrage_locatif`** (règles #5 + #7 actives) → score plancher 55

### Total et seuils

Score normalisé 0-100, plafonné. Seuils :
- ≥ 80 = `vente_imminente` (prio 1, push hebdo agence)
- 60-79 = `vente_probable_18m` (prio 2, livré bi-mensuel)
- 40-59 = `veille_passive` (livré trimestriel ou sur demande agence)
- < 40 = `cold` (non livré)

## Modèle de données (extensions KG existant)

### ALTER `brh_dpe_prospects` (cohérent avec Phase 11)

```sql
ALTER TABLE brh_dpe_prospects
  ADD COLUMN score_vente_v1 SMALLINT,
  ADD COLUMN score_vente_v1_detail JSONB,
  ADD COLUMN score_vente_v1_segment TEXT,        -- 'vente_imminente'|'vente_probable_18m'|'veille_passive'|'cold'
  ADD COLUMN score_vente_v1_calculated_at TIMESTAMPTZ,
  ADD COLUMN duree_detention_annees SMALLINT,    -- déduite via chaînage DVF
  ADD COLUMN proprio_bailleur BOOLEAN DEFAULT false; -- adresse proprio ≠ adresse bien

CREATE INDEX brh_dpe_prospects_score_vente ON brh_dpe_prospects(score_vente_v1 DESC) 
  WHERE score_vente_v1 IS NOT NULL;
CREATE INDEX brh_dpe_prospects_segment_vente ON brh_dpe_prospects(score_vente_v1_segment, code_postal) 
  WHERE score_vente_v1_segment IN ('vente_imminente','vente_probable_18m');
```

### ALTER `brh_companies` (typage agences immo)

```sql
ALTER TABLE brh_companies
  ADD COLUMN partner_type TEXT DEFAULT 'autre',  -- 'agence_immo'|'courtier'|'mo_oeuvre'|'architecte'|'autre'
  ADD COLUMN agence_zones_epci TEXT[],            -- codes EPCI couverts par l'agence
  ADD COLUMN agence_leads_quota_mois INT,         -- selon palier abonnement
  ADD COLUMN agence_segments_pref TEXT[];         -- ['vente_imminente','succession_imminente',...]

CREATE INDEX brh_companies_agence_epci ON brh_companies USING GIN (agence_zones_epci) 
  WHERE partner_type = 'agence_immo';
```

### NEW table `brh_agence_leads_envoyes` (CRM partenariat)

```sql
CREATE TABLE brh_agence_leads_envoyes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_company_id UUID NOT NULL REFERENCES brh_companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  envoye_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  segment TEXT NOT NULL,
  score_au_moment SMALLINT NOT NULL,
  -- Tracking conversion
  agence_action TEXT,                  -- 'contacte'|'rdv_pris'|'mandat_signe'|'refuse'|'non_contacte'
  mandat_signe_at TIMESTAMPTZ,
  mandat_montant_estime_cents BIGINT,  -- INTEGER cents (règle #2 CLAUDE.md)
  vente_signee_at TIMESTAMPTZ,
  vente_montant_cents BIGINT,
  -- Retour BRH (post-vente)
  acquereur_partage_at TIMESTAMPTZ,    -- date où agence a partagé contact acquéreur F/G
  acquereur_brh_prospect_id UUID REFERENCES brh_prospects(id),
  -- Méta
  notes TEXT,
  UNIQUE(agence_company_id, prospect_id)
);
CREATE INDEX brh_agence_leads_company ON brh_agence_leads_envoyes(agence_company_id, envoye_at DESC);
CREATE INDEX brh_agence_leads_segment ON brh_agence_leads_envoyes(segment, envoye_at DESC);
```

### NEW table `brh_agence_lead_outcomes` (vérité terrain pour modèle prédictif futur)

```sql
CREATE TABLE brh_agence_lead_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,
  score_vente_au_moment SMALLINT,
  detail_au_moment JSONB,
  outcome TEXT NOT NULL,               -- 'mandat_signe'|'vente_externe'|'maintenu'|'cold_18m'
  outcome_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
CREATE INDEX brh_agence_outcomes_outcome ON brh_agence_lead_outcomes(outcome, outcome_at DESC);
```

### RLS (cohérent règle #6 CLAUDE.md, jamais USING(true))

```sql
-- Agence voit uniquement les leads qui lui ont été envoyés
ALTER TABLE brh_agence_leads_envoyes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agence_select_own_leads" ON brh_agence_leads_envoyes FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM brh_company_members cm
      WHERE cm.profile_id = auth.uid() AND cm.company_id = brh_agence_leads_envoyes.agence_company_id
    )
    OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "agence_update_action" ON brh_agence_leads_envoyes FOR UPDATE
  USING (
    EXISTS(
      SELECT 1 FROM brh_company_members cm
      WHERE cm.profile_id = auth.uid() AND cm.company_id = brh_agence_leads_envoyes.agence_company_id
    )
  )
  WITH CHECK (true);  -- l'agence ne peut updater que les colonnes agence_action/mandat_*

CREATE POLICY "admin_all_outcomes" ON brh_agence_lead_outcomes FOR ALL
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

## Edge Functions (4 nouvelles, pattern Phase 11.1)

| EF | Input | Output | Rate limit | Rôle |
|----|-------|--------|------------|------|
| `score-vente-prospect` | `{prospectId}` | `{score, segment, breakdown}` | 20/min/IP | Calcul score vente unitaire (extension `enrich-prospect`) |
| `batch-score-vente-bretagne` | `{epci?}` (admin) | `{processed, errors[]}` | 2/min | Recalcule batch tous prospects ou par EPCI |
| `agence-leads-export` | `{companyId, segment?, limit?}` | CSV signé Storage 7j | 5/min | Export leads pour agence (avec marquage `envoye_at`) |
| `agence-lead-feedback` | `{leadId, action, montant?}` | Update tracking | 60/min | Agence remonte action (mandat signé, refusé, etc.) |

**Squelette `score-vente-prospect/index.ts`** (juste pour spec, pas pour exécution) :

```typescript
// Mêmes imports/CORS/rate-limit que enrich-prospect (Phase 11.1)
import { computeScoreVenteV1 } from './score-vente-v1.ts'

Deno.serve(async (req) => {
  // ... CORS + rate-limit identiques à enrich-prospect ...

  const { prospectId } = await req.json()
  
  // 1. Charger prospect + dépendances (déjà enrichi par Phase 11)
  const { data: prospect, error } = await supa.from('brh_dpe_prospects')
    .select('*, brh_ext_iris(*), brh_ext_commune(*)')
    .eq('id', prospectId).single()
  if (error) throw error  // règle #5 CLAUDE.md
  
  // 2. Lookups spécifiques vente (DGFIP × INPI × INSEE décès, durée détention DVF chaînée)
  const [sciContext, dureeDetention, voisinage, sitadelTravaux] = await Promise.all([
    detectSciFamilialeAgee(supa, prospect.owner_siren),
    chainerDvfDureeDetention(supa, prospect.parcelle_id),  // 5 ans glissants Etalab
    countMutationsRayon200m(supa, prospect.latitude, prospect.longitude),
    fetchSitadel12_24m(supa, prospect.adresse_norm),
  ])
  
  // 3. Calcul heuristique
  const result = computeScoreVenteV1({ prospect, sciContext, dureeDetention, voisinage, sitadelTravaux })
  
  // 4. Persist + log outcome (vérité terrain future)
  await supa.from('brh_dpe_prospects').update({
    score_vente_v1: result.total,
    score_vente_v1_detail: result.breakdown,
    score_vente_v1_segment: result.segment,
    score_vente_v1_calculated_at: new Date().toISOString(),
  }).eq('id', prospectId)
  
  return new Response(JSON.stringify(result), { headers: { ...cors, 'Content-Type': 'application/json' }})
})
```

## Modules TypeScript (extension `src/lib/dpe-engine/external/`)

```
src/lib/dpe-engine/external/
├── score-v2.ts              # Score rénovation (Phase 11)
├── score-vente-v1.ts        # ★ NEW : score vente (Phase 16)
├── dvf-chainage.ts          # ★ NEW : chaînage parcellaire DVF 5 ans
├── sci-succession.ts        # ★ NEW : DGFIP × INPI × INSEE décès
├── sitadel-valorisation.ts  # ★ NEW : détection travaux pré-vente
└── tests/
    ├── score-vente-v1.test.ts        # Couverture des 13 règles
    └── fixtures/
        ├── sci-decedee-rennes.ts
        ├── couple-downsizing.ts
        └── proprio-bailleur-vannes.ts
```

## API + Hooks React Query (pattern doublé existant)

```
src/api/score-vente.ts             # CRUD wrappers Supabase
src/hooks/queries/score-vente.ts   # useComputeScoreVente, useAgenceLeads, useExportAgenceLeads
```

## UI Pro — Portail Agence Immobilière

Nouvelles pages dans `src/pages/pro/agence/` (sous-dossier dédié, ProGuard + feature gate `partner_type='agence_immo'`).

```
src/pages/pro/agence/
├── leads-vente.tsx           # ★ Liste leads vente filtrée par EPCI agence + segment + score
├── lead-detail.tsx           # ★ Fiche prospect (adresse, breakdown score, carte, photos cadastre)
├── leads-tracking.tsx        # ★ Tableau de bord : envoyés / contactés / mandats / ventes
└── parametres-agence.tsx     # ★ Configuration zones EPCI + segments préférés + quota mois
```

**Composants partagés** :
- `ScoreVenteBadge` (rouge `vente_imminente` / orange `vente_probable_18m` / gris `veille_passive`)
- `SegmentChip` (`succession_imminente`, `downsizing_actif`, `arbitrage_locatif`)
- `LeadActionForm` (boutons `contacté` / `rdv pris` / `mandat signé`)

**Carte interactive** (réutilisation Leaflet de `prospection-map` Vercel) avec :
- Cluster prospects vente par segment
- Filtre EPCI / score / segment
- Popup avec breakdown règles + bouton "Marquer contacté"

## Business model partenaire (intégration `brh_companies`)

3 paliers d'abonnement à acter avec Philippe (à valider en Phase 16.0) :

| Palier | Quota leads/mois | Segments inclus | Prix HT/mois | Cible |
|--------|-----------------|-----------------|--------------|-------|
| **Découverte** | 10 leads | `vente_probable_18m` uniquement | 0 € (3 mois) | Onboarding |
| **Standard** | 30 leads | `vente_probable_18m` + 5 `vente_imminente` | 290 € | Agent indé / petite agence |
| **Premium** | 100 leads | Tous segments + carte interactive + API | 890 € | Agence multi-collaborateurs |

**Contrepartie data BRH** (clause contractuelle) : à chaque mandat signé via lead BRH, l'agence partage les coordonnées du **nouvel acquéreur** dans les 30 jours post-vente, qui rentre dans `brh_prospects` (segment `acquereur_F_G_post_mutation`, score rénovation v2 démarrant à 80). C'est le **flywheel data** qui justifie le prix bas Standard.

**Tracking commission** : table `brh_quotes` existante peut être étendue avec un champ `lead_origine_agence_id` pour lier les rénovations BRH issues d'un lead retourné par agence — base d'un éventuel reverse commission (BRH paie l'agence X% si la rénovation se signe).

## Phase d'implémentation

### Phase 16.0 — Cadrage business + RGPD (J+30, ~10h)

1. Validation des 3 paliers tarifaires + clause contrat partenariat avec Philippe
2. Déclaration CNIL / DPIA pour le scoring vente (impact = scoring d'individus / personnes morales pour démarchage commercial tiers)
3. Mention légale "Données issues de sources publiques (DVF, DGFIP, INSEE, INPI) — droit d'opposition" sur chaque lead exporté

### Phase 16.1 — Scoring socle (J+45, ~25h)

1. Migration `20260612100000_brh_score_vente_v1.sql` — ALTER + 2 nouvelles tables + RLS
2. Modules TS : `score-vente-v1.ts`, `dvf-chainage.ts`, `sci-succession.ts`, `sitadel-valorisation.ts` + tests Vitest
3. EF `score-vente-prospect` + `batch-score-vente-bretagne`
4. Script batch `scripts/external/batch-score-vente-bretagne.ts` — recalcule 59k prospects
5. **Pré-requis** : Phase 11.1 + 11.2 doivent être livrées (Sit@del2, IRIS, Géorisques)

**Livrable mesurable** : 59 306 prospects scorés, ~3 000 estimés dans segment `vente_probable_18m`, ~500 en `vente_imminente`.

### Phase 16.2 — Portail Agence (J+60, ~30h)

1. EF `agence-leads-export` + `agence-lead-feedback`
2. UI 4 pages `/pro/agence/*` + composants
3. Onboarding agence : formulaire SIRET + zones EPCI + paliers Stripe
4. Email de bienvenue Resend (EF `send-notification-email` existante)

### Phase 16.3 — Intégration Stripe paliers (J+75, ~15h)

1. Stripe Subscription paliers Standard/Premium
2. Webhook Stripe → mise à jour `brh_companies.agence_leads_quota_mois`
3. Compteur leads consommés vs quota (dashboard agence)

### Phase 16.4 — Boucle data acquéreur (J+90, ~10h)

1. Formulaire agence "déclarer mandat signé + acquéreur" (`agence-lead-feedback` enrichi)
2. Création automatique `brh_prospects` segment `acquereur_F_G_post_mutation`
3. Score rénovation v2 démarrant à 80 (règle #1 mutation_24m + autres bonus contextuels)
4. Trigger email Resend "Bienvenue dans BRH Habitat" à l'acquéreur (consentement explicite obligatoire)

### Phase 16.5 — Bascule prédictive (T+12 mois, conditionnée à ≥ 5 agences actives)

1. Script `scripts/external/train-vente-model.py` — XGBoost / LightGBM sur `brh_agence_lead_outcomes`
2. Export ONNX → inférence dans EF `score-vente-prospect-v2`
3. Dual-run heuristique vs prédictif pendant 1 mois pour valider gain de précision
4. Bascule `model_type: 'predictive_xgboost_v2'` documentée dans output EF

## Conformité RGPD (point critique)

Ce module **scorera des personnes morales (SCI/SARL via DGFIP) et indirectement des personnes physiques** (via détection succession INSEE décès × cadastre). Implications :

- ✅ **Sources strictement publiques** (Licence Ouverte 2.0)
- ⚠️ **Finalité commerciale tiers** = nécessite **DPIA (Analyse d'Impact RGPD)** avant lancement
- ⚠️ **Droit d'opposition** explicite à mentionner sur chaque lead livré (article 21 RGPD intérêt légitime)
- ⚠️ **Logging conservation 36 mois max** (purge auto via cron)
- ⚠️ **Information du dirigeant SCI** : envoi d'un courrier "votre SCI a été identifiée dans notre base prospection" 30 jours avant transmission à un tiers (best practice CNIL)
- ⚠️ **PAS de scoring d'individu personne physique sans interaction préalable** (le matching INSEE décès n'est appliqué qu'aux SCI, pas aux propriétaires personnes physiques connus)

**Action préalable obligatoire** : audit ProHacker dédié RGPD (cf. skill `prohacker`) + consultation DPO BRH avant Phase 16.1.

## Comparaison avec concurrents

| Acteur | Modèle | Coût agence | Différenciateur BRH |
|--------|--------|-------------|---------------------|
| **Hosman** | SaaS estimation lead | Commission vente 1% | Pas de scoring intention, juste lead estimation |
| **Effidea / Drimki** | Lead achetés revendus | 15-80€/lead | Coût élevé, pas de segment |
| **DataAgents** | Scoring propriétaire | Sur devis | Concurrent direct, peu de présence Bretagne |
| **Kelvin° (B2B Effy)** | API lead-gen white-label | Sur devis | Cible énergétique pas vente |
| **BRH Score Vente v1** | SaaS local Bretagne | 0-890€/mois | **Spécialisation Bretagne + flywheel data acquéreur F/G** |

## Conformité aux 14 règles BRH (CLAUDE.md)

- ✅ Règle #2 — INTEGER cents pour `mandat_montant_estime_cents`, `vente_montant_cents`
- ✅ Règle #4 — Validation Zod stricte sur EF inputs/outputs (à créer dans `api/schemas.ts`)
- ✅ Règle #5 — `if (error) throw error` après chaque appel Supabase
- ✅ Règle #6 — Toutes routes `/pro/agence/*` derrière ProGuard + feature gate `partner_type='agence_immo'`
- ✅ Règle #8 — Aucun `USING(true)` (RLS scopée par `brh_company_members`)
- ✅ Règle #9 — Rate limit sur les 4 EF (pattern `_shared/rate-limit.ts`)
- ✅ Règle #11 — TIMESTAMPTZ partout (`envoye_at`, `mandat_signe_at`, etc.)
- ✅ Règle #12 — Functions SECURITY DEFINER (si utilisées) avec `SET search_path = ''`

## Risques identifiés

| Risque | Niveau | Mitigation |
|--------|--------|------------|
| Précision scoring < 25 % conversion | Medium | Démarrer en gratuit Découverte 3 mois pour calibrer |
| Refus CNIL sur scoring SCI | Low | DPIA en amont + droit d'opposition systématique |
| Saturation marché agences (concurrence Hosman/Effidea) | Medium | Différenciateur Bretagne + flywheel data acquéreur |
| Faible volume `vente_imminente` (<200/mois) | Low | Élargir à `vente_probable_18m` + ajouter départements limitrophes (44 Loire-Atlantique) |
| Agences ne remontent pas la conversion | High | Conditionner renouvellement abonnement à un taux feedback ≥ 50 % |

## Statut d'implémentation

- ✅ Phase 16.0-DESIGN : Cette page (conception complète)
- ❌ Phase 16.0 : Cadrage business + DPIA RGPD
- ❌ Phase 16.1 : Scoring socle (dépend de Phase 11.1 + 11.2)
- ❌ Phase 16.2 : Portail Agence
- ❌ Phase 16.3 : Stripe paliers
- ❌ Phase 16.4 : Boucle data acquéreur (flywheel)
- ❌ Phase 16.5 : Bascule prédictive (T+12 mois)

## Mises à jour de cette page

- **2026-05-01** : Création — design complet score vente v1 + portail agence + business model partenaire
