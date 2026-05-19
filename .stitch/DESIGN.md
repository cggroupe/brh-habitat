# BRH Habitat — Design System (charte officielle du code)

**Source de vérité** : `src/index.css` (variables CSS du repo brh-habitat).
Ce fichier remplace les anciennes extractions erronées (designs Stitch v1 contenaient du bleu hors-charte).

---

## 1. Identité visuelle

**Style** : SaaS B2B premium pour BRH Habitat (rénovation énergétique habitat F/G en Bretagne). Vert profond brand sparing + neutres zinc dominants. Pas de bleu (sauf info sémantique rare). Material Design 3 retenu, mais **palette stricte** : ZINC + VERT BRH uniquement.

**Référence** : Stripe Dashboard + Linear Inbox + Pipedrive — mais en VERT BRH, jamais bleu.

---

## 2. Palette (officielle, depuis index.css)

### Vert BRH (brand)
```
brand-deep      #003404   ← sidebar bg, CTA primary, headlines critiques
brand           #00600a   ← primary actions, links
brand-light     #86efac   ← hover state, illumination
brand-soft      #ecfdf5   ← background subtil "active", chips success doux
primary         #0f7a2a   ← variantes
primary-dark    #062a0d   ← variantes très foncées
secondary       #16a34a   ← Tailwind green-600 (success principal)
accent          #86efac
```

### Neutres ZINC (dominants — PAS slate, PAS gray, PAS bleu)
```
canvas          #fafaf9   ← BODY page (zinc-50)
surface         #ffffff   ← cards, panels (blanc pur)
surface-low     #f5f5f4   ← hover row, zebra subtle (zinc-100)
surface-muted   #e7e5e4   ← border subtle (zinc-200)
border          #e7e5e4   ← zinc-200
border-strong   #d6d3d1   ← zinc-300
text            #1c1917   ← zinc-900 (texte principal)
text-muted      #57534e   ← zinc-600 (labels, captions)
text-subtle     #a8a29e   ← zinc-400 (placeholders, dividers)
neutral-dark    #44403c   ← zinc-700
footer-dark     #292524   ← zinc-800
```

### Sémantiques
```
success         #16a34a   bg soft #dcfce7
warning         #d97706   bg soft #fef3c7   (orange)
danger          #dc2626   bg soft #fee2e2
info            #2563eb   bg soft #dbeafe   ← SEUL bleu, à éviter sauf alerte info

score-ultra     #dc2626   ← rouge intense
score-hot       #ea580c   ← orange vif
score-warm      #d97706   ← orange
score-cold      #71717a   ← gris zinc
```

### Tier badges BRH (gold/silver/bronze)
```
gold     bg #fef3c7  border #d97706  text #92400e   (warm amber)
silver   bg #e7e5e4  border #57534e  text #1c1917   (zinc neutre)
bronze   bg #fed7aa  border #c2410c  text #7c2d12   (orange profond)
none     bg #fafaf9  border-dashed #d6d3d1  text #a8a29e
```

### Intérêt commercial chips (édition employé terrain)
```
chaud           bg #fee2e2 border #dc2626 text #991b1b   (rouge)
tiede           bg #fef3c7 border #d97706 text #92400e   (amber)
froid           bg #f5f5f4 border #57534e text #1c1917   (zinc neutre — PAS bleu)
a_recontacter   bg #ecfdf5 border #16a34a text #14532d   (vert pâle BRH)
refus           bg #e7e5e4 border #44403c text #1c1917   (zinc foncé)
inconnu         bg #ffffff border-dashed #d6d3d1 text #a8a29e
```

### DPE labels (officiels gouvernement)
```
A   bg #00a651 text white
B   bg #51b04b text white
C   bg #c4d041 text #1c1917
D   bg #fff200 text #1c1917
E   bg #f5b300 text white
F   bg #f47b00 text white   ← cible BRH prioritaire
G   bg #d80000 text white   ← cible BRH prioritaire
```

---

## 3. Typographie

```
Font display (titres) :   Epilogue 600/700
Font body (paragraphes) : Manrope 400/500/700
(L'app React utilise Inter en fallback, mais Stitch privilégie Epilogue+Manrope)
Icônes :                  Material Symbols Outlined (FILL 0, wght 400)
```

---

## 4. Composants

### Carte
```
background : #ffffff
border :     1px solid #e7e5e4
radius :     12px (rounded-xl)
padding :    20-24px
hover :      bg #fafaf9, border #d6d3d1
shadow :     0 1px 2px rgba(28,25,23,0.04)
```

### Bouton primaire
```
bg #003404 text #ffffff radius 8px padding 10-16px hover brightness-110
```

### Bouton secondaire
```
bg #ffffff text #003404 border #d6d3d1 radius 8px hover bg #f5f5f4
```

### Sidebar (référence pages portail)
```
bg #003404 (brand-deep)
text white sur active, text #86efac (brand-light) sur hover, text #ecfdf5 sur idle
items padding 12-16px, gap 4px entre liens
icône Material Symbols filled=0
```

### Chip
```
height 28px radius 9999px padding 6-12px font Manrope 500 11-12px
active : ring-2 ring-offset-1 ring-#00600a
```

---

## 5. Design System Notes for Stitch Generation

> **À copier-coller au début de chaque prompt Stitch.**

```
DESIGN SYSTEM BRH HABITAT (REQUIRED — charte officielle du code, src/index.css) :

Fonts: Epilogue 600/700 for headings, Manrope 400/500/700 for body, Material Symbols Outlined for icons.

Palette = ZINC NEUTRAL + VERT BRH (PAS DE BLEU, jamais).

Background body: #fafaf9 (zinc-50).
Cards: #ffffff (white pur), border #e7e5e4, radius 12px.
Hover/zebra rows: #f5f5f4 (zinc-100).
Border subtle: #e7e5e4, strong: #d6d3d1.

Text: #1c1917 (zinc-900), muted #57534e (zinc-600), subtle #a8a29e (zinc-400).

Vert BRH (brand — sparing) :
- brand-deep #003404 (sidebar, CTA primary, headlines critiques)
- brand #00600a (links, secondary primary)
- brand-light #86efac (hover, illumination)
- brand-soft #ecfdf5 (background actif subtil)
- success principal #16a34a / bg-soft #dcfce7

Sémantique : warning #d97706 / soft #fef3c7, danger #dc2626 / soft #fee2e2.

INTERDIT : bleu (#2563eb, #1d4ed8, #3b82f6 etc), violet, rose-saumon. Seul bleu toléré = info sémantique rare.

Tier badges :
- Gold : bg #fef3c7 border #d97706 text #92400e (amber warm)
- Silver : bg #e7e5e4 border #57534e text #1c1917 (zinc neutre)
- Bronze : bg #fed7aa border #c2410c text #7c2d12

Intérêt commercial chips :
- chaud rouge #fee2e2/#dc2626
- tiède amber #fef3c7/#d97706
- froid zinc neutre #f5f5f4/#57534e (PAS bleu)
- à recontacter vert pâle BRH #ecfdf5/#16a34a
- refus zinc foncé #e7e5e4/#44403c

DPE labels officiels : A vert, B vert clair, C jaune-vert, D jaune, E orange clair, F orange #f47b00, G rouge #d80000.

Layout: max-w-7xl container, cards rounded-xl, padding p-5 to p-6, gap-4 to gap-6.

Style: Material Design 3 (Material You) en VERT BRH. Référence: Stripe Dashboard + Linear Inbox + Pipedrive, mais SANS bleu. Densité commerciale Pipedrive-like pour CRM.

Target: commerciaux BRH terrain (rénovation énergétique habitat Bretagne).
```

---

**Dernière maj** : 2026-05-19 — Claude Opus 4.7, **charte corrigée depuis index.css officiel** (les v1 contenaient du bleu hors-charte, invalidé par Philippe).
