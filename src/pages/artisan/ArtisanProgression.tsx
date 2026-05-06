/**
 * Phase 17.1 — Ma progression artisan (skeleton).
 *
 * Cible Step 9 : paliers gamifiés calqués sur `AgenceProgression`.
 *
 * Table `brh_artisan_progression` :
 *   - palier ENUM('bronze','silver','gold','platinum')
 *   - bonus_leads_unlocked INT (crédits via réseaux sociaux + parrainage)
 *   - leads_received INT, contracts_signed INT, ca_genere_cents INT
 *
 * Paliers (recalculés par trigger sur INSERT/UPDATE de :
 * `brh_artisan_contributions`, `brh_artisan_referral_commissions` validated,
 * `brh_artisan_social_posts` validated) :
 *   - bronze : entrée
 *   - silver : 3 contributions OU 1 filleul actif
 *   - gold : 10 contributions OU 3 filleuls OU 5 chantiers signés
 *   - platinum : 25 contributions OU 8 filleuls OU 15 chantiers signés
 */
import { Award, Construction } from 'lucide-react'

export default function ArtisanProgression() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Award size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            Ma progression
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Vos paliers BRH (bronze → silver → gold → platinum), leads bonus
            débloqués, classement régional.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 9
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          4 paliers gamifiés (bronze/silver/gold/platinum), KPI cards
          (contributions, filleuls, chantiers, CA généré), leads bonus, badge
          de niveau partagé sur la vitrine publique.
        </p>
      </div>
    </div>
  )
}
