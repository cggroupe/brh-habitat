# BRH Habitat — Design System (extrait de Stitch project 6037063388122355367)

Synthèse pour les prompts Stitch et les implémentations React. Issue des 3 designs Stitch validés : dashboard, leaderboard, arbre-mlm (2026-05-08).

---

## 1. Identité visuelle

**Style** : Material Design 3 (Material You) appliqué au B2B BTP français. Luxe sobre, hauts de gamme, **vert BRH brand sparing**, neutres dominants. Ton "startup américaine prospection MLM" combiné Stripe Dashboard + Linear Inbox + Pipedrive + doTerra.

**Cible** : commerciaux internes BRH (employés terrain) + agences partenaires de Bretagne Rénovation Habitat. Pas de dark mode obligatoire. Pas de jargon corporate. Métier = rénovation énergétique habitat F/G en Bretagne.

---

## 2. Palette de couleurs

### Vert BRH (brand, usage parcimonieux)
```
primary:               #003404  ← vert profond, headlines + CTA primaires
primary-container:     #abf59d  ← chips actifs, mentions success
on-primary-container:  #78be6d  ← icônes sur primary-container
inverse-primary:       #90d883  ← darkmode-ish, accent secondaire
on-tertiary-container: #66c25b  ← variantes vert clair
on-primary-fixed:      #002202  ← vert très foncé contraste
```

### Surfaces (dominantes)
```
background:            #fbf9f8  ← champagne beige (BODY)
surface-container-low: #eff4ff  ← cartes secondaires
surface-container:     #e5eeff  ← cartes principales
surface-container-high:#dce9ff  ← cartes hover/active
surface-variant:       #d3e4fe  ← chip background, divider zones
```

### Texte
```
on-surface:            #0b1c30  ← texte principal (slate-900 like)
on-background:         #0b1c30  ← idem
secondary:             #5e5e5e  ← labels, captions
outline:               #717a6c  ← bordures discrètes
outline-variant:       #c0c9ba  ← séparateurs
```

### Sémantique
```
success / chaud:       #286c25, bg #abf59d/#9af98a
warning / tiède:       #ba1a1a... non, c'est rouge
error:                 #ba1a1a, bg #ffdad6, text on error: #93000a
info / froid:          surface-variant #d3e4fe
neutre:                #c7c6c5 (secondary-fixed-dim)
```

### Tier badges BRH (gold/silver/bronze)
```
gold:    bg #fff8e1 border #ffc107 text #b8860b   (à valider avec Philippe)
silver:  bg #f5f5f5 border #9e9e9e text #424242
bronze:  bg #fff3e0 border #cd7f32 text #8d4a00
none:    bg #ffffff border #c0c9ba text #5e5e5e (outline-variant)
```

### Intérêt commercial (chips éditables)
```
chaud:           bg #ffdad6 border #ba1a1a text #93000a  (rouge)
tiède:           bg #fff3e0 border #ff9800 text #c66900  (orange)
froid:           bg #d3e4fe border #5e5e5e text #0b1c30  (bleu)
à recontacter:   bg #e1bee7 border #7b1fa2 text #4a148c  (violet)
refus:           bg #c7c6c5 border #5e5e5e text #1b1c1b  (gris)
inconnu:         bg #ffffff border #c0c9ba text #717a6c  (vide)
```

---

## 3. Typographie

```
Font display (titres) :   Epilogue 600/700
Font body (paragraphes) : Manrope 400/500/700
Icônes :                  Material Symbols Outlined (FILL 0, wght 400)

Hiérarchie :
- H1 page :       Epilogue 700, 28-32px
- H2 section :    Epilogue 600, 20-24px
- H3 card :       Epilogue 600, 16-18px
- Body :          Manrope 400, 14-16px
- Caption :       Manrope 500, 11-12px uppercase tracking-wide
```

CDN à inclure si HTML pur :
```html
<link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@600;700&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
```

Dans le repo React : `Inter` (déjà en place) reste OK pour le body, mais ajouter `Epilogue` pour les titres clés des fiches refondues.

---

## 4. Composants clés

### Carte (card)
```
background : white (#ffffff)
border :     1px solid #e5eeff (surface-container)
radius :     12px (rounded-xl)
padding :    20-24px
shadow :     0 1px 3px rgba(11,28,48,0.04) (très subtil)
hover :      bg → #f8f9ff (surface neutre), shadow elevation 2
```

### Chips (filtres, badges)
```
height : 28px
radius : 9999px (rounded-full)
padding : 6-12px
typography : Manrope 500 11-12px
état actif : ring-2 ring-offset-1 ring-#717a6c
```

### Bouton primaire
```
bg :     #003404 (primary)
text :   #ffffff
radius : 8px
padding : 10-16px
hover :  brightness-110
```

### Bouton secondaire
```
bg :     #ffffff
text :   #003404
border : 1px solid #c0c9ba (outline-variant)
radius : 8px
```

### Input/Form
```
border :    1px solid #c0c9ba
radius :    8px
padding :   8-12px
focus :     ring-2 ring-#003404 ring-offset-1
font :      Manrope 400 14px
background: #ffffff
label :     uppercase tracking-wide 11px color #5e5e5e
```

### Section header avec icône
```
icon :     Material Symbol filled=0 wght=400 size=18-20
label :    Epilogue 600 12-14px uppercase tracking-widest color #003404
```

---

## 5. Layout & espacement

```
Max-width container : 1280px (xl) pour listes, 960px (md) pour fiches détaillées
Padding container :   24-32px (px-6 ou px-8)
Gap entre cartes :    16-24px (gap-4 ou gap-6)
Padding card :        20-24px (p-5 ou p-6)
Margin sections :     32-48px (my-8 ou my-12)
```

Header sticky (fiche détaillée) :
- Position : sticky top-0 z-10
- Background : white avec shadow-sm
- Padding : py-3 px-6
- Contenu : breadcrumb gauche + actions droite

---

## 6. Design System Notes for Stitch Generation

> **À copier-coller au début de chaque prompt Stitch.**

```
DESIGN SYSTEM BRH HABITAT (REQUIRED) :

Fonts: Epilogue 600/700 for headings, Manrope 400/500/700 for body, Material Symbols Outlined for icons.

Background body: champagne beige #fbf9f8.

Colors:
- Primary green (brand BRH, sparing): #003404
- Primary container: #abf59d (success chips, active states)
- Surface container: #e5eeff (cards), #dce9ff (hover), #d3e4fe (variants)
- Text on surface: #0b1c30 ; secondary: #5e5e5e ; outline: #717a6c
- Error: #ba1a1a on #ffdad6
- Success: #286c25 on #abf59d

Tier badges :
- Gold : bg #fff8e1 border #ffc107 text #b8860b
- Silver : bg #f5f5f5 border #9e9e9e
- Bronze : bg #fff3e0 border #cd7f32 text #8d4a00

Intérêt commercial chips (cliquables) :
- chaud rouge, tiède orange, froid bleu, à recontacter violet, refus gris

Layout: max-w-6xl container, cards rounded-xl with subtle border #e5eeff, padding p-5 to p-6, gap-4 to gap-6.

Style: Material Design 3 (Material You) applied to B2B premium. Luxe sobre, neutres dominants, vert BRH brand sparing. Référence: Stripe Dashboard + Linear Inbox + Pipedrive.

Target user: commerciaux BRH (rénovation énergétique habitat Bretagne).
Pas de dark mode. Pas de jargon corporate.
```

---

## 7. Iconographie Material Symbols (références utiles BRH)

```
home, location_on, badge, person, business, group,
phone, mail, sms,
trending_up, trending_down, monetization_on, savings, request_quote,
calendar_month, event, schedule,
construction, build, engineering, energy_savings_leaf,
favorite, star, bookmark, label_important,
edit, save, history, search, filter_list,
warning, error, check_circle, info,
chevron_right, expand_more, arrow_forward,
local_fire_department (chaud), ac_unit (froid)
```

---

## 8. Référence projets Stitch existants

- **Project ID** : `6037063388122355367`
- **Designs validés** (HTML+PNG dans `.stitch/designs/`) :
  - `dashboard.html` — Inbox du jour Linear-style
  - `leaderboard.html` — Classement Bretagne MLM
  - `arbre-mlm.html` — Visualisation parrainage 5 niveaux

Ces 3 designs sont la **source de vérité** de la charte. Toute nouvelle génération doit s'y aligner.

---

**Dernière maj** : 2026-05-19 — Claude Opus 4.7 (1M ctx), extrait des designs Stitch 2026-05-08.
