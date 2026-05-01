/**
 * Styles partagés pour le PDF audit.
 * Couleurs DPE conformes ADEME 2021.
 */

import { StyleSheet } from '@react-pdf/renderer'

export const COLORS = {
  brand: '#1c7b1d', // BRH vert
  brandDark: '#155a17',
  brandLight: '#e8f4e9',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bg: '#ffffff',
  bgAlt: '#f9fafb',
  // DPE officiels ADEME 2021
  dpeA: '#319834',
  dpeB: '#33CC33',
  dpeC: '#CCCC33',
  dpeD: '#FFCC33',
  dpeE: '#FF9933',
  dpeF: '#FF6633',
  dpeG: '#FF3333',
}

export const DPE_COLOR: Record<string, string> = {
  A: COLORS.dpeA,
  B: COLORS.dpeB,
  C: COLORS.dpeC,
  D: COLORS.dpeD,
  E: COLORS.dpeE,
  F: COLORS.dpeF,
  G: COLORS.dpeG,
}

export const DPE_TEXT_COLOR: Record<string, string> = {
  A: '#ffffff',
  B: '#ffffff',
  C: '#000000',
  D: '#000000',
  E: '#ffffff',
  F: '#ffffff',
  G: '#ffffff',
}

export const styles = StyleSheet.create({
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
  brand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.brand,
  },
  brandSub: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  pageHeaderRight: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  h1: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.brand,
    marginBottom: 8,
  },
  h2: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  h3: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.brandDark,
    marginTop: 8,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  small: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
    marginVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableHead: {
    backgroundColor: COLORS.bgAlt,
  },
  tableCell: {
    padding: 4,
    fontSize: 9,
    flex: 1,
  },
  tableCellRight: {
    padding: 4,
    fontSize: 9,
    flex: 1,
    textAlign: 'right',
  },
  tableCellHead: {
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.textMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
    marginVertical: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  bigNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  notice: {
    backgroundColor: COLORS.brandLight,
    padding: 8,
    borderRadius: 3,
    marginVertical: 6,
    fontSize: 9,
  },
})
