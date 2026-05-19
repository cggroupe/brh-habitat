---
page: fiche-adresse-dpe
---
Fiche adresse DPE plein écran pour les commerciaux BRH Habitat. Détail technique et commercial d'UNE adresse avec un DPE F ou G prioritaire (rénovation énergétique). Permet aux commerciaux terrain de qualifier l'adresse, voir l'historique mutations, les voisins du même secteur F/G, le propriétaire (particulier ou SCI), et mettre à jour les informations terrain.

**DESIGN SYSTEM (REQUIRED) :**

Fonts: Epilogue 600/700 for headings, Manrope 400/500/700 for body, Material Symbols Outlined for icons.

Background body: champagne beige #fbf9f8.

Colors:
- Primary green (brand BRH): #003404
- Primary container: #abf59d
- Surface container: #e5eeff (cards), #dce9ff (hover), #d3e4fe (variants)
- Text on surface: #0b1c30 ; secondary: #5e5e5e ; outline: #717a6c

DPE labels (très visuels) :
- A : bg #00a651 text white
- B : bg #51b04b text white
- C : bg #c4d041 text #003404
- D : bg #fff200 text #003404
- E : bg #f5b300 text white
- F : bg #f47b00 text white  ← cible BRH prioritaire
- G : bg #d80000 text white  ← cible BRH prioritaire

Intérêt commercial chips :
- chaud rouge bg #ffdad6, tiède orange bg #fff3e0, froid bleu bg #d3e4fe, à recontacter violet bg #e1bee7

Layout: max-w-5xl container, cards rounded-xl with subtle border #e5eeff, padding p-5 to p-6, gap-4 to gap-6.

Style: Material Design 3 (Material You). Luxe sobre B2B premium. Cohérent avec la fiche client BRH du même projet Stitch (Jean-Marc Lefebvre).

**Page Structure :**

1. **Header sticky** : breadcrumb "← Mes leads" + DPE label grand (F orange ou G rouge) + bouton favori étoile + bouton "Partager" secondaire.

2. **Hero adresse** (carte) :
   - H1 Epilogue 700 : adresse complète "45 rue des Brebis, 29600 Morlaix"
   - Sous-titre Manrope 400 secondary : "Maison individuelle · Construction 1962 · 162 m² habitables"
   - Mini-carte à droite (placeholder image Bretagne avec marker rouge)
   - Chips rapides : étiquette DPE (F gros), conso énergie primaire (kWhEP/m²/an), GES (kgCO2/m²/an), surface, année construction, type local

3. **Grille 2 colonnes principales** :

   **Colonne gauche (2/3)** :
   - **Performance énergétique** (carte) :
     - 2 jauges horizontales : Étiquette énergie (lettre F/G + valeur kWh) et Étiquette climat (GES kg CO2)
     - Détails techniques : système chauffage (description), type ventilation, isolation murs/menuiseries/plancher (4 chips qualité)
     - Estimation économies après travaux : encadré vert pâle "Gains potentiels : −X kWh/an, −Y €/an"
   - **Historique foncier (DVF)** (carte) :
     - Timeline verticale chronologique : 2-3 mutations
     - Pour chaque : date + nature (Vente/VEFA) + montant € en gras + surface m² + prix/m² calculé
     - Badge "groupée" orange si surface absente
   - **Voisinage F/G** (carte) :
     - Sous-titre "5 autres logements F/G dans la rue"
     - Liste compacte : adresse + DPE label + surface + lien fiche
   - **Suivi commercial terrain** (carte fond #e5eeff bordure #abf59d) :
     - Mêmes champs que la fiche client (intérêt chips, travaux select, DPE estimé après visite, créneau dispo, date visite, notes textarea)
     - Bouton "Mettre à jour" primary vert

   **Colonne droite (1/3)** :
   - **Propriétaire** (carte) :
     - Soit "Personne morale" avec encadré indigo : denomination SCI + SIREN + forme juridique + lien vers fiche entreprise
     - Soit "Particulier" avec encadré gris : nom (si connu) + lien fiche personne
     - Badge "Succession potentielle" rose si dirigeant décédé matché
   - **Habitants identifiés** (carte) :
     - Liste compacte des contacts BRH liés à cette adresse (1-3 personnes)
     - Chaque ligne : nom + tier badge + tel (clic-to-call) + lien fiche
   - **Scoring BRH** (carte) :
     - 3 jauges circulaires : Score travaux, Score vente, Score succession
     - Couleur de la jauge selon valeur (orange / vert)
   - **Données socio-démographiques IRIS** (carte) :
     - Décile estimé, type ménage, vacance logement, MaPrimeRénov éligibilité couleur (bleu/jaune/violet/rose)
   - **Risques** (carte petite) :
     - Chips : RGA (faible/moyen/fort), Radon catégorie, TLV (tendue), OPAH active

4. **Footer** : timestamp dernière mise à jour employé + lien "Voir l'historique des éditions"
