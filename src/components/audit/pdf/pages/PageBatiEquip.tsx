import { Page, Text, View } from '@react-pdf/renderer'
import type { AuditRow } from '@/api/schemas'
import type { AuditInputs } from '@/lib/dpe-engine/types'
import { HeaderPdf } from '../components/HeaderPdf'
import { FooterPdf } from '../components/FooterPdf'
import { styles } from '../styles'

interface Props {
  audit: AuditRow
}

const ISOLATION_LABEL: Record<string, string> = {
  iti: 'Intérieure (ITI)',
  ite: 'Extérieure (ITE)',
  iti_ite: 'Mixte ITI+ITE',
  sans: 'Sans isolation',
}

const ADJACENCE_LABEL: Record<string, string> = {
  exterieur: 'Extérieur',
  combles_perdus: 'Combles perdus',
  vide_sanitaire: 'Vide sanitaire',
  terre_plein: 'Terre-plein',
  sous_sol_non_chauffe: 'Sous-sol non chauffé',
  autre_logement: 'Autre logement',
}

export function PageBatiEquip({ audit }: Props) {
  const inputs = audit.inputs as AuditInputs

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Bâti & Équipements" auditId={audit.id} />

      {/* PAROIS OPAQUES */}
      <Text style={styles.h2}>Parois opaques</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Type</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Surface</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Adjacence</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Isolation</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>Épaisseur</Text>
        </View>
        {inputs.bati.parois.map((p, i) => (
          <View key={i} style={i === inputs.bati.parois.length - 1 ? styles.tableRowLast : styles.tableRow}>
            <Text style={styles.tableCell}>{p.type === 'plancher_haut' ? 'Plancher haut' : p.type === 'plancher_bas' ? 'Plancher bas' : p.type === 'mur' ? 'Mur' : 'Toiture'}</Text>
            <Text style={styles.tableCell}>{p.surface} m²</Text>
            <Text style={styles.tableCell}>{ADJACENCE_LABEL[p.adjacence ?? 'exterieur'] ?? p.adjacence ?? '—'}</Text>
            <Text style={styles.tableCell}>{ISOLATION_LABEL[p.isolation?.type ?? 'sans']}</Text>
            <Text style={styles.tableCellRight}>{p.isolation?.epaisseur ? `${p.isolation.epaisseur} mm` : '—'}</Text>
          </View>
        ))}
      </View>

      {/* OUVERTURES */}
      <Text style={styles.h2}>Ouvertures</Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Type</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Surface</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Orientation</Text>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Menuiserie</Text>
          <Text style={[styles.tableCellRight, styles.tableCellHead]}>Vitrage</Text>
        </View>
        {inputs.bati.ouvertures.map((o, i) => (
          <View key={i} style={i === inputs.bati.ouvertures.length - 1 ? styles.tableRowLast : styles.tableRow}>
            <Text style={styles.tableCell}>{o.type === 'fenetre' ? 'Fenêtre' : o.type === 'porte' ? 'Porte' : o.type === 'baie_vitree' ? 'Baie vitrée' : o.type === 'velux' ? 'Velux' : 'Porte-fenêtre'}</Text>
            <Text style={styles.tableCell}>{o.surface} m²</Text>
            <Text style={styles.tableCell}>{o.orientation ?? '—'}</Text>
            <Text style={styles.tableCell}>{o.menuiserie ?? '—'}</Text>
            <Text style={styles.tableCellRight}>{o.vitrage ?? '—'}</Text>
          </View>
        ))}
      </View>

      {/* CHAUFFAGE */}
      <Text style={styles.h2}>Chauffage</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Générateur</Text>
          <Text style={styles.tableCell}>{inputs.equipements.chauffage.generateur}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Émetteur</Text>
          <Text style={styles.tableCell}>{inputs.equipements.chauffage.emetteur ?? '—'}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Année installation</Text>
          <Text style={styles.tableCell}>{inputs.equipements.chauffage.anneeInstallation ?? '—'}</Text>
        </View>
        <View style={styles.tableRowLast}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Régulation pièce/pièce</Text>
          <Text style={styles.tableCell}>{inputs.equipements.chauffage.regulation ? 'Oui' : 'Non'}</Text>
        </View>
      </View>

      {/* ECS */}
      <Text style={styles.h2}>Eau chaude sanitaire</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Générateur</Text>
          <Text style={styles.tableCell}>{inputs.equipements.ecs.generateur}</Text>
        </View>
        <View style={styles.tableRowLast}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Stockage</Text>
          <Text style={styles.tableCell}>{inputs.equipements.ecs.stockageL ? `${inputs.equipements.ecs.stockageL} L` : 'Instantané'}</Text>
        </View>
      </View>

      {/* VENTILATION */}
      <Text style={styles.h2}>Ventilation</Text>
      <Text style={styles.paragraph}>{inputs.equipements.ventilation}</Text>

      <FooterPdf pageNumber={2} totalPages={5} />
    </Page>
  )
}
