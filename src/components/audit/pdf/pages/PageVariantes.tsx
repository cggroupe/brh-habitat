/**
 * Page PDF — Scénarios de rénovation comparés.
 * Phase 7 V1 : 5 templates calculés à la volée.
 * Phase 8.1 : aides détaillées (MPR + CEE + ÉcoPTZ + plafond) selon décile audit.
 */

import { Page, Text, View } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import {
  calcCouleurFromAudit,
  computeAllScenarios,
  ORDER_DPE,
  PLAFOND_GLOBAL_HT_PCT,
  type AuditInputs,
  type DpeResult,
  type CouleurMPR,
} from '@/lib/dpe-engine'
import { HeaderPdf } from '../components/HeaderPdf'
import { FooterPdf } from '../components/FooterPdf'
import { styles, COLORS, DPE_COLOR, DPE_TEXT_COLOR } from '../styles'

interface Props {
  audit: AuditRow
  result: DpeResult
}

const COULEUR_HEX: Record<CouleurMPR, string> = {
  bleu: '#dbeafe',
  jaune: '#fef3c7',
  violet: '#ede9fe',
  rose: '#fce7f3',
}

const COULEUR_TEXT: Record<CouleurMPR, string> = {
  bleu: '#1e40af',
  jaune: '#92400e',
  violet: '#6b21a8',
  rose: '#9f1239',
}

const COULEUR_LABEL: Record<CouleurMPR, string> = {
  bleu: 'Bleu (très modeste)',
  jaune: 'Jaune (modeste)',
  violet: 'Violet (intermédiaire)',
  rose: 'Rose (non modeste)',
}

function fmtEuros(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

function PdfEtiquette({ value }: { value: string }) {
  return (
    <View
      style={{
        width: 16,
        height: 16,
        backgroundColor: DPE_COLOR[value] ?? COLORS.dpeG,
        borderRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 10,
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
  const decile = calcCouleurFromAudit(inputs)
  const couleur: CouleurMPR = decile?.couleur ?? 'jaune'
  const scenarios = computeAllScenarios(inputs, result, {
    couleur,
    zoneClimat: result.hypotheses.zoneClimatique,
  })

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Scénarios de rénovation" auditId={audit.id} />

      <Text style={styles.h1}>5 scénarios comparés avec aides</Text>

      {/* Profil fiscal détecté */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: COULEUR_HEX[couleur],
          padding: 8,
          borderRadius: 4,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 9, color: COULEUR_TEXT[couleur], fontWeight: 'bold' }}>
          Profil MaPrimeRénov' :
        </Text>
        <Text style={{ fontSize: 11, color: COULEUR_TEXT[couleur], fontWeight: 'bold' }}>
          {COULEUR_LABEL[couleur]}
        </Text>
        <Text style={{ fontSize: 9, color: COULEUR_TEXT[couleur] }}>
          — Plafond global aides : {Math.round(PLAFOND_GLOBAL_HT_PCT[couleur] * 100)}% HT
        </Text>
      </View>

      <Text style={[styles.paragraph, { fontSize: 9 }]}>
        Voici 5 packs de rénovation prédéfinis. Les aides MPR + CEE + Éco-PTZ sont calculées
        selon votre profil fiscal. L'Éco-PTZ est un prêt à 0 % (jusqu'à 20 ans), pas une
        subvention — il peut couvrir tout ou partie du reste à charge.
      </Text>

      {/* Tableau des scénarios */}
      <View style={[styles.table, { borderWidth: 1, borderColor: COLORS.border }]}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHead, { backgroundColor: COLORS.bgAlt }]}>
          <Text style={[styles.tableCell, styles.tableCellHead, { flex: 1.6, fontSize: 7 }]}>
            Scénario
          </Text>
          <Text
            style={[styles.tableCell, styles.tableCellHead, { flex: 0.8, textAlign: 'center', fontSize: 7 }]}
          >
            DPE
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.9, fontSize: 7 }]}>
            Coût TTC
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.7, fontSize: 7 }]}>
            MPR
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.7, fontSize: 7 }]}>
            CEE
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.7, fontSize: 7 }]}>
            ÉcoPTZ
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.9, fontSize: 7 }]}>
            Reste
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { flex: 0.6, fontSize: 7 }]}>
            Payback
          </Text>
        </View>

        {/* Situation actuelle */}
        <View style={[styles.tableRow, { backgroundColor: '#fafafa' }]}>
          <View style={{ flex: 1.6, padding: 3 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: COLORS.textMuted }}>
              Situation actuelle
            </Text>
            <Text style={{ fontSize: 6, color: COLORS.textMuted }}>Sans rénovation</Text>
          </View>
          <View
            style={{ flex: 0.8, padding: 3, alignItems: 'center', justifyContent: 'center' }}
          >
            <PdfEtiquette value={result.etiquetteDpe} />
          </View>
          <Text style={[styles.tableCellRight, { flex: 0.9, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.7, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.7, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.7, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.9, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
          <Text style={[styles.tableCellRight, { flex: 0.6, color: COLORS.textMuted, fontSize: 7 }]}>—</Text>
        </View>

        {scenarios.map((s, i) => {
          const ameliorationClasses =
            ORDER_DPE[result.etiquetteDpe] - ORDER_DPE[s.result.etiquetteDpe]
          const isLast = i === scenarios.length - 1
          const aides = s.aidesDetaillees
          const mprEuros = aides?.mpr.totalEuros ?? s.aidesEuros.mpr
          const ceeEuros = aides?.cee.totalEuros ?? s.aidesEuros.cee
          const ecoPtzEuros = aides?.ecoPtz.montantEligibleEuros ?? 0
          return (
            <View
              key={s.template.id}
              style={isLast ? styles.tableRowLast : styles.tableRow}
            >
              <View style={{ flex: 1.6, padding: 3 }}>
                <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{s.template.label}</Text>
                <Text style={{ fontSize: 6, color: COLORS.textMuted, marginTop: 1 }}>
                  {s.template.description.length > 90
                    ? s.template.description.slice(0, 87) + '…'
                    : s.template.description}
                </Text>
                {aides?.cumul.ratioEcretement && aides.cumul.ratioEcretement < 1 && (
                  <Text style={{ fontSize: 6, color: '#c2410c', marginTop: 1 }}>
                    ⚠ Aides écrêtées (plafond)
                  </Text>
                )}
              </View>
              <View
                style={{
                  flex: 0.8,
                  padding: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <PdfEtiquette value={result.etiquetteDpe} />
                <Text style={{ fontSize: 7 }}>→</Text>
                <PdfEtiquette value={s.result.etiquetteDpe} />
                {ameliorationClasses > 0 && (
                  <Text style={{ fontSize: 6, color: COLORS.brand, fontWeight: 'bold' }}>
                    +{ameliorationClasses}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCellRight, { flex: 0.9, fontSize: 7, fontWeight: 'bold' }]}>
                {fmtEuros(s.coutTtcEuros)}
              </Text>
              <Text style={[styles.tableCellRight, { flex: 0.7, color: '#1d4ed8', fontSize: 7 }]}>
                {fmtEuros(mprEuros)}
              </Text>
              <Text style={[styles.tableCellRight, { flex: 0.7, color: '#1d4ed8', fontSize: 7 }]}>
                {fmtEuros(ceeEuros)}
              </Text>
              <View style={{ flex: 0.7, padding: 3 }}>
                <Text style={{ fontSize: 7, color: '#7e22ce', fontWeight: 'bold', textAlign: 'right' }}>
                  {fmtEuros(ecoPtzEuros)}
                </Text>
                {aides?.ecoPtz.mode && (
                  <Text style={{ fontSize: 5, color: COLORS.textMuted, textAlign: 'right' }}>
                    mode {aides.ecoPtz.mode}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.tableCellRight,
                  { flex: 0.9, color: COLORS.brand, fontWeight: 'bold', fontSize: 7 },
                ]}
              >
                {fmtEuros(s.payback.resteACharge)}
              </Text>
              <Text
                style={[
                  styles.tableCellRight,
                  {
                    flex: 0.6,
                    fontWeight: 'bold',
                    fontSize: 7,
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
      <Text style={[styles.h2, { marginTop: 10 }]}>Économies annuelles attendues</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead, { fontSize: 8 }]}>Scénario</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { fontSize: 8 }]}>
            Économie kWh/an
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { fontSize: 8 }]}>
            Économie €/an
          </Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead, { fontSize: 8 }]}>
            Gain DPE
          </Text>
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
              <Text style={[styles.tableCell, { fontSize: 8 }]}>{s.template.label}</Text>
              <Text style={[styles.tableCellRight, { fontSize: 8 }]}>
                {Math.round(s.payback.economieKwhEfAn).toLocaleString('fr-FR')}
              </Text>
              <Text style={[styles.tableCellRight, { fontSize: 8 }]}>
                {fmtEuros(s.payback.economieEurosAn)}
              </Text>
              <Text
                style={[
                  styles.tableCellRight,
                  { color: COLORS.brand, fontWeight: 'bold', fontSize: 8 },
                ]}
              >
                {gainPct > 0 ? `${gainPct}%` : '—'}
              </Text>
            </View>
          )
        })}
      </View>

      <Text style={[styles.small, { marginTop: 6 }]}>
        Aides calculées avec les barèmes officiels MaPrimeRénov' 2026 par décile + CEE par zone
        climatique avec bonus précaire (Bleu/Jaune). Plafond global d'écrêtement appliqué selon
        le décile. Les montants peuvent varier selon les critères techniques précis du chantier.
      </Text>

      <FooterPdf pageNumber={4} totalPages={5} />
    </Page>
  )
}
