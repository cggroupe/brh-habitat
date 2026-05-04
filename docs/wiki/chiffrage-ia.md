# BRH Habitat — Chiffrage IA

> Source : `supabase/functions/ai-proxy/` + `supabase/functions/chiffrage-prices/` + `src/lib/ai.ts` + `src/lib/chiffrage-pdf.tsx` + `src/api/chiffrages.ts`.
> **Dernière mesure** : 2026-04-23.

## Vue d'ensemble

BRH Habitat intègre un **assistant IA BTP** pour :
1. **Chiffrage automatique** de travaux de rénovation (via `ai-proxy` + `chiffrage-prices`)
2. **Assistant technique** (Q&A BTP pour pros et particuliers)

Les chiffrages générés sont historisés dans `brh_chiffrages` avec possibilité d'export PDF.

## Architecture

```
Frontend (page ProChiffrage / ParticulierChiffrage)
   ↓ supabase.functions.invoke('ai-proxy', { prompt, mode: 'chiffrage' })
Edge Function ai-proxy
   ├─ Vérifie auth (Bearer token) + rate limit (20-40/min selon rôle)
   ├─ Enrichit le prompt avec prix de référence depuis chiffrage-prices
   ├─ Appel OpenAI (GPT-4 ou équivalent)
   ├─ Retourne JSON structuré (lignes chiffrage, totaux)
   ↓
Frontend :
   ├─ Sauvegarde brh_chiffrages (input_data + output_data JSONB)
   ├─ Génère PDF via @react-pdf/renderer (lib/chiffrage-pdf.tsx)
   ├─ Upload PDF dans bucket chiffrage-pdf (scope user_id)
   └─ Affiche à l'utilisateur
```

## Tables

### `brh_chiffrages`
```
id             UUID PK
user_id        UUID → profiles
prospect_id    UUID? → brh_prospects (si lié à un prospect pro)
input_data     JSONB (ce que l'utilisateur a saisi : type projet, surface, etc.)
output_data    JSONB (lignes chiffrage IA)
total_cents    INTEGER (HT)
pdf_url        TEXT? (URL Storage si exporté)
created_at, updated_at TIMESTAMPTZ
```

### RLS
- Scope `user_id = auth.uid()` ou `prospect_id IN (pro company prospects)`
- Admin bypass

## Edge Functions

### `ai-proxy`
**Proxy sécurisé vers OpenAI**. Évite de mettre la clé OpenAI en frontend.

| Mode | Auth | Rate limit | Usage |
|------|------|------------|-------|
| `visitor` | Public | 20/min | Visiteur anonyme (homepage, diagnostic) |
| `assistant` | JWT | 20/min | Assistant technique authentifié |
| `chiffrage` | JWT + pro/particulier | 40/min | Génération chiffrage complet |

**Input** :
```typescript
{
  mode: 'visitor' | 'assistant' | 'chiffrage' | 'social-post',
  prompt: string,
  context?: object,  // pour chiffrage : { surface, type, budget_cible }
  stream?: boolean,  // support SSE
}
```

**Output (mode chiffrage)** :
```typescript
{
  summary: string,
  lines: Array<{
    category: string,  // 'Maçonnerie', 'Électricité', 'Plomberie'...
    description: string,
    quantity: number,
    unit: 'm²' | 'ml' | 'h' | 'u',
    unit_price_cents: number,
    total_cents: number,
  }>,
  total_ht_cents: number,
  tva_rate: number,  // 10 ou 20
  total_tva_cents: number,
  total_ttc_cents: number,
  notes: string,
  assumptions: string[],
}
```

### `chiffrage-prices`
**Retourne des prix de référence** pour enrichir le prompt IA (ancrage).

**Auth** : Public (usage interne par `ai-proxy`)
**Rate limit** : 40/min

**Input** :
```typescript
{
  categories: string[],  // ex: ['menuiserie', 'isolation', 'électricité']
  region?: string,       // default 'Bretagne'
}
```

**Output** : liste de prix `{ category, item, unit, price_cents_min, price_cents_max }`.

## Génération PDF

`src/lib/chiffrage-pdf.tsx` utilise `@react-pdf/renderer` (client-side) pour générer un PDF formaté :
- En-tête : logo BRH, infos entreprise
- Bloc client (si pro → infos prospect)
- Tableau lignes chiffrage
- Totaux HT / TVA / TTC
- Mentions légales BRH
- Validity : 30 jours

```typescript
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { ChiffragePDF } from '@/lib/chiffrage-pdf'

<PDFDownloadLink
  document={<ChiffragePDF chiffrage={data} tenant={tenantConfig} />}
  fileName={`chiffrage-${id}.pdf`}
>
  {({ loading }) => loading ? 'Génération...' : 'Télécharger PDF'}
</PDFDownloadLink>
```

Upload Storage :
```typescript
const pdfBlob = await pdf(<ChiffragePDF ... />).toBlob()
const { data: upload } = await supabase.storage
  .from('chiffrage-pdf')
  .upload(`${user.id}/${chiffrageId}.pdf`, pdfBlob)
await supabase.from('brh_chiffrages').update({ pdf_url: upload.path })
```

## Feature gates

| Feature | Tier | Page |
|---------|------|------|
| `aiChiffrage` | `pro`, `enterprise` | `/pro/chiffrage-ia`, `/particulier/chiffrage-ia` |
| `aiAssistantTechnique` | `pro`, `enterprise` | `/pro/assistant-technique`, `/particulier/assistant-technique` |
| `publicAssistantAI` | `pro`, `enterprise` | `/assistant` (page publique) |

Configuration : `src/config/tier-presets.ts`.

## Sécurité

### Côté Edge Function
- **Auth Bearer** obligatoire (sauf mode `visitor`)
- **Rate limiting** par user + par mode
- **Input validation** : longueur prompt limitée (anti-abuse)
- **Key OpenAI** : `Deno.env.get('OPENAI_API_KEY')` — jamais exposée
- **Log audit** : chaque appel loggé (user_id, mode, tokens) dans `brh_platform_settings` ou table dédiée

### Côté frontend
- **Enrichissement prompt** : inclure contexte tenant (BRH branding)
- **Validation output** : Zod parse sur response
- **Sanitization** : markdown rendu via `react-markdown` (sanitize par défaut)
- **Pas de prompt injection** : context utilisateur séparé du system prompt

## Coûts & quotas

- GPT-4 = ~$0.03/1K tokens input, $0.06/1K output
- Un chiffrage type = ~2K input + 2K output = ~$0.18
- Rate limit 40/min prévient abus
- Monitoring via logs EF + Sentry

## Flow complet utilisateur (pro)

```
1. /pro/chiffrage-ia
   → Formulaire : type projet, surface, budget cible, options (isolation, menuiserie...)
2. Submit
   → useChiffrageCreate.mutate(input)
   → API supabase.functions.invoke('ai-proxy', { mode: 'chiffrage', ... })
   → ai-proxy enrichit prompt avec chiffrage-prices
   → Retour JSON structuré
3. Display
   → Affiche lignes + totaux
   → Bouton "Télécharger PDF" (PDFDownloadLink)
   → Bouton "Sauvegarder" → INSERT brh_chiffrages
4. Si prospect lié
   → Lien depuis brh_prospects.id
   → Disponible dans /pro/prospects/:id
```

## Statut d'implémentation

- ✅ EF `ai-proxy` déployée (auth + rate limit)
- ✅ EF `chiffrage-prices` déployée
- ✅ Table `brh_chiffrages` + RLS (migration `20260410100000_chiffrage_history`)
- ✅ Corrections audit v8 (M3 chiffrage UPDATE)
- ✅ API `chiffrages.ts` + hook `useChiffrages`
- ✅ Page `/pro/chiffrage-ia` + PDF generation
- 🟡 Monitoring coûts : à raffiner (dashboard admin tokens consumés)
- 🟡 Streaming response (SSE) : support ajouté mais UI à finaliser

## Mises à jour de cette page

- **2026-04-23** : Création (audit wiki Karpathy).
