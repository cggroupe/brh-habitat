# Plan de refonte BRH — 21/05/2026

> **Statut** : 🟡 PROPOSITION — en attente GO Philippe phase par phase
> **Rédacteur** : Claude Opus 4.7 · **Commanditaire** : Philippe Gagnon
> **Compagnon de** : [bugs-and-data-strategy-2026-05-21.md](bugs-and-data-strategy-2026-05-21.md)

---

## 1. Contexte (ce que Philippe a demandé le 21/05)

Cinq axes formulés en vocal :

| # | Axe | Public visible | Cœur du besoin |
|---|-----|----------------|----------------|
| **P-A** | Fiche client BRH enrichie | Employé BRH seul | Travaux réalisés + contact + cross adresse↔DPE↔permis↔BDNB. Match strict num+rue+CP. Détecter cas "client locataire d'une SCI". |
| **P-B** | Fiche lead/prospect | Agences immo + pros BTP | Toutes adresses DPE (pas que F/G), toutes infos DPE, cross permis/BDNB/DVF/Sirene. **Zéro PII** côté public. |
| **P-C** | Fiche SCI "second cerveau" | Mixte | Dirigeants + leurs autres entreprises (commerce, artisanat) → contact via tel pro de la boulangerie. + BODACC liquidation/cession. **Tout sur une seule fiche.** |
| **P-D** | UX onglet "Mes leads" | Pros/agences | Chargement lent, segments incompréhensibles (ultra-chaud/MPR/prio/std/froid), score non expliqué, DPE figé F/G, "têtes de mort" résiduelles dans succession. |
| **P-E** | Ménage wiki | Tous | Tout ranger/classer dans wiki Karpathy BRH. Ménage autorisé. |

**Mapping vs axes initiaux Claude** (sauvegardés dans memory `brh-axes-travail-2026-05-21.md`) :

| Axe Philippe | Axes Claude initiaux |
|--------------|----------------------|
| P-A | Nouveau + B8 |
| P-B | Axe 3 + B8 |
| P-C | Axe 2 (Pappers P1) + B7 |
| P-D | Axe 1 (B6 + UX filtres) |
| P-E | Axe 4 |

**B9 (perf RPC dirigeants)** : non explicite dans tes axes mais bloquant pour P-D — à traiter en Phase 2.

---

## 2. État du repo (au 21/05 17h)

- HEAD = `8741c83` · 3 commits locaux **non pushés** (`1bcd4e7` formatage FR, `7f4b724` DPE éditable, `8741c83` wiki).
- 37 migrations 2026-05-* livrées, 6 RPC opérationnels, 1 manquant (`brh_dirigeants_search`).
- 39 pages wiki, dont 3-4 doublons identifiés à fusionner.

---

## 3. Phases (ordre proposé)

### PHASE 0 — Audit & ménage wiki (1 jour, zéro code)

**Objectif** : fusionner les doublons, créer 3 pages "hub" entité-pivot, archiver les pages obsolètes.

**Doublons détectés (à fusionner)**
- [data-coverage.md](data-coverage.md) + [osint-enrichment-registry.md](osint-enrichment-registry.md) + [bugs-and-data-strategy-2026-05-21.md](bugs-and-data-strategy-2026-05-21.md) → **3 pages parlent du même inventaire `brh_*` avec >70% overlap**. Cible : 1 page canonique `data-inventory.md` + une `bugs-ouverts.md` séparée.
- [entity-graph.md](entity-graph.md) recoupe la section "Pivots OSINT" de bugs-and-data-strategy → renvoi croisé suffit, pas de fusion.
- [reseau-social-blueprint.md](reseau-social-blueprint.md) marqué "PAUSE" → ranger sous `archive/` avec note de pause.

**Pages "hub" à créer**

| Hub | Rôle | Absorbe / remplace |
|-----|------|--------------------|
| [hub-client-brh.md](hub-client-brh.md) (à créer) | Fiche client employé BRH : travaux + contact + cross adresse + détection locataire SCI | Sections client de osint-enrichment + employe-portal-status |
| [hub-lead-public.md](hub-lead-public.md) (à créer) | Lead public agence/pro : adresse DPE complète, pas de PII | Sections leads de [agence-lead-economy.md](agence-lead-economy.md) + [fiches-drill-down.md](fiches-drill-down.md) |
| [hub-sci-dirigeant.md](hub-sci-dirigeant.md) (à créer) | SCI + dirigeants + autres entreprises + BODACC + succession (second cerveau) | Sections SCI de bugs-and-data-strategy + entity-graph |
| [matching-adresse.md](matching-adresse.md) (à créer) | Règle stricte num+rue+CP normalisé, référencée par les 3 hubs | (nouvelle) |

**Livrables Phase 0**
1. Page `data-inventory.md` (fusion) — inventaire `brh_*` unique avec rows réels
2. Page `bugs-ouverts.md` (extrait) — liste B6/B7/B8/B9 + suivi statut
3. 4 nouvelles pages "hub" (squelettes vides avec sommaire et liens — contenu rempli Phases 1-4)
4. [index.md](index.md) restructuré : section "Hubs entité-pivot" + section "État live" + section "Archive"
5. Entrée [log.md](log.md) "Ménage wiki 21/05"

**Charge** : ~3-4h Claude · **Risque** : Low · **Dépendances** : aucune

---

### PHASE 1 — Spec matching adresse + audit data (1 jour, zéro code prod)

**Objectif** : spec sans ambiguïté de la règle de match strict + audit volumétrique avant tout dev.

**Sous-livrables**

1. **`matching-adresse.md`** : règle complète
   - Normalisation : casse → lower, accents → ASCII, espaces multiples → 1, abréviations (rue/r, avenue/av, boulevard/bd, place/pl), virgules ignorées
   - Clé finale = `(numero TEXT, voie_norm TEXT, code_postal CHAR(5))`
   - Stratégie indice : index composite `(code_postal, voie_norm, numero)` sur chaque table cible
   - Tables cibles : `brh_dpe_prospects`, `brh_dvf_archive`, `brh_permis_construire`, `brh_bdnb_*` (à créer), `brh_personnes_historique`, `brh_sci_companies` (siège)
   - Cas ambigus listés : "14bis", "14 ter", "14 A", lieu-dit sans num → choix de fallback documenté

2. **Audit psql volumétrique** sur les 4 dépts bretons (22/29/35/44/56)
   - Combien de clients BRH par dépt ? combien avec adresse exploitable ?
   - Combien de matches DPE / permis / BDNB / DVF / Sirene par adresse sur échantillon 1000 ?
   - Combien de clients sont locataires (adresse rattachée à SCI dont ils ne sont pas dirigeant) ?
   - Output : `data-inventory.md` enrichi d'une section "Taux de couverture par dépt"

3. **Inventaire fichiers source 22/29/35/44/56** (Philippe les a transmis — à localiser sur le VPS)

**Charge** : ~4h · **Risque** : Medium (volumétrie inconnue avant audit) · **Dépendances** : Phase 0

---

### PHASE 2 — Fiche SCI "second cerveau" + fix perf B9 (3-4 jours)

**Objectif** : refondre la fiche SCI/dirigeant + activer le pivot "autres entreprises du dirigeant" + fixer le timeout RPC.

**Sous-livrables**

1. **Fix perf B9** (bloquant)
   - Migration : table de liaison `brh_dirigeant_sci(dirigeant_id, siren, departement)` indexée `(departement, siren)` + `(dirigeant_id)`
   - Backfill depuis `brh_sci_companies.dirigeants JSONB`
   - Réécriture RPC `brh_dirigeants_search` avec JOIN au lieu de `EXISTS jsonb_array_elements`
   - Critère succès : <500ms sur dept + 3 filtres combinés

2. **Pivot dirigeant → autres entreprises**
   - **Décision Pappers ou alternative gratuite** ⚠️ (cf Décision D-2 §5)
   - Migration : colonne `autres_entreprises JSONB` sur `brh_dirigeants` + colonne `tel_pro_via_entreprise`, `email_pro_via_entreprise`
   - Batch d'enrichissement (script Node) : 17 403 dirigeants propriétaires DPE priorisés
   - Cross BODACC : flag `has_bodacc_alert_other_company BOOLEAN` (cession/liquidation détectée sur une de ses autres entreprises)

3. **Refonte UI [EmployeDirigeantDetail.tsx](src/pages/employe/EmployeDirigeantDetail.tsx) + [FicheEntrepriseView.tsx](src/components/leads/fiche/FicheEntrepriseView.tsx)**
   - Single-page, zéro onglet : 6 blocs empilés (Identité / Patrimoine SCI / Autres entreprises / Contacts pro déduits / BODACC / Décès & succession)
   - Mini-carte des biens (DVF + DPE) via composant carte déjà existant
   - Badge "Tel pro via Boulangerie Dupont (autre société du dirigeant)" sur chaque contact dérivé

4. **Page wiki `hub-sci-dirigeant.md`** complétée (le squelette créé en Phase 0)

**Charge** : ~16-20h (4-5 jours rythme Claude+Philippe) · **Risque** : Medium (coût Pappers + qualité dédoublonnage) · **Dépendances** : Phase 1 (matching), Phase 0 (hub)

---

### PHASE 3 — Fiche client BRH employé (2 jours)

**Objectif** : enrichir [EmployeClientBrhDetail.tsx](src/pages/employe/EmployeClientBrhDetail.tsx) avec cross adresse + détection locataire.

**Sous-livrables**

1. **RPC `brh_client_360`** (nouveau) : aggrégate sur 1 client_id → contact + travaux observés + DPE rattaché à son adresse (via matching strict Phase 1) + permis + BDNB + détection "locataire SCI"
2. **Section UI "Foncier"** dans fiche client : tableau DPE / permis / BDNB à l'adresse, avec badge "🔒 Vous êtes locataire (propriétaire = SCI X)" si cas
3. **Import fichiers 22/29/35/44/56** dans `brh_personnes_historique` ou nouvelle table `brh_clients_brh_canonical` selon état actuel (à décider Phase 0/1)
4. **Page wiki `hub-client-brh.md`** complétée

**Charge** : ~10h · **Risque** : Low · **Dépendances** : Phase 1 (matching), Phase 0 (hub)

---

### PHASE 4 — Fiche lead public + UX filtres "Mes leads" (3 jours)

**Objectif** : rendre l'onglet `/agence/leads-v2` et `/employe/leads-v2` lisibles et performants, étendre les filtres DPE.

**Sous-livrables**

1. **Refonte filtres** dans [UnifiedLeadsView.tsx](src/components/leads/UnifiedLeadsView.tsx) (lignes 45-76)
   - Renommer segments avec tooltip explicatif (ultra-chaud→"Travaux probables <6 mois", MPR bleu→"Éligible MaPrimeRénov' tranche bleu", prio→"Score >70", standard→"Score 40-70", froid→"Score <40")
   - Ouvrir filtre DPE : F, G, E sélectionnables (multi-select) au lieu du toggle binaire "passeport thermique"
   - Activer filtre "Délai mutation DVF" (12m / 24m / 36m / 60m) — déjà visible mais non sélectionnable
   - Tooltip score : popover avec formule en 3 lignes
2. **Bug têtes de mort** ☠️/💀 dans "succession en cours"
   - **Note** : grep ☠/💀 dans `src/` = **0 occurrence**. Source probable : icône Lucide `Skull`, ou caractère UTF-8 alternatif (✝, ⚰), ou rendu côté Postgres dans une vue. **À localiser en début de phase**.
3. **Refonte UI** [FicheAdresseView.tsx](src/components/leads/fiche/FicheAdresseView.tsx) pour P-B (toutes infos DPE + cross sans PII)
4. **Perf** : audit React Query staleTime + pagination cursor sur `unified_leads`
5. **Page wiki `hub-lead-public.md`** complétée + section "Spec filtres" autonome

**Charge** : ~12-15h · **Risque** : Low · **Dépendances** : Phase 2 (B9), Phase 0 (hub)

---

### PHASE 5 — QA + push prod (1 jour)

**Objectif** : valider end-to-end les 4 phases, pusher les 3 commits en attente + tous les nouveaux.

**Sous-livrables**
1. Checklist test par phase (1 user employé + 1 user agence + 1 user pro BTP)
2. Vérification RLS sur fiches client BRH (côté agence/pro ne voit pas PII)
3. Build prod (`npm run build` strict — cf [feedback_tsc_strict_before_push.md](memory))
4. Push branche + déploiement Vercel preview → validation Philippe
5. Merge main → prod
6. Update `log.md` final + `architecture-snapshot.md` (nouveau count routes/tables)

**Charge** : ~4h · **Risque** : Medium (regressions UI possibles) · **Dépendances** : Phases 0-4

---

## 4. Récap charge totale & calendrier

| Phase | Charge | Durée calendaire (rythme Claude solo) |
|-------|--------|---------------------------------------|
| 0 — Wiki | 3-4h | Jour 1 matin |
| 1 — Spec matching + audit | ~4h | Jour 1 après-midi |
| 2 — Fiche SCI + B9 | 16-20h | Jours 2-4 |
| 3 — Fiche client BRH | ~10h | Jours 5-6 |
| 4 — Fiche lead + filtres | 12-15h | Jours 6-8 |
| 5 — QA + push | ~4h | Jour 9 |
| **TOTAL** | **~50-57h** | **~9 jours** |

---

## 5. Décisions à prendre AVANT démarrage (GO/NO-GO Philippe)

| # | Décision | Options | Recommandation |
|---|----------|---------|----------------|
| **D-1** | Fusionner data-coverage / osint-enrichment / bugs-strategy en 1 page `data-inventory.md` ? | (a) Fusion totale (b) Garder 3 pages avec note "ne pas modifier l'un sans l'autre" (c) Archiver les 2 anciennes | (a) Fusion |
| **D-2** | Source contact via "autres entreprises du dirigeant" | (a) Pappers API 49€/mois (paid, qualité haute, 17k dirigeants en 1 mois) (b) Sirene/Annuaire-entreprises gratuit + scraping limité 10/mois (c) Mix : 200 prio via Pappers + scale gratuit | (c) Mix — Philippe a déjà DeHashed Pro |
| **D-3** | Permettre DPE E sélectionnable dans filtres | (a) Oui ouvert E + F + G (b) Oui ouvert tous (A-G) (c) Garder F/G uniquement | (a) E + F + G (justifie l'investissement travaux) |
| **D-4** | Faut-il créer `brh_clients_brh_canonical` séparé de `brh_personnes_historique` ? | (a) Nouvelle table dédiée (b) Flag `is_client_canonical BOOLEAN` sur existant (c) Vue matérialisée | (b) Flag — moins de duplication |
| **D-5** | Push des 3 commits en attente avant de démarrer le reste ? | (a) Push maintenant (b) Attendre la fin de toutes les phases | (a) Push maintenant — base saine pour la suite |

---

## 6. Risques transverses

- **Coût** : Pappers 49€/mois confirmé budget OK. Si scale agressif >100k req/mois → coût peut grimper.
- **RLS** : exposer PII employé BRH côté agence est un risque RGPD bloquant — tests Phase 5 obligatoires.
- **Perf** : 80 844 dirigeants + 36 491 SCI + 59 306 DPE → toute jointure full-scan = mort. Tout passage prod nécessite EXPLAIN ANALYZE.
- **Régression filtres** : `UnifiedLeadsView.tsx` est partagé `/agence/leads-v2` et `/employe/leads-v2` — toucher l'un casse l'autre.

---

## 7. Glossaire (rappels Philippe)

- **DPE F/G** = passoires thermiques (interdites location nue depuis 2025 G, 2028 F)
- **MPR** = MaPrimeRénov' (subvention rénovation énergétique)
- **MPR bleu** = tranche modeste (revenus les plus bas, aides max)
- **SCI** = Société Civile Immobilière (entité passive, ne donne pas de tel/email pro public)
- **BODACC** = Bulletin Officiel des Annonces Civiles et Commerciales (radiations, liquidations, cessions fonds)
- **DVF** = Demandes de Valeurs Foncières (mutations immobilières publiées par DGFiP)
- **BDNB** = Base de Données Nationale des Bâtiments (CSTB) — typologie bâti
- **BAN** = Base Adresse Nationale
- **second cerveau** = un clic SCI affiche tout (dirigeants, autres entreprises, BODACC, DPE, héritiers), zéro onglet perdu

---

**Dernière maj** : 2026-05-21 — Claude Opus 4.7
**Prochaine action** : Philippe valide les 5 décisions D-1 à D-5, puis GO Phase 0
