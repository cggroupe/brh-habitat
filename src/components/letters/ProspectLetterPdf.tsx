/**
 * Phase 13 — PDF de courrier de prospection (format A4 français standard).
 *
 * Génère un courrier prêt à imprimer + envoyer (fenêtre adresse à droite,
 * en-tête expéditeur, lieu+date, objet, corps Markdown rendu plain text,
 * formule de politesse + signature + mentions RGE/SIRET).
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ProspectLetterRow } from '@/api/prospect-letters'
import type { ProspectBretagneRow } from '@/api/prospects-bretagne'

const styles = StyleSheet.create({
  page: {
    padding: 56, // ~2cm marges (A4 standard FR)
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    color: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  expeditor: {
    fontSize: 10,
    lineHeight: 1.3,
    width: '50%',
  },
  expeditorBold: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  recipientWindow: {
    fontSize: 10,
    lineHeight: 1.3,
    marginTop: 16,
    marginRight: 8,
    width: '45%',
    minHeight: 60,
  },
  lieuDate: {
    textAlign: 'right',
    fontSize: 10,
    marginBottom: 24,
  },
  subject: {
    fontWeight: 'bold',
    marginBottom: 18,
    fontSize: 11,
  },
  greeting: {
    marginBottom: 12,
  },
  bodyParagraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  signature: {
    marginTop: 28,
    fontSize: 10,
    lineHeight: 1.4,
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
})

interface Props {
  letter: Pick<ProspectLetterRow, 'subject' | 'body_md' | 'greeting' | 'signature'>
  prospect: Pick<ProspectBretagneRow, 'adresse_ban' | 'code_postal' | 'commune'> & {
    owner_name?: string | null
  }
  expeditor: {
    full_name: string
    company_name?: string | null
    address?: string | null
    code_postal?: string | null
    commune?: string | null
    rge_numero?: string | null
    siret?: string | null
    email?: string | null
    phone?: string | null
  }
}

function formatDateFr(d: Date): string {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Convertit du Markdown très simple en paragraphes <Text> pour @react-pdf.
 * Supporte : paragraphes (séparés par \n\n), gras (**...**), italique (*...*).
 */
function renderMarkdown(md: string): React.ReactNode {
  const paragraphs = md.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  return paragraphs.map((para, idx) => (
    <Text key={idx} style={styles.bodyParagraph}>
      {renderInline(para)}
    </Text>
  ))
}

function renderInline(text: string): React.ReactNode {
  // Split sur **bold** et *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: 'bold' }}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={i} style={{ fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </Text>
      )
    }
    return part
  })
}

export function ProspectLetterPdf({ letter, prospect, expeditor }: Props) {
  const lieu = expeditor.commune ?? 'Brest'
  const dateStr = formatDateFr(new Date())

  return (
    <Document
      title={`Courrier ${prospect.commune ?? ''} — ${letter.subject.slice(0, 60)}`}
      author={expeditor.full_name}
      subject="Prospection BRH Habitat"
      creator="BRH Habitat — Phase 13"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.expeditor}>
            <Text style={styles.expeditorBold}>
              {expeditor.full_name}
            </Text>
            {expeditor.company_name && <Text>{expeditor.company_name}</Text>}
            {expeditor.address && <Text>{expeditor.address}</Text>}
            {(expeditor.code_postal || expeditor.commune) && (
              <Text>
                {expeditor.code_postal} {expeditor.commune}
              </Text>
            )}
            {expeditor.phone && <Text>Tél : {expeditor.phone}</Text>}
            {expeditor.email && <Text>{expeditor.email}</Text>}
          </View>
          <View style={styles.recipientWindow}>
            {prospect.owner_name && <Text>{prospect.owner_name}</Text>}
            {!prospect.owner_name && <Text>À l&apos;attention du propriétaire</Text>}
            {prospect.adresse_ban && <Text>{prospect.adresse_ban}</Text>}
            {(prospect.code_postal || prospect.commune) && (
              <Text>
                {prospect.code_postal} {prospect.commune}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.lieuDate}>
          {lieu}, le {dateStr}
        </Text>

        <Text style={styles.subject}>Objet : {letter.subject}</Text>

        {letter.greeting && <Text style={styles.greeting}>{letter.greeting}</Text>}

        <View>{renderMarkdown(letter.body_md)}</View>

        {letter.signature && (
          <View style={styles.signature}>
            {letter.signature.split('\n').map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          BRH Habitat — Cabinet RGE QualiBat conforme arrêté 8 octobre 2021
          {expeditor.siret ? ` · SIRET ${expeditor.siret}` : ''}
          {expeditor.rge_numero ? ` · RGE ${expeditor.rge_numero}` : ''}
        </Text>
      </Page>
    </Document>
  )
}
