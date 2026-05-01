import { Text, View } from '@react-pdf/renderer'
import { styles, COLORS } from '../styles'

interface Props {
  title: string
  subtitle?: string
  auditId?: string
}

export function HeaderPdf({ title, subtitle, auditId }: Props) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>BRH Habitat</Text>
        <Text style={styles.brandSub}>Audit énergétique réglementaire 3CL-DPE 2021</Text>
      </View>
      <View>
        <Text style={[styles.pageHeaderRight, { fontSize: 11, fontWeight: 'bold', color: COLORS.text }]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.pageHeaderRight}>{subtitle}</Text>}
        {auditId && <Text style={styles.pageHeaderRight}>Réf. : {auditId.slice(0, 8)}</Text>}
      </View>
    </View>
  )
}
