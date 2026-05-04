# BRH Habitat — Moteur de Diagnostic

> Source : `src/lib/diagnostic-engine.ts` + `src/lib/renovation-plan-engine.ts` + `src/lib/aides-engine.ts` + `src/data/` + `src/stores/diagnosticStore.ts`.
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

Feature d'acquisition clé de BRH Habitat : un **diagnostic habitat multi-étapes** accessible aux visiteurs anonymes. Le flow :

1. Visiteur → /diagnostic
2. Questions guidées (type bâtiment, surface, installations, confort, budget)
3. Moteur calcule **score santé** + identifie **pistes de rénovation**
4. Suggestion d'**aides financières** disponibles (MaPrimeRénov, CEE, etc.)
5. Capture lead (optionnel) + sauvegarde dans `brh_diagnostics`
6. Prise de RDV pour visite technique

## Architecture du moteur

```
Frontend (pages/public/diagnostic/*)
   ↓
diagnosticStore (Zustand — draft persistant)
   ↓
diagnostic-engine (lib) — calcule score par domaine
   ↓
renovation-plan-engine (lib) — propose travaux prioritaires
   ↓
aides-engine (lib) — match aides applicables
   ↓
results page → "Réserver RDV" OU "Sauvegarder mon diagnostic"
```

## Tables

### `brh_diagnostics`
```
id              UUID PK
user_id         UUID? → profiles (optionnel — diagnostic peut être anonyme initialement)
type            TEXT ('rapide' | 'complet' | 'expert')
data            JSONB (toutes les réponses user)
score           INTEGER 0-100 (score santé global)
results         JSONB (pistes de rénovation, aides, coûts estimés)
status          TEXT ('draft' | 'submitted' | 'processed')
created_at, updated_at TIMESTAMPTZ
```

### Diagnostic draft (localStorage)
Clé : `${tenantId}-diagnostic-draft` (règle anti-bug #3 : scope tenant)

Structure persistée par Zustand :
```typescript
{
  currentStep: number,
  answers: Record<string, any>,
  type: 'rapide' | 'complet' | 'expert',
  lastSavedAt: timestamp,
}
```

**Correction v6** : clé globale → scope tenant (évite fuite entre tenants si multi-tenant runtime).

## Lib `diagnostic-engine.ts`

Calcule le score santé global d'un logement à partir des réponses.

```typescript
function calculateDiagnostic(answers: DiagnosticAnswers): DiagnosticResult {
  const scores = {
    toiture: calculateToitureScore(answers),
    electricite: calculateElectriciteScore(answers),
    isolation: calculateIsolationScore(answers),
    vmc: calculateVmcScore(answers),
    plomberie: calculatePlomberieScore(answers),
    menuiserie: calculateMenuiserieScore(answers),
    chauffage: calculateChauffageScore(answers),
  }

  const global = weightedAverage(scores, DOMAIN_WEIGHTS)

  return {
    globalScore: global,
    domainScores: scores,
    criticalIssues: detectCriticalIssues(scores, answers),
    recommendations: prioritizeRecommendations(scores),
  }
}
```

### Règles de scoring (exemples)

| Question | Impact |
|----------|--------|
| Toiture > 30 ans, non refaite | toiture -30 |
| Isolation combles < 20 cm | isolation -25 |
| VMC absente ou non fonctionnelle | vmc -40 |
| Chaudière fioul > 15 ans | chauffage -35 |
| Fenêtres simple vitrage | menuiserie -30 |
| Tableau électrique vétuste (pré-NFC15-100) | electricite -40 |

Score domain = `100 - sum(malus)` (borné 0-100).

## Lib `renovation-plan-engine.ts`

À partir du diagnostic, propose un plan de rénovation priorisé par ROI énergétique + confort.

```typescript
function generateRenovationPlan(diag: DiagnosticResult): RenovationPlan {
  const priorities = [
    ...suggestIsolation(diag),  // si isolation score < 50
    ...suggestVmc(diag),        // si vmc score < 40
    ...suggestChaudiere(diag),  // si chauffage score < 50
    ...suggestMenuiserie(diag), // si menuiserie score < 60
    // ...
  ]

  // Tri par ROI (gain énergétique / coût)
  priorities.sort((a, b) => b.roi - a.roi)

  return {
    phases: groupByBudget(priorities, 3),  // phase 1/2/3 par budget
    totalEstimatedCost: sum(priorities.map(p => p.costRange)),
    expectedEnergySavings: sum(priorities.map(p => p.energySavingsPercent)),
  }
}
```

## Lib `aides-engine.ts`

Match les aides financières disponibles selon profil + travaux.

### Aides supportées
- **MaPrimeRénov** (selon revenus : bleu/jaune/violet/rose)
- **CEE** (Certificats d'Économies d'Énergie)
- **Éco-PTZ** (prêt à taux zéro)
- **TVA réduite 5.5%** (pour travaux amélioration énergétique)
- **Aides locales Bretagne** (région + départements)

```typescript
function matchAides(diag, profile, renovationPlan): Aide[] {
  const aides: Aide[] = []

  if (profile.revenue_tier && renovationPlan.includes('isolation')) {
    aides.push({
      name: 'MaPrimeRénov',
      amount: calculateMPR(profile.revenue_tier, surface, 'isolation'),
      eligible: true,
      conditions: [...],
    })
  }

  // CEE, Éco-PTZ, aides locales...

  return aides.sort((a, b) => b.amount - a.amount)
}
```

**Source data** : `src/data/aides/` (fichiers statiques mis à jour manuellement ou via CMS si intégré).

## Données statiques (`src/data/`)

18 fichiers dans `src/data/` contenant :
- Services BRH (descriptions, prix indicatifs)
- Aides (MaPrimeRénov, CEE, Éco-PTZ)
- Diagnostics (questions, templates)
- Articles éducatifs (liens vers `brh_articles`)

**Pattern** : data statique = TS/JSON dans le repo (pas en DB) pour versioning + édition dev.

## Flow utilisateur

### 1. Entrée diagnostic
```
/ → CTA "Lancer mon diagnostic gratuit"
  → /diagnostic → Choix type (rapide 3min / complet 10min / expert 20min)
  → /diagnostic/:type → Wizard multi-étapes
```

### 2. Wizard
```
Step 1 : Type bâtiment (maison/appart, année, surface, localisation)
Step 2 : Isolation (combles, murs, sol)
Step 3 : Énergie (chauffage, ECS, VMC, électricité)
Step 4 : Confort (humidité, ponts thermiques, bruit)
Step 5 : Projet (budget, timeline, priorités)
Step 6 : Contact (nom, email, téléphone) — OPTIONNEL à ce stade
```

À chaque step : save dans `diagnosticStore` (localStorage) → reprise possible si quit.

### 3. Calcul & résultats
```
Submit → diagnosticEngine.calculate(answers)
  → renovationPlanEngine.generatePlan(result)
  → aidesEngine.match(result, plan)
  → INSERT brh_diagnostics (status='submitted')
  → Redirect /diagnostic/resultats/:id
```

### 4. Page résultats
- Score santé (HealthScoreGauge component réutilisé)
- Scores par domaine avec interprétation
- Pistes de rénovation priorisées (avec fourchettes de coûts)
- Aides financières éligibles
- CTA "Réserver une visite technique" → crée `brh_appointment`
- CTA "Sauvegarder mon diagnostic" → si pas encore user → sign-up

## Migration `20260326170000_diagnostic_draft_resume`

Ajoute support reprise draft :
- Colonne `data JSONB` accepte brouillons incomplets
- Policy RLS : SELECT/UPDATE par owner si `status='draft'`
- Trigger : si `status='submitted'` → lock (pas de modif ensuite)

**Correction v8 M5** : diagnostic draft à l'inscription — fix potentiel du link draft anonyme → compte créé.

## Pages

### `/diagnostic` (17 pages)
- `DiagnosticPage.tsx` — wizard principal
- `DiagnosticRapide.tsx`, `DiagnosticComplet.tsx`, `DiagnosticExpert.tsx` — variantes
- `DiagnosticResults.tsx` — page résultats
- Sous-pages par step (isolation, chauffage, etc.)

### `/tableau-de-bord/diagnostics` (user)
Liste des diagnostics de l'utilisateur (historique).

### `/admin/diagnostics` (admin)
Vue admin de tous les diagnostics (supervision).

## Performance

- Lazy imports toutes les pages diagnostic (65 lazy imports total sur l'app)
- Calcul engine côté client (pas besoin d'EF)
- `diagnosticStore` persist localStorage → reprise instantanée

## Sécurité

- Diagnostic anonyme OK (user_id null possible) — `brh_diagnostics INSERT` policy permissive mais contrôlée
- Lead capture : INSERT également dans `brh_contacts` si souhaité
- RLS : user peut voir/modifier ses diagnostics draft, read-only si submitted

## Statut d'implémentation

- ✅ Migration `20260326170000_diagnostic_draft_resume`
- ✅ Lib `diagnostic-engine.ts`, `renovation-plan-engine.ts`, `aides-engine.ts`
- ✅ `diagnosticStore` Zustand (scope tenant)
- ✅ Pages diagnostic + wizard multi-étapes
- ✅ Page résultats avec aides
- 🟡 Link anonymous draft → compte créé (correction v8 M5)
- 🟡 Export PDF résultats diagnostic : prévu non implémenté
- ❌ Tests unitaires moteurs : pas prévus (priorité basse)

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy).
