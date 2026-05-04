/**
 * Phase 17 — Bandeau d'installation PWA mobile.
 *
 * Affiche un CTA discret quand l'app est installable (event `beforeinstallprompt`).
 * Cible principale : pros RGE / artisans en déplacement chantier.
 *
 * Stocke le dismiss dans localStorage pour ne pas re-afficher avant 7 jours.
 */

import { useEffect, useState } from 'react'
import { Smartphone, X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'brh-pwa-install-dismissed-at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export function InstallPwaPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const dismissedAt = localStorage.getItem(DISMISS_KEY)
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) return

      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => setEvent(null)

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!event) return null

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      }
      setEvent(null)
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setEvent(null)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border-2 border-green-300 bg-white p-4 shadow-2xl md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-green-100 p-2">
          <Smartphone className="h-5 w-5 text-green-700" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900">Installer BRH Habitat</div>
          <p className="mt-0.5 text-xs text-gray-600">
            Accédez à l&apos;app depuis votre écran d&apos;accueil. Mode hors-ligne, démarrage instantané.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="inline-flex items-center gap-1 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              <Download className="h-3 w-3" />
              {installing ? 'Installation…' : 'Installer'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded p-1 text-gray-400 hover:bg-gray-100"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
