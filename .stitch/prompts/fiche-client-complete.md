---
page: fiche-client-complete
---
Fiche client BRH Habitat complète et entièrement éditable par les commerciaux terrain. Vue plein écran d'un contact avec édition inline de tous les champs (contact, DPE, travaux réalisés, ventilation, tableau électrique, isolation, chauffage). Marqueur "Client déjà vu" multi-employés.

**DESIGN SYSTEM (charte projet BRHCRM Direction Commerciale, natif Stitch) :**

Utiliser **strictement** le designTheme natif de ce projet BRH (configuré dans namedColors) :
- primary #00600a, primary_container #1c7b1d (vert BRH)
- background #f8faf8, surface_container #eceeec, surface_bright #f8faf8
- on_surface #191c1b, on_surface_variant #404a3c
- outline #707a6a, outline_variant #bfcab8
- error #ba1a1a, error_container #ffdad6
- secondary #565e74 (gris-vert)

Font: **INTER** uniquement (headline + body + label), comme le projet le définit.

Style : cohérent avec les écrans "Fiche Client - Famille Moreau", "Tableau de Bord Directeur Commercial", "Liste des Clients - BRHCRM" du même projet. PAS DE BLEU lavande, PAS de couleurs hors charte.

**Page Structure :**

### Header sticky
- Breadcrumb gauche : "← Mes leads · Liste des clients"
- Centre : titre H1 INTER 700 "Famille Lefebvre" + sous-titre "Client BRH historique"
- Droite : 
  - Badge "Gold Tier" amber #fef3c7
  - Bouton "✓ Marquer comme vu" avec checkbox — si déjà vu : badge vert "Vu par Marc D." avec avatar + date
  - Bouton "Sauvegarder" primary vert #00600a

### Section "👥 Déjà visité par" (encadré subtle si applicable)
- Avatars chainés horizontalement des employés qui ont coché "déjà vu" + dates + petite note
- Ex: "Marc Durand · 12/05/2024 · 'Hésite sur isolation, à recontacter'" + "Sophie L. · 03/04/2024"
- Permet d'éviter qu'un commercial repasse sur un client déjà visité

### Layout 2 colonnes

**Colonne gauche (60%)** :

#### Carte "Identité & Contact" (éditable)
- Avatar 64px + bouton modifier
- Champs en grid 2 colonnes éditables inline (focus → input visible, blur → text) :
  - Prénom · Nom · Société (si applicable)
  - Téléphone (clic-to-call vert) · Email (clic-to-mail)
  - Adresse complète · CP · Ville
  - Famille (nombre enfants) · Statut (Client/Prospect)
  - CA cumulé · Nb RDV historiques
- Bouton "Modifier" en haut droite → mode édition

#### Carte "DPE & Performance énergétique" (éditable)
- Badge DPE grand : F orange #f47b00 ou G rouge #d80000 + valeurs kWh/m²/an + kgCO2/m²/an
- Liste éditable des **postes techniques** (grid 2x4) :
  - **Murs (isolation)** : Select "Non isolé / Isolation simple / Isolation par l'intérieur (ITI) / Isolation par l'extérieur (ITE) / Inconnu" + date + entreprise
  - **Toiture / Combles** : Select "Non isolé / Combles perdus / Sarking / Inconnu" + date + entreprise
  - **Plancher bas** : Select + date + entreprise
  - **Fenêtres / Menuiseries** : Select "Simple vitrage / Double vitrage récent / Triple vitrage / PVC / Alu / Bois" + date + entreprise
  - **Chauffage** : Select "Chaudière fioul / Chaudière gaz / Pompe à chaleur / Poêle bois / Granulés / Électrique / Solaire" + marque + date + entreprise
  - **Ventilation** : Select "Naturelle / VMC simple flux / VMC double flux / Hygro A / Hygro B" + date + entreprise
  - **Eau chaude sanitaire** : Select "Cumulus / Chaudière mixte / Thermodynamique / Solaire" + date + entreprise
  - **Tableau électrique** : Select "Conforme NFC 15-100 / À mettre aux normes / Récent / Inconnu" + date + entreprise
- Pour chaque ligne : icône Material Symbol approprié + select + champ "Entreprise réalisatrice" + date picker + petit textarea note
- Encadré vert pâle bottom : "Gain potentiel après travaux complets : −X kWh/an · −Y €/an · DPE estimé : D"

#### Carte "Historique des travaux réalisés" (timeline)
- Timeline verticale chronologique des travaux confirmés
- Pour chaque entrée : date + poste (icône) + entreprise (logo si dispo) + montant € si connu + photos avant/après (placeholder)
- Bouton "+ Ajouter un travaux"

**Colonne droite (40%)** :

#### Carte "Suivi commercial terrain"
- Chips intérêt (chaud rouge #ffdad6 / tiède amber / froid zinc neutre / à recontacter vert pâle BRH / refus gris)
- Date dernière visite + employé
- Créneau dispo préféré select
- Textarea notes libres
- Bouton "Enregistrer" primary vert #00600a

#### Carte "Profil psycho-commercial (IA)" 
- 4 lignes label/value : Segment estimé, Style de communication, Canal préféré, Confidence
- Liste motivateurs (chips vert pâle), barrières (chips amber)
- Encadré italique "Conseil commercial" surface_container

#### Carte "Liens patrimoniaux 360°"
- Section "Adresses détenues" : liste cards (adresse + DPE + lien fiche)
- Section "Mutations DVF" : timeline (date + montant + €/m²)
- Section "Succession potentielle" si match : encadré tertiaire #ffd9e0 (rose pâle BRH)
- Section "Alertes BODACC" : liste compacte

#### Carte "Actions rapides"
- Boutons grille 2x2 : Appeler · Email · SMS · Créer RDV
- Bouton "Générer devis" primary vert

### Footer
- Audit log : "Mis à jour le 19/05/2024 par Marc Durand · Voir historique des modifications (12 entrées)"
- Petit lien "Marquer comme client problématique" (flag)

**Spécifications édition** :
- Chaque champ doit être facilement modifiable (clic pour éditer inline)
- Auto-save après 2s d'inactivité OU bouton "Sauvegarder" global
- Indicateur visuel quand modifié non sauvegardé (dot orange)
- Validation : DPE estimé doit être A-G uniquement, dates en passé, etc.
- Le marqueur "déjà vu" enregistre user_id + timestamp + note optionnelle
- Les autres employés voient les badges "Vu par X" en évidence pour éviter doublons

Pas de bleu (sauf info sémantique très rare).
