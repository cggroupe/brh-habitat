/**
 * Genere la presentation PPTX pour le RDV BRH demain.
 * Charte BRH appliquee (vert primaire, Oswald/Raleway via fonts safes).
 * 14 slides, 14 hero shots, pret a projeter.
 */

import PptxGenJsMod from 'pptxgenjs'
const pptxgen = (PptxGenJsMod as unknown as { default?: typeof PptxGenJsMod }).default ?? PptxGenJsMod
type pptxgen = typeof pptxgen
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HERO = join(ROOT, 'screenshots', 'hero')
const OUT = join(ROOT, '..', 'BRH_Presentation.pptx')

// ─── Charte ─────────────────────────────────────────────────────────────────
const C = {
  primary: '1c7b1d',
  primaryDark: '094114',
  secondary: '359932',
  eco: '81c784',
  darkGray: '3d3d3d',
  lightBg: 'F5F5F0',
  white: 'FFFFFF',
  textDark: '1B1C1C',
  textLight: '6B7280',
}
const FONT_TITLE = 'Oswald'
const FONT_BODY = 'Helvetica Neue'

// ─── Setup ──────────────────────────────────────────────────────────────────
const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inch
pres.title = 'BRH Habitat — Plateforme digitale'
pres.author = 'Philippe Gagnon'
pres.company = 'Bretagne Renovation Habitat'
pres.subject = 'Presentation interne direction + equipes'

// Slide master avec footer discret
pres.defineSlideMaster({
  title: 'MAIN',
  background: { color: C.white },
  objects: [
    { rect: { x: 0, y: 7.2, w: 13.33, h: 0.3, fill: { color: C.lightBg } } },
    {
      text: {
        text: 'BRH Habitat · Confidentiel · Avril 2026',
        options: {
          x: 0.3, y: 7.22, w: 6, h: 0.26,
          fontSize: 9, fontFace: FONT_BODY, color: C.textLight,
        },
      },
    },
    {
      text: {
        text: 'renovation-brh.fr',
        options: {
          x: 7, y: 7.22, w: 6, h: 0.26,
          fontSize: 9, fontFace: FONT_BODY, color: C.textLight, align: 'right',
        },
      },
    },
  ],
})

// ─── Helpers ────────────────────────────────────────────────────────────────
function addTitle(slide: pptxgen.Slide, text: string, eyebrow?: string): void {
  if (eyebrow) {
    slide.addText(eyebrow, {
      x: 0.5, y: 0.4, w: 12, h: 0.3,
      fontSize: 11, fontFace: FONT_BODY, bold: true, color: C.primary,
      charSpacing: 2,
    })
  }
  slide.addText(text, {
    x: 0.5, y: eyebrow ? 0.7 : 0.5, w: 12, h: 0.8,
    fontSize: 32, fontFace: FONT_TITLE, bold: true, color: C.textDark,
    charSpacing: 2,
  })
  // Accent bar
  slide.addShape('rect', {
    x: 0.5, y: eyebrow ? 1.55 : 1.35, w: 0.6, h: 0.06,
    fill: { color: C.primary }, line: { type: 'none' },
  })
}

function addScreenshot(slide: pptxgen.Slide, filename: string, x: number, y: number, w: number, h: number): void {
  slide.addImage({ path: join(HERO, filename), x, y, w, h, sizing: { type: 'contain', w, h } })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COUVERTURE
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide()
  s.background = { color: C.primaryDark }
  s.addShape('rect', { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.primaryDark }, line: { type: 'none' } })

  // Logo label
  s.addText('BRH', {
    x: 0.8, y: 0.5, w: 4, h: 0.8,
    fontSize: 36, fontFace: FONT_TITLE, bold: true, color: C.white,
    charSpacing: 4,
  })
  s.addText('BRETAGNE RENOVATION HABITAT', {
    x: 0.8, y: 1.3, w: 6, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.eco, charSpacing: 3,
  })

  // Titre
  s.addText('Plateforme digitale', {
    x: 0.8, y: 2.8, w: 12, h: 1.1,
    fontSize: 56, fontFace: FONT_TITLE, bold: true, color: C.white, charSpacing: 2,
  })
  s.addText('Du diagnostic a la commission.\nTout en un.', {
    x: 0.8, y: 4.0, w: 12, h: 1.2,
    fontSize: 26, fontFace: FONT_BODY, color: C.eco, italic: true,
  })

  // Footer speaker
  s.addShape('rect', { x: 0.8, y: 6.2, w: 0.6, h: 0.04, fill: { color: C.eco }, line: { type: 'none' } })
  s.addText('Philippe Gagnon, fondateur', {
    x: 0.8, y: 6.3, w: 8, h: 0.3,
    fontSize: 14, fontFace: FONT_BODY, bold: true, color: C.white,
  })
  s.addText('Avril 2026 · Direction + Equipes BRH', {
    x: 0.8, y: 6.6, w: 8, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, color: C.eco,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — VISION
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'La vision en 1 phrase', 'VISION')

  s.addShape('rect', {
    x: 0.5, y: 2.2, w: 12.3, h: 2.8,
    fill: { color: C.lightBg }, line: { type: 'none' },
  })
  s.addText([
    { text: 'BRH devient la premiere plateforme bretonne de renovation qui transforme ses clients satisfaits en ', options: { fontSize: 22, color: C.textDark, fontFace: FONT_BODY } },
    { text: 'apporteurs d\'affaires remuneres', options: { fontSize: 22, color: C.primary, fontFace: FONT_BODY, bold: true } },
    { text: ', sans salariat deguise ni paperasse.', options: { fontSize: 22, color: C.textDark, fontFace: FONT_BODY } },
  ], { x: 0.9, y: 2.5, w: 11.5, h: 2.2, valign: 'middle' })

  // 3 mots-cles
  const keywords = ['CONFIANCE', 'TRANSPARENCE', 'VIRALITE']
  keywords.forEach((kw, i) => {
    const x = 1.5 + i * 3.7
    s.addShape('rect', { x, y: 5.5, w: 3, h: 1, fill: { color: C.primary }, line: { type: 'none' } })
    s.addText(kw, {
      x, y: 5.5, w: 3, h: 1,
      fontSize: 18, fontFace: FONT_TITLE, bold: true, color: C.white,
      align: 'center', valign: 'middle', charSpacing: 3,
    })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — 5 UTILISATEURS
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, '5 utilisateurs, une seule plateforme', 'ARCHITECTURE')

  const users = [
    { title: 'Visiteur', sub: 'renovation-brh.fr', desc: 'Diagnostic gratuit, articles, chat IA', color: C.eco },
    { title: 'Client particulier', sub: '/tableau-de-bord', desc: 'Logements, dossiers, RDV', color: C.secondary },
    { title: 'Affilie particulier', sub: '/particulier', desc: 'Parraine, gagne commissions', color: C.primary },
    { title: 'Entreprise pro', sub: '/pro', desc: 'Apporte leads, commissions multi-niveaux', color: C.primaryDark },
    { title: 'Admin BRH', sub: '/admin', desc: 'Pilote 14 modules metier', color: C.darkGray },
  ]
  users.forEach((u, i) => {
    const x = 0.5 + i * 2.55
    const y = 2.3
    s.addShape('rect', { x, y, w: 2.4, h: 4.3, fill: { color: C.white }, line: { color: u.color, width: 2 } })
    s.addShape('rect', { x, y, w: 2.4, h: 0.5, fill: { color: u.color }, line: { type: 'none' } })
    s.addText(`${i + 1}`, { x, y: 0.1 + y, w: 2.4, h: 0.3, fontSize: 14, fontFace: FONT_TITLE, bold: true, color: C.white, align: 'center' })
    s.addText(u.title, { x: x + 0.1, y: y + 0.7, w: 2.2, h: 0.5, fontSize: 16, fontFace: FONT_TITLE, bold: true, color: C.textDark })
    s.addText(u.sub, { x: x + 0.1, y: y + 1.3, w: 2.2, h: 0.3, fontSize: 11, fontFace: FONT_BODY, italic: true, color: u.color })
    s.addText(u.desc, { x: x + 0.1, y: y + 1.8, w: 2.2, h: 2.3, fontSize: 11, fontFace: FONT_BODY, color: C.textLight })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — PARCOURS VISITEUR
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Du visiteur au devis en 2 minutes', 'PARCOURS PUBLIC')

  const steps = ['Visiteur', 'Diagnostic\n(7 types)', 'Resultat\nchiffre', 'Prise RDV', 'Devis BRH']
  steps.forEach((step, i) => {
    const x = 0.8 + i * 2.45
    const y = 2.5
    s.addShape('rect', { x, y, w: 2, h: 1.2, fill: { color: i === 4 ? C.primary : C.white }, line: { color: C.primary, width: 2 } })
    s.addText(step, { x, y, w: 2, h: 1.2, fontSize: 14, fontFace: FONT_TITLE, bold: true, color: i === 4 ? C.white : C.textDark, align: 'center', valign: 'middle' })
    if (i < steps.length - 1) {
      s.addText('→', { x: x + 2, y: y + 0.35, w: 0.45, h: 0.5, fontSize: 24, color: C.primary, align: 'center' })
    }
  })

  addScreenshot(s, 'slide02_diagnostic.png', 3.5, 4.2, 6.3, 2.8)
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — IA
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Intelligence artificielle : 3 assistants specialises', 'TECHNOLOGIE')

  const ias = [
    { title: 'Chat Visiteur', where: 'Site public', what: 'Questions prix, devis rapide', model: 'Llama-3.3-70B' },
    { title: 'Assistant Pro', where: 'Portails pro/particulier', what: 'DTU, normes, reglementations', model: 'Llama-3.3-70B + RAG DTU' },
    { title: 'Chiffrage IA', where: 'Portails pro/particulier', what: 'Estimation chantier + prix', model: 'Llama-3.3-70B + BATICHIFFRAGE' },
  ]
  ias.forEach((ia, i) => {
    const x = 0.5 + i * 4.25
    const y = 2.3
    s.addShape('rect', { x, y, w: 4, h: 3.5, fill: { color: C.lightBg }, line: { color: C.primary, width: 1 } })
    s.addText(ia.title, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.5, fontSize: 18, fontFace: FONT_TITLE, bold: true, color: C.primary })
    s.addText(`Ou : ${ia.where}`, { x: x + 0.2, y: y + 0.9, w: 3.6, h: 0.3, fontSize: 11, fontFace: FONT_BODY, italic: true, color: C.textLight })
    s.addText(ia.what, { x: x + 0.2, y: y + 1.4, w: 3.6, h: 0.6, fontSize: 13, fontFace: FONT_BODY, color: C.textDark })
    s.addText(`Moteur : ${ia.model}`, { x: x + 0.2, y: y + 2.4, w: 3.6, h: 0.3, fontSize: 10, fontFace: FONT_BODY, color: C.textLight })
    s.addShape('rect', { x: x + 0.2, y: y + 2.9, w: 1.6, h: 0.3, fill: { color: C.eco }, line: { type: 'none' } })
    s.addText('VPS BRH', { x: x + 0.2, y: y + 2.9, w: 1.6, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primaryDark, align: 'center' })
  })

  s.addText('IA hebergee sur notre propre VPS. Zero dependance OpenAI cote client. Prix temps reel BATICHIFFRAGE.', {
    x: 0.5, y: 6.3, w: 12.3, h: 0.5,
    fontSize: 13, fontFace: FONT_BODY, italic: true, color: C.textLight, align: 'center',
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — CLIENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Espace Client : transparence totale', 'DASHBOARD CLIENT')

  const bullets = [
    'Logements : fiches completes, photos, historique',
    'Dossiers : timeline devis → pose → SAV',
    'RDV : prise en ligne + rappel SMS/email',
    'Messages : chat direct avec l\'equipe BRH',
  ]
  bullets.forEach((b, i) => {
    s.addShape('rect', { x: 0.5, y: 2.3 + i * 0.7, w: 0.1, h: 0.5, fill: { color: C.primary }, line: { type: 'none' } })
    s.addText(b, { x: 0.8, y: 2.3 + i * 0.7, w: 4.8, h: 0.5, fontSize: 14, fontFace: FONT_BODY, color: C.textDark, valign: 'middle' })
  })

  addScreenshot(s, 'slide05_dashboard_client.png', 6, 2.3, 6.8, 4.2)
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 7 — ADMIN
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Espace ADMIN : pilotage 14 modules', 'ADMINISTRATION')

  addScreenshot(s, 'slide06_admin_dashboard.png', 0.5, 2.3, 7.5, 4.5)

  const modules = ['Dashboard', 'Partenaires', 'Prospects', 'Dossiers', 'Logements', 'Commissions', 'Catalogue', 'RDV', 'Articles', 'Publications', 'Messages', 'Utilisateurs', 'Parametres', 'Inbox']
  modules.forEach((m, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 8.3 + col * 2.3
    const y = 2.3 + row * 0.55
    s.addShape('rect', { x, y, w: 2.2, h: 0.45, fill: { color: C.lightBg }, line: { type: 'none' } })
    s.addText(m, { x, y, w: 2.2, h: 0.45, fontSize: 11, fontFace: FONT_BODY, bold: true, color: C.primary, align: 'center', valign: 'middle' })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 8 — ADMIN COMMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Gestion commissions multi-niveaux', 'ADMINISTRATION')

  addScreenshot(s, 'slide08_admin_commissions.png', 0.5, 2.3, 8, 4.5)

  const points = [
    'Calcul automatique par devis signe',
    'Validation admin avant paiement',
    'Multi-niveaux : bonus sur filleuls recrutes',
    'Export comptable pour DAS2',
  ]
  points.forEach((p, i) => {
    s.addText(`✓  ${p}`, { x: 8.8, y: 2.5 + i * 0.9, w: 4.2, h: 0.8, fontSize: 13, fontFace: FONT_BODY, color: C.textDark, valign: 'top' })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — PORTAIL PRO
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Portail PRO : les entreprises apporteuses', 'PARTENAIRES B2B')

  s.addText('CIBLES : agences immo, courtiers credit, architectes, artisans complementaires', {
    x: 0.5, y: 2.2, w: 12.3, h: 0.4, fontSize: 12, fontFace: FONT_BODY, italic: true, color: C.textLight,
  })

  addScreenshot(s, 'slide09_pro_dashboard.png', 0.5, 2.8, 7, 4.2)

  const features = [
    'Envoi prospect en 30 sec',
    'Suivi commissions temps reel',
    'QR code personnel pour recruter',
    'Rapport PDF mensuel auto',
    'Multi-niveaux (recruter sous soi)',
    'Chiffrage IA pour closing',
  ]
  features.forEach((f, i) => {
    s.addText(`→  ${f}`, {
      x: 8, y: 2.9 + i * 0.55, w: 5, h: 0.5,
      fontSize: 13, fontFace: FONT_BODY, color: C.primary, bold: true, valign: 'middle',
    })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — PRO PROSPECT NEW (30 SEC)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Envoi d\'un lead qualifie en 30 secondes', 'SIMPLICITE PRO')

  addScreenshot(s, 'slide10_pro_prospect_new.png', 0.5, 2.2, 7.5, 5)

  const texts = [
    { title: '3 champs essentiels', desc: 'Nom, telephone, type de travaux' },
    { title: 'Geolocalisation auto', desc: 'Code postal retrouve la commune' },
    { title: 'Notification admin', desc: 'Email + push dans l\'equipe BRH' },
    { title: 'Tracking transparent', desc: 'Le pro voit la progression du lead' },
  ]
  texts.forEach((t, i) => {
    const y = 2.4 + i * 1.1
    s.addText(t.title, { x: 8.4, y, w: 4.6, h: 0.4, fontSize: 14, fontFace: FONT_TITLE, bold: true, color: C.primary })
    s.addText(t.desc, { x: 8.4, y: y + 0.4, w: 4.6, h: 0.5, fontSize: 11, fontFace: FONT_BODY, color: C.textLight })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — PORTAIL PARTICULIER AFFILIE
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Portail PARTICULIER AFFILIE', 'LE COEUR VIRAL')

  addScreenshot(s, 'slide12_part_dashboard.png', 0.5, 2.2, 7.5, 5)

  s.addText('CIBLES', { x: 8.3, y: 2.2, w: 5, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primary, charSpacing: 2 })
  s.addText('Clients contents + personnes voulant un complement de revenu', {
    x: 8.3, y: 2.5, w: 5, h: 0.8, fontSize: 12, fontFace: FONT_BODY, color: C.textDark,
  })

  s.addText('PRINCIPAL', { x: 8.3, y: 3.5, w: 5, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primary, charSpacing: 2 })
  s.addText('Tableau de bord · Parrainages · Catalogue · Points · Messages · Paiements & Statut ⭐', {
    x: 8.3, y: 3.8, w: 5, h: 1.2, fontSize: 11, fontFace: FONT_BODY, color: C.textDark,
  })

  s.addText('OUTILS', { x: 8.3, y: 5.2, w: 5, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primary, charSpacing: 2 })
  s.addText('Simulateur · Reseaux sociaux · Vendeurs · Chiffrage IA · Badges · IA Batiment', {
    x: 8.3, y: 5.5, w: 5, h: 1.2, fontSize: 11, fontFace: FONT_BODY, color: C.textDark,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — STATUT FISCAL (STAR)
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Paiements & Statut : la brique qui rassure', 'NOUVEAUTE ⭐')

  addScreenshot(s, 'slide13_part_statut_fiscal.png', 7.5, 2.2, 5.3, 5)

  s.addText('LE PROBLEME', { x: 0.5, y: 2.2, w: 7, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primary, charSpacing: 2 })
  s.addText('Les gens ont peur du fisc, peur de la paperasse. Ca freine la conversion en affilie.', {
    x: 0.5, y: 2.5, w: 7, h: 0.8, fontSize: 13, fontFace: FONT_BODY, color: C.textDark,
  })

  s.addText('NOTRE SOLUTION', { x: 0.5, y: 3.5, w: 7, h: 0.3, fontSize: 10, fontFace: FONT_BODY, bold: true, color: C.primary, charSpacing: 2 })

  const profiles = [
    { emoji: '🌱', label: 'LOISIRS', range: '0 – 196 €/an', action: 'Cadeaux, zero demarche' },
    { emoji: '🌿', label: 'OCCASIONNEL', range: '196 – 1 200 €/an', action: 'Simple ligne BNC' },
    { emoji: '🎯', label: 'REGULIER', range: '1 200 – 5 000 €/an', action: 'Micro-entreprise recommandee' },
    { emoji: '💼', label: 'SECOND METIER', range: '5 000 € et +', action: 'On t\'accompagne pour tout cadrer' },
  ]
  profiles.forEach((p, i) => {
    const y = 3.9 + i * 0.75
    s.addText(`${p.emoji}  ${p.label}`, { x: 0.6, y, w: 2.5, h: 0.4, fontSize: 12, fontFace: FONT_BODY, bold: true, color: C.textDark })
    s.addText(p.range, { x: 3.1, y, w: 2, h: 0.4, fontSize: 11, fontFace: FONT_BODY, color: C.primary, bold: true })
    s.addText(p.action, { x: 5.1, y, w: 2.4, h: 0.4, fontSize: 10, fontFace: FONT_BODY, italic: true, color: C.textLight })
  })

  s.addText('🏆 1re boite bretonne de renovation a afficher sa fiscalite affilie ouvertement', {
    x: 0.5, y: 6.9, w: 12.3, h: 0.3,
    fontSize: 11, fontFace: FONT_BODY, bold: true, italic: true, color: C.primary, align: 'center',
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 13 — ARCHITECTURE TECHNIQUE
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Architecture technique : solide et scalable', 'SOUS LE CAPOT')

  // 3 blocs horizontaux
  const blocks = [
    {
      title: 'FRONTEND',
      items: ['Vite + React 19', 'Tailwind CSS 4', 'Vercel (CDN global)', 'PWA mobile-first', 'SEO structured data'],
      color: C.secondary,
    },
    {
      title: 'BACKEND',
      items: ['Supabase PostgreSQL', 'Row Level Security', '7 roles distincts', '24 migrations', 'Edge Functions'],
      color: C.primary,
    },
    {
      title: 'INTELLIGENCE IA',
      items: ['VPS Hostinger prive', 'Ollama + Llama-3.3-70B', 'Together AI fallback', 'Base prix BATICHIFFRAGE', 'RAG documentaire DTU'],
      color: C.primaryDark,
    },
  ]
  blocks.forEach((b, i) => {
    const x = 0.5 + i * 4.25
    const y = 2.2
    s.addShape('rect', { x, y, w: 4, h: 4.2, fill: { color: b.color }, line: { type: 'none' } })
    s.addText(b.title, { x, y: y + 0.2, w: 4, h: 0.5, fontSize: 18, fontFace: FONT_TITLE, bold: true, color: C.white, align: 'center', charSpacing: 3 })
    b.items.forEach((it, j) => {
      s.addText(`•  ${it}`, { x: x + 0.4, y: y + 1 + j * 0.55, w: 3.4, h: 0.5, fontSize: 12, fontFace: FONT_BODY, color: C.white })
    })
  })

  s.addText('SECURITE : Audit ProHacker passe le 25/03/2026 · RLS sur toutes les tables · CSP strict · Rate limiting IA', {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4, fontSize: 11, fontFace: FONT_BODY, italic: true, color: C.textLight, align: 'center',
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SLIDE 14 — CALL TO ACTION
// ═══════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide({ masterName: 'MAIN' })
  addTitle(s, 'Ce que je demande a l\'equipe', 'MAINTENANT')

  const actions = [
    { role: 'COMMERCIAL', ask: 'Identifier 20 pros bretons a inviter (agences immo, courtiers, artisans)' },
    { role: 'TERRAIN', ask: 'Accompagner les 10 premiers clients au portail affilie (15 min chacun)' },
    { role: 'TECHNIQUE', ask: 'Remonter tous les bugs UX via Messages Admin — zero friction client' },
    { role: 'MARKETING', ask: 'Produire 4 videos tuto de 60 sec (diagnostic, inscription, simulateur, catalogue)' },
    { role: 'TOUS', ask: 'Tester la plateforme avec son propre compte cette semaine' },
  ]
  actions.forEach((a, i) => {
    const y = 2.3 + i * 0.85
    s.addShape('rect', { x: 0.5, y, w: 2.3, h: 0.7, fill: { color: C.primary }, line: { type: 'none' } })
    s.addText(a.role, { x: 0.5, y, w: 2.3, h: 0.7, fontSize: 14, fontFace: FONT_TITLE, bold: true, color: C.white, align: 'center', valign: 'middle', charSpacing: 2 })
    s.addShape('rect', { x: 2.8, y, w: 10, h: 0.7, fill: { color: C.lightBg }, line: { type: 'none' } })
    s.addText(a.ask, { x: 3, y, w: 9.8, h: 0.7, fontSize: 13, fontFace: FONT_BODY, color: C.textDark, valign: 'middle' })
  })

  s.addText('On y va ensemble ?', {
    x: 0.5, y: 6.8, w: 12.3, h: 0.5,
    fontSize: 20, fontFace: FONT_TITLE, bold: true, italic: true, color: C.primary, align: 'center', charSpacing: 2,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════
await pres.writeFile({ fileName: OUT })
console.log(`✅ PPTX genere : ${OUT}`)
