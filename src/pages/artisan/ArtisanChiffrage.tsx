/**
 * Phase 17.1 — Chiffrage travaux artisan standalone (skeleton).
 *
 * Cible Step 4 : permettre à l'artisan de chiffrer un devis Batichiffrage
 * en quelques clics SANS être lié à un dossier client. Sauvegarde dans
 * `brh_artisan_chiffrages` (inputs JSONB + total HT/TTC + lien optionnel
 * vers prospect/lead).
 *
 * Pattern réutilisé : EF `chiffrage-prices` + composant ChiffrageWizard
 * (extrait de ProRapport) + génération PDF @react-pdf/renderer.
 */
import { Calculator, Construction } from 'lucide-react'

export default function ArtisanChiffrage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Calculator size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            Chiffrage travaux Batichiffrage
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Devis chiffré rapide à partir des prix Batichiffrage CSTB
            (15 161 ouvrages référencés). Sauvegarde + export PDF.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 4
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Sélection ouvrages par lot (gros œuvre / second œuvre / lots
          techniques), métré simple, calcul total HT/TTC marges, génération
          PDF devis client en un clic.
        </p>
      </div>
    </div>
  )
}
