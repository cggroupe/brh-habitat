/**
 * Phase 13 — Modal de génération + édition de courrier IA.
 *
 * Workflow :
 *   1. Click "Générer" → loader IA (~5-10s, Claude Opus 4.7)
 *   2. Preview Markdown + édition possible (subject, body, signature)
 *   3. Actions : Télécharger PDF / Marquer envoyé / Fermer
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Loader, FileText, Mail, Sparkles, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useGenerateLetter, useUpdateLetter } from '@/hooks/queries/prospect-letters'
import { ProspectLetterPdf } from './ProspectLetterPdf'
import type { ProspectBretagneRow } from '@/api/prospects-bretagne'

interface Props {
  prospect: ProspectBretagneRow & { owner_name?: string | null }
  onClose: () => void
}

export function GenerateLetterModal({ prospect, onClose }: Props) {
  const [letterId, setLetterId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [bodyMd, setBodyMd] = useState('')
  const [greeting, setGreeting] = useState('')
  const [signature, setSignature] = useState('')
  const [signaux, setSignaux] = useState<string[]>([])
  const [usage, setUsage] = useState<{
    input: number
    output: number
    cacheRead: number
    durationMs: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const generate = useGenerateLetter()
  const update = useUpdateLetter()

  const handleGenerate = async () => {
    setError(null)
    try {
      const result = await generate.mutateAsync(prospect.id)
      setLetterId(result.id)
      setSubject(result.subject)
      setBodyMd(result.body_md)
      setGreeting(result.greeting || 'Madame, Monsieur,')
      setSignature(result.signature || '')
      setSignaux(result.signaux_used || [])
      setUsage({
        input: result.usage.input_tokens,
        output: result.usage.output_tokens,
        cacheRead: result.usage.cache_read_input_tokens,
        durationMs: result.duration_ms,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleSaveEdit = async () => {
    if (!letterId) return
    try {
      await update.mutateAsync({
        id: letterId,
        patch: { subject, body_md: bodyMd, greeting, signature },
      })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleDownloadPdf = async () => {
    if (!letterId || !subject || !bodyMd) return
    try {
      const blob = await pdf(
        <ProspectLetterPdf
          letter={{ subject, body_md: bodyMd, greeting, signature }}
          prospect={{
            adresse_ban: prospect.adresse_ban,
            code_postal: prospect.code_postal,
            commune: prospect.commune,
            owner_name: prospect.owner_name,
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
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeCommune = (prospect.commune ?? 'commune').toLowerCase().replace(/[^a-z0-9-]/g, '-')
      a.download = `courrier-${safeCommune}-${prospect.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      // Mark as edited on download (status 'sent' set explicitly via "Marquer envoyé")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleMarkSent = async () => {
    if (!letterId) return
    try {
      await update.mutateAsync({
        id: letterId,
        patch: { status: 'sent', sent_via: 'pdf_print' },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Courrier IA — Prospect #{prospect.id}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* État initial : pas encore généré */}
          {!letterId && !generate.isPending && (
            <div className="space-y-4">
              <div className="rounded-md bg-purple-50 p-4 text-sm text-purple-900">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" /> Génération IA personnalisée
                </div>
                <p className="text-xs leading-relaxed">
                  Claude Opus 4.7 va analyser ce prospect (DPE {prospect.etiquette_dpe}, score{' '}
                  {prospect.score_v2 ?? '–'}, signaux DVF/MPR/Géorisques) et rédiger un courrier
                  ciblé prêt à imprimer. Coût ~0.05 € par courrier (cache 80%).
                </p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                <div className="mb-1 font-semibold uppercase text-gray-500">Contexte transmis à l&apos;IA</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span>Adresse :</span> <span>{prospect.adresse_ban}</span>
                  <span>Commune :</span>{' '}
                  <span>
                    {prospect.code_postal} {prospect.commune}
                  </span>
                  <span>DPE :</span> <span>{prospect.etiquette_dpe}</span>
                  <span>Score v2 :</span> <span>{prospect.score_v2 ?? '–'}</span>
                  <span>Segment :</span> <span>{prospect.score_v2_segment ?? '–'}</span>
                  <span>DVF mutation 24m :</span> <span>{prospect.dvf_mutation_24m ? 'oui' : 'non'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-700 px-4 py-3 text-sm font-medium text-white hover:bg-purple-800"
              >
                <Sparkles className="h-4 w-4" />
                Générer le courrier (Claude Opus 4.7)
              </button>
            </div>
          )}

          {/* État loading */}
          {generate.isPending && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader className="h-10 w-10 animate-spin text-purple-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Génération en cours…</div>
                <div className="mt-1 text-sm text-gray-600">
                  Claude analyse les signaux DVF, MPR, Géorisques et compose un courrier ciblé.
                </div>
                <div className="mt-2 text-xs text-gray-500">~5-10 secondes</div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">
                  {error.includes('Quota') ? 'Quota mensuel dépassé' : 'Erreur'}
                </div>
                <div className="text-xs">{error}</div>
                {error.includes('Quota') && (
                  <Link
                    to="/pro/abonnement"
                    className="mt-2 inline-flex items-center gap-1 rounded bg-purple-700 px-2 py-1 text-xs font-medium text-white hover:bg-purple-800"
                  >
                    <CreditCard className="h-3 w-3" /> Upgrader pour plus de courriers
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Preview / édition */}
          {letterId && !generate.isPending && (
            <div className="space-y-4">
              {usage && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-2 text-xs text-green-900">
                  <CheckCircle className="h-4 w-4" />
                  Généré en {(usage.durationMs / 1000).toFixed(1)}s · {usage.input + usage.output}{' '}
                  tokens · cache hit {usage.cacheRead > 0 ? '✓' : '✗'}
                </div>
              )}

              {signaux.length > 0 && (
                <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-xs">
                  <div className="mb-1 font-semibold text-purple-900">Signaux utilisés :</div>
                  <ul className="list-disc space-y-0.5 pl-4 text-purple-800">
                    {signaux.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Objet</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!editing}
                  className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Salutation</span>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  disabled={!editing}
                  className="w-full rounded-md border-gray-300 text-sm disabled:bg-gray-50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Corps (Markdown)</span>
                <textarea
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  disabled={!editing}
                  rows={14}
                  className="w-full rounded-md border-gray-300 font-mono text-xs disabled:bg-gray-50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Signature</span>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  disabled={!editing}
                  rows={4}
                  className="w-full rounded-md border-gray-300 text-xs disabled:bg-gray-50"
                />
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        {letterId && !generate.isPending && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Éditer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={update.isPending}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              <FileText className="h-4 w-4" /> Télécharger PDF
            </button>
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={update.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" /> Marquer envoyé
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
