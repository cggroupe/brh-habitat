/**
 * DpeLabelGauge — Étiquette DPE A→G visuelle conforme ADEME.
 *
 * Affichage jauge avec 7 barres colorées de largeur croissante,
 * la classe active est highlightée. Couleurs officielles ADEME 2021.
 */

import type { EtiquetteDpe } from '@/lib/dpe-engine/constants'

interface Props {
  etiquette: EtiquetteDpe
  value: number
  unit: string
  title?: string
  /** "energie" affiche kWh EP, "climat" affiche kg CO₂ */
  type?: 'energie' | 'climat' | 'final'
}

const COLORS: Record<EtiquetteDpe, { bg: string; text: string; label: string }> = {
  A: { bg: '#319834', text: 'white', label: 'A' },
  B: { bg: '#33CC33', text: 'white', label: 'B' },
  C: { bg: '#CCCC33', text: 'black', label: 'C' },
  D: { bg: '#FFCC33', text: 'black', label: 'D' },
  E: { bg: '#FF9933', text: 'white', label: 'E' },
  F: { bg: '#FF6633', text: 'white', label: 'F' },
  G: { bg: '#FF3333', text: 'white', label: 'G' },
}

const ETIQUETTES: EtiquetteDpe[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export function DpeLabelGauge({ etiquette, value, unit, title, type = 'final' }: Props) {
  const titleLabel = title ?? (type === 'energie' ? 'Énergie' : type === 'climat' ? 'Climat' : 'DPE')

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{titleLabel}</h3>
      <div className="mt-2 flex items-baseline gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded text-3xl font-black"
          style={{ backgroundColor: COLORS[etiquette].bg, color: COLORS[etiquette].text }}
          aria-label={`Classe ${etiquette}`}
        >
          {etiquette}
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums text-gray-900">
            {Math.round(value)}
          </div>
          <div className="text-xs text-gray-500">{unit}</div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {ETIQUETTES.map((e, i) => {
          const isActive = e === etiquette
          const width = 30 + i * 10 // 30%, 40%, 50%, ..., 90%
          const c = COLORS[e]
          return (
            <div
              key={e}
              className={`flex h-5 items-center rounded-r text-xs font-bold transition-all ${isActive ? 'ring-2 ring-gray-800 ring-offset-1' : 'opacity-50'}`}
              style={{ width: `${width}%`, backgroundColor: c.bg, color: c.text }}
            >
              <span className="ml-2">{e}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
