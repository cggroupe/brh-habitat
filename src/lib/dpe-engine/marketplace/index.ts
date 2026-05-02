/**
 * Phase 13.6 — Marketplace artisans RGE.
 *
 * Public API : matching prospect ↔ artisan + scoring.
 */

export {
  haversineKm,
  proximityFactor,
  matchArtisansForGeste,
  findProspectsForArtisan,
} from './match-artisans'
export type { GesteId, ArtisanCandidate, ArtisanMatch } from './match-artisans'
