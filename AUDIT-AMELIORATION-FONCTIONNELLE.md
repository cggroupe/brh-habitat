# Audit d'Amelioration Fonctionnelle — BRH Habitat

**Date** : 2026-03-24
**Vision** : Transformer BRH Habitat du meilleur simulateur de diagnostic habitat en Bretagne en un **outil de decision complet pour les particuliers** — de "j'ai un probleme" a "je sais combien ca coute, combien l'Etat me rembourse, et quand commencer".

**Cible** : Particuliers proprietaires en Bretagne. Pas de jargon technique. Parcours guide, accessible, professionnel.

**Inspiration** : CAPRENOV+ (logiciel pro), France Renov' (simulateur officiel), Effy/Hellio (parcours grand public).

---

## Resume Executif

L'application actuelle fait bien une chose : diagnostiquer les problemes. Mais elle s'arrete la ou le particulier a le plus besoin d'aide — **comprendre combien ca coute vraiment (reste a charge), quelles aides il peut toucher, et dans quel ordre faire les travaux**.

### 3 axes majeurs d'amelioration

| Axe | Idee cle | Impact |
|-----|----------|--------|
| **1. Estimation des aides** | Ajouter un simulateur MaPrimeRenov' + CEE integre aux resultats | Le particulier voit son **reste a charge reel**, pas juste le cout brut |
| **2. Parcours de renovation guide** | Recommander un **ordre de travaux** intelligent base sur le diagnostic | Le particulier sait par ou commencer |
| **3. Avant/Apres energetique** | Montrer l'etiquette DPE estimee avant et apres travaux | Le particulier visualise le gain concret |

---

## Etat des lieux — Ce qui fonctionne bien

| Fonctionnalite | Verdict |
|----------------|---------|
| Wizard 6 etapes | Fluide, bien guide, pas intimidant |
| 7 domaines de diagnostic | Complet pour la renovation habitat |
| 56 symptomes avec poids | Scoring credible et bien calibre |
| Recommandations par symptome | 55 reco concretes avec budgets |
| Bonus equipements (DPE, VMC, vitrage) | Bonne prise en compte du contexte |
| Articles SEO | 10 articles bien cibles BTP Bretagne |
| Admin complet | Gestion dossiers, RDV, users |

---

## AXE 1 — Simulateur d'Aides Integre (Le plus gros gain de valeur)

### Probleme actuel
Le diagnostic affiche "Budget estime : 8 000 - 25 000 EUR" mais le particulier pense "C'est trop cher, je ne fais rien". En realite, avec MaPrimeRenov' + CEE + eco-PTZ, son reste a charge peut etre **divise par 2 ou 3**.

### Solution proposee

**Ajouter un Step 2.5 "Votre situation"** (entre Propriete et Equipements) :

```
Questions a poser (inspirees de France Renov') :
1. Etes-vous proprietaire occupant ou bailleur ?
   → [ Occupant ] [ Bailleur ]

2. Combien de personnes composent votre foyer ?
   → [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5+ ]

3. Quel est votre revenu fiscal de reference ? (approximatif)
   → [ Moins de 17 009 EUR ]    ← Bleu (tres modeste)
   → [ 17 009 - 21 805 EUR ]    ← Jaune (modeste)
   → [ 21 805 - 30 549 EUR ]    ← Violet (intermediaire)
   → [ Plus de 30 549 EUR ]     ← Rose (superieur)

   + Tooltip : "Vous le trouverez sur votre avis d'imposition,
     ligne 'Revenu fiscal de reference'"

   + Option : "Je ne sais pas" → on fait le calcul pour les 4 profils
```

**Adapter la page de Resultats** pour afficher :

```
┌─────────────────────────────────────────────────┐
│  ISOLATION COMBLES                              │
│  Score : 72/100 — Urgent                        │
│                                                 │
│  Cout estime :     8 000 - 12 000 EUR           │
│  MaPrimeRenov' :   - 1 500 EUR (profil Jaune)  │
│  CEE :             - 800 EUR                    │
│  ─────────────────────────────────              │
│  Reste a charge :  5 700 - 9 700 EUR            │
│                                                 │
│  💡 Eligible eco-PTZ (pret a taux zero)         │
│  💡 TVA reduite a 5.5%                          │
└─────────────────────────────────────────────────┘
```

### Donnees MaPrimeRenov' 2026 a integrer

| Geste | Bleu | Jaune | Violet | Rose |
|-------|------|-------|--------|------|
| PAC air/eau | 5 000 | 4 000 | 3 000 | — |
| PAC geothermique | 11 000 | 9 000 | 6 000 | — |
| Chauffe-eau solaire | 4 000 | 3 000 | 2 000 | — |
| Chauffe-eau thermo | 1 200 | 800 | 400 | — |
| Poele a granules | 1 800 | 1 500 | 700 | — |
| Insert cheminee | 1 800 | 1 000 | 600 | — |
| VMC double flux | 2 500 | 2 000 | 1 500 | — |
| Isolation combles | 25 EUR/m2 | 20 EUR/m2 | 15 EUR/m2 | — |
| Isolation planchers | 25 EUR/m2 | 20 EUR/m2 | 15 EUR/m2 | — |
| Isolation toiture-terrasse | 75 EUR/m2 | 60 EUR/m2 | 40 EUR/m2 | — |
| Fenetres (double/triple) | 100 EUR/eq | 80 EUR/eq | 40 EUR/eq | — |

**Important 2026** : L'isolation des murs et les chaudieres biomasse ne sont plus financees en geste isole. Le profil Rose n'est plus eligible au parcours par geste.

### Estimation CEE (Certificats d'Economie d'Energie)

Ajouter une estimation CEE forfaitaire par type de travaux (montants moyens 2026) :

| Geste | CEE moyen estime |
|-------|-----------------|
| Isolation combles | 8-12 EUR/m2 |
| Isolation plancher | 5-10 EUR/m2 |
| PAC air/eau | 2 500 - 4 000 EUR |
| VMC double flux | 300 - 500 EUR |
| Fenetres | 50 - 80 EUR/eq |
| Chauffe-eau thermo | 100 - 200 EUR |

### Implementation

1. Creer `src/data/aides-renov.ts` — baremes MaPrimeRenov' 2026 + CEE + eco-PTZ
2. Creer `src/lib/aides-engine.ts` — calcul des aides en fonction du profil revenus
3. Ajouter un step "Situation" dans le wizard diagnostic
4. Modifier `DiagnosticResultsPage` pour afficher le reste a charge
5. Stocker le profil revenus dans `diagnosticStore` (champ optionnel)

---

## AXE 2 — Parcours de Renovation Guide

### Probleme actuel
Le diagnostic affiche les recommandations par priorite (haute/moyenne/basse) mais ne dit pas **dans quel ordre concret faire les travaux**. Un particulier qui isole ses combles avant de traiter l'humidite va perdre son investissement.

### Solution proposee : "Mon Plan de Renovation"

Apres les resultats du diagnostic, proposer une section **"Votre plan de renovation recommande"** qui ordonne les travaux intelligemment :

```
VOTRE PLAN DE RENOVATION RECOMMANDE
====================================

Etape 1 — URGENCES (a faire immédiatement)
   ⚡ Mise aux normes electriques
   Score : 85/100 | Budget : 2 000 - 4 000 EUR
   → Pourquoi en premier : risque de securite

Etape 2 — TRAITEMENT (avant d'isoler)
   💧 Traitement humidite / infiltrations
   Score : 72/100 | Budget : 3 000 - 8 000 EUR
   → Pourquoi avant l'isolation : isoler un mur humide
     aggrave le probleme

Etape 3 — ENVELOPPE (isolation + menuiseries)
   🧱 Isolation combles + remplacement fenetres
   Score : 65/100 | Budget : 8 000 - 18 000 EUR
   → Pourquoi ensemble : traiter l'enveloppe en une fois
     maximise les economies

Etape 4 — VENTILATION (apres avoir isole)
   🌀 Installation VMC double flux
   Score : 58/100 | Budget : 3 000 - 6 000 EUR
   → Pourquoi apres l'isolation : un logement isole DOIT
     etre ventile pour eviter la condensation

Etape 5 — TOITURE (si necessaire)
   🏠 Demoussage + hydrofuge
   Score : 40/100 | Budget : 1 500 - 3 000 EUR
   → Peut attendre 6-12 mois

────────────────────────────────────────
TOTAL ESTIME :     17 500 - 39 000 EUR
AIDES ESTIMEES :   - 6 200 EUR
RESTE A CHARGE :   11 300 - 32 800 EUR

💡 Ce plan peut etre realise sur 2-3 ans.
   Commencez par les etapes 1-2 cette annee.
```

### Logique d'ordonnancement (regles metier)

L'ordre des travaux suit la logique ADEME :

```
Priorite 1 — SECURITE (electrique, gaz, structure)
  ↓ Obligatoire, risque vital
Priorite 2 — TRAITEMENT SOURCE (humidite, infiltrations, plomberie)
  ↓ Traiter la cause avant les consequences
Priorite 3 — ENVELOPPE (isolation + menuiseries ensemble)
  ↓ Reduire les deperditions
Priorite 4 — VENTILATION (VMC)
  ↓ Ventiler APRES avoir isole (sinon inutile)
Priorite 5 — CHAUFFAGE (si necessaire)
  ↓ Dimensionner le chauffage pour le logement isole
Priorite 6 — CONFORT (toiture, facade, second oeuvre)
  ↓ Finitions, pas urgent
```

**Interactions critiques a expliquer au particulier** :
- "Isoler sans ventiler = moisissures" → message si isolation haute mais pas de VMC
- "Traiter l'humidite AVANT d'isoler" → message si humidite + isolation selectionnees
- "Changer les fenetres en meme temps que l'isolation" → synergie
- "Apres isolation, votre chauffage sera surdimensionne" → conseil

### Implementation

1. Creer `src/lib/renovation-plan-engine.ts` — ordonnancement + interactions
2. Creer `src/pages/public/RenovationPlanPage.tsx` — affichage du plan
3. Ajouter un CTA "Voir mon plan de renovation" sur DiagnosticResultsPage
4. Stocker le plan dans les resultats du diagnostic (champ `renovation_plan`)

---

## AXE 3 — Etiquette Energetique Avant/Apres

### Probleme actuel
Le DPE est collecte en step 3 (equipements) mais **jamais exploite visuellement**. Le particulier ne voit pas la difference concrete que les travaux vont faire.

### Solution proposee

Afficher une estimation de l'etiquette energetique **avant et apres travaux** sur la page de resultats :

```
┌──────────────────────────────────────────────┐
│       VOTRE LOGEMENT AUJOURD'HUI             │
│                                              │
│   A ■                                        │
│   B ■■                                       │
│   C ■■■                                      │
│   D ■■■■                                     │
│   E ■■■■■  ◄── Vous etes ici               │
│   F ■■■■■■                                   │
│   G ■■■■■■■                                  │
│                                              │
│       APRES TRAVAUX (estimation)             │
│                                              │
│   A ■                                        │
│   B ■■                                       │
│   C ■■■    ◄── Objectif atteignable         │
│   D ■■■■                                     │
│   E ■■■■■                                    │
│   F ■■■■■■                                   │
│   G ■■■■■■■                                  │
│                                              │
│   Gain estime : 2 classes DPE                │
│   Economies : ~600 EUR/an sur vos factures   │
└──────────────────────────────────────────────┘
```

### Logique de calcul simplifiee

Pas besoin d'un calcul DPE reel (trop complexe pour un simulateur). Une estimation basee sur :

| Travaux realises | Gain DPE estime |
|-----------------|-----------------|
| Isolation combles seule | +0.5 a +1 classe |
| Isolation combles + murs | +1 a +2 classes |
| Remplacement fenetres simple → double | +0.5 classe |
| Installation VMC | +0.5 classe |
| Changement chauffage (fioul → PAC) | +1 a +2 classes |
| Renovation globale (tout) | +2 a +4 classes |

**Disclaimer obligatoire** : "Cette estimation est indicative. Seul un audit energetique officiel peut determiner votre classe DPE reelle."

### Implementation

1. Ajouter `estimateDpeGain()` dans `src/lib/diagnostic-engine.ts`
2. Creer `src/components/DpeScale.tsx` — composant visuel etiquette DPE
3. Afficher avant/apres sur `DiagnosticResultsPage`

---

## AXE 4 — Ameliorations du Parcours Existant

### 4.1 Validation du wizard (quick wins)

| Step | Probleme | Fix |
|------|----------|-----|
| Step 2 (Propriete) | Annee non obligatoire (mais necessaire pour le scoring age) | Rendre `year` obligatoire avec un picker simple |
| Step 4 (Symptomes) | On peut passer sans cocher aucun symptome | Exiger minimum 1 symptome par type selectionne |
| Step 6 (Contact) | Pas de validation email/telephone | Regex email + telephone francais (10 chiffres) |

### 4.2 Step 5 Photos — Rendre utile ou supprimer

Actuellement, les photos sont collectees mais **jamais exploitees**. Deux options :

**Option A — Supprimer** (recommande pour v1) :
- Retirer le step photos du wizard
- Passer de 6 a 5 etapes (plus rapide)
- Les photos seront ajoutees plus tard dans le dossier

**Option B — Valoriser** (v2) :
- Apres upload, afficher un message "Nos experts analyseront vos photos sous 24h"
- Les photos apparaissent dans l'admin pour l'expertise manuelle
- A terme : analyse IA des photos (moisissures, fissures, etc.)

### 4.3 Resultats — Enrichissements

| Amelioration | Description |
|-------------|-------------|
| **PDF telecharger** | Bouton "Telecharger mon diagnostic" en PDF propre avec logo BRH |
| **Partager par email** | "Envoyer les resultats a mon email" — utile pour en discuter en couple |
| **Comparer des scenarios** | "Et si je ne faisais que l'isolation ?" vs "Renovation globale" |
| **Sauvegarder sans compte** | Stocker en localStorage + proposer de creer un compte pour sauvegarder |
| **Prise de RDV directe** | Calendrier inline (pas un formulaire) avec creneaux dispos |

### 4.4 Dashboard utilisateur — Enrichissements

| Amelioration | Description |
|-------------|-------------|
| **Timeline de renovation** | Visualisation "Ou j'en suis" avec les etapes du plan |
| **Suivi des aides** | Status de la demande MaPrimeRenov' (en cours, accepte, verse) |
| **Documents centralises** | Upload devis, factures, attestations — tout au meme endroit |
| **Historique diagnostics** | Comparer l'evolution dans le temps (re-diagnostic 6 mois apres) |

---

## AXE 5 — Contenu Educatif Contextuel

### Probleme actuel
Les 10 articles existent mais ne sont pas lies au diagnostic. Le particulier fait un diagnostic "humidite" et ne voit pas l'article "Problemes d'humidite en Bretagne".

### Solution proposee

**Recommandations d'articles contextuelles** sur la page de resultats :

```
📚 ARTICLES LIES A VOTRE DIAGNOSTIC
────────────────────────────────────
Vous avez des problemes d'humidite et d'isolation.
Voici des guides pour mieux comprendre :

→ "Problemes d'humidite en maison bretonne : causes et solutions"
   10 min de lecture

→ "Isolation thermique : le guide complet 2026"
   10 min de lecture

→ "Aides a la renovation 2026 : MaPrimeRenov', CEE, eco-PTZ"
   9 min de lecture
```

### Implementation
Mapper `diagnosticType` → `articleCategory` → articles associes dans les resultats.

---

## AXE 6 — SEO et Conversion

### 6.1 Pages de service enrichies

Chaque service (toiture, isolation, etc.) devrait avoir :
- Un mini-simulateur embarque ("Testez en 30 secondes si vous avez besoin d'une renovation toiture")
- Temoignages clients (a ajouter dans la DB)
- Galerie avant/apres (photos de chantiers BRH)
- FAQ structuree (schema JSON-LD FAQPage)

### 6.2 Blog dynamique

Migrer les articles statiques (`src/data/articles/`) vers la table `brh_articles` en DB pour :
- Gestion via l'admin (deja fonctionnel)
- SEO meta dynamiques
- Programmation de publication
- Statistiques de lecture

### 6.3 Landing pages locales

Creer des pages par ville/zone :
- "Renovation habitat Brest"
- "Isolation maison Quimper"
- "Toiture Rennes"
- Schema LocalBusiness par zone

---

## Roadmap d'Implementation Suggeree

### Phase 1 — Quick Wins (1-2 semaines)
- [ ] Valider annee propriete obligatoire
- [ ] Valider minimum 1 symptome par type
- [ ] Valider email/telephone step contact
- [ ] Supprimer step photos (passer a 5 etapes)
- [ ] Lier articles au diagnostic (recommandations contextuelles)
- [ ] Ajouter composant DPE visuel (avant/apres simple)

### Phase 2 — Simulateur d'Aides (2-3 semaines)
- [ ] Step "Situation" (proprietaire, revenus, foyer)
- [ ] Baremes MaPrimeRenov' 2026 + CEE
- [ ] Calcul reste a charge sur la page resultats
- [ ] Mention eco-PTZ et TVA 5.5%

### Phase 3 — Plan de Renovation (2-3 semaines)
- [ ] Moteur d'ordonnancement des travaux
- [ ] Messages d'interactions critiques (isoler avant ventiler, etc.)
- [ ] Page "Mon Plan de Renovation"
- [ ] Estimation budget total avec aides

### Phase 4 — Experience Complete (1 mois)
- [ ] Export PDF des resultats
- [ ] Envoi par email
- [ ] Comparaison de scenarios
- [ ] Dashboard timeline
- [ ] Blog dynamique (migration vers DB)

---

## Metriques de Succes

| Metrique | Actuel (estime) | Cible |
|----------|----------------|-------|
| Taux de completion du diagnostic | ~30% (6 etapes) | 50%+ (5 etapes + plus motivant) |
| Taux de prise de RDV | ~5% | 15%+ (quand le particulier voit le reste a charge) |
| Temps moyen sur resultats | ~2 min | 5 min+ (plus de contenu a explorer) |
| Articles lus post-diagnostic | ~0 | 1.5+ par utilisateur |
| Diagnostics par mois | ? | x3 avec le partage email/PDF |

---

## Conclusion

La plus grosse opportunite est le **simulateur d'aides integre** (Axe 1). C'est ce qui transforme BRH Habitat d'un "outil de diagnostic" en un **outil de decision**. Un particulier qui voit "Reste a charge : 5 700 EUR au lieu de 12 000 EUR" est 3x plus susceptible de prendre RDV.

Le **plan de renovation ordonne** (Axe 2) est le differentiant — aucun concurrent ne fait ca de maniere simple et visuelle pour les particuliers. C'est le bridge entre "j'ai un diagnostic" et "je sais quoi faire".

L'**etiquette DPE avant/apres** (Axe 3) est le declencheur emotionnel — "Passer de E a C" est plus parlant que n'importe quel chiffre.
