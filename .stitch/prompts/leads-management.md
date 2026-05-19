---
page: leads-management
---
Vue gestion leads CRM BRH Habitat — fusion liste + fiche adresse détaillée (Pipedrive/Linear pattern). Page principale pour commerciaux BRH terrain (employés internes, agences partenaires, artisans).

Layout split : **sidebar gauche fixe** + **liste centrale** + **drawer fiche détaillée à droite** (slide depuis la droite au clic sur un lead).

**DESIGN SYSTEM (REQUIRED — charte officielle BRH du code, ZÉRO BLEU) :**

Fonts: Epilogue 600/700 for headings, Manrope 400/500/700 for body, Material Symbols Outlined for icons.

Palette = ZINC NEUTRAL + VERT BRH UNIQUEMENT. Aucun bleu.

Background body: #fafaf9 (zinc-50, pas champagne ni beige).
Cards: #ffffff white pur, border #e7e5e4, radius 12px.
Hover/zebra rows: #f5f5f4 (zinc-100).
Sidebar fixe gauche: bg #003404 (brand-deep) avec text white sur actif, #86efac sur hover, #ecfdf5 sur idle.

Text: #1c1917 (zinc-900) principal, #57534e (zinc-600) muted, #a8a29e (zinc-400) subtle.

Vert BRH (brand sparing) :
- #003404 sidebar + CTA primary "Mettre à jour" / "Nouveau lead"
- #00600a links et secondary actions
- #86efac hover état doux
- #ecfdf5 background actif (chip success)
- #16a34a success principal

Sémantique chips :
- chaud rouge bg #fee2e2 border #dc2626 text #991b1b
- tiède amber bg #fef3c7 border #d97706
- froid ZINC NEUTRE bg #f5f5f4 border #57534e text #1c1917 (PAS bleu)
- à recontacter VERT PÂLE BRH bg #ecfdf5 border #16a34a text #14532d
- refus bg #e7e5e4 border #44403c

Tier badges (warm amber, PAS bleu) :
- Gold bg #fef3c7 border #d97706 text #92400e
- Silver bg #e7e5e4 border #57534e text #1c1917
- Bronze bg #fed7aa border #c2410c text #7c2d12

DPE labels couleurs officielles : A #00a651, B #51b04b, C #c4d041, D #fff200, E #f5b300, F #f47b00, G #d80000 (rouge intense).

Layout: max-w container, table dense lignes 48-56px, padding cellule px-3 py-2.

Style: Linear Inbox + Pipedrive + Stripe Dashboard EN VERT BRH (jamais bleu). Material Design 3.

**Page Structure (1 seul écran qui fusionne P2 et P3) :**

### Sidebar gauche fixe (240px)
- Background #003404 (vert profond BRH)
- Logo BRH Habitat en haut + texte "Portail Pro"
- Navigation : Dashboard / Leads (actif highlight) / Tournée du jour / Statistiques / Paramètres
- Items inactifs text #ecfdf5, actif bg rgba(255,255,255,0.1) text white avec barre verticale brand-light #86efac à gauche
- Avatar utilisateur en bas + bouton déconnexion

### Header central (sticky top)
- H1 Epilogue 700 "Mes leads" + sous-titre Manrope #57534e "16 607 contacts BRH · 5 524 enrichis · 133 gold"
- Right: toggle Liste/Carte, bouton "Exporter CSV" secondary, bouton "+ Nouveau lead" primary vert #003404

### Barre filtres rapides (sticky sous header)
- Input recherche grand avec icône search
- Select Département (Tous/22/29/35/56)
- Chips toggle (zinc neutre par défaut, vert BRH quand actif) :
  - Avec téléphone / Avec email / Avec CA / Avec RDV / DPE F/G uniquement
- Chips Tier (Gold/Silver/Bronze avec compteurs)
- Chips Intérêt (chaud/tiède/froid/à recontacter)
- Bouton "Filtres avancés" outline

### Layout principal SPLIT (2/3 + 1/3)

**Colonne gauche (2/3) — Table dense leads** :
- Card #ffffff border #e7e5e4 rounded-xl
- Header sticky cols : Tier · Contact · Ville · DPE · Surface · Tél/Email · CA · Intérêt · Action
- 8-10 lignes visibles (zebra subtle alterne #ffffff / #fafaf9)
- Hover row bg #f5f5f4
- Ligne sélectionnée bg #ecfdf5 (vert pâle BRH) + barre gauche #00600a
- Chaque ligne : avatar 32px circulaire #e7e5e4 fallback initiales, nom Manrope 500 + société Manrope 400 muted, DPE label colored badge officiel, icônes tel/mail verts si dispo gris si absent, intérêt chip coloré, bouton chevron "Voir" sur l'action
- Pagination en pied : "Page 1/31 · 1 543 résultats"

**Colonne droite (1/3) — Drawer fiche adresse détaillée** :
- S'affiche quand un lead est sélectionné (sinon empty state "Sélectionnez un lead pour voir sa fiche")
- Card #ffffff sticky scrollable
- Header drawer : bouton X fermer top-right, breadcrumb "45 rue des Brebis", bouton favori étoile, bouton "Ouvrir en grand" (vers route /employe/clients-brh/:id ou /leads/adresse/:id)
- Section adresse : H2 Epilogue "45 rue des Brebis", sous-titre "29600 Morlaix · Maison individuelle · 162 m² · construite 1962"
- DPE label gros : badge G rouge #d80000 + valeurs (420 kWhEP/m²/an · 95 kgCO2/m²/an)
- Section "Habitants identifiés" : 1-2 cartes mini personnes (nom + tier + tel cliquable)
- Section "Propriétaire" : encadré (si SCI : denomination + SIREN + bouton "Voir fiche entreprise" ; sinon : nom particulier)
- Section "Performance énergétique" : 4 chips qualité (Murs/Toiture/Fenêtres/Chauffage) avec couleur verte si bon, rouge si mauvais
- Section "Historique foncier (DVF)" : 2 mutations max avec date + nature + montant + €/m²
- Section "Suivi commercial terrain" éditable inline :
  - Chips intérêt cliquables (chaud/tiède/froid/à recontacter/refus)
  - Select travaux constatés (aucun/partiel/total/inconnu)
  - Input DPE estimé après visite
  - Date picker dernière visite
  - Select créneau dispo
  - Textarea notes commerciales
  - Bouton "Enregistrer" primary vert #003404
- Section "Scoring BRH" : 3 jauges circulaires Travaux/Vente/Succession (couleur orange #ea580c si élevé, vert #16a34a si bas)
- Footer drawer : "Mis à jour le 12/05 par Marc Durand · Voir historique"

### Bottom bar (footer minimal)
- "© 2026 BRH Habitat · Données B2B confidentielles · Audit log"

**Ambiance générale** : neutre zinc + vert BRH parcimonieux. Texture papier moderne. Pipedrive en VERT. Densité élevée mais respirable. Aucune trace de bleu indigo/sky/sapphire.
