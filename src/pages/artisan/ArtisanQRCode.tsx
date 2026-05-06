/**
 * Phase 17.1 — QR Code artisan (skeleton).
 *
 * Cible Step 8 : 2 modes (calque `AgenceQRCode`)
 *  - Mode "Vitrine prospect" : QR vers `/r/:artisanId` (page publique avec
 *    fiche RGE + CTA "Demander un devis" → /contact?artisan=<id>)
 *  - Mode "Parrainage" : QR vers `/inscription/artisan?ref=<id>`
 *
 * Vitrine publique alimentée par RPC `brh_get_public_artisan(uuid)` qui filtre
 * sur status='actif' (artisans cancelled invisibles) avec `SET search_path = ''`.
 *
 * QR généré en PNG haute résolution téléchargeable / imprimable (chantier,
 * camionette, carte de visite).
 */
import { QrCode, Construction } from 'lucide-react'

export default function ArtisanQRCode() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <QrCode size={22} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-text-primary">QR Code</h1>
          <p className="text-text-secondary text-sm mt-1">
            QR à imprimer sur vos cartes de visite, votre camionette, vos
            chantiers. Captez les leads qui scannent.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
        <Construction size={32} className="text-amber-500 mx-auto mb-3" />
        <p className="font-display text-lg text-text-primary mb-2">
          Bientôt disponible — Step 8
        </p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          2 modes : Vitrine prospect (QR → /r/:artisanId fiche RGE + CTA devis)
          ou Parrainage (QR → onboarding artisan filleul). Téléchargement PNG
          haute résolution.
        </p>
      </div>
    </div>
  )
}
