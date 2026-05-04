import { Text, View } from '@react-pdf/renderer'
import { styles } from '../styles'

interface Props {
  pageNumber: number
  totalPages: number
}

export function FooterPdf({ pageNumber, totalPages }: Props) {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return (
    <View style={styles.footer} fixed>
      <Text>BRH Habitat — Audit DPE 3CL 2021</Text>
      <Text>Édité le {date}</Text>
      <Text>
        Page {pageNumber} / {totalPages}
      </Text>
    </View>
  )
}
