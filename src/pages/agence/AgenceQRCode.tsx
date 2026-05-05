/**
 * Phase 16.1 — /agence/qr-code : QR code personnalisé multi-cibles.
 *
 * 2 modes au choix :
 *   1. Vitrine prospect → URL publique `/a/<agenceId>` (page vitrine + CTA simulation)
 *   2. Recrutement agences → URL `/inscription/agence?ref=<agenceId>` (parrainage 100€)
 *
 * Téléchargement PNG haute résolution avec header BRH + footer agence.
 */
import { useState } from 'react'
import { Copy, Check, QrCode, ExternalLink, Sparkles, Network } from 'lucide-react'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import { useAgenceImmo } from '@/hooks/queries/agences-immo'
import AgenceQRCodeCard from '@/components/agence/AgenceQRCodeCard'

type Mode = 'vitrine' | 'parrainage'

const MODE_DEFS: Array<{
  id: Mode
  label: string
  description: string
  icon: typeof Sparkles
  buildUrl: (origin: string, agenceId: string) => string
}> = [
  {
    id: 'vitrine',
    label: 'Vitrine prospect',
    description:
      'Vos clients propriétaires scannent → arrivent sur votre fiche publique avec CTA "demander une simulation gratuite".',
    icon: Sparkles,
    buildUrl: (origin, id) => `${origin}/a/${id}`,
  },
  {
    id: 'parrainage',
    label: 'Recrutement agences',
    description:
      'Pour partager avec d\'autres agences immobilières → 100 € HT de commission HT à chaque charte signée.',
    icon: Network,
    buildUrl: (origin, id) => `${origin}/inscription/agence?ref=${id}`,
  },
]

export default function AgenceQRCode() {
  const { data: membership } = useMyAgenceMembership()
  const { data: agence } = useAgenceImmo(membership?.agenceId)

  const [mode, setMode] = useState<Mode>('vitrine')
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const def = MODE_DEFS.find((d) => d.id === mode)!
  const url = membership?.agenceId ? def.buildUrl(origin, membership.agenceId) : ''
  const label = agence?.raison_sociale ?? 'Mon agence'

  async function handleCopy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
          <QrCode size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display tracking-tight">Mon QR Code</h1>
          <p className="text-sm text-slate-500">
            Personnalisé pour vos cartes de visite, vitrine, devis, signatures email.
          </p>
        </div>
      </header>

      {/* Mode selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODE_DEFS.map((d) => {
          const active = mode === d.id
          const Icon = d.icon
          return (
            <button
              type="button"
              key={d.id}
              onClick={() => setMode(d.id)}
              className={`text-left p-4 rounded-2xl border-2 transition ${
                active
                  ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-400 shadow-md'
                  : 'bg-white border-slate-200 hover:border-orange-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    active ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={15} />
                </div>
                <p className="font-bold text-sm text-slate-800">{d.label}</p>
              </div>
              <p className="text-xs text-slate-500">{d.description}</p>
            </button>
          )
        })}
      </div>

      {!membership ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">Chargement de votre agence…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR card */}
          <AgenceQRCodeCard url={url} label={label} />

          {/* Side info */}
          <div className="space-y-4">
            {/* URL + copy */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">
                URL encodée
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 truncate">
                  {url}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                    copied
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-800 text-white hover:bg-slate-900'
                  }`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                <ExternalLink size={11} />
                Ouvrir le lien dans un onglet
              </a>
            </div>

            {/* Usage tips */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">
                Comment l'utiliser
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700">
                {[
                  'Cartes de visite et plaquettes',
                  'Devis, mandats et présentations clients',
                  'Vitrine de l\'agence et panneaux à louer/vendre',
                  'Signatures email et réseaux sociaux',
                  'Salons immobiliers et événements locaux',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs text-orange-800 leading-relaxed">
              <p className="font-bold mb-1">💡 Conseil impression</p>
              <p>
                Téléchargez le PNG, puis imprimez à minimum 2 cm × 2 cm pour scan fiable. Les QR
                codes BRH supportent jusqu'à 30 % d'occlusion (logo central possible).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
