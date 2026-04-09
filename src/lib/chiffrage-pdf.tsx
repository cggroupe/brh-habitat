import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Couleurs BRH
const BRH_GREEN = '#1c7b1d'
const BRH_GREEN_LIGHT = '#359932'
const BRH_GRAY = '#3d3d3d'
const BRH_GRAY_LIGHT = '#e8e8e8'

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, borderBottom: `2px solid ${BRH_GREEN}`, paddingBottom: 15 },
  logo: { fontSize: 28, fontWeight: 700, color: BRH_GREEN, letterSpacing: 3 },
  logoSub: { fontSize: 8, color: BRH_GREEN_LIGHT, letterSpacing: 2, marginTop: 2 },
  headerRight: { textAlign: 'right' },
  headerLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  headerValue: { fontSize: 9, color: BRH_GRAY, marginTop: 1 },
  // Title
  titleBar: { backgroundColor: BRH_GREEN, padding: 12, borderRadius: 4, marginBottom: 20 },
  title: { fontSize: 16, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 9, color: '#c8e6c9', marginTop: 3 },
  // Warning
  warning: { backgroundColor: '#fff8e1', border: '1px solid #ffe082', borderRadius: 4, padding: 10, marginBottom: 20 },
  warningText: { fontSize: 8, color: '#f57f17', textAlign: 'center' },
  // Info cards
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  infoCard: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 4, padding: 10 },
  infoLabel: { fontSize: 7, color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 10, color: BRH_GRAY, fontWeight: 700, marginTop: 3 },
  // Table
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: BRH_GREEN, borderRadius: '4 4 0 0', paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderCell: { color: 'white', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottom: `1px solid ${BRH_GRAY_LIGHT}` },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { fontSize: 9, color: BRH_GRAY },
  tableCellRight: { fontSize: 9, color: BRH_GRAY, textAlign: 'right' },
  // Totals
  totalsBox: { marginLeft: 'auto', width: 220, marginBottom: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 10 },
  totalLabel: { fontSize: 9, color: '#666' },
  totalValue: { fontSize: 9, color: BRH_GRAY, fontWeight: 700 },
  totalRowFinal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: BRH_GREEN, borderRadius: 4, marginTop: 5 },
  totalLabelFinal: { fontSize: 11, color: 'white', fontWeight: 700 },
  totalValueFinal: { fontSize: 11, color: 'white', fontWeight: 700 },
  // Notes
  notes: { marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 },
  notesTitle: { fontSize: 8, fontWeight: 700, color: BRH_GRAY, marginBottom: 5, textTransform: 'uppercase' },
  notesText: { fontSize: 8, color: '#666', lineHeight: 1.5 },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTop: `1px solid ${BRH_GRAY_LIGHT}`, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#999' },
  footerBrh: { fontSize: 7, color: BRH_GREEN, fontWeight: 700 },
})

export interface ChiffrageLineItem {
  designation: string
  unite: string
  quantite: number
  prix_unitaire: number // en centimes
  total: number // en centimes
}

export interface ChiffrageData {
  // Client
  client_name: string
  client_address?: string
  client_phone?: string
  // Partenaire
  partner_name: string
  partner_type: 'pro' | 'particulier'
  partner_company?: string
  // Projet
  projet_titre: string
  projet_description?: string
  // Lignes
  lignes: ChiffrageLineItem[]
  // Totaux
  total_ht: number // centimes
  tva_rate: number // ex: 10
  total_tva: number // centimes
  total_ttc: number // centimes
  // Notes
  notes?: string
  // Date
  date: string
  reference: string
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'
}

export function ChiffragePDF({ data }: { data: ChiffrageData }) {
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
            <Text style={s.headerLabel}>Chiffrage N°</Text>
            <Text style={s.headerValue}>{data.reference}</Text>
            <Text style={{ ...s.headerLabel, marginTop: 5 }}>Date</Text>
            <Text style={s.headerValue}>{data.date}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleBar}>
          <Text style={s.title}>Chiffrage estimatif</Text>
          <Text style={s.subtitle}>{data.projet_titre}</Text>
        </View>

        {/* Warning */}
        <View style={s.warning}>
          <Text style={s.warningText}>
            Ce document est un chiffrage estimatif et ne constitue pas un devis. Un chiffrage definitif sera etabli par un technicien BRH apres visite sur site.
          </Text>
        </View>

        {/* Info cards */}
        <View style={s.infoRow}>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Client</Text>
            <Text style={s.infoValue}>{data.client_name}</Text>
            {data.client_address && <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{data.client_address}</Text>}
            {data.client_phone && <Text style={{ fontSize: 8, color: '#666', marginTop: 1 }}>{data.client_phone}</Text>}
          </View>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>{data.partner_type === 'pro' ? 'Partenaire professionnel' : 'Affilie partenaire'}</Text>
            <Text style={s.infoValue}>{data.partner_company ?? data.partner_name}</Text>
            {data.partner_company && <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{data.partner_name}</Text>}
          </View>
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={{ ...s.tableHeaderCell, flex: 4 }}>Designation</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: 'center' }}>Unite</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1, textAlign: 'center' }}>Qte</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: 'right' }}>P.U. HT</Text>
            <Text style={{ ...s.tableHeaderCell, flex: 1.5, textAlign: 'right' }}>Total HT</Text>
          </View>
          {data.lignes.map((ligne, i) => (
            <View key={i} style={{ ...s.tableRow, ...(i % 2 === 1 ? s.tableRowAlt : {}) }}>
              <Text style={{ ...s.tableCell, flex: 4 }}>{ligne.designation}</Text>
              <Text style={{ ...s.tableCell, flex: 1, textAlign: 'center' }}>{ligne.unite}</Text>
              <Text style={{ ...s.tableCell, flex: 1, textAlign: 'center' }}>{ligne.quantite}</Text>
              <Text style={{ ...s.tableCellRight, flex: 1.5 }}>{formatEur(ligne.prix_unitaire)}</Text>
              <Text style={{ ...s.tableCellRight, flex: 1.5 }}>{formatEur(ligne.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total HT</Text>
            <Text style={s.totalValue}>{formatEur(data.total_ht)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA ({data.tva_rate}%)</Text>
            <Text style={s.totalValue}>{formatEur(data.total_tva)}</Text>
          </View>
          <View style={s.totalRowFinal}>
            <Text style={s.totalLabelFinal}>Total TTC</Text>
            <Text style={s.totalValueFinal}>{formatEur(data.total_ttc)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={s.notes}>
            <Text style={s.notesTitle}>Notes et observations</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Description projet */}
        {data.projet_description && (
          <View style={{ ...s.notes, marginTop: 8 }}>
            <Text style={s.notesTitle}>Description du projet</Text>
            <Text style={s.notesText}>{data.projet_description}</Text>
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
