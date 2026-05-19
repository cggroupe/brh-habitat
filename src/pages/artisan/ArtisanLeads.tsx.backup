/**
 * Phase 17.1 — Leads & porte-à-porte artisan (skeleton, page à 2 modes).
 *
 * Cible Step 5 : page unique avec 2 onglets :
 *  1. Onglet "Porte-à-porte" : carte Leaflet des prospects DPE F/G dans la
 *     zone d'activité de l'artisan (filtre commune + segment hot/very_hot)
 *     → click prospect → ProspectStudyPanel (déjà mutualisé) → bouton
 *     "Démarcher" qui ajoute le prospect à `brh_artisan_lead_assignments`.
 *  2. Onglet "Apporter un prospect" : formulaire pour saisir un prospect
 *     déjà rencontré en physique (nom, téléphone, adresse, RGPD) → INSERT
 *     `brh_artisan_contributions` (calque `brh_agence_contributions`).
 *
 * Note : le filtre carte est limité à la zone géographique RGE déclarée
 * (rayon 30 km autour du siège entreprise) pour éviter le scraping.
 */
import { useState } from 'react'
import { MapPinned, Handshake, Construction } from 'lucide-react'

type Mode = 'porte-a-porte' | 'apporter'

export default function ArtisanLeads() {
  const [mode, setMode] = useState<Mode>('porte-a-porte')

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <MapPinned size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            Leads & porte-à-porte
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Carte des prospects DPE F/G dans votre zone, ou saisie d'un client
            rencontré en physique.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMode('porte-a-porte')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'porte-a-porte'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-slate-600 hover:text-text-primary'
          }`}
        >
          <MapPinned size={16} />
          Porte-à-porte
        </button>
        <button
          onClick={() => setMode('apporter')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'apporter'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-slate-600 hover:text-text-primary'
          }`}
        >
          <Handshake size={16} />
          Apporter un prospect
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          {mode === 'porte-a-porte'
            ? 'Carte porte-à-porte — Bientôt disponible (Step 5)'
            : 'Formulaire apport prospect — Bientôt disponible (Step 5)'}
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          {mode === 'porte-a-porte'
            ? "Carte Leaflet des prospects DPE F/G dans votre rayon RGE 30 km, click prospect → étude rapide + bouton Démarcher."
            : "Formulaire (nom, téléphone, adresse, contexte rencontre, RGPD) → soumission BRH pour validation et commission."}
        </p>
      </div>
    </div>
  )
}
