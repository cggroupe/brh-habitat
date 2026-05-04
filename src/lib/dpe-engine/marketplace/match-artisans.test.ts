/**
 * Phase 22 — Tests matching artisans (Phase 13.6).
 *
 * Couvre :
 *   - haversineKm précision (référence Brest ↔ Rennes ≈ 244 km)
 *   - proximityFactor paliers (10 / 25 / 50 / 100 km)
 *   - matchArtisansForGeste : filtre spécialité, tri combined_score, premium boost
 *   - findProspectsForArtisan : filtre rayon + intersection gestes
 */
import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  proximityFactor,
  matchArtisansForGeste,
  findProspectsForArtisan,
  type ArtisanCandidate,
} from './match-artisans'

const BREST = { lat: 48.39, lng: -4.49 }
const RENNES = { lat: 48.117, lng: -1.677 }
const VANNES = { lat: 47.66, lng: -2.76 }

function makeArtisan(over: Partial<ArtisanCandidate>): ArtisanCandidate {
  return {
    id: 'a',
    nom_entreprise: 'Test',
    representant: null,
    email: null,
    telephone: null,
    code_postal: null,
    commune: null,
    departement: null,
    latitude: null,
    longitude: null,
    geste_specialites: [],
    score_qualite: 70,
    nombre_chantiers_brh: 0,
    taux_conversion_brh: null,
    marketplace_premium: false,
    ...over,
  }
}

describe('haversineKm', () => {
  // Distance vol d'oiseau Brest (48.39, -4.49) ↔ Rennes (48.117, -1.677) ≈ 210 km
  it('Brest ↔ Rennes ≈ 210 km (tolerance 5 km)', () => {
    const d = haversineKm(BREST, RENNES)
    expect(d).toBeGreaterThan(205)
    expect(d).toBeLessThan(215)
  })

  it('même point ⇒ 0', () => {
    expect(haversineKm(BREST, BREST)).toBeCloseTo(0, 5)
  })

  it('symétrique', () => {
    expect(haversineKm(BREST, RENNES)).toBeCloseTo(haversineKm(RENNES, BREST), 5)
  })
})

describe('proximityFactor', () => {
  it.each([
    [0, 1.0],
    [5, 1.0],
    [10, 1.0],
    [10.01, 0.85],
    [25, 0.85],
    [25.01, 0.7],
    [50, 0.7],
    [50.01, 0.5],
    [100, 0.5],
    [100.01, 0.3],
    [500, 0.3],
  ])('distance=%s km → factor=%s', (km, expected) => {
    expect(proximityFactor(km)).toBe(expected)
  })
})

describe('matchArtisansForGeste', () => {
  const candidates: ArtisanCandidate[] = [
    makeArtisan({
      id: 'a-brest-pac',
      nom_entreprise: 'Brest PAC',
      latitude: BREST.lat,
      longitude: BREST.lng,
      geste_specialites: ['pac_air_eau'],
      score_qualite: 70,
    }),
    makeArtisan({
      id: 'a-rennes-pac',
      nom_entreprise: 'Rennes PAC',
      latitude: RENNES.lat,
      longitude: RENNES.lng,
      geste_specialites: ['pac_air_eau'],
      score_qualite: 90,
    }),
    makeArtisan({
      id: 'a-vannes-iso',
      nom_entreprise: 'Vannes ISO',
      latitude: VANNES.lat,
      longitude: VANNES.lng,
      geste_specialites: ['isolation_combles_perdus'],
      score_qualite: 80,
    }),
    makeArtisan({
      id: 'a-rennes-premium',
      nom_entreprise: 'Rennes Premium',
      latitude: RENNES.lat,
      longitude: RENNES.lng,
      geste_specialites: ['pac_air_eau'],
      score_qualite: 70,
      marketplace_premium: true,
    }),
  ]

  it('filtre par spécialité — un prospect Rennes pour PAC ne voit pas le specialiste isolation', () => {
    const matches = matchArtisansForGeste(RENNES, 'pac_air_eau', candidates)
    const ids = matches.map((m) => m.artisan.id)
    expect(ids).not.toContain('a-vannes-iso')
  })

  it('classe en tête l\'artisan local (proximité × score)', () => {
    const matches = matchArtisansForGeste(RENNES, 'pac_air_eau', candidates)
    expect(matches[0].artisan.id).toBe('a-rennes-pac') // 90 × 1.0 = 90 (le plus haut)
  })

  it('le boost premium 1.15 départage à score qualité égal', () => {
    const noPremium = matchArtisansForGeste(
      RENNES,
      'pac_air_eau',
      [
        makeArtisan({
          id: 'r1',
          latitude: RENNES.lat,
          longitude: RENNES.lng,
          geste_specialites: ['pac_air_eau'],
          score_qualite: 70,
        }),
        makeArtisan({
          id: 'r2-premium',
          latitude: RENNES.lat,
          longitude: RENNES.lng,
          geste_specialites: ['pac_air_eau'],
          score_qualite: 70,
          marketplace_premium: true,
        }),
      ],
    )
    expect(noPremium[0].artisan.id).toBe('r2-premium')
  })

  it('respecte la limite top N', () => {
    const matches = matchArtisansForGeste(RENNES, 'pac_air_eau', candidates, 2)
    expect(matches).toHaveLength(2)
  })

  it('renvoie un tableau vide si aucun candidat lat/lng', () => {
    const noCoords = candidates.map((c) => ({ ...c, latitude: null, longitude: null }))
    const matches = matchArtisansForGeste(RENNES, 'pac_air_eau', noCoords)
    expect(matches).toEqual([])
  })

  it('combined_score est arrondi à 2 décimales', () => {
    const matches = matchArtisansForGeste(RENNES, 'pac_air_eau', candidates)
    for (const m of matches) {
      expect(Math.round(m.combined_score * 100) / 100).toBe(m.combined_score)
    }
  })
})

describe('findProspectsForArtisan', () => {
  const artisanRennesPAC = {
    lat: RENNES.lat,
    lng: RENNES.lng,
    geste_specialites: ['pac_air_eau', 'isolation_combles_perdus'],
  }

  it('retourne uniquement les prospects à portée + intersection gestes', () => {
    const prospects = [
      // À Rennes, gestes match → IN
      { id: 1, lat: RENNES.lat, lng: RENNES.lng, gestes_recommandes: ['pac_air_eau'] },
      // À Brest (~244 km), trop loin → OUT
      { id: 2, lat: BREST.lat, lng: BREST.lng, gestes_recommandes: ['pac_air_eau'] },
      // À Rennes, gestes non match → OUT
      { id: 3, lat: RENNES.lat, lng: RENNES.lng, gestes_recommandes: ['fenetres_double_vitrage'] },
      // À Vannes (~95 km), gestes match → IN (default 50 km ⇒ OUT, on relâche le seuil)
      { id: 4, lat: VANNES.lat, lng: VANNES.lng, gestes_recommandes: ['isolation_combles_perdus'] },
    ]

    const all = findProspectsForArtisan(artisanRennesPAC, prospects, 200)
    expect(all.map((p) => p.prospectId).sort()).toEqual([1, 4])

    const close = findProspectsForArtisan(artisanRennesPAC, prospects, 50)
    expect(close.map((p) => p.prospectId)).toEqual([1])
  })

  it('trie par distance ASC', () => {
    const prospects = [
      { id: 1, lat: VANNES.lat, lng: VANNES.lng, gestes_recommandes: ['pac_air_eau'] },
      { id: 2, lat: RENNES.lat, lng: RENNES.lng, gestes_recommandes: ['pac_air_eau'] },
    ]
    const out = findProspectsForArtisan(artisanRennesPAC, prospects, 200)
    expect(out[0].prospectId).toBe(2) // Rennes plus proche
    expect(out[1].prospectId).toBe(1) // Vannes plus loin
  })
})
