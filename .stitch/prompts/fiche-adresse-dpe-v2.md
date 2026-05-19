---
page: fiche-adresse-dpe-v2
---
Fiche adresse DPE plein écran cohérente avec la maquette "Fiche Client Expert - Famille Lefebvre" (projet BRHCRM Direction Commerciale). Adresse Bretagne avec DPE F ou G prioritaire pour BRH.

Tous les libellés en FRANÇAIS strict. Pas d'anglais (pas "Save Changes", pas "Audit Log", pas "Client Ledger"). Utiliser : "Enregistrer", "Journal d'activité", "Mes leads", etc.

**Charte (native du projet BRHCRM Direction Commerciale)** :
- primary #00600a, primary_container #1c7b1d (vert BRH)
- background #f8faf8, surface_container #eceeec
- on_surface #191c1b, on_surface_variant #404a3c
- outline #707a6a, outline_variant #bfcab8
- error #ba1a1a, error_container #ffdad6
- Font INTER partout

PAS DE BLEU lavande. Palette VERT BRH + zinc neutre.

**Structure (cohérent avec fiche-client-complete v3) :**

1. **Header sticky** :
   - Gauche : breadcrumb "← Mes leads · Liste adresses · 45 rue des Brebis"
   - Centre : H1 INTER 700 "45 rue des Brebis, 29600 Morlaix" + sous-titre Manrope "Maison individuelle · 162 m² habitables · construite 1962"
   - Droite : badge DPE grand (F orange #f47b00 ou G rouge #d80000), bouton favori étoile, bouton "Enregistrer" primary vert #00600a

2. **Section "Déjà visité par"** (encadré subtle) : avatars chainés + dates + notes des collègues qui ont visité

3. **Layout 2 colonnes** :

**Gauche (60%)** :

#### Carte "Identité de l'adresse" éditable
- Champs : adresse, code postal, ville, type local (Maison/Appartement), année construction, surface habitable, surface terrain, nombre pièces principales
- Bouton "Modifier" → édition inline

#### Carte "Performance énergétique DPE" éditable
- Badge DPE grand officiel (F #f47b00 ou G #d80000) + valeurs "420 kWhEP/m²/an · 95 kgCO2/m²/an"
- Sous-titre : "DPE actuel · réalisé en YYYY · DPE estimé après travaux : C (à confirmer)"
- **Table éditable POSTE TECHNIQUE / ÉTAT / ENTREPRISE / DATE** (identique à fiche client) :
  - Murs (isolation)
  - Toiture / Combles
  - Plancher bas
  - Fenêtres / Menuiseries
  - Chauffage
  - Ventilation
  - Eau chaude sanitaire
  - Tableau électrique
- Pour chaque ligne : select état + texte entreprise + date picker + bouton crayon édition
- Encadré vert pâle bas : "Gain énergie estimé après travaux complets : −X kWh/an, économie de Y €/an"

#### Carte "Historique des travaux réalisés"
- Timeline verticale chronologique
- Pour chaque entrée : date + poste + entreprise + montant si connu

#### Carte "Suivi commercial terrain" éditable
- Chips intérêt (chaud rouge / tiède amber / froid zinc / à recontacter vert pâle BRH / refus gris)
- Date dernière visite + employé
- Créneau dispo préféré
- Textarea notes
- Bouton "Enregistrer" primary vert

**Droite (40%)** :

#### Carte "Habitants identifiés"
- Liste 1-3 contacts BRH liés à cette adresse
- Chaque : avatar + nom + tier (gold/silver/bronze) + tel cliquable + lien fiche

#### Carte "Propriétaire"
- Si SCI : encadré avec dénomination + SIREN + forme juridique + bouton "Voir la fiche entreprise"
- Si particulier : nom (si connu) + lien fiche
- Badge "Succession potentielle" rose pâle BRH si dirigeant décédé

#### Carte "Scoring BRH"
- 3 jauges circulaires : Score travaux, Score vente, Score succession
- Couleurs orange #ea580c (élevé) ou vert #16a34a

#### Carte "Données socio-démographiques (IRIS)"
- Décile estimé, type ménage, vacance logement, MaPrimeRénov éligibilité

#### Carte "Risques & zones"
- Chips : RGA (faible/moyen/fort), Radon catégorie, TLV (tendue), OPAH active

#### Carte "Actions rapides"
- Boutons : Appeler · Email · SMS · Créer RDV · Générer devis

4. **Footer** : Journal d'activité (audit log) avec dernière modification + employé + lien "Voir tout l'historique"

Tous les libellés en FRANÇAIS. Aucun bleu lavande visible.
