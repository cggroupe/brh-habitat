/**
 * Phase 13.3 — Modal génération bulk de courriers IA.
 *
 * Workflow :
 *   1. Pro sélectionne segment + nombre (10/25/50)
 *   2. Modal affiche les N prospects ciblés (preview)
 *   3. Click "Lancer" → progress bar live + résultats unitaires
 *   4. Une fois terminé : "Télécharger tous les PDF (ZIP)" ou détail courrier par courrier
 *
 * Throttle : 3 parallèles + 3.5s entre requêtes par slot = ~17 req/min (sous EF rate limit 20/min).
 * Pour 50 courriers : ~3 min total.
 */

import { useState } from 'react'
import { X, Loader, Sparkles, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import JSZip from 'jszip'
import { prospectLettersApi, type BulkProgress } from '@/api/prospect-letters'
import { ProspectLetterPdf } from './ProspectLetterPdf'
import type { ProspectBretagneRow } from '@/api/prospects-bretagne'

interface Props {
  prospects: ProspectBretagneRow[]
  onClose: () => void
}

export function BulkGenerateModal({ prospects, onClose }: Props) {
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [zipping, setZipping] = useState(false)

  const handleStart = async () => {
    setRunning(true)
    try {
      const final = await prospectLettersApi.generateBulk(
        prospects.map((p) => p.id),
        (snap) => setProgress(snap),
      )
      setProgress(final)
    } finally {
      setRunning(false)
    }
  }

  const handleZipAll = async () => {
    if (!progress) return
    setZipping(true)
    try {
      const zip = new JSZip()
      const successes = progress.results.filter((r) => r.status === 'success' && r.letter)

      for (const r of successes) {
        const prospect = prospects.find((p) => p.id === r.prospectId)
        if (!prospect || !r.letter) continue

        const blob = await pdf(
          <ProspectLetterPdf
            letter={{
              subject: r.letter.subject,
              body_md: r.letter.body_md,
              greeting: r.letter.greeting,
              signature: r.letter.signature,
            }}
            prospect={{
              adresse_ban: prospect.adresse_ban,
              code_postal: prospect.code_postal,
              commune: prospect.commune,
              owner_name: null,
            }}
            expeditor={{
              full_name: 'Jean Le Roux',
              company_name: 'BRH Habitat',
              address: '12 rue de la Forge',
              code_postal: '29200',
              commune: 'Brest',
              rge_numero: 'QB-12345',
              siret: '12345678900012',
              email: 'jean@brh-habitat.fr',
              phone: '02 98 12 34 56',
            }}
          />,
        ).toBlob()

        const safeCommune = (prospect.commune ?? 'commune').toLowerCase().replace(/[^a-z0-9-]/g, '-')
        zip.file(`courrier-${safeCommune}-${prospect.id}.pdf`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const yyyy = new Date().getFullYear()
      const mm = String(new Date().getMonth() + 1).padStart(2, '0')
      const dd = String(new Date().getDate()).padStart(2, '0')
      a.download = `courriers-prospects-${yyyy}-${mm}-${dd}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setZipping(false)
    }
  }

  const successes = progress?.results.filter((r) => r.status === 'success').length ?? 0
  const errors = progress?.errors ?? 0
  const pct = progress ? Math.round(((progress.done + progress.inProgress * 0.5) / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">
              Génération bulk — {prospects.length} courriers
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!progress && !running && (
            <div className="space-y-4">
              <div className="rounded-md bg-purple-50 p-4 text-sm text-purple-900">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" /> Génération industrielle
                </div>
                <p className="text-xs leading-relaxed">
                  Claude Opus 4.7 va générer{' '}
                  <strong>{prospects.length} courriers personnalisés</strong> en parallèle (3 simultanés,
                  throttle EF 20/min). Durée estimée : <strong>{Math.ceil(prospects.length * 3.5 / 60 / 3)} min</strong>.
                  Coût estimé : <strong>{(prospects.length * 0.02).toFixed(2)} € avec cache</strong>.
                </p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  Aperçu des prospects ciblés
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto text-xs">
                  {prospects.slice(0, 20).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1">
                      <div>
                        <span className="font-mono text-gray-500">#{p.id}</span>{' '}
                        <span className="text-gray-900">{p.commune}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="rounded bg-purple-100 px-1.5 text-purple-900">
                          {p.score_v2_segment ?? '–'}
                        </span>
                        <span className="font-semibold">{p.score_v2 ?? '–'}</span>
                        <span className="rounded bg-red-100 px-1 text-red-900">
                          {p.etiquette_dpe ?? '?'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {prospects.length > 20 && (
                    <div className="py-1 text-center text-gray-500">
                      … et {prospects.length - 20} autres
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-700 px-4 py-3 text-sm font-medium text-white hover:bg-purple-800"
              >
                <Sparkles className="h-4 w-4" />
                Lancer la génération bulk ({prospects.length} courriers)
              </button>
            </div>
          )}

          {progress && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">
                    {progress.done}/{progress.total} terminés
                    {progress.inProgress > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({progress.inProgress} en cours)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-600">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-3 w-3" /> {successes} succès
                  </span>
                  {errors > 0 && (
                    <span className="flex items-center gap-1 text-red-700">
                      <AlertTriangle className="h-3 w-3" /> {errors} erreurs
                    </span>
                  )}
                  {running && (
                    <span className="flex items-center gap-1 text-purple-700">
                      <Loader className="h-3 w-3 animate-spin" /> en cours
                    </span>
                  )}
                </div>
              </div>

              {/* Liste résultats */}
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
                {progress.results.map((r) => {
                  const prospect = prospects.find((p) => p.id === r.prospectId)
                  return (
                    <div
                      key={r.prospectId}
                      className="flex items-center justify-between rounded border border-gray-200 bg-white px-2 py-1 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {r.status === 'pending' && (
                          <div className="h-3 w-3 rounded-full border border-gray-300" />
                        )}
                        {r.status === 'in_progress' && (
                          <Loader className="h-3 w-3 animate-spin text-purple-600" />
                        )}
                        {r.status === 'success' && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        {r.status === 'error' && (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        )}
                        <span className="font-mono text-gray-500">#{r.prospectId}</span>
                        {prospect && <span className="text-gray-700">{prospect.commune}</span>}
                      </div>
                      <div className="text-gray-500">
                        {r.status === 'success' && r.letter && (
                          <span className="text-green-700">{r.letter.subject.slice(0, 50)}…</span>
                        )}
                        {r.status === 'error' && (
                          <span className="text-red-700">{r.error?.slice(0, 60)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {progress && !running && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Fermer
            </button>
            {successes > 0 && (
              <button
                type="button"
                onClick={handleZipAll}
                disabled={zipping}
                className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {zipping ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger ZIP ({successes} PDF)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

