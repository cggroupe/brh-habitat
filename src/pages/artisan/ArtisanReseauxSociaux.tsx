/**
 * Phase 17.1 — Réseaux sociaux artisan (skeleton).
 *
 * Cible Step 7 : permettre à l'artisan de soumettre une publication
 * (URL post + screenshot) qui mentionne BRH. Status `attente_validation`
 * → admin valide → trigger SQL crédite +N leads bonus dans
 * `brh_artisan_progression.bonus_leads_unlocked`.
 *
 * Plafond : 2 publications validées/mois (max +10 leads bonus mensuels).
 * Récompenses : +5 leads (FB/IG/LI), +8 (TikTok), +3 (Google).
 *
 * Calque exact de `AgenceSocial` + table `brh_agence_social_posts`.
 */
import { Share2, Construction } from 'lucide-react'

export default function ArtisanReseauxSociaux() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Share2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            Réseaux sociaux
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Soumettez vos publications mentionnant BRH. Récompense : leads
            bonus crédités dans votre compteur Ma progression.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 7
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Form URL + upload screenshot, statut attente_validation, validation
          admin via /admin/artisan-social-posts, récompense automatique +5/+8/+3
          leads selon plateforme. Plafond 2 publications/mois.
        </p>
      </div>
    </div>
  )
}
