/**
 * Phase 19 Sprint F — Couleurs DPE ADEME officielles 2024 (Loi Climat).
 *
 * Extrait de DpeMarker.tsx pour respecter react-refresh/only-export-components.
 */
import L from 'leaflet'

export type DpeRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export const DPE_COLORS: Record<DpeRating, { bg: string; text: string }> = {
  A: { bg: '#009900', text: '#fff' },
  B: { bg: '#33CC33', text: '#fff' },
  C: { bg: '#99FF66', text: '#1a1a1a' },
  D: { bg: '#FFFF00', text: '#1a1a1a' },
  E: { bg: '#FFCC00', text: '#1a1a1a' },
  F: { bg: '#FF6600', text: '#fff' },
  G: { bg: '#FF0000', text: '#fff' },
}

const ICON_CACHE: Partial<Record<DpeRating, L.DivIcon>> = {}

export function getDpeIcon(rating: DpeRating): L.DivIcon {
  const cached = ICON_CACHE[rating]
  if (cached) return cached

  const colors = DPE_COLORS[rating]
  const html = `
    <div style="
      width: 30px;
      height: 38px;
      background: ${colors.bg};
      color: ${colors.text};
      border: 2px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    ">
      <span style="
        transform: rotate(45deg);
        font-weight: 800;
        font-size: 14px;
        line-height: 1;
        font-family: ui-sans-serif, system-ui, sans-serif;
      ">${rating}</span>
    </div>
  `.trim()

  const icon = L.divIcon({
    html,
    className: 'brh-dpe-marker',
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -38],
  })
  ICON_CACHE[rating] = icon
  return icon
}
