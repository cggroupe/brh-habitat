/**
 * Phase 13.6.7.2 — PDF facture de commission BRH (A4, mentions légales FR).
 *
 * Format : facture professionnelle française (CGV + TVA + RIB + délai paiement).
 * Source des données : `brh_commission_invoices` + `brh_commission_lead_links`.
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CommissionInvoiceEnriched } from '@/api/admin-commissions'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: '2pt solid #1c7b1d',
  },
  emitter: {
    fontSize: 10,
    lineHeight: 1.3,
    width: '50%',
  },
  emitterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1c7b1d',
    marginBottom: 4,
  },
  invoiceMeta: {
    width: '45%',
    textAlign: 'right',
    fontSize: 10,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c7b1d',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  recipient: {
    marginBottom: 24,
    fontSize: 10,
    lineHeight: 1.3,
  },
  recipientLabel: {
    fontSize: 9,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  table: {
    marginTop: 8,
    marginBottom: 16,
    border: '1pt solid #d1d5db',
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1c7b1d',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  td: {
    padding: 6,
    fontSize: 9,
  },
  totalsBox: {
    alignSelf: 'flex-end',
    width: '50%',
    marginTop: 16,
    border: '1pt solid #1c7b1d',
    borderRadius: 4,
    padding: 12,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 10,
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1pt solid #1c7b1d',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1c7b1d',
  },
  paymentInfo: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderLeft: '3pt solid #f59e0b',
    fontSize: 9,
    lineHeight: 1.5,
  },
  legal: {
    marginTop: 32,
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    borderTop: '0.5pt solid #d1d5db',
    paddingTop: 8,
  },
  signature: {
    marginTop: 24,
    fontSize: 9,
    fontStyle: 'italic',
    color: '#4b5563',
  },
})

interface Lead {
  lead_id: string
  chantier_ttc_eur: number
  commission_eur: number
}

interface Props {
  invoice: CommissionInvoiceEnriched
  leads: Lead[]
  invoiceNumber: string
  /** Dates à passer depuis le caller (pureté composant) */
  dateEmission?: Date
  dateEcheance?: Date
  emitter?: {
    nom: string
    forme_juridique: string
    siret: string
    tva: string | null
    rcs: string | null
    adresse: string
    code_postal: string
    commune: string
    email: string
    telephone: string
    iban: string | null
    bic: string | null
  }
}

const DEFAULT_EMITTER = {
  nom: 'Bretagne Rénovation Habitat',
  forme_juridique: 'SAS',
  siret: '123 456 789 00012',
  tva: 'FR12345678901',
  rcs: 'Brest 123 456 789',
  adresse: '35 rue de Kervao',
  code_postal: '29490',
  commune: 'Guipavas',
  email: 'compta@brh-habitat.fr',
  telephone: '02 19 00 53 05',
  iban: 'FR76 1234 5678 9012 3456 7890 123',
  bic: 'CCBPFRPPXXX',
}

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(Number(n))) return '0,00 €'
  return `${Number(n).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function formatDateFr(d: Date): string {
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

export function CommissionInvoicePdf({ invoice, leads, invoiceNumber, dateEmission, dateEcheance, emitter }: Props) {
  const e = emitter ?? DEFAULT_EMITTER
  const periodLabel = `${MONTHS_FR[invoice.period_month - 1]} ${invoice.period_year}`
  const dateEmissionLabel = formatDateFr(dateEmission ?? new Date(invoice.created_at))
  const dateEcheanceObj = dateEcheance ?? new Date(new Date(invoice.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
  const dateEcheanceLabel = formatDateFr(dateEcheanceObj)
  const ht = Number(invoice.total_commission_due_eur) / 1.2
  const tva = Number(invoice.total_commission_due_eur) - ht

  return (
    <Document
      title={`Facture commission BRH ${invoiceNumber}`}
      author={e.nom}
      subject={`Commission ${periodLabel}`}
      creator="BRH Habitat — Phase 13.6.7"
    >
      <Page size="A4" style={styles.page}>
        {/* Header émetteur + facture */}
        <View style={styles.header}>
          <View style={styles.emitter}>
            <Text style={styles.emitterTitle}>{e.nom}</Text>
            <Text>{e.forme_juridique}</Text>
            <Text>{e.adresse}</Text>
            <Text>
              {e.code_postal} {e.commune}
            </Text>
            <Text>SIRET : {e.siret}</Text>
            {e.tva && <Text>TVA : {e.tva}</Text>}
            {e.rcs && <Text>RCS : {e.rcs}</Text>}
            <Text>Tél : {e.telephone}</Text>
            <Text>{e.email}</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceNumber}>N° {invoiceNumber}</Text>
            <Text>Émise le {dateEmissionLabel}</Text>
            <Text>Échéance le {dateEcheanceLabel}</Text>
          </View>
        </View>

        {/* Destinataire */}
        <View style={styles.recipient}>
          <Text style={styles.recipientLabel}>Facturé à</Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
            {invoice.artisan_nom_entreprise ?? 'Artisan RGE'}
          </Text>
          {invoice.artisan_commune && (
            <Text>
              {invoice.artisan_commune} ({invoice.artisan_departement})
            </Text>
          )}
          {invoice.artisan_email && <Text>{invoice.artisan_email}</Text>}
        </View>

        {/* Description */}
        <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
          Commission BRH Habitat — Période {periodLabel}
        </Text>
        <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 12 }}>
          Mise en relation prospects DPE F/G via plateforme BRH Habitat (
          {invoice.nb_leads_completed} chantiers signés ce mois — taux{' '}
          {(Number(invoice.commission_pct) * 100).toFixed(1)} %).
        </Text>

        {/* Tableau leads détaillés */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.td, { width: '40%' }]}>Lead # (référence)</Text>
            <Text style={[styles.td, { width: '30%', textAlign: 'right' }]}>Chantier TTC</Text>
            <Text style={[styles.td, { width: '15%', textAlign: 'center' }]}>%</Text>
            <Text style={[styles.td, { width: '15%', textAlign: 'right' }]}>Commission</Text>
          </View>
          {leads.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: '100%', textAlign: 'center', fontStyle: 'italic' }]}>
                Aucun lead détaillé (agrégation simple)
              </Text>
            </View>
          ) : (
            leads.map((l, i) => (
              <View key={l.lead_id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={[styles.td, { width: '40%' }]}>
                  Lead {l.lead_id.slice(0, 8)}…
                </Text>
                <Text style={[styles.td, { width: '30%', textAlign: 'right' }]}>
                  {formatEur(l.chantier_ttc_eur)}
                </Text>
                <Text style={[styles.td, { width: '15%', textAlign: 'center' }]}>
                  {(Number(invoice.commission_pct) * 100).toFixed(1)} %
                </Text>
                <Text
                  style={[
                    styles.td,
                    { width: '15%', textAlign: 'right', fontWeight: 'bold', color: '#1c7b1d' },
                  ]}
                >
                  {formatEur(l.commission_eur)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Totaux */}
        <View style={styles.totalsBox}>
          <View style={styles.totalLine}>
            <Text>Total CA chantiers signés</Text>
            <Text>{formatEur(invoice.total_chantiers_ttc_eur)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Montant HT (TVA déduite)</Text>
            <Text>{formatEur(ht)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>TVA 20 %</Text>
            <Text>{formatEur(tva)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text>Total TTC à régler</Text>
            <Text>{formatEur(invoice.total_commission_due_eur)}</Text>
          </View>
        </View>

        {/* Paiement */}
        {(e.iban || e.bic) && (
          <View style={styles.paymentInfo}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Paiement par virement</Text>
            {e.iban && <Text>IBAN : {e.iban}</Text>}
            {e.bic && <Text>BIC : {e.bic}</Text>}
            <Text style={{ marginTop: 4 }}>
              Référence à indiquer : <Text style={{ fontWeight: 'bold' }}>{invoiceNumber}</Text>
            </Text>
            <Text style={{ marginTop: 4, color: '#78350f' }}>
              Échéance : 30 jours à compter de la date d&apos;émission ({dateEcheanceLabel}).
            </Text>
          </View>
        )}

        <View style={styles.signature}>
          <Text>Merci pour votre confiance et votre activité avec BRH Habitat.</Text>
        </View>

        {/* Mentions légales */}
        <Text style={styles.legal}>
          En cas de retard de paiement, des pénalités de retard égales à 3 fois le taux d&apos;intérêt
          légal seront exigibles (article L.441-10 du Code de Commerce). Une indemnité forfaitaire
          de 40 € pour frais de recouvrement sera également due (article L.441-10).{' '}
          {e.tva && `TVA intracommunautaire : ${e.tva}.`} TVA acquittée d&apos;après les
          encaissements. Pas d&apos;escompte pour règlement anticipé.
        </Text>

        <Text style={styles.footer} fixed>
          {e.nom} · SIRET {e.siret} · {e.email} · {e.telephone}
        </Text>
      </Page>
    </Document>
  )
}
