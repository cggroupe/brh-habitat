/**
 * Phase 17.1 — Simulateur énergétique artisan (skeleton).
 *
 * Cible Step 3 : réutiliser le composant `AgenceSimulateur` (BAN + 6 étapes
 * manuel + sauvegarde) en branchant la sauvegarde sur la nouvelle table
 * `brh_artisan_simulations` plutôt que `brh_agence_simulations`.
 *
 * Workflow attendu : l'artisan saisit l'adresse d'un client potentiel
 * rencontré en porte-à-porte → étude DPE virtuelle + 3 scénarios rénovation
 * + chiffrage Batichiffrage → sauvegarde dans son historique pour relance.
 */
import { Sparkles, Construction } from 'lucide-react'

export default function ArtisanSimulateur() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Sparkles size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            Simulateur énergétique
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Étude virtuelle BDNB CSTB pour n'importe quelle adresse :
            DPE estimé, GES, 3 scénarios rénovation, aides MPR/CEE par décile.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 3
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Le simulateur sera identique à celui des agences immo : recherche BAN,
          wizard manuel 6 étapes, sauvegarde dans votre historique, relance
          d'un client potentiel.
        </p>
      </div>
    </div>
  )
}
