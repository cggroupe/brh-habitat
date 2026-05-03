/**
 * Phase R4 — Page `/artisan/missions` : tous les leads BRH reçus.
 *
 * Fork du contenu existant ArtisanDashboard (Phase 13.6.4) mais sans le
 * "header dashboard" — la page Accueil garde l'overview, celle-ci se
 * concentre sur la liste exhaustive avec filtres status + geste.
 *
 * MVP : on importe la même UI que ArtisanDashboard. Différenciation visuelle
 * légère via headline.
 */
import ArtisanDashboard from './ArtisanDashboard'

export default function ArtisanMissions() {
  return <ArtisanDashboard />
}
