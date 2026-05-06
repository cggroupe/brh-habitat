# Programme de recommandation BRH Habitat — Agences immobilières partenaires

**Document à valider par avocat spécialisé Hoguet/Hamon avant intégration aux CGU agences (Phase 16.1).**

**Version draft** : v1.0 du 2026-05-06 · **Rédacteur technique** : équipe BRH · **À valider** : avocat Hoguet (budget 1 500 € HT acté).

---

## Préambule

Le présent document décrit le **Programme de recommandation** mis en place par BRH Habitat à destination des agences immobilières signataires de la charte partenariat « agence_immo » (modèle Hoguet « A » — apport d'affaires non régulé). Il complète les Conditions Générales d'Utilisation (CGU) du portail Agence et constitue un avenant contractuel à la charte partenariat.

Toute agence partenaire est libre de participer au Programme. Aucune adhésion n'est obligatoire ni payante : la signature de la charte partenariat suffit.

---

## Article 1 — Définitions

- **Agence parrain** : agence immobilière signataire d'une charte partenariat BRH active qui partage son lien personnalisé `/inscription/agence?ref=<id>` avec une agence tierce.
- **Agence parrainée** : agence immobilière qui s'inscrit sur le portail BRH via le lien personnalisé d'une agence parrain ET qui signe ensuite une charte partenariat « agence_immo » à son nom.
- **Niveau de recommandation** : profondeur dans la chaîne de recommandation. Le Niveau 1 désigne la relation parrain↔filleul direct. Les Niveaux 2 à 5 correspondent aux relations indirectes (filleul d'un filleul, etc.) avec un cap absolu à 5 niveaux.
- **Charte active** : charte signée + email confirmé + statut `active` dans la base BRH.
- **Lead** : fiche d'opportunité scorée fournie par BRH via le catalogue Score Vente, accessible au claim selon le quota mensuel de l'agence.

---

## Article 2 — Récompense

Lorsqu'une agence parrainée signe et active sa charte partenariat, BRH crédite automatiquement les agences ancêtres (jusqu'au 5ᵉ niveau de la chaîne) selon le barème suivant :

| Niveau | Position | Récompense cash | Récompense leads |
|--------|----------|-----------------|------------------|
| **1** | Parrain direct | 100 € HT | +5 leads bonus |
| **2** | Grand-parrain | 25 € HT | +3 leads bonus |
| **3** | Arrière-grand-parrain | 10 € HT | +2 leads bonus |
| **4** | Niveau 4 | 5 € HT | +1 lead bonus |
| **5** | Niveau 5 | 5 € HT | +1 lead bonus |

**Total maximum par charte signée et activée : 145 € HT + 12 leads bonus**, distribués entre 5 ancêtres distincts.

Les leads bonus sont des fiches d'opportunité scorées supplémentaires que l'agence pourra claim dans le mois civil en cours, en complément du quota inclus dans son abonnement.

---

## Article 3 — Conditions de versement

### 3.1 Récompense conditionnée à un acte concret

La récompense (cash + leads) **n'est versée que si** l'agence parrainée signe effectivement une charte partenariat ET que cette charte passe au statut `active` (signature électronique simple eIDAS + confirmation email + acceptation conditions). Aucune récompense n'est versée pour une simple inscription, une visite du site, ou un téléchargement.

### 3.2 Workflow des commissions cash

Chaque commission cash suit un workflow à 4 statuts :
- `pending` : créée automatiquement à l'activation de la charte parrainée
- `validated` : validée par BRH (revue manuelle anti-fraude, max 30 jours)
- `paid` : versée par virement bancaire à l'agence parrain
- `cancelled` : annulée si la charte parrainée est elle-même annulée dans les 30 jours suivant signature, ou en cas de fraude détectée

### 3.3 Workflow des leads bonus

Les leads bonus sont crédités **immédiatement** au statut `pending` sur le compteur mensuel de l'agence parrain (`brh_agence_progression.referral_unlocked`). Ils sont consommables dès leur octroi via la fonction de claim du catalogue Score Vente.

### 3.4 Reset mensuel

Les compteurs de leads bonus (toutes sources : tier abonnement, contributions, parrainage, réseaux sociaux) sont remis à zéro le 1ᵉʳ jour de chaque mois. Les leads bonus non consommés à la fin du mois sont définitivement perdus.

Cette règle vise à préserver la fluidité du flux de leads disponibles dans le catalogue Score Vente et à éviter toute thésaurisation de droits différés.

### 3.5 Versement cash

Les versements cash sont effectués par BRH au plus tard le 15 du mois suivant la validation, à concurrence des montants au statut `validated`. Une facture sera émise par l'agence parrain (numéro SIRET + numéro carte T) pour récupérer la somme due.

---

## Article 4 — Garde-fous anti-pyramide

Le Programme de recommandation BRH n'est **pas un système de vente pyramidale** au sens de l'article L. 122-6 du Code de la consommation, ni un système d'organisation pyramidale prohibé par l'article L. 121-15 dudit code, pour les raisons suivantes :

1. **Aucun droit d'entrée** : aucune somme n'est demandée à l'agence pour rejoindre le Programme. La charte partenariat est gratuite. Aucun stock à constituer, aucun matériel à acheter.
2. **Récompense conditionnée à un acte commercial réel** : la rémunération est versée uniquement après la signature et l'activation effective d'une charte par l'agence parrainée. La rémunération n'est pas conditionnée à la simple adhésion ou au recrutement d'autres agences en cascade infinie.
3. **Cap absolu à 5 niveaux** : la cascade s'arrête au 5ᵉ niveau de la chaîne. Au-delà, aucune commission n'est due. Cap technique mis en place dans le code source (boucle SQL `EXIT WHEN v_level > 5`).
4. **Cash dégressif** : la rémunération cash décroît rapidement entre les niveaux (100 € → 25 € → 10 € → 5 € → 5 €). Le ratio cumulé n'incite pas à la recherche d'enrichissement par recrutement passif.
5. **Pas de quota minimum de recrutement** : l'agence partenaire n'a aucune obligation de parrainer pour conserver son statut, son abonnement ou son quota de leads.
6. **Détection des cycles** : le code source empêche les cycles de recommandation (A→B→A) via une condition `EXIT WHEN v_current = NEW.agence_id`.
7. **Vérification anti-fraude** : BRH se réserve le droit de valider manuellement chaque commission avant versement et d'annuler toute commission obtenue par dissimulation, fausse déclaration ou collusion entre agences.

---

## Article 5 — Obligations de l'agence parrain

L'agence parrain s'engage à :
- Ne partager le lien de parrainage qu'avec des agences immobilières françaises sérieuses (titulaires de la carte professionnelle T, en activité).
- Ne pas pratiquer de démarchage abusif, de spam ou de communications non sollicitées au nom de BRH.
- Respecter le RGPD lors de tout partage de coordonnées professionnelles (mention claire de l'origine du contact).
- Ne pas usurper l'identité de BRH ni laisser entendre que l'agence parrainée doit verser une somme pour rejoindre le réseau.

---

## Article 6 — Sanctions

Tout manquement aux obligations de l'article 5, ou toute tentative de fraude au Programme, peut entraîner :
- L'annulation des commissions cash et leads bonus déjà acquises mais non versées
- La suspension temporaire du Programme pour l'agence concernée
- La résiliation de la charte partenariat dans les cas les plus graves (article 8 de la charte partenariat)

---

## Article 7 — Modification et arrêt du Programme

BRH se réserve le droit de modifier le barème de récompense, le nombre de niveaux ou les conditions d'éligibilité avec un préavis de 30 jours communiqué par email à l'ensemble des agences partenaires actives. Les commissions déjà au statut `pending` ou `validated` au moment de la modification restent dues selon les conditions en vigueur lors de leur création.

BRH peut arrêter le Programme à tout moment moyennant un préavis de 90 jours. Les commissions au statut `validated` au moment de l'arrêt sont versées normalement.

---

## Article 8 — Droit applicable et juridiction

Le présent Programme est régi par le droit français. Tout litige relatif à son exécution sera soumis aux tribunaux compétents du ressort du siège social de BRH Habitat (Bretagne).

---

**Annexe — référence au code source de l'application**

Pour traçabilité et audit, l'implémentation technique du Programme est documentée dans le wiki interne BRH :
- [docs/wiki/agence-lead-economy.md](../wiki/agence-lead-economy.md) — modèle complet
- Migrations SQL : `supabase/migrations/20260706200000_brh_agence_lead_economy_unified.sql` + `20260706210000_brh_agence_referral_chain.sql`
- Trigger cascade : fonction PL/pgSQL `brh_agence_referral_commission_trigger()`
- Cap 5 niveaux : `EXIT WHEN v_level > 5`
- Détection cycles : `EXIT WHEN v_current = NEW.agence_id`
