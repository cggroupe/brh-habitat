import { Page, Text, View } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import type { DpeResult } from '@/lib/dpe-engine/types'
import { HeaderPdf } from '../components/HeaderPdf'
import { FooterPdf } from '../components/FooterPdf'
import { DpeLabelPdf } from '../components/DpeLabelPdf'
import { styles } from '../styles'

interface Props {
  audit: AuditRow
  result: DpeResult
}

export function PageSynthese({ audit, result }: Props) {
  const inputs = audit.inputs as { bati?: { surfaceHabitable?: number; periodeConstruction?: string; typeBatiment?: string }; geo?: { codeInsee?: string } } | undefined
  const sh = inputs?.bati?.surfaceHabitable ?? 0
  const periode = inputs?.bati?.periodeConstruction ?? '—'
  const type = inputs?.bati?.typeBatiment ?? '—'
  const insee = inputs?.geo?.codeInsee ?? '—'

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Synthèse" subtitle="Audit énergétique" auditId={audit.id} />

      <Text style={styles.h1}>Audit énergétique du logement</Text>
      <View style={[styles.notice]}>
        <Text>
          Audit réalisé selon la <Text style={{ fontWeight: 'bold' }}>méthode 3CL-DPE 2021</Text>{' '}
          (arrêté du 8 octobre 2021 modifié). Cet audit est un outil d'aide à la décision pour
          la rénovation énergétique.
        </Text>
      </View>

      {/* Caractéristiques */}
      <Text style={styles.h2}>Caractéristiques du logement</Text>
      <View style={[styles.table]}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Type de bâtiment</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Période</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Surface</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Code INSEE</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Zone climatique</Text>
        </View>
        <View style={styles.tableRowLast}>
          <Text style={styles.tableCell}>{type}</Text>
          <Text style={styles.tableCell}>{periode}</Text>
          <Text style={styles.tableCell}>{sh} m²</Text>
          <Text style={styles.tableCell}>{insee}</Text>
          <Text style={styles.tableCell}>{result.hypotheses.zoneClimatique}</Text>
        </View>
      </View>

      {/* 3 étiquettes */}
      <Text style={styles.h2}>Étiquettes DPE</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
        <View style={{ flex: 1 }}>
          <DpeLabelPdf
            etiquette={result.etiquetteEnergie}
            value={result.cepKwhEpM2An}
            unit="kWh EP/m²·an"
            title="Énergie (CEP)"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DpeLabelPdf
            etiquette={result.etiquetteClimat}
            value={result.gesKgCo2M2An}
            unit="kg CO₂/m²·an"
            title="Climat (GES)"
          />
        </View>
        <View style={{ flex: 1 }}>
          <DpeLabelPdf
            etiquette={result.etiquetteDpe}
            value={result.cepKwhEpM2An}
            unit="kWh EP/m²·an"
            title="DPE final (max)"
            size="large"
          />
        </View>
      </View>

      <Text style={[styles.small, { marginTop: 4 }]}>
        L'étiquette finale du DPE est la plus sévère entre la classe énergie (CEP) et la classe climat
        (GES), selon la règle réglementaire de l'arrêté DPE 2021.
      </Text>

      {/* Chiffres clés */}
      <Text style={styles.h2}>Chiffres clés</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Conso énergie primaire</Text>
          <Text style={styles.bigNumber}>{Math.round(result.cepKwhEpM2An)}</Text>
          <Text style={styles.small}>kWh EP/m²/an</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Émissions GES</Text>
          <Text style={styles.bigNumber}>{result.gesKgCo2M2An.toFixed(1)}</Text>
          <Text style={styles.small}>kg CO₂/m²/an</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Conso totale (EF)</Text>
          <Text style={styles.bigNumber}>{Math.round(result.consoEfTotaleKwhAn)}</Text>
          <Text style={styles.small}>kWh EF/an</Text>
        </View>
      </View>

      <FooterPdf pageNumber={1} totalPages={5} />
    </Page>
  )
}
