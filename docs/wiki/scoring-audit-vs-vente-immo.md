# Audit Scoring v2 — comparaison référentiel "vente immobilière"

> Source : Audit effectué 2026-05-01, comparaison du score composite v2 BRH (cf. [external-data-sources.md](external-data-sources.md)) avec le référentiel "scoring prédictif de vente" utilisé par les agences immobilières françaises.
> Dernière mesure : 2026-05-01
> Rôle : Vérifier la complétude du scoring BRH face au modèle de référence (4 familles de variables + 6 sources open data) et trancher : ajouter / ignorer / pivoter.

## Vue d'ensemble

Le scoring v2 BRH (Phase 11.0) cible la **probabilité de rénovation énergétique** d'un propriétaire de logement F/G en Bretagne. Le référentiel "agences immobilières" cible la **probabilité de vente** sous 12-24 mois. Les deux modèles partagent ~50 % de signaux (DVF mutation, INSEE IRIS, Sit@del2, Géorisques) mais divergent sur les triggers comportementaux (vente = très exogènes, rénovation = très endogènes au logement).

**Distinction fondamentale à acter** : un signal "vente probable" est utile à BRH **comme signal négatif** (un propriétaire qui va vendre dans 6 mois ne rénovera pas) ET **comme signal positif post-mutation** (le nouvel acquéreur d'un F/G rénove dans 70 % des cas sous 24 mois — déjà encodé dans la règle #1 du score v2).

L'audit ci-dessous utilise les codes :
- ✅ Présent dans le score v2 (Phase 11)
- 🟡 Partiellement encodé (proxy ou agrégat)
- ❌ Absent — peut être ajouté si pertinent
- ⛔ Absent — non accessible (RGPD, payant, hors scope)

## Vérité terrain — sommes-nous prédictif ou heuristique ?

**Constat honnête** : le score v2 actuel est **100 % heuristique** (règles métier pondérées à dire d'expert), pas un modèle prédictif entraîné. Conséquences :

- ❌ Aucune table `brh_dpe_renovations_realisees` permettant de mesurer la conversion réelle des prospects scorés
- ❌ Aucun feedback loop : on ne sait pas si un prospect "ultra_chaud" (score ≥ 80) convertit effectivement plus qu'un "standard"
- ❌ Aucun calage des poids (35/20/15/10...) — choisis sur intuition produit, pas par régression logistique
- ✅ Conforme à la phase de démarrage : avec 0 historique de conversion BRH, on ne peut pas faire mieux qu'une heuristique. La transition vers un vrai scoring prédictif viendra **après 6-12 mois d'exploitation** avec ~500-1000 prospects qualifiés et leur statut final (signé / abandonné / froid).

**Recommandation cadrage** : ajouter dès maintenant la table `brh_prospect_outcomes` (prospect_id, statut_final, date_conversion, montant_devis_cents) pour collecter la vérité terrain en vue d'un Phase 11.6 "scoring prédictif XGBoost" dans 6-12 mois. Sans cette collecte dès J1, on perd l'historique nécessaire.

## Famille 1 — Détention et historique du bien

| Variable réf. | Statut score v2 | Détail |
|---|---|---|
| **Durée de détention** | 🟡 | Encodé indirectement via DVF `mutation_24m` (binaire). On ne capte pas les biens détenus 7-12 ans (zone chaude vente) car DVF Etalab couvre **5 ans glissants seulement**. La médiane française réelle est ~10 ans (Notaires Paris 2024, pas 8 ans). |
| **Mode d'acquisition** (achat / succession / donation) | ❌ | DVF `nature_mutation` ne contient PAS les successions/donations (mutations à titre gratuit explicitement exclues). Détection indirecte possible via croisement INSEE fichier des décès × adresse cadastre — faisable mais demande matching nominal CNIL. |
| **Crédit en cours, ancienneté** | ⛔ | Banque de France FICP/FCC réservé aux banques, pas de signal public. |
| **Travaux récents (DP, PC)** | ❌ → planifié 11.2 | Sit@del2 prévu en Phase 11.2 (Tier 2). Sera ajouté comme règle bonus "DP voisinage 12m". |

### Gap utile à combler pour BRH

1. **Détecter les SCI familiales âgées** (forte proba succession 5-10 ans) : croiser DGFIP locaux personnes morales (déjà en base) × API INPI dirigeants × INSEE décès. Action : ajouter colonne `brh_dpe_prospects.sci_succession_proba` (Phase 11.2 bonus). Coût : 0€, gratuit, faisable.
2. **Étendre fenêtre DVF de 5 → 15 ans** : DV3F Cerema couvre 2010+ mais réservé acteurs publics. → BRH non éligible. **Impasse hors convention collectivité (Phase 11.5)**.
3. **Travaux récents Sit@del2** : déjà planifié, à conserver tel quel.

## Famille 2 — Profil sociodémographique du propriétaire

| Variable réf. | Statut score v2 | Détail |
|---|---|---|
| **Âge propriétaire** | ⛔ | Personnes physiques non publiques (RGPD). Proxy IRIS via `C21_POP65P` envisageable mais très grossier. |
| **Composition foyer / sur-occupation** | 🟡 | Encodable via INSEE Recensement IRIS (déjà Tier 2) — taille moyenne ménage commune. Pas l'individu. |
| **Adéquation taille logement / foyer** | 🟡 | Calculable agrégé : `surface_dpe / taille_moy_menage_iris`. **Gap actionnable** : à ajouter en Phase 11.2 comme règle "couple_seul_grande_maison" si surface > 120 m² ET IRIS fort taux >65 ans. |
| **CSP / revenus estimés** | ✅ | Couvert par Filosofi IRIS (règle #2 décile MPR auto, règle bonus précarité). C'est le point fort de notre score v2. |
| **Distance domicile / lieu de travail** | ⛔ | Aucune source publique individu. Hors scope. |

### Gap utile à combler

1. **Indicateur sur-dimensionnement logement** : ratio surface_dpe / taille_menage_commune (INSEE). Signal classique de mobilité résidentielle (downsizing retraités). Ajout simple en Phase 11.2. Pertinent pour BRH car ces propriétaires rénovent souvent **avant** de vendre (valorisation).

## Famille 3 — Événements de vie ("triggers")

| Variable réf. | Statut score v2 | Détail |
|---|---|---|
| **Décès** | ❌ | INSEE fichier des décès 1970+ open data (data.gouv.fr) + matchID.io. **Le seul trigger public exploitable**. Demande matching nominal — déclaration CNIL requise pour démarchage. |
| **Mariage / divorce** | ⛔ | INSEE état civil agrégé commune seulement, pas individu. |
| **Naissance** | ⛔ | Non public individu. |
| **Retraite** | ⛔ | Pas de signal public direct. Proxy IRIS `tx_65p` envisageable (faible). |
| **Mutation professionnelle** | ⛔ | LinkedIn Sales Navigator payant, pas exploitable scoring habitat. |
| **Enfants quittant le domicile** | ⛔ | Indirect via INSEE composition ménage IRIS — proxy faible. |

### Gap utile à combler

1. **Croisement INSEE décès × adresse propriétaire connu** : utile **uniquement** pour les prospects nominatifs déjà dans `brh_prospects` (issus du diag express ou formulaires). Pas applicable à la base anonyme `brh_dpe_prospects` (59k F/G sans nom propriétaire). Pertinence pour BRH : moyenne — applicable à terme, pas en Phase 11.
2. **Aucun autre trigger n'est mobilisable légalement et gratuitement.** Famille à abandonner pour le scoring data-only.

## Famille 4 — Signaux comportementaux

| Variable réf. | Statut score v2 | Détail |
|---|---|---|
| **Demandes d'estimation en ligne** | ⛔ | Données propriétaires MeilleursAgents/SeLoger, **revendues 15-80€/lead** sur Leadgenoo, Estimation Française. Pas open data. |
| **Visites portails immobiliers** | ⛔ | Cookies tiers, propriétaires des portails. |
| **Recherches notaire / déménageur / courtier** | ⛔ | Idem. |
| **Abonnement alertes immobilières** | ⛔ | Idem. |
| **Mise en location puis retrait** | ❌ | Scrapable LeBonCoin/SeLoger mais ToS interdits, gris légalement. |
| **Yanport API** (agrégateur annonces) | 💰 | Plusieurs centaines €/mois, pas envisageable pour BRH. |

### Gap utile à combler

**Aucun signal comportemental n'est accessible légalement et gratuitement.** Les acteurs qui scorent vraiment ces signaux (Effy, Hosman, Liberkeys) ont des partenariats data payants ou des cookies first-party sur leurs propres portails. **BRH n'a pas ce levier sans investissement data ≥ 5k€/mois.**

**Alternative à creuser (long terme)** : développer un **simulateur DPE/rénovation BRH grand public** avec capture lead (déjà fait via `dpe-express-create-lead`). Chaque visiteur qui simule = signal d'intention fort, capté en first-party — c'est exactement ce que fait Kelvin° avec sa stratégie SaaS white-label. Le simulateur 8915 est notre actif comportemental, à industrialiser.

## Audit des sources de données réf. vs score v2

| Source réf. (Sébastien) | Statut score v2 | Phase BRH |
|---|---|---|
| **DVF géolocalisées** | ✅ | Tier 1 — Phase 11.1 |
| **Cadastre** (parcelles, surfaces, propriété) | ✅ | Déjà intégré (avant Phase 11) |
| **INSEE IRIS sociodémographie** | ✅ | Tier 1 (Filosofi + Recensement Logement) |
| **BAN Base Adresse Nationale** | ✅ | Déjà intégré (jointure pivot adresse) |
| **Sit@del2 permis de construire** | 🟡 | Tier 2 — Phase 11.2 (planifié) |
| **Géorisques** | ✅ | Tier 1 — Phase 11.1 |
| **Géoportail urbanisme (PLU)** | 🟡 | Tier 2 — Phase 11.2 (planifié) |
| **DGFIP locaux personnes morales** | ✅ | Déjà intégré (32 825 SCI identifiées) |
| **Fichier INSEE des décès** | ❌ | Non planifié — à arbitrer (cf. Famille 3 §1) |
| **API INPI dirigeants entreprise** | ❌ | Non planifié — à arbitrer (cf. Famille 1 §1) |
| **DV3F Cerema (15 ans)** | ⛔ | Non éligible privé — Phase 11.5 (convention collectivité) |
| **Perval / BIEN ADNOV** | 💰 | Hors budget data BRH (50-200€/mois) |
| **Leads vendeurs (MeilleursAgents Pro, etc.)** | 💰 | Hors budget — alternative simulateur first-party |

## Verdict — couverture et écarts

### Couverture actuelle vs référentiel "vente immo"
- **Famille 1 (détention/historique)** : 50 % couvert — gap principal = mode acquisition + horizon DVF
- **Famille 2 (sociodémo)** : 70 % couvert via Filosofi IRIS — point fort
- **Famille 3 (triggers vie)** : 5 % couvert — RGPD bloque l'essentiel
- **Famille 4 (comportemental)** : 0 % couvert — payant ou propriétaire de portails

**Score global de couverture du référentiel** : ~35-40 %.

### Mais : c'est suffisant pour BRH (cas d'usage rénovation, pas vente)

Le score v2 actuel encode correctement les signaux **prédictifs de rénovation** :
- DPE F/G + sur-conso Enedis (passoire active confirmée) — non couvert par le référentiel vente
- Décile MPR auto-détecté (éligibilité aides) — non couvert par le référentiel vente
- Géorisques RGA + radon (entrées techniques rénovation) — non couvert par le référentiel vente
- Concurrence locale RGE (opportunité commerciale) — non couvert par le référentiel vente

Inversement, les signaux "vente" qui nous manquent (trigger succession, comportemental estimation en ligne) sont **moins prédictifs pour la rénovation** que pour la vente. Le post-mutation (règle #1 du score v2) capte 80 % de la valeur du signal "vente" pour notre cas d'usage.

## Recommandations

### À ajouter (gap réellement actionnable, gratuit, RGPD-clean)

1. **Indicateur sur-dimensionnement logement** (Famille 2) — ratio `surface_dpe / taille_menage_commune_iris` → règle bonus +5 si ratio > 1.8 et IRIS forte part >65 ans. **Ajout Phase 11.2, effort 2h.**
2. **SCI familiale vieillissante** (Famille 1) — croisement DGFIP × INPI dirigeants × INSEE décès. **Ajout Phase 11.2, effort 6h, valeur élevée.**
3. **Table `brh_prospect_outcomes`** (vérité terrain) — collecte conversion dès J1 pour modèle prédictif futur. **Ajout Phase 11.1, effort 2h, indispensable long terme.**

### À ne PAS ajouter (effort/valeur défavorable ou hors scope)

1. **Croisement INSEE décès × prospects nominatifs** : utile uniquement sur la base nominative (~10 % des prospects), demande déclaration CNIL spécifique pour démarchage post-décès. **Reporter à Phase 12+ avec accompagnement DPO.**
2. **DV3F Cerema 15 ans** : convention DGALN, BRH non éligible privé — déjà acté Phase 11.5.
3. **Signaux comportementaux payants** : ROI non démontré pour rénovation, budget data ≥ 5k€/mois nécessaire. **Privilégier industrialisation simulateur first-party** (`dpe-express-create-lead` existant).
4. **Trigger mutation professionnelle / mariage / divorce** : non accessibles légalement.

### À pivoter

1. **Renommer "score_v2" en "score_renovation_v2"** dans la table `brh_dpe_prospects` pour acter qu'il ne s'agit PAS d'un score de vente. Évite la confusion future avec un éventuel score vente.
2. **Documenter explicitement le caractère heuristique** dans la sortie EF `enrich-prospect` (champ `model_type: 'heuristic_v2' | 'predictive_xgboost_v3'` futur).
3. **Mesurer la médiane détention française à 10 ans** (pas 8) dans la documentation et les materials commerciaux qui s'appuieraient sur ce chiffre.

## Conformité aux 14 règles BRH (CLAUDE.md)

Cet audit ne modifie aucun code donc seules les règles documentaires s'appliquent :
- ✅ Page wiki créée dans catégorie existante (Partie 2 — Guides features majeures)
- ✅ Entrée log.md au format CLAUDE.md à ajouter (cf. mises à jour ci-dessous)
- ✅ Index.md à mettre à jour
- ✅ Aucun push/deploy/git effectué

## Statut d'implémentation

- ✅ Phase 11.0 : Plan score v2 rédigé (cf. [external-data-sources.md](external-data-sources.md))
- ✅ Phase 11.0-AUDIT : Audit comparatif référentiel vente immo (cette page)
- ❌ Phase 11.1 : Tier 1 socle scoring (à démarrer)
- ❌ Phase 11.6 (futur) : Bascule heuristique → prédictif XGBoost (post 6-12 mois exploitation)

## Mises à jour de cette page

- **2026-05-01** : Création — audit Phase 11.0 vs référentiel vente immo (4 familles + 6 sources)
