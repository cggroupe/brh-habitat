import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

import { tenant } from '../config/tenant'

// Couleurs depuis le tenant
const BRH_GREEN = tenant.branding.colors.primary
const BRH_GREEN_LIGHT = tenant.branding.colors.secondary
const BRH_GRAY = '#3d3d3d'
const BRH_GRAY_LIGHT = '#e8e8e8'
const BRH_RED = '#c62828'

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { fontFamily: 'Montserrat', fontSize: 10, color: BRH_GRAY, padding: 40 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: `2px solid ${BRH_GREEN}`, paddingBottom: 14 },
  logo: { fontSize: 28, fontWeight: 700, color: BRH_GREEN, letterSpacing: 3 },
  logoSub: { fontSize: 8, color: BRH_GREEN_LIGHT, letterSpacing: 2, marginTop: 2 },
  headerRight: { textAlign: 'right' },
  headerLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  headerValue: { fontSize: 9, color: BRH_GRAY, marginTop: 1 },
  // Title bar
  titleBar: { backgroundColor: BRH_GREEN, padding: 12, borderRadius: 4, marginBottom: 20 },
  titleMain: { fontSize: 15, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: 2 },
  titleSub: { fontSize: 9, color: '#c8e6c9', marginTop: 3 },
  // Partner info
  partnerCard: { backgroundColor: '#f5f5f5', borderRadius: 4, padding: 12, marginBottom: 20 },
  partnerLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  partnerName: { fontSize: 12, fontWeight: 700, color: BRH_GRAY },
  partnerMeta: { fontSize: 8, color: '#666', marginTop: 2 },
  // Stats grid
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 4, padding: 10, borderTop: `3px solid ${BRH_GREEN}` },
  statLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 700, color: BRH_GRAY },
  statCompare: { fontSize: 8, marginTop: 3 },
  statUp: { color: BRH_GREEN },
  statDown: { color: BRH_RED },
  statNeutral: { color: '#999' },
  // Section title
  sectionTitle: { fontSize: 9, fontWeight: 700, color: BRH_GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  // Table
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: BRH_GREEN, borderRadius: '4 4 0 0', paddingVertical: 7, paddingHorizontal: 10 },
  tableHeaderCell: { color: 'white', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottom: `1px solid ${BRH_GRAY_LIGHT}` },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { fontSize: 8, color: BRH_GRAY },
  tableCellRight: { fontSize: 8, color: BRH_GRAY, textAlign: 'right' },
  // Status badge inline
  statusBadge: { fontSize: 7, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 3 },
  // Comparison section
  compareRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  compareCard: { flex: 1, borderRadius: 4, padding: 10, border: `1px solid ${BRH_GRAY_LIGHT}` },
  compareTitle: { fontSize: 8, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  compareItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottom: `1px solid ${BRH_GRAY_LIGHT}` },
  compareKey: { fontSize: 8, color: '#666' },
  compareVal: { fontSize: 8, fontWeight: 700, color: BRH_GRAY },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: `1px solid ${BRH_GRAY_LIGHT}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#999' },
  footerBrh: { fontSize: 7, color: BRH_GREEN, fontWeight: 700 },
})

// ============================================================
// Types exportes
// ============================================================

export interface RapportProspectLine {
  client_name: string
  work_type: string
  status: string
  signed_amount: number | null // centimes, null si pas signe
  commission_amount: number | null // centimes
  commission_status: string | null
  created_at: string
}

export interface RapportMonthStats {
  ca_apporte: number // centimes
  commissions_dues: number // centimes
  commissions_versees: number // centimes
  nb_prospects: number
  nb_signes: number
}

export interface RapportData {
  // Partenaire
  partner_name: string
  partner_company: string
  partner_level: string
  commission_rate: number
  // Periode
  month: number // 1-12
  year: number
  // Stats du mois
  stats: RapportMonthStats
  // Stats du mois precedent (pour comparaison)
  prev_stats: RapportMonthStats | null
  // Liste des prospects du mois
  prospects: RapportProspectLine[]
}

// ============================================================
// Helpers
// ============================================================

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'
}

function monthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function prevMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 2, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function tauxConversion(stats: RapportMonthStats): string {
  if (stats.nb_prospects === 0) return '0%'
  return ((stats.nb_signes / stats.nb_prospects) * 100).toFixed(1) + '%'
}

interface CompareArrow {
  arrow: string
  styleKey: 'statUp' | 'statDown' | 'statNeutral'
  percent: string
}

function compareValues(current: number, previous: number | null): CompareArrow {
  if (previous === null || previous === 0) return { arrow: '—', styleKey: 'statNeutral', percent: '' }
  const diff = ((current - previous) / previous) * 100
  if (diff > 0) return { arrow: '▲', styleKey: 'statUp', percent: `+${diff.toFixed(1)}%` }
  if (diff < 0) return { arrow: '▼', styleKey: 'statDown', percent: `${diff.toFixed(1)}%` }
  return { arrow: '=', styleKey: 'statNeutral', percent: '0%' }
}

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  etude: 'En etude',
  devis_envoye: 'Devis envoye',
  signe: 'Signe',
  termine: 'Termine',
  perdu: 'Perdu',
}

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  validee: 'Validee',
  versee: 'Versee',
}

// ============================================================
// Composant PDF
// ============================================================

export function RapportPDF({ data }: { data: RapportData }) {
  const prevCa = data.prev_stats?.ca_apporte ?? null
  const prevComm = data.prev_stats?.commissions_dues ?? null
  const prevNb = data.prev_stats?.nb_prospects ?? null
  const prevTaux = data.prev_stats ? parseFloat(tauxConversion(data.prev_stats)) : null

  const caCmp = compareValues(data.stats.ca_apporte, prevCa)
  const commCmp = compareValues(data.stats.commissions_dues, prevComm)
  const nbCmp = compareValues(data.stats.nb_prospects, prevNb)
  const tauxNum = parseFloat(tauxConversion(data.stats))
  const tauxCmp = compareValues(tauxNum, prevTaux)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>BRH</Text>
            <Text style={s.logoSub}>BRETAGNE RENOVATION HABITAT</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Rapport mensuel</Text>
            <Text style={s.headerValue}>{monthLabel(data.month, data.year)}</Text>
            <Text style={{ ...s.headerLabel, marginTop: 5 }}>Genere le</Text>
            <Text style={s.headerValue}>{new Date().toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleBar}>
          <Text style={s.titleMain}>Rapport Mensuel Partenaire</Text>
          <Text style={s.titleSub}>{monthLabel(data.month, data.year)}</Text>
        </View>

        {/* Partner info */}
        <View style={s.partnerCard}>
          <Text style={s.partnerLabel}>Partenaire</Text>
          <Text style={s.partnerName}>{data.partner_company || data.partner_name}</Text>
          {data.partner_company && (
            <Text style={s.partnerMeta}>{data.partner_name}</Text>
          )}
          <Text style={s.partnerMeta}>
            Niveau {data.partner_level.charAt(0).toUpperCase() + data.partner_level.slice(1)} — Taux de commission : {data.commission_rate}%
          </Text>
        </View>

        {/* Stats grid */}
        <Text style={s.sectionTitle}>Synthese du mois</Text>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>CA apporte</Text>
            <Text style={s.statValue}>{formatEur(data.stats.ca_apporte)}</Text>
            {data.prev_stats && (
              <Text style={{ ...s.statCompare, ...(s[caCmp.styleKey]) }}>
                {caCmp.arrow} {caCmp.percent} vs mois prec.
              </Text>
            )}
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Commissions dues</Text>
            <Text style={s.statValue}>{formatEur(data.stats.commissions_dues)}</Text>
            {data.prev_stats && (
              <Text style={{ ...s.statCompare, ...(s[commCmp.styleKey]) }}>
                {commCmp.arrow} {commCmp.percent} vs mois prec.
              </Text>
            )}
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Comm. versees</Text>
            <Text style={s.statValue}>{formatEur(data.stats.commissions_versees)}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Prospects soumis</Text>
            <Text style={s.statValue}>{data.stats.nb_prospects}</Text>
            {data.prev_stats && (
              <Text style={{ ...s.statCompare, ...(s[nbCmp.styleKey]) }}>
                {nbCmp.arrow} {nbCmp.percent} vs mois prec.
              </Text>
            )}
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Prospects signes</Text>
            <Text style={s.statValue}>{data.stats.nb_signes}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Taux de conversion</Text>
            <Text style={s.statValue}>{tauxConversion(data.stats)}</Text>
            {data.prev_stats && (
              <Text style={{ ...s.statCompare, ...(s[tauxCmp.styleKey]) }}>
                {tauxCmp.arrow} {tauxCmp.percent} vs mois prec.
              </Text>
            )}
          </View>
        </View>

        {/* Comparaison mois precedent */}
        {data.prev_stats && (
          <>
            <Text style={s.sectionTitle}>Comparaison avec {prevMonthLabel(data.month, data.year)}</Text>
            <View style={s.compareRow}>
              <View style={s.compareCard}>
                <Text style={s.compareTitle}>{monthLabel(data.month, data.year)}</Text>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>CA apporte</Text>
                  <Text style={s.compareVal}>{formatEur(data.stats.ca_apporte)}</Text>
                </View>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>Commissions dues</Text>
                  <Text style={s.compareVal}>{formatEur(data.stats.commissions_dues)}</Text>
                </View>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>Nb prospects</Text>
                  <Text style={s.compareVal}>{data.stats.nb_prospects}</Text>
                </View>
                <View style={{ ...s.compareItem, borderBottom: 'none' }}>
                  <Text style={s.compareKey}>Taux conversion</Text>
                  <Text style={s.compareVal}>{tauxConversion(data.stats)}</Text>
                </View>
              </View>
              <View style={s.compareCard}>
                <Text style={s.compareTitle}>{prevMonthLabel(data.month, data.year)}</Text>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>CA apporte</Text>
                  <Text style={s.compareVal}>{formatEur(data.prev_stats.ca_apporte)}</Text>
                </View>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>Commissions dues</Text>
                  <Text style={s.compareVal}>{formatEur(data.prev_stats.commissions_dues)}</Text>
                </View>
                <View style={s.compareItem}>
                  <Text style={s.compareKey}>Nb prospects</Text>
                  <Text style={s.compareVal}>{data.prev_stats.nb_prospects}</Text>
                </View>
                <View style={{ ...s.compareItem, borderBottom: 'none' }}>
                  <Text style={s.compareKey}>Taux conversion</Text>
                  <Text style={s.compareVal}>{tauxConversion(data.prev_stats)}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Table des prospects */}
        {data.prospects.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Detail des prospects — {monthLabel(data.month, data.year)}</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={{ ...s.tableHeaderCell, flex: 3 }}>Client</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Travaux</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Statut</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 2, textAlign: 'right' }}>Montant signe</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 2, textAlign: 'right' }}>Commission</Text>
                <Text style={{ ...s.tableHeaderCell, flex: 2 }}>Etat comm.</Text>
              </View>
              {data.prospects.map((p, i) => (
                <View key={i} style={{ ...s.tableRow, ...(i % 2 === 1 ? s.tableRowAlt : {}) }}>
                  <Text style={{ ...s.tableCell, flex: 3 }}>{p.client_name}</Text>
                  <Text style={{ ...s.tableCell, flex: 2 }}>{p.work_type}</Text>
                  <Text style={{ ...s.tableCell, flex: 2 }}>{PROSPECT_STATUS_LABELS[p.status] ?? p.status}</Text>
                  <Text style={{ ...s.tableCellRight, flex: 2 }}>
                    {p.signed_amount !== null ? formatEur(p.signed_amount) : '—'}
                  </Text>
                  <Text style={{ ...s.tableCellRight, flex: 2 }}>
                    {p.commission_amount !== null ? formatEur(p.commission_amount) : '—'}
                  </Text>
                  <Text style={{ ...s.tableCell, flex: 2 }}>
                    {p.commission_status ? (COMMISSION_STATUS_LABELS[p.commission_status] ?? p.commission_status) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {data.prospects.length === 0 && (
          <View style={{ padding: 20, backgroundColor: '#f9f9f9', borderRadius: 4, marginBottom: 20 }}>
            <Text style={{ fontSize: 9, color: '#999', textAlign: 'center' }}>
              Aucun prospect soumis ce mois-ci.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Bretagne Renovation Habitat — 35 rue de Kervao, 29490 Guipavas — 02 19 00 53 05
          </Text>
          <Text style={s.footerBrh}>renovation-brh.fr</Text>
        </View>
      </Page>
    </Document>
  )
}
