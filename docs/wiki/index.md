# BRH Habitat Wiki — Source de vérité (Pattern Karpathy)

> **Pattern Karpathy LLM Wiki appliqué** — Cette wiki est la source de vérité pour BRH Habitat. Avant toute modification : Claude lit l'index, lit les pages pertinentes, applique. Après la modification : Claude met à jour les pages impactées.
>
> Référence : [Karpathy — LLM Knowledge Base Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

**Date création** : 2026-04-23 · **Rédacteur** : Claude Opus 4.7 (audit commandé par Philippe Gagnon)
**Projet** : Bretagne Rénovation Habitat — Plateforme SaaS multi-portails
**App** : https://www.renovation-brh.fr · Base44 : brh-habitat-e9ba58c9.base44.app

---

## Comment utiliser cette wiki

**Règle d'or Karpathy** : toute modification de BRH Habitat commence par la lecture de cette wiki, se termine par sa mise à jour.

```
1. NOUVELLE TÂCHE
   └─> Claude lit index.md (cette page)
       └─> Claude identifie les pages concernées
           └─> Claude lit ces pages (charge le contexte minimal nécessaire)
               └─> Claude agit (modif code + tests)
                   └─> Claude met à jour les pages impactées
                       └─> Claude ajoute une entrée dans log.md
```

---

## Catalogue des pages

### Partie 1 — État actuel du projet

| Page | Sujet |
|------|-------|
| [architecture-snapshot.md](architecture-snapshot.md) | Stack, 119 pages, 33+ tables `brh_*`, 70 routes, score 9.8/10 |
| [data-model.md](data-model.md) | Tables par domaine, RLS, triggers, fonctions SECURITY DEFINER |
| [edge-functions-reference.md](edge-functions-reference.md) | 11 Edge Functions (IA, emails, invitations, SIRET, Clerk bridge) |
| [hooks-reference.md](hooks-reference.md) | 14 hooks React Query + 25 modules API Zod |
| [migrations-audit.md](migrations-audit.md) | Catalog des 37 migrations en 5 phases |

### Partie 2 — Guides features majeures

| Page | Sujet |
|------|-------|
| [partner-platform.md](partner-platform.md) | Plateforme partenaires (companies, quotes, commissions, recrutement multi-niveaux) |
| [viral-features.md](viral-features.md) | Simulation partagée, code court, leaderboard, social posts, cashback, QR codes |
| [chiffrage-ia.md](chiffrage-ia.md) | IA BTP (ai-proxy) + chiffrage-prices + génération PDF |
| [tenant-multitenancy.md](tenant-multitenancy.md) | TenantContext, feature flags par tier, config multi-tenant |
| [health-carnet.md](health-carnet.md) | Carnet santé habitat : health_records, work_history, home_documents |
| [diagnostic-engine.md](diagnostic-engine.md) | Moteur de diagnostic multi-étapes + renovation-plan-engine + aides-engine |
| [external-data-sources.md](external-data-sources.md) | ⭐ **Phase 11** — 27 sources publiques gratuites (Enedis, GRDF, Géorisques, Filosofi, DVF, RGE, ANIL...) pour scoring composite v2 sur 59 306 prospects DPE F/G Bretagne |
| [scoring-audit-vs-vente-immo.md](scoring-audit-vs-vente-immo.md) | ⭐ **Audit Phase 11.0** — Comparaison score v2 vs référentiel "scoring prédictif de vente immo" (4 familles + 6 sources). Verdict + 3 ajouts validés + 4 rejets motivés |
| [score-vente-agences.md](score-vente-agences.md) | ⭐ **Phase 16** (renommée 02/05) — Score Vente v1 (heuristique 13 règles) pour agences immo partenaires + portail dédié + flywheel data acquéreur F/G + 3 paliers SaaS (0/390/990/2490€) |
| [score-vente-amelioration-pre-build.md](score-vente-amelioration-pre-build.md) | ⭐ **Pre-Mortem Phase 16** (renommée 02/05) — 10 améliorations critiques + plan révisé ~110h (vs 205h grâce réutilisation Phase 13/14/15) + MRR cible M+12 = 20k€/mois |
| [audit-retard-phases-mai-2026.md](audit-retard-phases-mai-2026.md) | 🚨 **Audit 02/05** — État réel des phases : 8 phases code livrées le 01/05 (11.1→11.2.1, 12 XML ADEME, 13/13.3/13.5, 14, 15) pendant production docs Phase 11.0/12.0. Conflit numérotation résolu, plan Phase 16 révisé |
| [tenant-multitenancy.md](tenant-multitenancy.md#phase-15-tier-dynamique-par-utilisateur-stripe-saas) | ⭐ **Phase 15** — Tier dynamique pro RGE (Free/Pro 49€/Expert 149€) avec quota courriers IA mensuel + Stripe Checkout + webhook auto-sync. Distinct du pricing agences immo Phase 12. |
| [log.md#2026-05-02-phase-13-6-marketplace-artisans-rge-bretons-network-effect](log.md#2026-05-02--phase-136--marketplace-artisans-rge-bretons-network-effect) | ⭐ **Phase 13.6** — Marketplace artisans RGE bretons : matching prospect ↔ artisan local (Haversine + score qualité), 2 tables `brh_artisans_*`, page `/pro/marketplace-artisans`, commission 5-10 % chantier signé, network effect SaaS |
| [agence-portal-status.md](agence-portal-status.md) | ⭐ **Phase 16.1 (05/05)** — Portail agence enrichi 13 entrées · 5 boucles fonctionnelles end-to-end (parrainage, vitrine QR, social, équipe, messagerie) · 6 nouvelles tables · 8 helpers SECURITY DEFINER · 5 permissions JSONB · ⏳ admin BRH = session dédiée à venir (8 pages /admin/* à créer) |
| [artisan-portal-status.md](artisan-portal-status.md) | 🟡 **Phase 17.1 (06/05)** — Portail artisan enrichi (en cours) — Step 1 (sidebar 13 entrées + 7 skeletons cliquables) + Step 2 (migration `20260706200000` : 6 tables `brh_artisan_*`, 3 helpers SECURITY DEFINER, 3 triggers, RLS) livrés. Reste Steps 3-9 (simulateur, chiffrage Batichiffrage, leads porte-à-porte, parrainage, social, QR vitrine, progression). |
| [reseau-social-blueprint.md](reseau-social-blueprint.md) | 📐 **Phase 18 Blueprint (06/05)** — Architecture cible couche réseau social pro `/reseau` transverse 4 personae (agences/artisans/architectes/apporteurs) + 8 décisions stratégiques + 11 tables nouvelles + algo feed V1 + bridge AUTAF API (pas migration) + emprunts AUTAF (5/8 composantes ENGINE_V2). |
| [reseau-social-status.md](reseau-social-status.md) | 🟡 **Phase 18 Status (06/05)** — Étape 1/12 livrée (audit AUTAF + blueprint). 11 étapes restantes : migration SQL, infra UI, graphe social, feed MVP, marketplace chantiers (KILLER), bridge AUTAF, modération, bootstrap, SEO, monétisation. MVP utilisable Étape 6 (4 sem). Monétisable Étape 12 (~14-16 sem). |

### Partie 3 — Qualité & opérations

| Page | Sujet |
|------|-------|
| [security-status.md](security-status.md) | ⭐ Statut findings sécurité audits v4→v8 + corrections post-audit |
| [performance.md](performance.md) | ⭐ SW cache v3, Sentry, staleTime, lazy imports, monitoring |
| [tests.md](tests.md) | ⭐ État tests (aucun auto), roadmap implémentation Vitest/Playwright |
| [playbooks.md](playbooks.md) | ⭐ 10 playbooks : RLS debug, Clerk flow, migrations, commissions cascade |

### Partie 4 — Méta

| Page | Sujet |
|------|-------|
| [karpathy-pattern-setup.md](karpathy-pattern-setup.md) | Règles d'usage de cette wiki |
| [log.md](log.md) | Journal append-only des modifications |

### Tooling

- [`scripts/verify-wiki.sh`](../../scripts/verify-wiki.sh) — Lint wiki vs code
  - Sans flag : lint structurel rapide
  - `--strict` : claims chiffrés exacts + anti-hallucinations
  - `--semantic` : lint via Claude Haiku (CLI auto-détecté)
  - `--all` : les deux
- [`scripts/ingest-wiki.sh`](../../scripts/ingest-wiki.sh) — Analyse diff git, propose pages wiki à mettre à jour + draft log.md
- [`raw/README.md`](raw/README.md) — **Sources immuables** (migrations, audits, configs) — source de vérité vs wiki générée
- [`llms.txt`](llms.txt) — Format standard pour agents IA externes (ChatGPT, Claude, Perplexity)

---

## Règles anti-bug (non négociables)

1. **TOUJOURS invalider `['dashboard', 'stats']`** après toute mutation comptée dans le dashboard
2. **TOUJOURS utiliser INTEGER (cents)** pour les montants — JAMAIS NUMERIC, FLOAT, TEXT
3. **TOUJOURS scoper les clés localStorage par tenant** : `${tenantId}-xxx`
4. **JAMAIS `as unknown as`** pour les réponses Supabase — utiliser Zod (`api/schemas.ts`)
5. **TOUJOURS `if (error) throw error`** après appel Supabase
6. **JAMAIS de route sans guard** (AuthGuard / AdminGuard / ProGuard / ParticulierGuard)
7. **TOUJOURS tester RLS** avec user non-admin avant merge
8. **JAMAIS `USING (true)`** sauf exceptions documentées (brh_simulation_leads, brh_badges SELECT)
9. **TOUJOURS rate limit** sur toute nouvelle Edge Function (pattern ai-proxy)
10. **TOUJOURS incrémenter version SW** après deploy avec cache changes
11. **TOUJOURS TIMESTAMPTZ** (pas TIMESTAMP)
12. **TOUJOURS `SET search_path = ''`** sur fonctions SECURITY DEFINER
13. **JAMAIS `toISOString().slice(0,10)`** — utiliser `getFullYear/getMonth/getDate`
14. **TOUJOURS `@layer base { }`** pour resets CSS Tailwind 4

---

## Stack (vérifiée package.json 2026-04-23)

- **Frontend** : React 19.2 + TypeScript 5.9 strict + Vite 7.3 + Tailwind CSS 4.2
- **State** : Zustand 5.0 + React Query 5.99
- **Backend** : Supabase 2.103 (PostgreSQL + Auth + Storage + Edge Functions + Realtime)
- **PDF** : @react-pdf/renderer 4.4
- **Monitoring** : Sentry 10.48
- **Validation** : Zod 4.3
- **i18n** : i18next 26 (FR/EN)
- **Icons** : lucide-react 1.8
- **Emails** : Resend (via EF auto-email + send-notification-email)
- **Auth bridge** : Clerk (via EF bridge-signin, clerk-webhook)
- **Deploy** : Vercel (SPA) · Supabase Cloud

---

## Liens externes essentiels

- Site public : https://www.renovation-brh.fr
- Base44 app : https://brh-habitat-e9ba58c9.base44.app (App ID : `69735696675e3c24e9ba58c9`)
- Supabase : project `lygmmvxnmvlgynmrcpny`
- Repo : `/Users/philippegagnon/Desktop/brh-habitat/brh-habitat/`
- CLAUDE.md projet : [../CLAUDE.md](../../CLAUDE.md)
- ARCHITECTURE.md audit v7 : [../ARCHITECTURE.md](../../ARCHITECTURE.md)
- PARTNER-PLATFORM.md blueprint : [../PARTNER-PLATFORM.md](../../PARTNER-PLATFORM.md)

---

## Résumé exécutif (TL;DR)

BRH Habitat est une **plateforme SaaS multi-portails** pour la rénovation habitat en Bretagne :

- **5 portails** : Public (17 pages), Dashboard user (7), Admin (13), Pro (17), Particulier (12)
- **Architecture de pointe** : 4 guards d'auth, 16 feature gates, API layer centralisée avec Zod
- **Plateforme partenaires** : système d'affiliation multi-niveaux avec commissions auto (triggers SQL)
- **Gamification** : badges, points, leaderboard, cashback
- **IA BTP** : ai-proxy (OpenAI) + chiffrage-prices + génération PDF
- **Score santé** : **9.8/10** (aucune faiblesse critique)
- **Production-ready** — prêt pour montée en charge

**Base44 vs Supabase** : l'app Base44 (externe) est le mockup historique. Le code sous `/Desktop/brh-habitat/brh-habitat/` est l'**implémentation de production** sur Supabase.
