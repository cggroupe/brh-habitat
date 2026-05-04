/**
 * Tests Phase 13.6 — Marketplace artisans RGE.
 */

import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  proximityFactor,
  matchArtisansForGeste,
  findProspectsForArtisan,
  type ArtisanCandidate,
} from '../match-artisans'

const BREST: { lat: number; lng: number } = { lat: 48.39, lng: -4.49 }
const RENNES: { lat: number; lng: number } = { lat: 48.11, lng: -1.68 }
const QUIMPER: { lat: number; lng: number } = { lat: 47.99, lng: -4.1 }

const artisanBrestPac: ArtisanCandidate = {
  id: 'a-1',
  nom_entreprise: 'Pompes à chaleur Brest',
  representant: 'Yann Le Roux',
  email: 'yann@pac-brest.fr',
  telephone: '02 98 00 00 00',
  code_postal: '29200',
  commune: 'Brest',
  departement: '29',
  latitude: 48.39,
  longitude: -4.49,
  geste_specialites: ['pac_air_eau', 'pac_eau_eau'],
  score_qualite: 85,
  nombre_chantiers_brh: 12,
  taux_conversion_brh: 0.65,
  marketplace_premium: true,
}

const artisanRennesIso: ArtisanCandidate = {
  id: 'a-2',
  nom_entreprise: 'Iso-Confort Rennes',
  representant: 'Marie Le Bras',
  email: 'contact@iso-confort.fr',
  telephone: '02 99 00 00 00',
  code_postal: '35000',
  commune: 'Rennes',
  departement: '35',
  latitude: 48.11,
  longitude: -1.68,
  geste_specialites: ['isolation_combles_perdus', 'isolation_murs_ite'],
  score_qualite: 70,
  nombre_chantiers_brh: 5,
  taux_conversion_brh: 0.4,
  marketplace_premium: false,
}

const artisanQuimperPac: ArtisanCandidate = {
  id: 'a-3',
  nom_entreprise: 'Quimper Énergie',
  representant: 'Erwan Tanguy',
  email: 'erwan@qe.fr',
  telephone: '02 98 99 99 99',
  code_postal: '29000',
  commune: 'Quimper',
  departement: '29',
  latitude: 47.99,
  longitude: -4.1,
  geste_specialites: ['pac_air_eau'],
  score_qualite: 60,
  nombre_chantiers_brh: 2,
  taux_conversion_brh: 0.5,
  marketplace_premium: false,
}

describe('haversineKm', () => {
  it('0 km si coords identiques', () => {
    expect(haversineKm(BREST, BREST)).toBe(0)
  })

  it('Brest ↔ Rennes ≈ 210 km', () => {
    const d = haversineKm(BREST, RENNES)
    expect(d).toBeGreaterThan(195)
    expect(d).toBeLessThan(215)
  })

  it('Brest ↔ Quimper ≈ 53 km', () => {
    const d = haversineKm(BREST, QUIMPER)
    expect(d).toBeGreaterThan(48)
    expect(d).toBeLessThan(60)
  })
})

describe('proximityFactor', () => {
  it('5 km → 1.0', () => {
    expect(proximityFactor(5)).toBe(1.0)
  })

  it('10 km → 1.0 (limite haute)', () => {
    expect(proximityFactor(10)).toBe(1.0)
  })

  it('15 km → 0.85', () => {
    expect(proximityFactor(15)).toBe(0.85)
  })

  it('40 km → 0.7', () => {
    expect(proximityFactor(40)).toBe(0.7)
  })

  it('80 km → 0.5', () => {
    expect(proximityFactor(80)).toBe(0.5)
  })

  it('150 km → 0.3 (rural breton plafond)', () => {
    expect(proximityFactor(150)).toBe(0.3)
  })
})

describe('matchArtisansForGeste', () => {
  const candidates = [artisanBrestPac, artisanRennesIso, artisanQuimperPac]

  it('Prospect Brest + geste PAC → Brest #1, Quimper #2 (Rennes filtré)', () => {
    const matches = matchArtisansForGeste(BREST, 'pac_air_eau', candidates)
    expect(matches).toHaveLength(2)
    expect(matches[0].artisan.id).toBe('a-1') // Brest local + premium boost
    expect(matches[1].artisan.id).toBe('a-3') // Quimper ~70 km
  })

  it('Prospect Brest + geste isolation → Rennes seul (PAC filtrés)', () => {
    const matches = matchArtisansForGeste(BREST, 'isolation_combles_perdus', candidates)
    expect(matches).toHaveLength(1)
    expect(matches[0].artisan.id).toBe('a-2')
    // Brest ↔ Rennes ~200 km → proximity 0.3
    expect(matches[0].proximity_factor).toBe(0.3)
  })

  it('Prospect Brest + geste inconnu → liste vide', () => {
    const matches = matchArtisansForGeste(BREST, 'pac_air_air', candidates)
    expect(matches).toHaveLength(0)
  })

  it('Combined score = score × proximité × premium', () => {
    const matches = matchArtisansForGeste(BREST, 'pac_air_eau', [artisanBrestPac])
    // Brest: distance ~0 km → proximity 1.0 ; score 85 ; premium 1.15
    // combined = 85 × 1.0 × 1.15 = 97.75
    expect(matches[0].combined_score).toBeCloseTo(97.75, 1)
  })

  it('Premium boost départage à score+distance égaux', () => {
    const a1: ArtisanCandidate = { ...artisanBrestPac, marketplace_premium: false, id: 'a-1' }
    const a2: ArtisanCandidate = { ...artisanBrestPac, marketplace_premium: true, id: 'a-2' }
    const matches = matchArtisansForGeste(BREST, 'pac_air_eau', [a1, a2])
    expect(matches[0].artisan.id).toBe('a-2')
  })

  it('Filtre coords manquantes', () => {
    const noCoords: ArtisanCandidate = { ...artisanBrestPac, latitude: null, longitude: null, id: 'a-x' }
    const matches = matchArtisansForGeste(BREST, 'pac_air_eau', [noCoords])
    expect(matches).toHaveLength(0)
  })

  it('Limite top N respectée', () => {
    const big = Array.from({ length: 20 }, (_, i) => ({
      ...artisanBrestPac,
      id: `a-${i}`,
      score_qualite: 50 + (i % 30),
    }))
    const matches = matchArtisansForGeste(BREST, 'pac_air_eau', big, 5)
    expect(matches).toHaveLength(5)
  })
})

describe('findProspectsForArtisan', () => {
  it('Filtre par rayon + matching geste', () => {
    const prospects = [
      { id: 1, lat: 48.39, lng: -4.49, gestes_recommandes: ['pac_air_eau'] }, // Brest
      { id: 2, lat: 48.11, lng: -1.68, gestes_recommandes: ['pac_air_eau'] }, // Rennes (>50 km)
      { id: 3, lat: 47.99, lng: -4.1, gestes_recommandes: ['isolation_combles_perdus'] }, // Quimper, geste différent
      { id: 4, lat: 48.4, lng: -4.5, gestes_recommandes: ['pac_air_eau', 'pac_eau_eau'] }, // Brest proche
    ]
    const result = findProspectsForArtisan(
      { lat: 48.39, lng: -4.49, geste_specialites: ['pac_air_eau', 'pac_eau_eau'] },
      prospects,
      50,
    )
    // Brest #1 et #4 ; Rennes filtré (>50 km), Quimper filtré (geste ne matche pas)
    expect(result.map((r) => r.prospectId).sort()).toEqual([1, 4])
    expect(result[0].distance_km).toBeLessThan(result[1].distance_km)
  })

  it('matched_gestes contient l\'intersection', () => {
    const result = findProspectsForArtisan(
      { lat: 48.39, lng: -4.49, geste_specialites: ['pac_air_eau', 'pac_eau_eau'] },
      [{ id: 1, lat: 48.4, lng: -4.5, gestes_recommandes: ['pac_air_eau', 'isolation_combles_perdus', 'pac_eau_eau'] }],
      50,
    )
    expect(result[0].matched_gestes.sort()).toEqual(['pac_air_eau', 'pac_eau_eau'])
  })
})
