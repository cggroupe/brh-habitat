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
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <QrCode size={24} className="text-primary" />
        <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
          Mon QR Code
        </h1>
      </div>
      <p className="font-body text-sm text-slate-500 mb-8">
        Votre QR code personnalise pour rediriger les clients vers BRH.
      </p>

      {isLoading && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 flex items-center justify-center">
          <span className="inline-block w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && !company && (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-slate-100 text-center">
          <QrCode size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-body text-slate-400 text-sm">Votre profil entreprise est introuvable.</p>
        </div>
      )}

      {!isLoading && company && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code display */}
          <QRCodeDownload url={referralUrl} companyName={company.name} />

          {/* Info & instructions */}
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-3">
                Comment l'utiliser
              </h2>
              <p className="font-body text-sm text-slate-600 leading-relaxed">
                Imprimez ce QR code sur vos cartes de visite, devis et presentations. Quand un client le scanne, il arrive directement sur notre formulaire de contact avec votre reference.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Cartes de visite et plaquettes commerciales',
                  'Devis et propositions clients',
                  'Emails et signatures electroniques',
                  'Affichages sur vos chantiers',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-body text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Referral URL */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-display text-sm uppercase tracking-wide text-slate-700 mb-3">
                Votre lien de reference
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-0">
                  <p className="font-body text-xs text-slate-500 truncate">{referralUrl}</p>
                </div>
                <button
                  onClick={() => void handleCopy()}
                  className="shrink-0 flex items-center gap-1.5 bg-primary text-white font-body text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copie !' : 'Copier'}
                </button>
              </div>
              <p className="font-body text-xs text-slate-400 mt-2">
                Partagez ce lien directement ou via le QR code ci-contre.
              </p>
            </div>

            {/* Company info */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="font-body text-xs text-green-700">
                <span className="font-semibold">Reference partenaire :</span> pro-{company.id.slice(0, 8)}...
              </p>
              <p className="font-body text-xs text-green-600 mt-1">
                Chaque formulaire soumis via ce lien sera automatiquement associe a votre compte.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
