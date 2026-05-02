# Audit retard — État réel des phases au 2026-05-02

> Source : Audit 2026-05-02 du log.md complet (1480 lignes, 21 entrées). Constat : 8 phases de **code livré en prod** ont été produites le 2026-05-01 pendant que je travaillais en parallèle sur 4 entrées **documentaires** (plans / audits / pre-mortem). Mes contributions ont guidé le développement mais sont devenues partiellement obsolètes ou en conflit de numérotation.
> Dernière mesure : 2026-05-02
> Rôle : Re-synchroniser ma compréhension avec l'état réel du projet, résoudre le conflit Phase 12, et re-prioriser le travail restant en réutilisant massivement les briques déjà livrées.

## Vue d'ensemble — qui a livré quoi le 2026-05-01

### Code livré (8 phases en prod, 228/228 tests verts)

| Phase | Intitulé | Livrable concret | Migrations |
|-------|----------|-----------------|------------|
| 11.1 | Tier 1 socle scoring | 3 tables `brh_ext_*` + EF `enrich-prospect` + 11 modules TS `dpe-engine/external/` + score-v2.ts | ✅ `20260507100000_brh_ext_tier1.sql` |
| 11.1.1 | Scripts seed Bretagne | 4 scripts ops (`seed-iris`, `seed-commune`, `enrich-iris-from-prospect`, `batch-score-v2-all`) + APIs Enedis/GRDF/Géorisques/RGE/Pyris | — |
| 11.1.2 | Auto-download CSV INSEE | 1909 IRIS BZH seedés + 1202 communes BZH + Filosofi 2020 + Recensement 2020 | — |
| 11.2 | Tier 2 DVF + page Pro | `brh_ext_aides_anil` + module `dvf.ts` + page `/pro/prospects-bretagne` + 16 tests Vitest | ✅ `20260514100000_brh_ext_tier2.sql` |
| 11.2.1 | Enrich DVF Bretagne | Script ops `enrich-dvf-bretagne.ts` + fix batch-score-v2 (DVF + Enedis lus côté prospect) | — |
| **12** | **Export XML ADEME** (audit opposable, schéma 5.3.1) | EF + module + tests | ✅ migration |
| 13 | 🚀 KILLER — Générateur IA courrier prospection | Table `brh_prospect_letters` + EF `generate-prospect-letter` (Claude Opus 4.7 direct, prompt caching) + composants letters/ + PDF A4 | ✅ `20260520100000_brh_prospect_letters.sql` |
| 13.3 | Bulk génération top 50 courriers | EF rate 5→20/min + `generateBulk` 3 parallèles + JSZip côté client | — |
| 13.5 | Carte chaleur Bretagne | Leaflet + heatmap 59k prospects + popup → bouton "Courrier IA" 1 clic | — |
| 14 | Dashboard analytique pro | API `pro-analytics.ts` + page `/pro/analytics` + recharts + KPI MPR potentiel + cost monitoring Opus 4.7 | — |
| 15 | SaaS Stripe (pros RGE) | Table `brh_pro_subscriptions` + 4 EFs Stripe (checkout, webhook HMAC, portal, quota gating SQL atomique) + page `/pro/abonnement` Free/49/149€ | ✅ `20260601100000_brh_pro_subscriptions.sql` |

### Documentation produite (par moi en parallèle)

| Phase doc | Intitulé | Statut vs code livré |
|-----------|----------|----------------------|
| 11.0 | Plan Sources Données Externes (`external-data-sources.md`) | ✅ A guidé Phase 11.1 → 11.2.1 livrées |
| 11.0-AUDIT | Audit scoring v2 vs vente immo (`scoring-audit-vs-vente-immo.md`) | ✅ Toujours valide |
| **12.0-DESIGN** | **Score Vente v1 agences immo** (`score-vente-agences.md`) | ⚠️ **CONFLIT numérotation** : Phase 12 prise par XML ADEME |
| 12.0-PRE-MORTEM | Pre-mortem 10 améliorations (`score-vente-amelioration-pre-build.md`) | ⚠️ 6/10 améliorations DÉJÀ faisables grâce à briques Phase 13/14/15 |

## Conflit de numérotation à résoudre IMMÉDIATEMENT

| Phase | Mon intitulé (doc) | Intitulé livré (code) |
|-------|---------------------|----------------------|
| **12** | Score Vente Agences Immo (design + pre-mortem) | **Export XML ADEME** (livré en prod) |

**Décision recommandée** :

1. **Renommer mes pages wiki** :
   - `score-vente-agences.md` : Phase 12 → **Phase 16**
   - `score-vente-amelioration-pre-build.md` : Phase 12.0-PRE-MORTEM → **Phase 16.0-PRE-MORTEM**
2. **Mettre à jour les en-têtes + statuts** de ces 2 pages
3. **Mettre à jour `index.md`** (libellés Phase 12 → Phase 16)
4. **Le log.md reste antéchrono inchangé** (les entrées historiques gardent leur libellé d'origine)

**Justification** : Phase 15 = dernière livrée. Phase 16 = prochaine libre. Pas d'autre numéro disponible sans renumérotation rétrospective hasardeuse.

## Réutilisation massive — 60 % du pre-mortem est DÉJÀ livré

L'aspect le plus important de cet audit : mon pre-mortem Phase 12 (score vente) contenait 10 améliorations critiques. Avec ce qui a été livré ces dernières heures, **6 d'entre elles sont déjà partiellement ou totalement implémentées** sous une autre forme :

| # | Amélioration pre-mortem | Brique livrée réutilisable | Effort restant pour agences immo |
|---|--------------------------|---------------------------|----------------------------------|
| 1 | Lead actionnable (courrier "Au propriétaire") | ✅ **Phase 13** générateur IA courrier (Claude Opus 4.7) | Adapter prompt template segment vente (3-4h vs 8h initial) |
| 2 | Précision démontrée (dashboard transparence) | ✅ **Phase 14** dashboard analytique (recharts + funnel + KPIs) | Dupliquer pour persona agence (4h vs 12h initial) |
| 3 | Timing temps réel (bulk + push) | ✅ **Phase 13.3** bulk top 50 courriers + JSZip | Réutilisable directement (1h vs 15h initial) |
| 4 | Outillage agence (PDF tournée + scripts) | 🟡 **Phase 13** PDF + EF Claude existent. Manque : TSP solver tournée + scripts segment vente | 8h pour TSP + scripts vente (vs 25h initial) |
| 5 | Effet réseau Bretagne (anti-doublon) | ❌ Non couvert | 10h (inchangé) |
| 6 | Pricing révisé Stripe | ✅ **Phase 15** Stripe SaaS complet (checkout, webhook HMAC, portal, quota SQL atomique) | Dupliquer table `brh_agence_subscriptions` + reconfigurer paliers (3h vs 5h+25h initial) — **mentionné explicitement comme phase suivante dans Phase 15 décisions** |
| 7 | Funnel acquisition agences | ❌ Non couvert | 30h (inchangé, business-side) |
| 8 | Compliance Hoguet + DPIA RGPD | ❌ Non couvert | 40h + 1500€ (inchangé, BLOQUE LAUNCH LÉGAL) |
| 9 | Algo enrichi (saisonnalité, Bayes) | ❌ Non couvert | 12h (inchangé) |
| 10 | North Star + AARRR | ✅ **Phase 14** KPIs cards + funnel d'activation 6 étapes | Dupliquer pour persona agence (3h vs 8h initial) |

**Effort total Phase 16 score vente RÉVISÉ** :
- Plan initial : ~205h dev + 1500€ avocat
- Plan révisé après réutilisation Phase 11/13/14/15 : **~110h dev + 1500€ avocat** (gain ~50 %)

**Justification du gain** : les patterns architecturaux livrés (EF Claude direct, prompt caching, PDF jsPDF, recharts dashboard, Stripe quota SQL atomique, JSZip bulk client-side) sont **réutilisables tels quels** pour le persona agence immo en changeant le ciblage métier.

## État réel Phase 11 — où en sommes-nous

### Tiers livrés ✅

- **Tier 1** (Phase 11.1 + 11.1.1 + 11.1.2) : 1909 IRIS BZH + 1202 communes BZH + Enedis + GRDF + Géorisques + Filosofi 2020 + Recensement 2020 + RGE ADEME + Pyris IRIS lookup + 11 modules TS + score-v2 + EF enrich-prospect
- **Tier 2** (Phase 11.2 + 11.2.1) : DVF + page Pro `/pro/prospects-bretagne` + script enrich-dvf-bretagne + 16 tests Vitest

### Tiers restants (selon plan `external-data-sources.md` initial)

- 🟡 **Tier 2 partiel** : ANIL Bretagne 84 aides locales (table `brh_ext_aides_anil` créée mais scraper non livré)
- ❌ **Tier 2 reste** : `insee-recensement.ts` détaillé par IRIS, `sitadel2.ts` effet voisinage chantiers
- ❌ **Tier 3 régional Bretagne** : DPE Rennes Métropole enrichi, PLUi RM, Datarmor, RS Bretagne, cadastres solaires
- ❌ **Tier 4 technique avancé** : LiDAR HD, BD TOPO, Audit ADEME, Météo-France DJU, SPR

### Distribution réelle prospects scorés

D'après log.md Phase 11.2.1 : sur 1000 prospects scorés v2 dans les tests live, **998 cold + 2 standard + 0 ultra-chaud**. Pourquoi ?

- DVF enrichi sur **10 communes Finistère seulement** (vs 1208 communes BZH cible) → règle #1 (+35 pts) très peu déclenchée
- Enedis adresse **non encore enrichi** → règle #3 (+15 pts) jamais déclenchée

**Action concrète immédiate restante** (mentionnée par Phase 11.2.1 elle-même) :
```bash
# Doit être lancé par Philippe (~30 min)
npx tsx scripts/external/enrich-dvf-bretagne.ts   # 1208 communes × 3 années
npx tsx scripts/external/batch-score-v2-all.ts    # 59k prospects rescoring
```

## Recommandation de re-priorisation

### Priorité 1 — Activation complète scoring v2 (J+1, 30 min user-side)

Lancer les 2 scripts ops déjà livrés (Phase 11.2.1) pour activer la valeur sur 59k prospects. **Sans ça, le dashboard Phase 14 et la carte Phase 13.5 affichent des données incomplètes.**

### Priorité 2 — Finir Tier 2 (J+5, ~15h)

- Scraper ANIL Bretagne 84 aides locales (table `brh_ext_aides_anil` déjà créée)
- Module `insee-recensement.ts` détaillé
- Module `sitadel2.ts` effet voisinage

### Priorité 3 — Compliance Phase 16 (J+30, 50h + 1500€) — **PRÉ-REQUIS LÉGAL**

Avant tout code Score Vente Agences :
1. DPIA RGPD signé par DPO BRH
2. Avis avocat Hoguet (1500€ one-shot)
3. Page opt-out publique sur renovation-brh.fr
4. Charte éthique partenariat draftée
5. Templates info préalable SCI 30j relus

### Priorité 4 — Phase 16 Score Vente Agences (J+45, ~110h dev) — **planning révisé**

Avec réutilisation maximale des briques 11/13/14/15 :

| Phase 16.x | Intitulé | Effort révisé | Dépend de |
|-----------|----------|--------------|-----------|
| 16.0 | Cadrage business + DPIA + Hoguet | 50h + 1500€ | — |
| 16.1 | Algo `score-vente-v1` + 13 règles + table `brh_agence_*` | 25h | Phase 11.1+11.2 ✅ |
| 16.2 | Adaptation générateur courrier IA pour persona agence (template "Au propriétaire") | 4h | Phase 13 ✅ |
| 16.3 | Bulk leads agence (réutilisation pattern bulk Phase 13.3) | 1h | Phase 13.3 ✅ |
| 16.4 | Dashboard agence (clone Phase 14 avec KPIs vente) | 4h | Phase 14 ✅ |
| 16.5 | Stripe agences (clone Phase 15 + paliers 0/390/990/2490€) | 3h | Phase 15 ✅ |
| 16.6 | TSP solver tournée + scripts vente IA segment | 8h | Phase 13 ✅ |
| 16.7 | Anti-doublon 90j + crowdsourcing inter-agences | 10h | Tier 2 ✅ |
| 16.8 | Funnel acquisition agences (parallèle business) | 30h sur 3 mois | Indépendant |
| 16.9 | Algo enrichi (saisonnalité, Bayes) | 12h | Phase 11.1 ✅ |
| 16.10 | Flywheel data acquéreur F/G | 15h | Phase 16.1 |
| 16.11 (T+12 mois) | Bascule prédictive XGBoost | conditionné ≥5 agences | — |

### Priorité 5 — Tiers 3 + 4 différés (post-Phase 16, J+90+)

- Tier 3 régional (DPE RM, PLUi RM, RS Bretagne, cadastres solaires) — accélère Rennes Métropole
- Tier 4 technique (LiDAR, BD TOPO, Météo-France DJU) — USP technique vs Kelvin

## Mises à jour wiki à exécuter

### Pages à modifier

- [x] `audit-retard-phases-mai-2026.md` — créée (cette page)
- [ ] `score-vente-agences.md` — renommer "Phase 12" → "Phase 16" dans header + sections + statut
- [ ] `score-vente-amelioration-pre-build.md` — renommer "Phase 12" → "Phase 16" + ajouter section "Réutilisation Phase 13/14/15"
- [ ] `index.md` — corriger libellés Phase 12 → Phase 16 dans les 2 entrées concernées
- [x] `log.md` — entrée d'audit ajoutée

### Pages à mettre à jour (par les phases livrées, pas par moi)

- `data-model.md` : 79 → 83 tables (passage 11.1 + 11.2 + 12 + 13 + 15)
- `architecture-snapshot.md` : routes + pages Pro (passage de 17 → 21+)
- `edge-functions-reference.md` : 11 → 19 EF (déjà en partie fait par Phase 15)
- `external-data-sources.md` : marquer Tier 1 + Tier 2 ✅ livrés

## Leçons à retenir

1. **Vérifier l'état du wiki AVANT chaque session** : log.md antéchrono est la photo en temps réel. Mes 4 entrées documentaires Phase 11.0-AUDIT, 12.0-DESIGN, 12.0-PRE-MORTEM ont été insérées pendant que d'autres agents livraient du code en parallèle.
2. **Conflit de numérotation = symptôme de désynchronisation** : Phase 12 = mon design ET XML ADEME. À éviter via lecture log.md systématique.
3. **Le pre-mortem reste valable mais doit être contextualisé** : 60 % de mes 10 améliorations sont déjà partiellement résolues par les phases parallèles. Le pre-mortem garde sa valeur en tant que checklist commerciale, pas en tant que plan de dev.
4. **Privilégier la réutilisation** : Phase 16 pourra livrer ~50 % plus vite grâce aux briques Phase 13/14/15.

## Conformité aux 14 règles BRH (CLAUDE.md)

(Audit documentaire, aucun code modifié, règles applicables = mise à jour wiki + log.md format)

## Statut d'implémentation

- ✅ Audit retard 2026-05-02 : cette page
- ❌ Renumérotation Phase 12 → Phase 16 : à exécuter (action triviale)
- ❌ Re-priorisation : à valider par Philippe avant action

## Mises à jour de cette page

- **2026-05-02** : Création — audit retard + recommandations re-priorisation
