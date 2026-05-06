/**
 * Phase 17.1 — Mon réseau (parrainage artisan→artisan, skeleton).
 *
 * Cible Step 6 : marketing de réseau pur.
 *  - Lien personnel `https://renovation-brh.fr/inscription/artisan?ref=<artisanId>`
 *  - 3 boutons share (WhatsApp / Email / LinkedIn)
 *  - Table `brh_artisan_referral_commissions` (calque
 *    `brh_agence_referral_commissions`) : 100€ HT par charte signée par un
 *    artisan parrainé qui devient actif.
 *  - KPI cards : filleuls signés, commissions pending/validated/paid.
 *
 * Trigger SQL `trg_brh_artisan_referral_commission` (AFTER INSERT/UPDATE sur
 * `brh_partner_contracts` avec partner_type='artisan') déclenche la
 * commission.
 */
import { Network, Construction } from 'lucide-react'

export default function ArtisanReseau() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Network size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">Mon réseau</h1>
          <p className="text-text-secondary text-sm mt-1">
            Parrainez d'autres artisans RGE bretons. 100 € HT par charte BRH
            signée par un filleul actif.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 6
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Lien parrainage personnel + share buttons WhatsApp/Email/LinkedIn,
          tableau de bord commissions (pending → validated → paid), KPI
          filleuls actifs.
        </p>
      </div>
    </div>
  )
}
