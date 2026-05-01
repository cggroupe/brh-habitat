/**
 * Étiquette DPE A→G colorée pour PDF.
 * Conforme ADEME 2021.
 */

import { Text, View } from '@react-pdf/renderer'
import { COLORS, DPE_COLOR, DPE_TEXT_COLOR } from '../styles'

const ETIQUETTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

interface Props {
  etiquette: string
  value: number
  unit: string
  title?: string
  size?: 'small' | 'medium' | 'large'
}

export function DpeLabelPdf({ etiquette, value, unit, title, size = 'medium' }: Props) {
  const sizeBox = size === 'large' ? 64 : size === 'small' ? 36 : 48
  const fontSize = size === 'large' ? 32 : size === 'small' ? 18 : 24
  const valueSize = size === 'large' ? 22 : size === 'small' ? 14 : 18

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 8,
        flexDirection: 'column',
      }}
    >
      {title && (
        <Text style={{ fontSize: 9, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>
          {title}
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <View
          style={{
            width: sizeBox,
            height: sizeBox,
            borderRadius: 4,
            backgroundColor: DPE_COLOR[etiquette] ?? COLORS.dpeG,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize, fontWeight: 'bold', color: DPE_TEXT_COLOR[etiquette] ?? '#fff' }}>
            {etiquette}
          </Text>
        </View>
        <View style={{ marginLeft: 10 }}>
          <Text style={{ fontSize: valueSize, fontWeight: 'bold' }}>{Math.round(value)}</Text>
          <Text style={{ fontSize: 8, color: COLORS.textMuted }}>{unit}</Text>
        </View>
      </View>

      {/* Mini gauge avec barres */}
      <View style={{ flexDirection: 'column', marginTop: 4 }}>
        {ETIQUETTES.map((e, i) => {
          const isActive = e === etiquette
          const width = `${30 + i * 10}%`
          return (
            <View
              key={e}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 9,
                backgroundColor: DPE_COLOR[e],
                width,
                marginBottom: 1,
                borderRadius: 1,
                opacity: isActive ? 1 : 0.4,
                paddingLeft: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 6,
                  fontWeight: 'bold',
                  color: DPE_TEXT_COLOR[e],
                }}
              >
                {e}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
