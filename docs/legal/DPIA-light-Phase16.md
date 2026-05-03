# DPIA "light" — Phase 16 BRH Habitat (Score Vente Agences Immo)

**Document préparatoire — à compléter avec un DPO certifié avant montée en charge**

> Ce document est une étude d'impact RGPD allégée (DPIA "light" au sens de
> l'article 35 du RGPD), produite avant l'ouverture publique de Phase 16 aux
> premières agences pilotes. Il sera complété et signé par un DPO ou consultant
> RGPD dans les 90 jours suivant le lancement. À présenter à l'avocat
> spécialisé Hoguet pour validation conjointe avec la charte partenariat.

---

## 1. Description du traitement

### Finalité
Identifier les biens immobiliers en classe énergétique F ou G en Bretagne
susceptibles d'être mis en vente sous 6 mois, et mettre ces fiches
d'opportunité scorées à la disposition d'agences immobilières partenaires
sous contrat.

### Périmètre géographique
4 départements bretons : Côtes-d'Armor (22), Finistère (29),
Ille-et-Vilaine (35), Morbihan (56). ~59 000 prospects identifiés (volumétrie
au 2026-04 via Open Data ADEME).

### Modèle économique
**Modèle Hoguet "A"** (apport d'affaires non régulé) : BRH fournit aux agences
des fiches d'opportunité scorées (adresse + DPE + score + recommandations),
**sans réaliser de transaction immobilière**. BRH ne prend pas de mandat,
ne perçoit pas de commission sur vente, ne génère pas de courrier au nom de
l'agence. La carte professionnelle T n'est donc pas requise pour BRH.

### Catégories de personnes concernées
- **Propriétaires occupants ou bailleurs** de logements F/G situés en Bretagne
- **Représentants signataires** des agences partenaires (un compte BRH par agence)

---

## 2. Données collectées

### Données de base (sources publiques)
| Donnée | Source | Base légale |
|---|---|---|
| Adresse postale | Open Data ADEME (DPE publics) | Intérêt légitime (Art. 6.1.f) |
| Étiquette DPE + caractéristiques techniques | Open Data ADEME | Idem |
| Code IRIS / commune | INSEE | Idem |
| Mutations DVF (prix, dates) | DGFiP Open Data | Idem |
| Revenu médian IRIS | Filosofi INSEE | Idem |

### Données dérivées (calculées par BRH)
| Donnée | Construction | Sensibilité |
|---|---|---|
| Score Vente v1 (0-100) | Heuristique 13 règles déterministe | Faible (pas de profilage individuel) |
| Segment (très_chaud/chaud/tiède/froid) | Découpage du score | Faible |
| Probabilité 6m | Calibrage par segment (0.05 à 0.65) | Modérée (effet juridique potentiel : démarchage commercial) |

### Données partenaires (collectées au signing)
| Donnée | Finalité | Conservation |
|---|---|---|
| Représentant : nom, email, téléphone | Compte authentifié + facturation | 3 ans après résiliation |
| SIRET, raison sociale | Vérification carte T + facturation | Idem |
| IP + user-agent au signing | Preuve eIDAS de la signature | 5 ans (durée prescription) |

### Données NON collectées (et NE LE SERONT PAS)
- ❌ Nom/prénom du propriétaire
- ❌ Téléphone ou email personnel du propriétaire
- ❌ Données de santé, opinions, religion
- ❌ Identifiants nationaux (NIR, etc.)

L'identification du propriétaire pour démarchage **incombe à l'agence**
(via cadastre, annuaire, porte-à-porte, etc.) sous sa propre responsabilité
de traitement.

---

## 3. Base légale et consentement

### Base légale principale
**Intérêt légitime** (Art. 6.1.f RGPD) pour le scoring et la mise à
disposition aux agences sous contrat. Test de proportionnalité :

- **Légitimité** : favoriser la rénovation énergétique (objectif d'intérêt
  général), faciliter la vente de logements obsolescents qui freinent la
  transition (loi Climat 2025 interdiction location G).
- **Nécessité** : sans cette mise en relation, les propriétaires F/G
  ignorent souvent leur valorisation possible et n'engagent pas de travaux.
- **Équilibre** : impact mineur (pas de profilage individuel), encadré par
  - Page d'opt-out publique (Art. 21 droit d'opposition)
  - Anti-doublon inter-agences (1 lead = 1 agence pendant 30j max)
  - Frequency cap 2 tentatives par lead
  - Audit aléatoire mensuel 5 %

### Pas de consentement préalable
Le scoring lui-même est basé sur des données publiques (Open Data ADEME, DVF,
INSEE) et un intérêt légitime. **Pas de consentement requis** pour le scoring
interne BRH, conformément aux lignes directrices du CEPD sur l'intérêt légitime
(WP217 + Lignes directrices 2024).

### Information des personnes (Art. 13/14)
- Mention dans `politique-de-confidentialite` du site renovation-brh.fr
- Page publique `/opt-out` accessible sans authentification
- Mention transparente sur la home page : "BRH analyse les DPE publics F/G
  pour faciliter la rénovation énergétique"

---

## 4. Droits des personnes

| Droit RGPD | Implémentation | Délai |
|---|---|---|
| **Information** (Art. 13/14) | Page politique de confidentialité | Immédiat |
| **Accès** (Art. 15) | Email rgpd@contact-brh.fr → réponse manuelle | 30 jours |
| **Rectification** (Art. 16) | Page `/opt-out` type='rectification' | 30 jours |
| **Suppression** (Art. 17) | Page `/opt-out` type='suppression' | 30 jours |
| **Opposition** (Art. 21) | Page `/opt-out` type='opposition' (par défaut) | 30 jours, immédiat techniquement |
| **Portabilité** (Art. 20) | Email → export JSON manuel | 30 jours |
| **Profilage** (Art. 22) | Score Vente n'est pas une décision automatisée à effet juridique (l'agence reste libre de contacter ou non) | N/A |

**Mécanisme de purge** :
- Insert dans `brh_optout_requests` avec `deadline = now() + 30 days`
- Cron quotidien (à brancher) qui :
  1. Marque le prospect comme opt-out dans `brh_dpe_prospects`
  2. Désactive tous les `brh_lead_assignments` actifs sur ce prospect (status='released')
  3. Supprime le score `brh_score_vente_v1`
  4. Notifie les agences qui avaient claim ce lead
  5. Confirme par email au demandeur

---

## 5. Mesures de sécurité

### Techniques
- ✅ **RLS Postgres** sur toutes les tables sensibles (cf. migration 16.0.1 + 16.0.8/9)
- ✅ **Helper SQL `brh_user_can`** avec SECURITY DEFINER + search_path = '' (pas d'élévation de privilèges via search_path injection)
- ✅ **Helper SQL `brh_grant_lead_claim`** transaction-safe avec FOR UPDATE + UNIQUE INDEX (anti race condition)
- ✅ **HTTPS uniquement** (Vercel + Supabase TLS 1.3)
- ✅ **Sentry** pour monitoring erreurs (sourcemaps tagués par tenant)
- ✅ **Rate limiting** sur Edge Functions publiques (5/IP/heure pour opt-out, 10/IP/min pour checkout)
- ✅ **Authentification** Supabase Auth (JWT + refresh token)
- ✅ **Permissions JSONB granulaires** sur les membres pro (canViewFinance, etc.)

### Organisationnelles
- 🟡 **Charte partenariat** signée électroniquement (eIDAS) avec sanctions en cas de manquement (audit aléatoire 5 % mensuel, 3 plaintes confirmées = suspension)
- 🟡 **Liste blanche des agences** : seules les agences sous charte active peuvent claim des leads
- 🟡 **Versioning de la charte** : ancienne version archivée (`brh_partner_contracts.contract_content` snapshot)
- 🟡 **Logs d'audit** : `brh_agence_audits` retient 5 % des contacts mensuels pour vérification

### À mettre en place (avant ouverture publique)
- ❌ **DPO interne ou externe** identifié avec délégation explicite
- ❌ **Registre RGPD** des activités de traitement (Art. 30) — à formaliser
- ❌ **Contrat de sous-traitance** Supabase + Vercel + Resend (probablement inclus dans leurs DPA standards mais à vérifier)
- ❌ **Chiffrement at rest** des notes de visite (`brh_lead_assignments.notes`) — actuellement clear text en DB

---

## 6. Risques résiduels et atténuations

### Risque 1 : Démarchage abusif d'un même propriétaire (harassment)
- **Probabilité** : Moyenne (sans contrôle) → Faible (avec contrôle)
- **Impact** : Moyen (plainte CNIL, presse négative)
- **Atténuation** :
  - Anti-doublon UNIQUE INDEX (1 agence active par prospect)
  - Frequency cap 2 tentatives max par agence
  - Audit aléatoire 5 % mensuel
  - Page opt-out 30j

### Risque 2 : Re-identification du propriétaire à partir de l'adresse
- **Probabilité** : Élevée (l'adresse seule peut ré-identifier dans une petite commune)
- **Impact** : Moyen (donnée publique mais traitement à finalité commerciale)
- **Atténuation** :
  - Pas de croisement avec données nominatives chez BRH
  - L'identification du propriétaire incombe à l'agence (responsabilité conjointe)
  - Mention explicite dans la charte que l'agence est responsable de cette
    étape sous sa propre conformité

### Risque 3 : Revente des leads par une agence à un tiers
- **Probabilité** : Faible (charte interdit explicitement)
- **Impact** : Élevé (perte de contrôle, risque CNIL pour BRH)
- **Atténuation** :
  - Clause anti-revente dans la charte (Art. 8 interdit revente/partage/export en masse)
  - Suspension immédiate + dommages contractuels en cas de constatation
  - Audit technique : pas d'export massif côté UI (tableau paginé, pas d'API publique pour les agences)

### Risque 4 : Hébergeur Supabase aux US ?
- **Probabilité** : N/A
- **Statut** : Supabase Cloud BRH est hébergé en région **eu-west-1** (Irlande) → pas de transfert hors UE
- **DPA Supabase** : OK (clauses contractuelles type CCT 2021)

---

## 7. Délais et obligations

### Conservation
- Données scoring : tant que prospect en base + opt-out non demandé
- Audits agences : 3 ans (durée prescription civile)
- Contrats partenaires : 5 ans après résiliation (durée prescription commerciale)
- Logs d'authentification : 1 an (Art. 6 LCEN)

### Notification CNIL
- En cas de violation de données : notification sous 72 h (Art. 33)
- Impact > 250 personnes : information directe des personnes (Art. 34)

### Mise à jour du document
- DPIA "light" → DPIA complète sous 90 jours après lancement public
- Revue annuelle obligatoire ou à chaque évolution majeure (nouveau type de
  donnée, changement de finalité, nouvelle source)

---

## 8. Validation

- **Rédacteur** : Claude (assistant IA BRH) sous supervision Philippe Gagnon (CG Groupe)
- **Date du document** : 2026-05-03
- **Version** : 1.0 light (à étoffer en v2.0 complet par DPO certifié)
- **À valider avant ouverture publique** :
  - [ ] Avocat spécialisé Hoguet (validation modèle "A" + charte template)
  - [ ] DPO interne ou consultant externe (validation conformité Art. 35)
  - [ ] Direction CG Groupe (signature DPIA + budget compliance)
- **Stockage de ce document** : `docs/legal/DPIA-light-Phase16.md` versionné Git

---

**Pour questions / mise à jour** : philippegagnonp@gmail.com (contact BRH)
ou rgpd@contact-brh.fr (boîte dédiée RGPD).
