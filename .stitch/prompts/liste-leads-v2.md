---
page: liste-leads-v2
---
Liste des leads BRH Habitat — vue dense type Pipedrive/Linear pour commerciaux. Page "Mes leads" qui regroupe les 16 607 contacts BRH historiques + DPE F/G prioritaires. Cohérent avec la maquette "Fiche Client Expert - Famille Lefebvre" du même projet.

Tous les libellés en FRANÇAIS strict. Aucun anglais (pas "Filters", "Export", "Search" → "Filtres", "Exporter", "Rechercher").

**Charte (native projet BRHCRM Direction Commerciale)** :
- primary #00600a, primary_container #1c7b1d (vert BRH)
- background #f8faf8, surface_container #eceeec
- on_surface #191c1b
- outline #707a6a
- Font INTER

PAS de bleu. Palette VERT BRH + zinc neutre.

**Structure :**

1. **Header sticky** :
   - H1 INTER 700 "Mes leads"
   - Sous-titre INTER 400 #404a3c "16 607 contacts BRH · 5 524 enrichis · 133 dans le tier Or"
   - Droite : bascule "Liste / Carte", bouton "Exporter CSV" outline, bouton "+ Nouveau lead" primary vert #00600a

2. **Barre de filtres rapides** (sticky sous header) :
   - Input recherche grand avec icône loupe : placeholder "Rechercher nom, société, ville, téléphone..."
   - Select Département : "Tous départements" / 22 / 29 / 35 / 56
   - Chips toggle (état actif vert pâle BRH #ecfdf5 border #00600a) :
     - "Avec téléphone" / "Avec email" / "Avec chiffre d'affaires" / "Avec RDV" / "DPE F ou G"
   - **Chips Tier** colorés amber : "Tous" · "Or (133)" · "Argent (1 543)" · "Bronze (3 848)" · "À enrichir (11 083)"
   - **Chips Intérêt** : "Chaud" rouge · "Tiède" amber · "Froid" zinc neutre · "À recontacter" vert pâle BRH · "Refus" gris
   - Bouton "Filtres avancés" outline

3. **Stats inline** (4 cartes petites en row) :
   - Total filtré · "Chauds" (rouge) · "Avec RDV" · "Sans contact" (alerte amber)

4. **Table principale** (carte rounded-xl, sticky header) :
   - Colonnes (toutes libellées en FR) :
     - Checkbox sélection
     - **Tier** : badge amber Or/Argent/Bronze ou "—"
     - **Contact** : avatar 32px + nom + société en sous-ligne
     - **Ville (CP)** : "Brest (29200)"
     - **DPE** : badge couleur officielle F/G/E/D/C/B/A
     - **Surface** : "162 m²"
     - **Contacts** : icônes téléphone + enveloppe (vert si dispo, zinc si absent, cliquables tel:/mailto:)
     - **CA cumulé** : "12 450 €" ou "—"
     - **Dernier RDV** : "12 oct. 2024" ou "—"
     - **Vu par** : avatars empilés horizontalement des collègues qui ont déjà visité (chip "+N" si plus de 3), tooltip avec liste noms+dates
     - **Intérêt** : chip coloré chaud/tiède/froid/à recontacter
     - **Action** : bouton "Voir →" outline qui ouvre la fiche
   - Lignes hover bg #fafaf9, lignes sélectionnées bg #ecfdf5 (vert pâle BRH) + barre gauche vert
   - 25 lignes visibles minimum

5. **Pagination en pied** :
   - "Page 1 sur 31 · 1 543 résultats"
   - Boutons "Précédente" / "Suivante"
   - Saut direct à la page

6. **Drawer "Filtres avancés"** (slide right) :
   - Range slider "Score enrichissement (0-15)"
   - Range "Année construction"
   - Range "Surface (m²)"
   - Toggle "Succession potentielle"
   - Toggle "Mutations DVF récentes (12 mois)"
   - Checkboxes "MaPrimeRénov" : Bleu / Jaune / Violet / Rose
   - Boutons "Appliquer" primary vert + "Réinitialiser" outline

Vue compacte type CRM, densité élevée mais lisible. Référence Pipedrive et Linear Inbox MAIS EN VERT BRH.
