import { Page, Text, View } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import type { DpeResult } from '@/lib/dpe-engine/types'
import { HeaderPdf } from '../components/HeaderPdf'
import { FooterPdf } from '../components/FooterPdf'
import { styles, COLORS } from '../styles'

interface Props {
  audit: AuditRow
  result: DpeResult
}

const POSTE_COLORS = {
  chauffage: '#FF6B35',
  ecs: '#4ECDC4',
  eclairage: '#F7C548',
  auxiliaires: '#A084CA',
  refroidissement: '#3D9DF2',
}

export function PageDeperditions({ audit, result }: Props) {
  const totalConsoEp =
    result.parPoste.chauffage +
    result.parPoste.ecs +
    result.parPoste.eclairage +
    result.parPoste.auxiliaires +
    result.parPoste.refroidissement

  const pct = (v: number) => (totalConsoEp > 0 ? (v / totalConsoEp) * 100 : 0)

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Bilan énergétique" auditId={audit.id} />

      {/* CONSOMMATIONS PAR POSTE */}
      <Text style={styles.h2}>Consommations par poste (kWh EP/an)</Text>

      {/* Bar chart visuel */}
      <View style={{ marginVertical: 8 }}>
        {[
          { label: 'Chauffage', value: result.parPoste.chauffage, color: POSTE_COLORS.chauffage },
          { label: 'Eau chaude sanitaire', value: result.parPoste.ecs, color: POSTE_COLORS.ecs },
          { label: 'Éclairage', value: result.parPoste.eclairage, color: POSTE_COLORS.eclairage },
          { label: 'Auxiliaires (ventilation, pompes)', value: result.parPoste.auxiliaires, color: POSTE_COLORS.auxiliaires },
          { label: 'Climatisation', value: result.parPoste.refroidissement, color: POSTE_COLORS.refroidissement },
        ].map((p) => (
          <View key={p.label} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ fontSize: 9 }}>{p.label}</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                {Math.round(p.value)} kWh ({pct(p.value).toFixed(0)}%)
              </Text>
            </View>
            <View
              style={{
                height: 12,
                backgroundColor: COLORS.bgAlt,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.max(0.5, pct(p.value))}%`,
                  backgroundColor: p.color,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: COLORS.brandLight, marginTop: 6 }]}>
        <Text style={[styles.cardTitle, { color: COLORS.brand }]}>Total consommation EP</Text>
        <Text style={styles.bigNumber}>{Math.round(totalConsoEp)} kWh/an</Text>
        <Text style={styles.small}>(soit {Math.round(result.cepKwhEpM2An)} kWh EP/m²/an)</Text>
      </View>

      {/* DÉPERDITIONS */}
      <Text style={styles.h2}>Déperditions thermiques (W/K)</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Source</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>W/K</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>%</Text>
        </View>
        {[
          { label: 'Parois opaques (murs, planchers, toiture)', value: result.deperditions.parois },
          { label: 'Ouvertures (fenêtres, portes)', value: result.deperditions.ouvertures },
          { label: 'Ponts thermiques', value: result.deperditions.pontsThermiques },
          { label: "Renouvellement d'air (ventilation)", value: result.deperditions.renouvellementAir },
        ].map((p, i, arr) => {
          const total = result.deperditions.total
          const percent = total > 0 ? (p.value / total) * 100 : 0
          return (
            <View key={p.label} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
              <Text style={styles.tableCell}>{p.label}</Text>
              <Text style={styles.tableCellRight}>{Math.round(p.value)}</Text>
              <Text style={styles.tableCellRight}>{percent.toFixed(1)}%</Text>
            </View>
          )
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>GV total</Text>
          <Text style={styles.bigNumber}>{Math.round(result.deperditions.total)}</Text>
          <Text style={styles.small}>W/K — coefficient de déperdition global</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Ubat</Text>
          <Text style={styles.bigNumber}>{result.deperditions.ubat.toFixed(2)}</Text>
          <Text style={styles.small}>W/m²·K — U moyen pondéré enveloppe</Text>
        </View>
      </View>

      <FooterPdf pageNumber={3} totalPages={5} />
    </Page>
  )
}
