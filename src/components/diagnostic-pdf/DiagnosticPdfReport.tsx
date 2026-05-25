/**
 * DiagnosticPdfReport — PDF particulier 5 pages, généré via @react-pdf/renderer.
 *
 * Remplace l'ancien `window.print()` qui faisait juste imprimer la page web.
 * Design pro adapté au grand public (vocabulaire simple, ton anxiogène pour
 * pousser à la prise de RDV).
 *
 *   1. Synthèse — couverture avec score santé + niveau d'urgence
 *   2. Analyse par domaine — détail des problèmes détectés (isolation/chauffage/...)
 *   3. Plan de rénovation — travaux priorisés avec chiffrage indicatif
 *   4. Aides financières — MaPrimeRénov'/CEE/ÉcoPTZ/aides locales Bretagne
 *   5. Prochaines étapes — CTA pro RGE + contact BRH
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { DiagnosticResult, TypeResult } from '@/lib/diagnostic-engine'

const COLORS = {
  brand: '#1c7b1d',
  brandDark: '#155a17',
  brandLight: '#e8f4e9',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bg: '#ffffff',
  bgAlt: '#f9fafb',
  red: '#dc2626',
  redBg: '#fef2f2',
  orange: '#ea580c',
  orangeBg: '#fff7ed',
  yellow: '#ca8a04',
  yellowBg: '#fefce8',
  green: '#16a34a',
  greenBg: '#f0fdf4',
}

const URGENCY_META: Record<TypeResult['urgencyLevel'], { label: string; color: string; bg: string; emoji: string }> = {
  critique: { label: 'État critique — agir maintenant', color: COLORS.red, bg: COLORS.redBg, emoji: '!' },
  eleve: { label: 'État préoccupant — intervention conseillée', color: COLORS.orange, bg: COLORS.orangeBg, emoji: '!' },
  modere: { label: 'État moyen — à améliorer', color: COLORS.yellow, bg: COLORS.yellowBg, emoji: '~' },
  faible: { label: 'Bon état — surveillance', color: COLORS.green, bg: COLORS.greenBg, emoji: 'OK' },
}

const TYPE_LABELS: Record<string, string> = {
  isolation: 'Isolation',
  chauffage: 'Chauffage',
  ventilation: 'Ventilation',
  toiture: 'Toiture',
  humidite: 'Humidité',
  menuiseries: 'Fenêtres & menuiseries',
  electricite: 'Électricité',
  plomberie: 'Plomberie',
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: COLORS.bg,
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand,
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.brand },
  brandSub: { fontSize: 8, color: COLORS.textMuted, marginTop: 2 },
  pageNum: { fontSize: 8, color: COLORS.textMuted, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 7,
    color: COLORS.textMuted,
  },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 4 },
  body: { fontSize: 10, lineHeight: 1.5, color: COLORS.text },
  bodyMuted: { fontSize: 9, lineHeight: 1.4, color: COLORS.textMuted },
  // Page 1 — cover
  cover: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  coverLabel: { fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  coverTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: COLORS.text, textAlign: 'center', marginBottom: 24 },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreText: { fontSize: 56, fontFamily: 'Helvetica-Bold', color: COLORS.text },
  scoreSub: { fontSize: 9, color: COLORS.textMuted, marginTop: -4 },
  urgencyBox: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 20,
  },
  urgencyText: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  budgetBox: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginTop: 10,
  },
  budgetLabel: { fontSize: 8, color: COLORS.brandDark, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  budgetAmount: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: COLORS.brand },
  budgetHint: { fontSize: 8, color: COLORS.textMuted, marginTop: 4 },
  // Cards
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    backgroundColor: COLORS.bg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  badge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  recoItem: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recoNum: { width: 24, fontFamily: 'Helvetica-Bold', color: COLORS.brand },
  recoBody: { flex: 1 },
  recoTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 2 },
  recoDesc: { fontSize: 9, color: COLORS.textMuted, lineHeight: 1.4 },
  recoBudget: { fontSize: 8, color: COLORS.brand, marginTop: 3, fontFamily: 'Helvetica-Bold' },
  aideRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aideName: { width: 140, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  aideDesc: { flex: 1, fontSize: 9, lineHeight: 1.4, color: COLORS.text },
  ctaBox: {
    backgroundColor: COLORS.brand,
    borderRadius: 8,
    padding: 18,
    marginTop: 14,
  },
  ctaTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.bg, marginBottom: 6 },
  ctaText: { fontSize: 10, color: COLORS.bg, lineHeight: 1.5, marginBottom: 10 },
  ctaContact: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.bg },
})

function PdfHeader({ pageNum, totalPages, ref }: { pageNum: number; totalPages: number; ref: string }) {
  return (
    <View style={styles.header} fixed>
      <View>
        <Text style={styles.brand}>BRH HABITAT</Text>
        <Text style={styles.brandSub}>Diagnostic énergie · Rénovation Bretagne</Text>
      </View>
      <View>
        <Text style={styles.pageNum}>Rapport #{ref}</Text>
        <Text style={styles.pageNum}>Page {pageNum} / {totalPages}</Text>
      </View>
    </View>
  )
}

function PdfFooter({ date }: { date: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Diagnostic gratuit BRH Habitat — généré le {date}</Text>
      <Text>www.renovation-brh.fr · 02 19 00 53 05</Text>
    </View>
  )
}

interface Props {
  result: DiagnosticResult
  property: { address?: string; year?: number; surface?: number; type?: string }
  generatedAt?: Date
  reportId?: string
}

export function DiagnosticPdfReport({ result, property, generatedAt, reportId }: Props) {
  const now = generatedAt ?? new Date()
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  // Référence dérivée de generatedAt (param contrôlé par l'appelant) ou
  // de la date capturée ci-dessus — pur, idempotent pour un mount donné.
  const ref = reportId ?? `${now.getTime().toString(36).slice(-6).toUpperCase()}`
  const urgency = URGENCY_META[result.urgencyLevel]

  // Plan de rénovation : tri par priorité haute → basse, max 8 items
  const planRecos = [...result.recommendations]
    .sort((a, b) => {
      const order = { haute: 0, moyenne: 1, basse: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 8)

  // Aides standard (toujours affichées)
  const AIDES: Array<{ name: string; desc: string }> = [
    { name: "MaPrimeRénov'", desc: "Aide nationale aux ménages selon revenus. Jusqu'à 90% du coût HT pour les ménages très modestes (geste par geste ou Ampleur)." },
    { name: 'Coup de pouce CEE', desc: "Primes des fournisseurs d'énergie pour les travaux d'économie. Cumulable avec MaPrimeRénov'." },
    { name: 'Éco-PTZ', desc: "Prêt à taux zéro jusqu'à 50 000 € pour une rénovation globale. Remboursement sur 20 ans." },
    { name: 'TVA réduite 5,5%', desc: "Sur les travaux d'amélioration énergétique dans un logement de plus de 2 ans." },
    { name: 'Aides Bretagne', desc: "La Région Bretagne et certains EPCI (Brest Métropole, Rennes Métropole, etc.) proposent des aides complémentaires selon la commune." },
  ]

  return (
    <Document
      title={`Diagnostic énergie BRH — ${ref}`}
      author="BRH Habitat"
      subject="Rapport de diagnostic énergétique du logement"
      creator="BRH Habitat"
    >
      {/* ── PAGE 1 — COUVERTURE ────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PdfHeader pageNum={1} totalPages={5} ref={ref} />
        <View style={styles.cover}>
          <Text style={styles.coverLabel}>Votre diagnostic BRH Habitat</Text>
          <Text style={styles.coverTitle}>Rapport d'analyse personnalisé</Text>

          <View style={[styles.scoreCircle, { borderColor: urgency.color }]}>
            <Text style={[styles.scoreText, { color: urgency.color }]}>{result.overallScore}</Text>
            <Text style={styles.scoreSub}>/100</Text>
          </View>

          <View style={[styles.urgencyBox, { borderColor: urgency.color, backgroundColor: urgency.bg }]}>
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>

          {property.address && (
            <Text style={[styles.body, { textAlign: 'center', marginTop: 8 }]}>
              <Text style={{ color: COLORS.textMuted }}>Logement analysé : </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{property.address}</Text>
            </Text>
          )}

          <View style={{ flexDirection: 'row', marginTop: 14, gap: 12 }}>
            {property.type && (
              <Text style={styles.bodyMuted}>{property.type}</Text>
            )}
            {property.surface && (
              <Text style={styles.bodyMuted}>· {property.surface} m²</Text>
            )}
            {property.year && (
              <Text style={styles.bodyMuted}>· Construit en {property.year}</Text>
            )}
          </View>

          <View style={styles.budgetBox}>
            <Text style={styles.budgetLabel}>Budget total estimé pour les travaux recommandés</Text>
            <Text style={styles.budgetAmount}>
              {result.totalBudgetMin.toLocaleString('fr-FR')} – {result.totalBudgetMax.toLocaleString('fr-FR')} €
            </Text>
            <Text style={styles.budgetHint}>
              Avant aides financières. Le reste à charge peut être divisé par 2 à 4 selon vos revenus.
            </Text>
          </View>
        </View>
        <PdfFooter date={date} />
      </Page>

      {/* ── PAGE 2 — ANALYSE PAR DOMAINE ────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PdfHeader pageNum={2} totalPages={5} ref={ref} />
        <Text style={styles.h1}>Analyse par domaine</Text>
        <Text style={styles.body}>
          Voici le détail de l'analyse de votre logement, domaine par domaine.
          Les éléments classés « critique » ou « préoccupant » sont à traiter en priorité.
        </Text>

        {result.typeResults.map((tr) => {
          const meta = URGENCY_META[tr.urgencyLevel]
          return (
            <View key={tr.type} style={styles.card} wrap={false}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{TYPE_LABELS[tr.type] ?? tr.type}</Text>
                  <Text style={[styles.bodyMuted, { marginTop: 2 }]}>
                    Score santé : {tr.score}/100
                  </Text>
                </View>
                <Text style={[styles.badge, { color: meta.color, backgroundColor: meta.bg }]}>
                  {meta.label.split('—')[0].trim()}
                </Text>
              </View>
              {tr.recommendations.length > 0 && (
                <Text style={styles.bodyMuted}>
                  {tr.recommendations.length} action{tr.recommendations.length > 1 ? 's' : ''} recommandée{tr.recommendations.length > 1 ? 's' : ''} ·
                  Budget estimé : {tr.budgetMin.toLocaleString('fr-FR')} – {tr.budgetMax.toLocaleString('fr-FR')} €
                </Text>
              )}
            </View>
          )
        })}

        <PdfFooter date={date} />
      </Page>

      {/* ── PAGE 3 — PLAN DE RÉNOVATION ─────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PdfHeader pageNum={3} totalPages={5} ref={ref} />
        <Text style={styles.h1}>Plan de rénovation recommandé</Text>
        <Text style={styles.body}>
          Voici les travaux recommandés pour votre logement, classés par ordre de priorité.
          Un pro RGE BRH peut vous accompagner pour le chiffrage précis et la demande des aides.
        </Text>

        <View style={{ marginTop: 12 }}>
          {planRecos.map((rec, idx) => (
            <View key={`${rec.title}-${idx}`} style={styles.recoItem} wrap={false}>
              <Text style={styles.recoNum}>#{idx + 1}</Text>
              <View style={styles.recoBody}>
                <Text style={styles.recoTitle}>{rec.title}</Text>
                <Text style={styles.recoDesc}>{rec.description}</Text>
                <Text style={styles.recoBudget}>
                  Budget indicatif : {rec.estimatedBudget} · Priorité {rec.priority}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {planRecos.length === 0 && (
          <Text style={[styles.body, { marginTop: 20, fontStyle: 'italic', textAlign: 'center' }]}>
            Aucune action urgente détectée sur votre logement.
          </Text>
        )}

        <PdfFooter date={date} />
      </Page>

      {/* ── PAGE 4 — AIDES FINANCIÈRES ──────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PdfHeader pageNum={4} totalPages={5} ref={ref} />
        <Text style={styles.h1}>Aides financières applicables</Text>
        <Text style={styles.body}>
          Les aides ci-dessous sont cumulables et peuvent prendre en charge jusqu'à <Text style={{ fontFamily: 'Helvetica-Bold' }}>90% du coût des travaux</Text>
          {' '}pour les ménages aux revenus les plus modestes. Un pro RGE BRH calcule le montant précis selon votre situation.
        </Text>

        <View style={{ marginTop: 14 }}>
          {AIDES.map((a) => (
            <View key={a.name} style={styles.aideRow} wrap={false}>
              <Text style={styles.aideName}>{a.name}</Text>
              <Text style={styles.aideDesc}>{a.desc}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { marginTop: 18, backgroundColor: COLORS.brandLight, borderColor: COLORS.brand }]}>
          <Text style={[styles.h3, { color: COLORS.brandDark }]}>Reste à charge estimé</Text>
          <Text style={styles.body}>
            Pour votre projet : <Text style={{ fontFamily: 'Helvetica-Bold', color: COLORS.brand }}>
              {Math.round(result.totalBudgetMin * 0.3).toLocaleString('fr-FR')} – {Math.round(result.totalBudgetMax * 0.6).toLocaleString('fr-FR')} €
            </Text>
            {' '}(hypothèse ménage aux revenus intermédiaires).
          </Text>
          <Text style={[styles.bodyMuted, { marginTop: 4 }]}>
            Estimation indicative. Le calcul précis nécessite votre revenu fiscal de référence et la composition du foyer.
          </Text>
        </View>

        <PdfFooter date={date} />
      </Page>

      {/* ── PAGE 5 — PROCHAINES ÉTAPES ─────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <PdfHeader pageNum={5} totalPages={5} ref={ref} />
        <Text style={styles.h1}>Prochaines étapes</Text>
        <Text style={styles.body}>
          Votre diagnostic indique un <Text style={{ fontFamily: 'Helvetica-Bold', color: urgency.color }}>{urgency.label.toLowerCase()}</Text>.
          {result.urgencyLevel === 'critique' && (
            <Text> Plus vous attendez, plus les économies potentielles vous échappent et plus la valeur de votre bien diminue.</Text>
          )}
          {result.urgencyLevel === 'eleve' && (
            <Text> Un plan d'action structuré peut réduire vos factures de 30 à 50% en 6-12 mois.</Text>
          )}
        </Text>

        <Text style={styles.h2}>1. Validation par un pro RGE BRH (sous 24h)</Text>
        <Text style={styles.body}>
          Nos artisans certifiés RGE en Bretagne analysent votre rapport, contrôlent les chiffrages
          et vous proposent un plan d'attaque concret. Aucune obligation d'engagement.
        </Text>

        <Text style={styles.h2}>2. Visite sur site (gratuite)</Text>
        <Text style={styles.body}>
          Un expert BRH se déplace chez vous, mesure les paramètres réels du logement,
          et vous remet un devis personnalisé avec montant précis des aides incluses.
        </Text>

        <Text style={styles.h2}>3. Devis personnalisé (aides incluses)</Text>
        <Text style={styles.body}>
          Vous recevez un devis détaillé poste par poste, le montant des aides MaPrimeRénov',
          CEE, Éco-PTZ et locales déjà calculé, et votre reste à charge net.
        </Text>

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Prendre rendez-vous maintenant</Text>
          <Text style={styles.ctaText}>
            Un conseiller BRH vous rappelle au créneau de votre choix.
            Diagnostic gratuit, sans engagement. Artisans certifiés RGE en Bretagne.
          </Text>
          <Text style={styles.ctaContact}>Tél : 02 19 00 53 05</Text>
          <Text style={styles.ctaContact}>Web : www.renovation-brh.fr</Text>
        </View>

        <PdfFooter date={date} />
      </Page>
    </Document>
  )
}
