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

export function PageMentions({ audit, result }: Props) {
  const dateFinalize = audit.finalized_at
    ? new Date(audit.finalized_at).toLocaleDateString('fr-FR')
    : '—'
  const dateCreated = new Date(audit.created_at).toLocaleDateString('fr-FR')

  return (
    <Page size="A4" style={styles.page}>
      <HeaderPdf title="Hypothèses & mentions" auditId={audit.id} />

      <Text style={styles.h2}>Hypothèses du calcul</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Méthode de calcul</Text>
          <Text style={styles.tableCell}>3CL-DPE 2021 (arrêté du 8 octobre 2021 modifié)</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Zone climatique</Text>
          <Text style={styles.tableCell}>{result.hypotheses.zoneClimatique}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Altitude</Text>
          <Text style={styles.tableCell}>{result.hypotheses.altitude} m</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Nombre d'occupants équivalents</Text>
          <Text style={styles.tableCell}>{result.hypotheses.nadeq.toFixed(2)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Coefficient EP électricité</Text>
          <Text style={styles.tableCell}>2.3 (officiel ADEME 2021)</Text>
        </View>
        <View style={styles.tableRowLast}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Version moteur de calcul</Text>
          <Text style={styles.tableCell}>BRH Habitat — DPE Engine v{result.hypotheses.moteurVersion}</Text>
        </View>
      </View>

      <Text style={styles.h2}>Méthodologie</Text>
      <Text style={styles.paragraph}>
        Cet audit a été réalisé selon la méthode 3CL-DPE 2021 telle que définie par l'arrêté du
        8 octobre 2021 modifié. Les calculs prennent en compte les caractéristiques thermiques du
        bâtiment (parois opaques, ouvertures, ponts thermiques, perméabilité à l'air,
        renouvellement d'air) ainsi que les rendements des équipements (chauffage, ECS,
        ventilation, éclairage, auxiliaires).
      </Text>
      <Text style={styles.paragraph}>
        Les apports gratuits (solaires + internes) sont intégrés au bilan via le facteur
        d'utilisation F_j conventionnel selon l'inertie du bâtiment.
      </Text>

      <Text style={styles.h2}>Limites de précision</Text>
      <Text style={styles.paragraph}>
        Le résultat de cet audit est un calcul conventionnel. La consommation réelle peut différer
        en fonction du comportement des occupants, des conditions climatiques de l'année et de
        l'état réel des équipements. La marge d'erreur typique est de ±10 à 20 %.
      </Text>

      <Text style={styles.h2}>Statut & date</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Référence audit</Text>
          <Text style={styles.tableCell}>{audit.id}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Date de création</Text>
          <Text style={styles.tableCell}>{dateCreated}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Date de finalisation</Text>
          <Text style={styles.tableCell}>{dateFinalize}</Text>
        </View>
        <View style={styles.tableRowLast}>
          <Text style={[styles.tableCell, styles.tableCellHead]}>Statut</Text>
          <Text style={styles.tableCell}>
            {audit.status === 'submitted' ? 'Finalisé' : audit.status === 'archived' ? 'Archivé' : 'Brouillon'}
          </Text>
        </View>
      </View>

      <Text style={styles.h2}>Mentions légales</Text>
      <Text style={[styles.small, { lineHeight: 1.5 }]}>
        Document généré par BRH Habitat — Plateforme de rénovation énergétique en Bretagne.
        Document à valeur indicative pour aide à la décision en rénovation. Pour un DPE
        réglementaire opposable (vente, location), faire appel à un diagnostiqueur certifié inscrit
        à l'Observatoire DPE-Audit ADEME (https://observatoire-dpe-audit.ademe.fr).
      </Text>
      <Text style={[styles.small, { marginTop: 4, lineHeight: 1.5 }]}>
        Les classes F et G correspondent aux logements considérés comme « passoires thermiques »
        au sens de la loi Climat et Résilience du 22 août 2021. Des restrictions à la mise en
        location s'appliquent depuis le 1er janvier 2025 pour les classes G, et s'appliqueront aux
        classes F à partir du 1er janvier 2028.
      </Text>

      <View style={[styles.notice, { marginTop: 14, backgroundColor: COLORS.brandLight }]}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Pour toute question :</Text>
        <Text>
          BRH Habitat — www.renovation-brh.fr
        </Text>
      </View>

      <FooterPdf pageNumber={5} totalPages={5} />
    </Page>
  )
}
