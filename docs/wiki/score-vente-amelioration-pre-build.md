# Score Vente v1 — Améliorations Pre-Build (Pre-Mortem Phase 16)

> ⚠️ **2026-05-02 — Renommée Phase 12 → Phase 16** : conflit numérotation avec Phase 12 "Export XML ADEME" déjà livrée. **Mise à jour effort révisé** : 6/10 améliorations sont DÉJÀ partiellement résolues par les briques Phase 13 (générateur courrier IA) + 14 (dashboard analytique) + 15 (Stripe SaaS) livrées le 2026-05-01. Détails dans [audit-retard-phases-mai-2026.md](audit-retard-phases-mai-2026.md). **Effort total révisé : ~110h dev + 1500€ avocat (vs ~205h initial)**.

> Source : Pre-mortem 2026-05-01 du design [score-vente-agences.md](score-vente-agences.md), avant tout développement Phase 16.1.
> Dernière mesure : 2026-05-01
> Rôle : Identifier les angles morts du design initial et proposer 10 améliorations concrètes pour rendre le produit **véritablement rentable côté agence** (= taux renouvellement abonnement ≥ 80 % à 6 mois). L'objectif n'est pas le scoring — c'est le **cash flow de l'agence**.

## Vue d'ensemble

Le design Phase 16 livré le 2026-05-01 répond à une question technique ("comment scorer une intention de vente") mais **pas à la question commerciale** : pourquoi un agent immobilier paierait 290 €/mois plutôt qu'un boîtage à 0,01 €/flyer ? Cette page corrige ce biais en partant de la question : "Si je suis Pierre, agent immo à Lannion, qu'est-ce qui me ferait renouveler à M+3 ?"

**Constat** : le design initial est **conceptuellement correct mais commercialement incomplet**. Manquent l'outillage opérationnel (tournée optimisée, scripts), la transparence de précision (sans elle, churn à M+2), le timing temps réel (un lead "imminent" de 6 mois est mort), et l'effet réseau qui justifie le prix.

## Pre-Mortem — Qu'est-ce qui ferait churner une agence en 3 mois ?

Avant tout build, lister honnêtement les 7 raisons probables d'abandon :

| # | Raison de churn | Probabilité (sans correction) | Mitigation prévue ? |
|---|-----------------|-------------------------------|---------------------|
| 1 | "Les leads sont juste des adresses, je ne sais pas qui contacter" | **Haute** | ❌ Non prévu (RGPD bloque nom personne physique) |
| 2 | "J'ai signé 0 mandat en 3 mois, c'est de l'arnaque" | **Haute** | ❌ Aucune garantie ROI dans design initial |
| 3 | "Les leads sont vieux, le bien est déjà mandaté chez Foncia" | **Moyenne** | ❌ Aucun système anti-doublon mandat |
| 4 | "Je perds 2h à organiser ma tournée pour 5 portes" | **Moyenne** | ❌ Pas d'optimisation tournée TSP |
| 5 | "Je ne sais pas quoi dire au téléphone / à la porte" | **Haute** | ❌ Pas de scripts par segment |
| 6 | "Le propriétaire me dit 'comment vous avez eu mes coordonnées ?'" | **Haute** | ❌ Pas de page opt-out publique transparente |
| 7 | "C'est trop cher pour le volume réel actionnable" | **Moyenne** | 🟡 3 paliers prévus mais ROI non démontré |

**Verdict pré-mortem** : 5/7 risques de churn n'ont **aucune mitigation** dans le design Phase 16 initial. Sans corrections, **renouvellement estimé < 30 % à M+6** (vs cible 80 %).

## Les 10 améliorations à intégrer AVANT Phase 16.1

### Amélioration #1 — "Lead actionnable" (vs simple adresse)

**Problème** : RGPD interdit la diffusion du nom du propriétaire personne physique. Adresse seule = boîtage anonyme = taux retour 0,1 %.

**Solutions cumulables (toutes gratuites)** :

1. **Pour les SCI** (~21 419 sur 32 825 propriétaires identifiés) : nom SCI + dirigeant via API INPI publique → courrier nominatif légal
2. **Pour personnes physiques** : générer un **courrier "Au propriétaire"** nominatif sur la *boîte aux lettres* avec :
   - Mention "Votre voisin du n°X a vendu Y€ il y a 3 mois (DVF)" → légitimité immédiate
   - Estimation valeur du bien personnalisée (DVF du quartier × surface DPE) → hook financier
   - QR code "Je veux une estimation gratuite confidentielle" → captation lead
3. **Mode "tournée porte-à-porte optimisée"** : grouper les leads par micro-zone géographique (clustering DBSCAN à 200m) pour faire 20 portes en 1h vs 20 portes éclatées
4. **Fiche mobile par lead** (réutilisation pattern `prospection-map`) : photos cadastre, Street View, valeur estimée, breakdown score, segment, **bouton "appel téléphone PagesJaunes" si numéro public**

**Effort** : 8h (générateur courrier + tournée TSP solver simple). **Impact** : transforme un lead "adresse + score" en "outil de prospection clé en main".

### Amélioration #2 — Précision démontrée (vs promesse vide)

**Problème** : sans preuve de précision, l'agence churne au mois 2 ("j'ai testé 30 leads, 0 mandat"). Le design initial promet 25 % de conversion mais ne le mesure pas.

**Solutions** :

1. **Garantie ROI contractuelle** : "Si 0 mandat signé en 3 mois, abonnement remboursé". Risque BRH limité (Découverte gratuit → Standard payant uniquement si Discovery a converti).
2. **Dashboard transparence** : chaque agence voit son taux conversion vs **moyenne plateforme par segment** → effet "je suis sous-performant, je dois m'améliorer" (vs "le produit est mauvais")
3. **Score de confiance par lead** (0-100) reflétant la **complétude des signaux** disponibles. Ex: lead avec DVF + INPI + Géorisques = confiance 95. Lead avec DVF seulement = confiance 40. L'agence priorise sa tournée selon confiance × score.
4. **A/B test mensuel transparent** : 90 % leads scoring v1 + 10 % leads aléatoires (contrôle) → mesure du **lift réel** vs hasard. Publié dans dashboard agence. Si lift < 2x, BRH baisse le prix.
5. **Cohorte training mensuelle** : webinar 1h "Comment exploiter les 30 leads du mois" — taux conversion plateforme corrélé à la participation.

**Effort** : 12h (dashboard + table contrôle + workflow garantie). **Impact** : convertit le scepticisme initial en engagement long terme.

### Amélioration #3 — Timing temps réel (vs batch mensuel)

**Problème** : un lead "vente_imminente" perd 50 % de sa valeur tous les 30 jours (le propriétaire signe avec un autre, ou la fenêtre de mutation passe). Batch mensuel = anti-pattern.

**Solutions** :

1. **Refresh quotidien** des sources qui changent vite : DVF (semestriel mais à intégrer dès publication avr/oct), INSEE décès (mensuel, immédiat), Sit@del2 (mensuel)
2. **Push notification + SMS agence** dès qu'un lead `vente_imminente` apparaît dans son EPCI (pas attendre le batch hebdo)
3. **Décay automatique du score** : un lead `vente_imminente` non contacté dans les 30 jours descend à `vente_probable_18m`, puis `cold` à 90j. Force l'action.
4. **Frontière "lead frais" vs "lead vieillissant"** dans UI : badge vert <14j, jaune 14-45j, rouge >45j non contacté.
5. **Replay quotidien automatique** : à 06h, recalcul des prospects de l'EPCI agence + push email "20 nouveaux leads cette nuit, voici votre tournée du jour" (PDF imprimable + lien Google Maps optimisé).

**Effort** : 15h (cron quotidien + push notif + email PDF auto). **Impact** : transforme l'agence en **réactive** plutôt que **passive**.

### Amélioration #4 — Outillage agence > le lead lui-même

**Problème** : un lead seul est inerte. L'agence a besoin d'une **boîte à outils complète** autour de chaque lead, sinon elle reste à 0 mandat.

**Solutions (suite produit)** :

1. **Carte papier imprimable** par jour de tournée (PDF A3) avec :
   - Itinéraire optimisé TSP (~20 adresses ordonnées)
   - Photo cadastre par adresse
   - Champs notes manuscrites
   - QR code par adresse → fiche mobile
2. **Script de prospection téléphonique** par segment (pré-rempli IA ai-proxy existant) :
   - Segment `succession_imminente` → "Bonjour, je me permets de vous contacter car notre algorithme a identifié votre SCI familiale comme potentiellement concernée par un changement à venir..."
   - Segment `downsizing_actif` → "Bonjour, je suis spécialisé dans les transitions de logement pour les couples de plus de 60 ans..."
3. **Modèle courrier "Au propriétaire"** pré-rempli (réutilisation Phase 13 — générateur courrier IA déjà existant !) avec personnalisation segment
4. **Handle objections IA** (ai-proxy + Claude) : agent tape l'objection entendue → réponse suggérée
5. **Intégration calendrier** Google Calendar / iCal : bloque la tournée
6. **Mode "rapport de tournée"** : à la fin de la journée, agent saisit en 30s par adresse (`pas vu / pas intéressé / RDV pris / mandat`) → `agence-lead-feedback` EF
7. **Suite "Closing"** post-RDV : checklist mandat exclusif, calculateur honoraires, pré-rempli mandat PDF

**Effort** : 25h (PDF tournée + scripts + intégration ai-proxy + calendrier). **Impact** : différenciateur absolu vs Effidea/Drimki qui livrent juste des leads bruts.

### Amélioration #5 — Effet réseau Bretagne (la donnée que personne d'autre n'a)

**Problème** : si BRH livre les mêmes leads à 5 agences sur le même EPCI, c'est la guerre — propriétaire harcelé, agence frustrée, churn massif.

**Solutions** :

1. **Anti-doublon mandat** : avant chaque envoi, check `brh_agence_leads_envoyes` → exclure les leads déjà envoyés à une autre agence dans les 90 derniers jours. Le 1er agent à recevoir un lead a 90 jours d'exclusivité.
2. **Crowdsourcing feedback inter-agences** (anonymisé) : "Cette adresse a déjà été contactée 3x → tag `sur-prospection`, retirer de la rotation"
3. **Map "déjà mandaté ailleurs"** : agence remonte "j'ai vu un panneau Foncia" → l'adresse passe en `mandate_concurrent_actif`, retirée de toutes les rotations 6 mois
4. **Tag "DPE rénové en G→C"** : si un prospect F/G a fait un audit BRH et est passé en C, il est moins probable de vendre → retirer du score vente, ajouter à `score_renovation_v2`
5. **"Hot zones" dynamiques** : EPCI où conversion >30 % → notifier les agences voisines pour expansion de zone (revenu cross-sell BRH)

**Effort** : 10h (logique d'exclusion + table feedback). **Impact** : le SaaS devient *meilleur quand il a plus d'agences* (network effect classique). Justifie le prix premium long terme.

### Amélioration #6 — Pricing révisé avec garantie ROI

**Problème** : 290 €/30 leads = 9.7 €/lead. Concurrent Effidea = 15-80 €/lead. Le prix BRH est sous-évalué (signal qualité bas) ET sans garantie (signal arnaque potentielle).

**Solutions** :

| Palier | Quota/mois | Prix HT révisé | Garantie | Cible |
|--------|-----------|----------------|----------|-------|
| **Découverte** | 5 leads | 0 € (1 mois) | — | Démo / test |
| **Standard** | 20 leads + carte tournée + scripts IA | **390 €** | Remboursé si 0 mandat à M+3 | Agent indé |
| **Premium** | 60 leads + tout Standard + API + multi-utilisateurs | **990 €** | Idem + 5 leads bonus si 0 conv. M+3 | Agence multi-collab |
| **Réseau** (NEW) | 200 leads + multi-EPCI + white-label | **2 490 €** | Idem | Réseau franchisé (ORPI, Plaza, Laforêt) |

**Justification** : 1 mandat moyen breton = 8 000-12 000 € de commission. Si Standard convertit 1 mandat = 20x ROI mensuel. Le prix peut monter sans frein si la garantie tient.

**Pré-vente** : démo gratuite 5 leads sans engagement avec breakdown complet → si 1 mandat signé, conversion Standard immédiate.

**Effort** : 5h (révision Stripe paliers + workflow garantie). **Impact** : double le revenu unitaire et triple la confiance perçue.

### Amélioration #7 — Funnel acquisition agences (comment vendre le produit ?)

**Problème** : design Phase 16 silencieux sur la stratégie d'acquisition agences. Sans agence, le produit n'existe pas.

**Solutions** :

1. **Démo gratuite ciblée** : pour chaque EPCI breton, identifier les 5 agences les plus actives (DVF mandats déposés via mention "Agent commercial : X" dans annonces SeLoger) → email perso "Voici 5 leads gratuits sur votre zone, voulez-vous les voir ?"
2. **Webinar mensuel** "Les 50 leads chauds que vous ratez sur Lannion ce mois" — capte 50-100 agences/mois
3. **Partenariats syndicats** :
   - **FNAIM Bretagne** (~150 agences) — proposition tarif réseau -20 %
   - **SNPI Bretagne** (~80 agences) — idem
   - **UNIS Bretagne**
4. **White-label réseaux franchisés** : ORPI, Stéphane Plaza, Laforêt, Century 21 Bretagne — palier Réseau 2 490 €/mois
5. **Référencement Google "leads vente immobilier Bretagne"** + landing page SEO `/agences/leads-vente-bretagne`
6. **Témoignages clients early adopters** : 2-3 agences pilotes Découverte → vidéo cas client → social proof
7. **Script de vente outbound** : SDR (sales) avec 50 appels/jour aux 1 200 agences bretonnes (selon Annuaire FNAIM)

**Effort** : 30h sur 3 mois (CRM HubSpot + landing + webinar setup + SDR onboarding). **Impact** : passer de 0 à 30 agences payantes en 6 mois (target).

### Amélioration #8 — Compliance & confiance (Hoguet + RGPD + éthique)

**Problème** : 3 risques juridiques majeurs non traités dans Phase 16 initial.

**Solutions** :

1. **Loi Hoguet 70-9** : vérifier avec avocat que la facturation **abonnement forfaitaire** (pas par lead facturé) reste hors champ "courtage en données" / "mise en relation rémunérée à la performance" qui demande carte T. **Action** : consultation cabinet immobilier-spécialisé (1 500 € one-shot).
2. **DPIA RGPD** (déjà mentionné) : Analyse d'Impact obligatoire car scoring d'individus pour démarchage commercial tiers. Process formel article 35 RGPD. Templates CNIL gratuits, mais relecture DPO recommandée. **Action** : DPIA livré avant Phase 16.1, audit ProHacker complet.
3. **Page opt-out publique** sur renovation-brh.fr/prospection-immobiliere :
   - Formulaire "Je ne souhaite plus apparaître dans la base" (vérification email + adresse)
   - Process automatisé : entrée → trigger → suppression `brh_dpe_prospects` + log RGPD 36 mois
4. **Charte éthique** signée par chaque agence partenaire :
   - Pas de démarchage avant 9h ou après 19h
   - Pas de relance > 2x sur la même adresse
   - Mention obligatoire "Données issues de sources publiques (DVF, DGFIP, INSEE)" dans premier contact
   - Sanction : exclusion plateforme + restitution leads non utilisés
5. **Mention sur chaque lead livré** : "Droit d'opposition art. 21 RGPD : opt-out via brh.fr/prospection-immobiliere"
6. **Information préalable propriétaire SCI** : envoi automatique d'un courrier 30j avant 1er envoi à agence (best practice CNIL) — coût ~0,8 €/lead. À budgéter dans pricing.

**Effort** : 40h + 1 500 € avocat. **Impact** : protection juridique BRH + confiance long terme propriétaires + image marque.

### Amélioration #9 — Améliorations algorithmiques

**Problème** : 13 règles heuristiques fixes ignorent saisonnalité, contexte EPCI, et qualité signal.

**Solutions** :

1. **Saisonnalité** : multiplier `score_vente` × `coef_saisonnalite_mois` (1.2 mars-juillet, 0.8 nov-jan) — calé sur stats Notaires France
2. **Pondération par EPCI** : Rennes Métropole (marché tendu) ≠ Centre-Bretagne rural. Ajuster les seuils dynamiquement (ex: gentrification +15% commune en zone rurale = +20 pts vs +10 en zone tendue)
3. **Score de confiance par lead** (cf. amélioration #2) : sigma sur la complétude des signaux (combien de règles ont pu être évaluées vs missing data)
4. **Bayes update** post-feedback agence : si une règle prédit mal (ex: SCI succession converte à 10 % au lieu de 30 % attendu), réduire son poids automatiquement après 50 cas
5. **Détection résidence secondaire** (Phase 11.3 RS Bretagne) : booster score vente +15 si RS littoral 29/56 (souvent revendues post-pandémie)
6. **Détection prix m² range agence** : si l'agence est positionnée milieu de gamme (mandats 200-400k€), filtrer leads dont valeur estimée est dans cette range — évite frustration leads inadaptés
7. **Croisement Géoportail urba** : exclure leads en zone N (non constructible) ou zone PPRi forte (illiquides)

**Effort** : 12h. **Impact** : améliore précision de ~25 % (estimation interne, à mesurer post-prod).

### Amélioration #10 — North Star Metric & cohortes mesure

**Problème** : design Phase 16 ne définit aucun KPI cible. Comment savoir si on réussit ?

**Solutions** :

1. **North Star Metric** : `mandats_signes_via_leads_brh_par_mois` (somme inter-agences). Cible M+6 = 30 mandats/mois. Cible M+12 = 100/mois.
2. **Cohortes AARRR** :
   - **Acquisition** : nombre d'agences inscrites Découverte / mois
   - **Activation** : % qui a contacté ≥ 5 leads dans les 30j (target 70 %)
   - **Retention** : % renouvellement abonnement M+3 (target 80 %)
   - **Revenue** : MRR (Monthly Recurring Revenue) en €
   - **Referral** : % d'agences qui invitent une autre (NPS proxy)
3. **Funnel par lead** :
   - Livré → Vu (clic UI agence)
   - Vu → Contacté (action `agence_action != 'non_contacte'`)
   - Contacté → RDV (`rdv_pris`)
   - RDV → Mandat (`mandat_signe`)
   - Mandat → Vente (`vente_signee_at`)
   - Conversion globale cible : 30 % vu, 50 % contacté, 30 % RDV, 50 % mandat, 80 % vente
4. **Dashboard admin temps réel** : `/admin/agence-leads-metrics` avec funnel + segmentation par EPCI / palier / segment
5. **Revue mensuelle** Philippe + équipe : 30 min, focus sur 3 indicateurs : MRR, retention M+3, north star.

**Effort** : 8h (dashboard + tracking events). **Impact** : pilotage data-driven du produit (vs naviguer à vue).

## Synthèse des améliorations

| # | Amélioration | Effort | Impact | Bloque-launch ? |
|---|-------------|--------|--------|-----------------|
| 1 | Lead actionnable (courrier + tournée + fiche mobile) | 8h | ⭐⭐⭐ | OUI |
| 2 | Précision démontrée (garantie + dashboard + A/B) | 12h | ⭐⭐⭐ | OUI |
| 3 | Timing temps réel (push + décay + replay quotidien) | 15h | ⭐⭐ | OUI |
| 4 | Outillage agence (PDF tournée + scripts + handle objections) | 25h | ⭐⭐⭐ | OUI |
| 5 | Effet réseau Bretagne (anti-doublon + crowdsourcing) | 10h | ⭐⭐⭐ | OUI |
| 6 | Pricing révisé avec garantie | 5h | ⭐⭐ | OUI |
| 7 | Funnel acquisition agences | 30h sur 3 mois | ⭐⭐⭐ | NON (post-launch) |
| 8 | Compliance Hoguet + RGPD + éthique | 40h + 1500€ | ⭐⭐⭐ | **OUI (légal)** |
| 9 | Améliorations algo (saisonnalité, EPCI, Bayes) | 12h | ⭐⭐ | NON |
| 10 | North Star + AARRR + dashboard | 8h | ⭐⭐ | OUI |

**Total bloque-launch** : ~120h dev + 1 500 € avocat. **Total post-launch** : ~70h.

## Plan Phase 16 RÉVISÉ (intégrant les améliorations critiques)

### Phase 16.0 — Cadrage business + DPIA RGPD + Hoguet (J+30, ~50h + 1500€)

1. ✅ Validation business model révisé (3 paliers à 0/390/990 + Réseau 2490)
2. ✅ Consultation avocat immo Hoguet (1 500 €)
3. ✅ DPIA RGPD complet + audit ProHacker
4. ✅ Charte éthique partenariat draft
5. ✅ Page opt-out publique `/prospection-immobiliere`
6. ✅ Templates courrier propriétaire SCI (info préalable 30j)

### Phase 16.1 — Scoring socle ENRICHI (J+50, ~40h)

1. Migration enrichie + ALTER `brh_dpe_prospects` (+5 cols base + `score_confiance` + `dernier_contact_at`)
2. Modules TS : `score-vente-v1.ts` + `confiance-signaux.ts` + `saisonnalite.ts` + `epci-pondération.ts`
3. EF `score-vente-prospect` avec output `{score, segment, breakdown, confiance, model_version}`
4. Cron quotidien refresh DVF/INSEE décès/Sit@del2
5. Tests Vitest (couverture ≥ 80 %)

### Phase 16.2 — Outillage agence (CRITIQUE) (J+75, ~60h)

1. Générateur PDF tournée optimisée TSP (réutilisation jsPDF existant)
2. Scripts prospection IA par segment (réutilisation `ai-proxy` existant)
3. Générateur courrier "Au propriétaire" personnalisé (réutilisation Phase 13 — déjà livré ! cf. log 2026-05-01)
4. Fiche mobile lead (page `/pro/agence/lead/:id` mobile-first)
5. Handle objections IA (chat ai-proxy)
6. Push notifications + SMS (Twilio API ou similaire)
7. Email quotidien "Votre tournée du jour" PDF + lien Google Maps

### Phase 16.3 — Anti-doublon + effet réseau (J+85, ~20h)

1. Logique d'exclusion 90j dans `agence-leads-export`
2. Crowdsourcing feedback (table `brh_agence_lead_feedback_communautaire`)
3. Map "déjà mandaté ailleurs"
4. Tags `mandate_concurrent_actif` + `dpe_renove_recent`
5. Hot zones notification

### Phase 16.4 — Stripe + dashboard transparence (J+95, ~25h)

1. Stripe paliers révisés
2. Dashboard agence avec funnel + comparaison plateforme
3. Garantie ROI workflow (refund auto si 0 mandat M+3)
4. A/B test mensuel (10 % leads contrôle aléatoires)

### Phase 16.5 — Funnel acquisition (parallèle, J+30 → J+120, ~30h)

1. Landing page SEO `/agences-bretagne`
2. Webinar setup mensuel
3. SDR outbound 50 appels/jour
4. Partenariats syndicats (FNAIM/SNPI/UNIS Bretagne)
5. White-label négociations réseaux franchisés

### Phase 16.6 — North Star + AARRR (J+100, ~10h)

1. Dashboard admin temps réel
2. Tracking events PostHog ou similaire
3. Revue mensuelle process

### Phase 16.7 — Boucle data acquéreur (flywheel) (J+110, ~15h)

(Inchangé vs design initial)

### Phase 16.8 — Bascule prédictive XGBoost (T+12 mois)

(Inchangé vs design initial, conditionné ≥ 5 agences actives)

## Check-list "GO / NO-GO" avant Phase 16.1

Conditions à valider AVANT le moindre commit code :

- [ ] DPIA RGPD signé par DPO BRH
- [ ] Avis avocat Hoguet écrit (charte conforme)
- [ ] 3 paliers tarifaires validés par Philippe
- [ ] 3 agences pilotes Bretagne signées en Découverte (preuve d'intérêt marché)
- [ ] Mention "droit d'opposition" templating validée
- [ ] Page opt-out publique en ligne sur renovation-brh.fr
- [ ] Templates courriers SCI relus par avocat
- [ ] Audit ProHacker complet livré

## Modélisation économique révisée

**Hypothèses conservatives M+6** :
- 3 Découverte (gratuit)
- 8 Standard (390 €/mois)
- 2 Premium (990 €/mois)
- 0 Réseau

**MRR M+6** = 8 × 390 + 2 × 990 = **5 100 €/mois** (61 200 €/an)

**Hypothèses agressives M+12** :
- 25 Standard
- 8 Premium
- 1 Réseau

**MRR M+12** = 25 × 390 + 8 × 990 + 1 × 2 490 = **20 160 €/mois** (242 000 €/an)

**Coûts opérationnels mensuels** :
- Stripe 2.9 % = ~150 €/mois M+6, ~600 €/mois M+12
- Twilio SMS push (estim) = 50 €/mois
- Hosting Vercel + Supabase scaling = 100 €/mois M+6, 300 €/mois M+12
- Email Resend = 30 €/mois
- Cron daily refresh APIs gratuites (Edge Functions Supabase) = inclus

**Marge brute M+12 estimée** : ~95 % (produit SaaS pur, pas de coût marginal par lead)

**Break-even Phase 16** : ~3 mois après Phase 16.4 (Stripe live), si funnel acquisition tient les hypothèses.

## Risques résiduels post-amélioration

| Risque | Mitigation post-amélioration |
|--------|------------------------------|
| Précision conversion <25 % | A/B test + Bayes update + garantie ROI = transparence |
| Concurrence Effidea/Hosman | Différenciateur Bretagne + outillage suite + flywheel |
| RGPD attaque collective propriétaires | Page opt-out + DPIA + info préalable SCI = protection |
| Lassitude marché agences (saturation prospection) | Anti-doublon 90j + crowdsourcing = qualité long terme |
| Saisonnalité revenue | Pricing forfaitaire (pas par lead) lisse le revenu |

## Conformité aux 14 règles BRH (CLAUDE.md)

(Identique au design Phase 16 initial, toutes règles applicables respectées dans les améliorations)

## Statut d'implémentation

- ✅ Phase 16.0-PRE-MORTEM : Cette page (10 améliorations identifiées)
- ❌ Phase 16.0 : Cadrage business + DPIA + Hoguet (à démarrer)
- ❌ Phase 16.1 → 12.7 : selon plan révisé ci-dessus
- ❌ Phase 16.8 : Bascule prédictive (T+12 mois)

## Mises à jour de cette page

- **2026-05-01** : Création — pre-mortem + 10 améliorations critiques + plan révisé Phase 16 + modélisation économique
