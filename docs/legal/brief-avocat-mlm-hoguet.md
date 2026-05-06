# Brief avocat — Validation Programme de recommandation 5 niveaux BRH Habitat

**Destinataire** : avocat spécialisé Hoguet/Hamon (à désigner — budget 1 500 € HT acté)
**Date** : 2026-05-06
**Émetteur** : Philippe Gagnon (CG GROUPE / BRH Habitat)
**Objet** : Audit juridique d'un programme de recommandation à 5 niveaux destiné aux agences immobilières partenaires, en complément d'une charte partenariat « apport d'affaires » (modèle Hoguet « A »).

---

## 1. Contexte business

BRH Habitat (Bretagne Rénovation Habitat) est une plateforme SaaS multi-portails (https://www.renovation-brh.fr) qui connecte des agences immobilières bretonnes à un catalogue de fiches d'opportunité scorées (~59 000 propriétaires en classes énergétiques F/G susceptibles de mettre en vente sous 6 mois).

**Modèle économique principal** : abonnement mensuel SaaS pour les agences (4 paliers : Discovery 0 €, Standard 390 €, Premium 990 €, Expert 2 490 €). L'agence claim des fiches d'opportunité dans la limite de son quota mensuel (5/30/100/illimité).

**Modèle Hoguet « A »** : BRH ne réalise pas de transaction immobilière, ne prend pas de mandat, n'envoie pas de courrier au nom de l'agence. La relation BRH↔agence est strictement un apport d'affaires (article 4 de la loi Hoguet n° 70-9 du 2 janvier 1970, modifié 2014).

Un DPIA-light a déjà été produit côté BRH ([docs/legal/DPIA-light-Phase16.md](DPIA-light-Phase16.md)) pour la conformité RGPD du traitement des données prospects.

---

## 2. Objet du programme à valider

Pour stimuler l'acquisition de nouvelles agences partenaires, BRH souhaite mettre en place un **Programme de recommandation à 5 niveaux** :

- Une agence A (parrain direct) partage un lien personnalisé avec une agence B
- Si B s'inscrit ET signe sa charte partenariat → A reçoit 100 € HT + 5 leads bonus
- Si B parraine ensuite une agence C qui signe sa charte → A reçoit aussi 25 € HT + 3 leads bonus (Niveau 2 dans la chaîne)
- Cascade de 5 niveaux maximum, avec rémunération dégressive

**Total maximum par charte signée** : 145 € HT cash + 12 leads bonus, distribués sur 5 ancêtres.

Le draft des CGU est dans le fichier joint [cgu-agence-programme-recommandation-draft.md](cgu-agence-programme-recommandation-draft.md).

---

## 3. Barème complet

| Niveau | Position | Récompense cash | Leads bonus |
|--------|----------|-----------------|-------------|
| 1 | Parrain direct | 100 € HT | +5 |
| 2 | Grand-parrain | 25 € HT | +3 |
| 3 | Arrière-grand-parrain | 10 € HT | +2 |
| 4 | Niveau 4 | 5 € HT | +1 |
| 5 | Niveau 5 | 5 € HT | +1 |
| **Total** | — | **145 € HT** | **+12 leads** |

---

## 4. Préoccupation principale — non-pyramidalité

Le risque juridique central est une qualification potentielle de :

**(a) Vente pyramidale prohibée** — articles L. 121-15 et L. 122-6 du Code de la consommation
**(b) Boule de neige** — article L. 122-6 1° du Code de la consommation
**(c) Pratique commerciale trompeuse** — articles L. 121-2 à L. 121-5 du Code de la consommation

### Garde-fous mis en place côté BRH

1. **Aucun droit d'entrée** : la charte partenariat est gratuite. Aucun stock, aucun matériel.
2. **Récompense conditionnée à un acte commercial réel** : versement uniquement après signature ET activation (`status = 'active'` après confirmation email) d'une charte de la part de l'agence parrainée. Pas de prime à l'inscription seule.
3. **Cap absolu à 5 niveaux** : implémenté en dur dans le code source. Au-delà, aucune commission n'est due.
4. **Cash dégressif** : 100 → 25 → 10 → 5 → 5 €. Ratio total/Niveau 1 = 1,45×.
5. **Aucun quota de recrutement** : l'agence n'a aucune obligation de parrainer pour conserver son statut.
6. **Reset mensuel** des leads bonus : pas d'accumulation à long terme.
7. **Détection automatique des cycles** : code SQL empêche les boucles A→B→A.
8. **Validation manuelle anti-fraude** : chaque commission est revue par BRH avant versement (statut `validated`).
9. **Annulation possible** : si la charte parrainée est elle-même résiliée dans les 30 jours, la commission est annulée (`cancelled`).

---

## 5. Questions précises à l'avocat

1. **Le programme ainsi défini est-il qualifiable de système pyramidal au sens de L. 122-6 ou L. 121-15 du Code de la consommation ?**
2. **Les garde-fous (article 4 du draft CGU) sont-ils suffisants pour éviter cette qualification, ou faut-il en ajouter ?**
3. **Le cap de 5 niveaux + cash dégressif est-il acceptable, ou faut-il limiter à 1 ou 2 niveaux ?**
4. **Le total max de 145 € HT par charte est-il proportionné par rapport au MRR cible (390-2490 € / mois) ? L'avocat estime-t-il que cette proportion établit la dimension « réelle activité commerciale » plutôt que « activité de recrutement » ?**
5. **Faut-il faire signer aux agences un avenant spécifique au moment de leur entrée dans le Programme, ou suffit-il que la charte partenariat fasse référence aux CGU (lien au document) ?**
6. **Le programme est-il compatible avec le statut d'apporteur d'affaires non régulé (Hoguet « A ») dans lequel BRH se positionne, ou requiert-il une autre qualification (mandat, intermédiation, etc.) ?**
7. **Y a-t-il des obligations particulières d'information précontractuelle envers l'agence parrainée (mention claire qu'un tiers reçoit une commission, conformément aux articles L. 111-1 ou L. 222-5 du Code de la consommation) ?**
8. **TVA / facturation** : l'agence parrain doit-elle facturer BRH à hauteur de la commission cash ? Faut-il une mention spécifique sur la facture ? Quel est le régime de TVA applicable (apport d'affaires entre agences = prestation de services facturée HT) ?**
9. **Risque d'inscription auprès de l'AMF** ou autre autorité ? Le programme est-il considéré comme une activité d'intermédiation financière ?
10. **Le Programme est-il compatible avec le RGPD** (DPIA-light déjà produit, fichier joint) ?

---

## 6. Livrables attendus de l'avocat

1. **Avis juridique écrit** sur les 10 questions ci-dessus (max 5 pages).
2. **CGU validées** ou propositions de modifications point par point sur le draft fourni.
3. **Modèle de facture-type** pour le versement cash de l'agence parrain à BRH (TVA + mentions obligatoires).
4. **Recommandations sur l'information précontractuelle** à l'agence parrainée (formulation à intégrer dans `/inscription/agence`).
5. **Si modifications nécessaires** : proposition de barème alternatif sécurisé (ex: plafond annuel par agence parrain, limitation du nombre de niveaux, etc.).

---

## 7. Documents annexes

Tous accessibles au repo Git BRH (privé) — accès lecture sur demande :

| Document | Chemin | Description |
|----------|--------|-------------|
| Draft CGU Programme | `docs/legal/cgu-agence-programme-recommandation-draft.md` | À valider |
| DPIA-light Phase 16 | `docs/legal/DPIA-light-Phase16.md` | RGPD existant |
| Modèle économique unifié | `docs/wiki/agence-lead-economy.md` | Détail technique 4 sources de leads |
| Score Vente Agences | `docs/wiki/score-vente-agences.md` | Modèle Hoguet « A » justifié |
| Migration cascade SQL | `supabase/migrations/20260706210000_brh_agence_referral_chain.sql` | Implémentation cap 5 niveaux + détection cycles |

---

## 8. Calendrier souhaité

- **Envoi brief** : 2026-05-06
- **Premier retour avocat** : sous 10 jours ouvrés
- **Itérations CGU** : 2 semaines
- **Validation finale + intégration produit** : 2026-06-15 au plus tard
- **Lancement public Programme de recommandation** : conditionné à la validation écrite de l'avocat

**Le Programme est techniquement déployé** (commits Git du 2026-05-06) **mais reste désactivé côté UI** (la table `brh_agence_referral_commissions` se remplit en backend) **jusqu'à validation juridique**. Les premières commissions générées en pilote restent au statut `pending` et ne sont pas versées tant que l'avocat n'a pas tranché.

---

## 9. Contact technique

Pour toute question sur l'implémentation technique (algorithme de cascade, RLS, audit trail, anti-fraude), l'avocat peut contacter :

- **Philippe Gagnon** — philippegagnonp@gmail.com
- **CG GROUPE** — VPS `147.93.52.70` (logs accessibles à la demande)
- Code source migrations + triggers : `supabase/migrations/20260706200000_*.sql` et `20260706210000_*.sql`

---

## Pièce jointe à fournir à l'avocat

1. Ce brief
2. `cgu-agence-programme-recommandation-draft.md`
3. `DPIA-light-Phase16.md`
4. Capture d'écran de la page `/agence/parrainage` (onglet Mon arbre) pour visualiser l'UX
5. Copie de la charte partenariat actuelle (template_version v1.0)
