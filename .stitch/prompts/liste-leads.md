---
page: liste-leads
---
Page liste "Mes leads" pour les commerciaux BRH (employé interne / agence partenaire / artisan). Vue dense type Linear Inbox / Pipedrive Apollo avec filtres simplifiés en haut, table de leads triable, et drawer de filtres avancés à droite. Cible : permettre à un commercial de qualifier rapidement 50-200 leads, filtrer par intérêt/tier/département/DPE, et cliquer pour voir la fiche.

**DESIGN SYSTEM (REQUIRED) :**

Fonts: Epilogue 600/700 for headings, Manrope 400/500/700 for body, Material Symbols Outlined for icons.

Background body: champagne beige #fbf9f8.

Colors:
- Primary green (brand BRH): #003404
- Primary container: #abf59d
- Surface container: #e5eeff (table header, hover), #dce9ff (selected rows)
- Text on surface: #0b1c30 ; secondary: #5e5e5e ; outline: #717a6c

DPE label badges petits (24x18px) :
- A vert, B vert clair, C jaune-vert, D jaune, E orange clair, F orange, G rouge

Tier badges (icône + label) :
- Gold #fff8e1/#ffc107/#b8860b
- Silver #f5f5f5/#9e9e9e
- Bronze #fff3e0/#cd7f32/#8d4a00

Intérêt chips : chaud rouge / tiède orange / froid bleu / à recontacter violet / refus gris

Layout: max-w container, table dense lignes 48-56px hauteur, padding cellule px-3 py-2, gap-4 entre sections.

Style: Linear Inbox + Pipedrive + Stripe Dashboard. Densité élevée mais lisible. Material 3 chips et boutons.

**Page Structure :**

1. **Header sticky** :
   - Gauche : H1 Epilogue 700 "Mes leads" + sous-titre Manrope secondary "16 607 contacts BRH · 5 524 enrichis"
   - Droite : 2 boutons toggle "Liste" / "Carte" + bouton "Exporter CSV" secondary + bouton "Nouveau lead" primary

2. **Barre de filtres rapides** (carte fond white, sticky sous header) :
   - Input recherche grand (icône search) "Nom, société, ville, téléphone…"
   - Select Département : Tous / 22 / 29 / 35 / 56
   - Chips toggle filtres rapides :
     - "Avec téléphone" / "Avec email" / "Avec CA" / "Avec RDV" / "DPE F/G"
   - **Chips Tier** : Tous · Gold (133) · Silver (1 543) · Bronze (3 848) · À enrichir (11 083)
   - **Chips Intérêt** (post édition employé) : Tous · Chaud · Tiède · Froid · À recontacter
   - Bouton "Filtres avancés" qui ouvre un drawer à droite

3. **Stats inline** (4 cards petites en row, max-w-md) :
   - Total filtré : "1 543 leads"
   - Chaud : "127" (vert)
   - Avec RDV : "456"
   - Sans contact : "234" (alerte orange)

4. **Table principale** (carte, rounded-xl, overflow-x-auto) :
   - Header sticky avec colonnes :
     - Checkbox (sélection multiple)
     - Tier (badge gold/silver/bronze)
     - Contact (avatar + nom + société)
     - Ville (CP + commune)
     - DPE (label color)
     - Surface (m²)
     - Contacts (icônes tel et mail cliquables, vert si dispo, gris si NULL)
     - CA cumulé (€ ou —)
     - Dernier RDV (date ou —)
     - Intérêt (chip coloré)
     - Notes (icône + tooltip)
     - Action (3 dots menu : Voir fiche, Appeler, Email, Marquer faux positif)
   - Lignes : hover bg #e5eeff, selected bg #dce9ff
   - Tri possible sur chaque colonne (icône arrow)
   - 50 lignes par page

5. **Pagination en bas** :
   - Indicateur "Page 1 / 31 · 1 543 résultats"
   - Boutons Précédente / Suivante
   - Jump to page input

6. **Drawer filtres avancés** (slide depuis droite, 360px, fermé par défaut) :
   - Section "Score" : range slider 0-15
   - Section "Année construction" : range
   - Section "Surface m²" : range
   - Section "Succession potentielle" : toggle on/off
   - Section "Mutations DVF récentes" : toggle
   - Section "MaPrimeRénov couleur" : checkboxes Bleu/Jaune/Violet/Rose
   - Bouton "Appliquer" primary + "Reset" secondary

Doit être responsive desktop large (1280-1920px). Densité commerciale (Pipedrive-like).
