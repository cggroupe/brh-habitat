import { useState } from 'react'
import { QrCode, Copy, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCompany } from '@/hooks/queries'
import QRCodeDownload from '@/components/pro/QRCodeDownload'

export default function ProQRCode() {
  const { user } = useAuth()
  const { data: company, isLoading } = useMyCompany(user?.id)
  const [copied, setCopied] = useState(false)

  const referralUrl = company
    ? `${window.location.origin}/contact?ref=pro-${company.id}`
    : ''

  async function handleCopy() {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Identite</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-text-primary uppercase">
          Mon QR Code
        </h1>
        <p className="text-sm text-text-light mt-1">
          Votre QR code personnalise pour rediriger les clients vers BRH.
        </p>
      </div>

      {isLoading && (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && !company && (
        <div className="bg-white rounded-2xl p-12 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-4">
            <QrCode size={24} className="text-text-light/30" />
          </div>
          <p className="text-sm font-medium text-text-light">Votre profil entreprise est introuvable.</p>
        </div>
      )}

      {!isLoading && company && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code display */}
          <QRCodeDownload url={referralUrl} companyName={company.name} />

          {/* Info & instructions */}
          <div className="space-y-5">
            {/* Instructions */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
                Comment l'utiliser
              </p>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Imprimez ce QR code sur vos cartes de visite, devis et presentations. Quand un client le scanne, il arrive directement sur notre formulaire de contact avec votre reference.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Cartes de visite et plaquettes commerciales',
                  'Devis et propositions clients',
                  'Emails et signatures electroniques',
                  'Affichages sur vos chantiers',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Referral URL */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-4">
                Votre lien de reference
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-xl px-4 py-3 min-w-0">
                  <p className="text-xs text-text-light truncate font-medium">{referralUrl}</p>
                </div>
                <button
                  onClick={() => void handleCopy()}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                    copied
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-primary/20 hover:-translate-y-0.5'
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
              <p className="text-xs text-text-light mt-2">
                Partagez ce lien directement ou via le QR code ci-contre.
              </p>
            </div>

            {/* Company info */}
            <div className="bg-primary/10 rounded-2xl p-5">
              <p className="text-xs font-bold text-primary">
                Reference partenaire : pro-{company.id.slice(0, 8)}...
              </p>
              <p className="text-xs text-primary/80 mt-1.5">
                Chaque formulaire soumis via ce lien sera automatiquement associe a votre compte.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
