/**
 * Page PDF — Scénarios de rénovation comparés.
 * Phase 7 V1 : 5 templates calculés à la volée.
 */

import { Page, Text, View } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import type { AuditInputs, DpeResult } from '@/lib/dpe-engine/types'
import { computeAllScenarios, ORDER_DPE } from '@/lib/dpe-engine'
import { HeaderPdf } from '../components/HeaderPdf'
import { FooterPdf } from '../components/FooterPdf'
import { styles, COLORS, DPE_COLOR, DPE_TEXT_COLOR } from '../styles'

interface Props {
  audit: AuditRow
  result: DpeResult
}

function fmtEuros(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

function PdfEtiquette({ value }: { value: string }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        backgroundColor: DPE_COLOR[value] ?? COLORS.dpeG,
        borderRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: 'bold',
          color: DPE_TEXT_COLOR[value] ?? '#fff',
        }}
      >
        {value}
      </Text>
    </View>
  )
}

export function PageVariantes({ audit, result }: Props) {
  const inputs = audit.inputs as AuditInputs
  const scenarios = computeAllScenarios(inputs, result)

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Scénarios de rénovation" auditId={audit.id} />

      <Text style={styles.h1}>5 scénarios comparés</Text>
      <Text style={styles.paragraph}>
        Voici 5 packs de rénovation prédéfinis, du moins cher au plus complet. Le payback est
        le temps de retour sur investissement après aides MPR + CEE.
      </Text>

      <View
        style={[
          styles.notice,
          { backgroundColor: COLORS.brandLight, marginBottom: 8, fontSize: 8 },
        ]}
      >
        <Text>
          <Text style={{ fontWeight: 'bold' }}>Hypothèses</Text> : prix énergie 2026, MPR + CEE
          forfaitaires (V1). Le calcul détaillé selon votre décile fiscal sera affiné lors de
          l'étude personnalisée.
        </Text>
      </View>

      {/* Tableau des scénarios */}
      <View style={[styles.table, { borderWidth: 1, borderColor: COLORS.border }]}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHead, { backgroundColor: COLORS.bgAlt }]}>
          <Text style={[styles.tableCell, styles.tableCellHead, { flex: 2 }]}>Scénario</Text>
          <Text style={[styles.tableCell, styles.tableCellHead, { flex: 1, textAlign: 'center' }]}>
            DPE
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 1 }]}>Coût TTC</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 1 }]}>Aides</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 1 }]}>Reste</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.7 }]}>Payback</Text>
        </View>

        {/* Situation actuelle */}
        <View style={[styles.tableRow, { backgroundColor: '#fafafa' }]}>
          <View style={{ flex: 2, padding: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: COLORS.textMuted }}>
              Situation actuelle
            </Text>
            <Text style={{ fontSize: 7, color: COLORS.textMuted }}>Sans rénovation</Text>
          </View>
          <View style={{ flex: 1, padding: 4, alignItems: 'center', justifyContent: 'center' }}>
            <PdfEtiquette value={result.etiquetteDpe} />
          </View>
          <Text style={[styles.tableCellRight, { flex: 1, color: COLORS.textMuted }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 1, color: COLORS.textMuted }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 1, color: COLORS.textMuted }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.7, color: COLORS.textMuted }]}>—</Text>
        </View>

        {scenarios.map((s, i) => {
          const ameliorationClasses = ORDER_DPE[result.etiquetteDpe] - ORDER_DPE[s.result.etiquetteDpe]
          const isLast = i === scenarios.length - 1
          return (
            <View
              key={s.template.id}
              style={isLast ? styles.tableRowLast : styles.tableRow}
            >
              <View style={{ flex: 2, padding: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{s.template.label}</Text>
                <Text style={{ fontSize: 7, color: COLORS.textMuted }}>
                  {s.template.description}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  padding: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <PdfEtiquette value={result.etiquetteDpe} />
                <Text style={{ fontSize: 8 }}>→</Text>
                <PdfEtiquette value={s.result.etiquetteDpe} />
                {ameliorationClasses > 0 && (
                  <Text style={{ fontSize: 7, color: COLORS.brand, fontWeight: 'bold' }}>
                    {' '}
                    +{ameliorationClasses}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCellRight, { flex: 1 }]}>
                {fmtEuros(s.coutTtcEuros)}
              </Text>
              <Text style={[styles.tableCellRight, { flex: 1, color: '#1d4ed8' }]}>
                {fmtEuros(s.aidesEuros.total)}
              </Text>
              <Text
                style={[
                  styles.tableCellRight,
                  { flex: 1, color: COLORS.brand, fontWeight: 'bold' },
                ]}
              >
                {fmtEuros(s.payback.resteACharge)}
              </Text>
              <Text
                style={[
                  styles.tableCellRight,
                  {
                    flex: 0.7,
                    fontWeight: 'bold',
                    color:
                      s.payback.alerteSuperieur30Ans
                        ? '#c2410c'
                        : s.payback.paybackAnnees && s.payback.paybackAnnees < 10
                          ? COLORS.brand
                          : COLORS.text,
                  },
                ]}
              >
                {s.payback.paybackAnnees != null
                  ? s.payback.paybackAnnees < 30
                    ? `${s.payback.paybackAnnees.toFixed(1)}a`
                    : '>30a'
                  : '—'}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Détail économies annuelles */}
      <Text style={styles.h2}>Économies annuelles attendues</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Scénario</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>Économie kWh/an</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>Économie €/an</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>Gain DPE %</Text>
        </View>
        {scenarios.map((s, i) => {
          const gainPct =
            result.consoEfTotaleKwhAn > 0
              ? Math.round(
                  ((result.consoEfTotaleKwhAn - s.result.consoEfTotaleKwhAn) /
                    result.consoEfTotaleKwhAn) *
                    100,
                )
              : 0
          return (
            <View
              key={s.template.id}
              style={i === scenarios.length - 1 ? styles.tableRowLast : styles.tableRow}
            >
              <Text style={styles.tableCell}>{s.template.label}</Text>
              <Text style={styles.tableCellRight}>
                {Math.round(s.payback.economieKwhEfAn).toLocaleString('fr-FR')}
              </Text>
              <Text style={styles.tableCellRight}>
                {fmtEuros(s.payback.economieEurosAn)}
              </Text>
              <Text style={[styles.tableCellRight, { color: COLORS.brand, fontWeight: 'bold' }]}>
                {gainPct > 0 ? `${gainPct}%` : '—'}
              </Text>
            </View>
          )
        })}
      </View>

      <Text style={[styles.small, { marginTop: 8 }]}>
        Le coût et les aides sont des estimations forfaitaires basées sur les prix marché
        Bretagne 2026. Pour un chiffrage précis, votre artisan RGE réalisera une étude de devis
        personnalisée tenant compte de la spécificité de votre logement et de votre profil
        fiscal (décile MaPrimeRénov').
      </Text>

      <FooterPdf pageNumber={4} totalPages={5} />
    </Page>
  )
}
