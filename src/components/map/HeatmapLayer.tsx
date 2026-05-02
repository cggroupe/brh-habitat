/**
 * Phase 13.5 — Couche heatmap pour Leaflet (plugin leaflet.heat).
 *
 * leaflet.heat n'a pas de wrapper react-leaflet officiel, on l'intègre
 * via useMap() + useEffect.
 */

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

interface HeatPoint {
  lat: number
  lng: number
  intensity: number // 0-1
}

interface Props {
  points: HeatPoint[]
  radius?: number
  blur?: number
  maxZoom?: number
  gradient?: Record<number, string>
}

// Type minimal pour leaflet.heat (pas typé dans @types/leaflet)
interface HeatLayerOptions {
  minOpacity?: number
  maxZoom?: number
  max?: number
  radius?: number
  blur?: number
  gradient?: Record<number, string>
}

interface HeatLayer extends L.Layer {
  setLatLngs(latlngs: Array<[number, number, number]>): void
  setOptions(options: HeatLayerOptions): void
}

interface LWithHeat {
  heatLayer(latlngs: Array<[number, number, number]>, options?: HeatLayerOptions): HeatLayer
}

export function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
  gradient = {
    0.0: '#3b82f6', // bleu
    0.3: '#fbbf24', // jaune
    0.6: '#f97316', // orange
    1.0: '#dc2626', // rouge
  },
}: Props) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return

    const data: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ])

    const heatL = L as unknown as LWithHeat
    const layer = heatL.heatLayer(data, {
      radius,
      blur,
      maxZoom,
      gradient,
    })
    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [map, points, radius, blur, maxZoom, gradient])

  return null
}
