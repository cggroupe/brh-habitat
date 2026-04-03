import { useState } from 'react'
import { Link2, Copy, MessageCircle, Smartphone, CheckCircle, Zap, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate } from '@/hooks/queries'
import { supabase } from '@/lib/supabase'
import { getSimulationLink, copyToClipboard, getWhatsAppShareUrl, getSmsShareUrl } from '@/lib/referral'
import { generateShortCode } from '@/lib/referral'
import { useQueryClient } from '@tanstack/react-query'

// ─── Work types ───────────────────────────────────────────────────────────────

const WORK_TYPES = [
  { value: 'toiture',     label: 'Toiture' },
  { value: 'isolation',   label: 'Isolation' },
  { value: 'fenetres',    label: 'Fenetres' },
  { value: 'ravalement',  label: 'Ravalement' },
  { value: 'electricite', label: 'Electricite' },
  { value: 'plomberie',   label: 'Plomberie' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'autre',       label: 'Autre' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartSimulation() {
  const { user } = useAuth()
  const { data: affiliate, isLoading } = useMyAffiliate(user?.id)
  const queryClient = useQueryClient()

  const [selectedWorkType, setSelectedWorkType] = useState('')
  const [copiedSim, setCopiedSim] = useState(false)
  const [copiedShort, setCopiedShort] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [codeError, setCodeError] = useState('')

  const code = affiliate?.referral_code ?? ''
  const shortCode = affiliate?.short_code ?? null
  const simLink = code ? getSimulationLink(code, selectedWorkType || undefined) : ''

  async function handleCopySim() {
    if (!simLink) return
    await copyToClipboard(simLink)
    setCopiedSim(true)
    setTimeout(() => setCopiedSim(false), 2000)
  }

  async function handleCopyShort() {
    if (!shortCode) return
    await copyToClipboard(shortCode)
    setCopiedShort(true)
    setTimeout(() => setCopiedShort(false), 2000)
  }

  async function handleGenerateShortCode() {
    if (!user || !affiliate) return
    setCodeError('')
    setGeneratingCode(true)
    try {
      const nameParts = user.full_name?.split(' ') ?? ['X', 'X']
      const firstName = nameParts[0] ?? 'X'
      const lastName = nameParts[1] ?? nameParts[0] ?? 'X'
      const newCode = generateShortCode(firstName, lastName)

      const { error } = await supabase
        .from('brh_affiliates')
        .update({ short_code: newCode })
        .eq('id', affiliate.id)

      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['affiliates', 'my', user.id] })
    } catch {
      setCodeError('Impossible de generer le code court. Reessayez.')
    } finally {
      setGeneratingCode(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link2 size={24} className="text-primary" />
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Liens simulateur
          </h1>
          <p className="font-body text-sm text-slate-500">
            Partagez le simulateur BRH avec votre code de parrainage
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Short code block */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-amber-500" />
              <h2 className="font-display text-base uppercase tracking-wide text-slate-900">
                Mon code court
              </h2>
            </div>

            {shortCode ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-4xl tracking-[0.3em] text-amber-600 bg-amber-50 px-6 py-3 rounded-xl flex-1 text-center border border-amber-200">
                    {shortCode}
                  </span>
                  <button
                    onClick={() => void handleCopyShort()}
                    className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Copier le code court"
                  >
                    {copiedShort
                      ? <CheckCircle size={20} className="text-green-500" />
                      : <Copy size={20} className="text-slate-500" />
                    }
                  </button>
                </div>
                {copiedShort && (
                  <p className="font-body text-xs text-green-600">Code copie !</p>
                )}
                <p className="font-body text-xs text-slate-400 mt-2">
                  Donnez ce code a l'oral — vos contacts le saisissent directement sur le site.
                </p>
              </>
            ) : (
              <>
                <p className="font-body text-sm text-slate-500 mb-4">
                  Vous n'avez pas encore de code court memorisable.
                  Generez-en un en un clic pour le partager facilement a l'oral.
                </p>
                {codeError && (
                  <p className="font-body text-xs text-red-600 mb-3">{codeError}</p>
                )}
                <button
                  onClick={() => void handleGenerateShortCode()}
                  disabled={generatingCode}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-body text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={15} className={generatingCode ? 'animate-spin' : ''} />
                  {generatingCode ? 'Generation...' : 'Generer mon code court'}
                </button>
              </>
            )}
          </div>

          {/* Referral code reminder */}
          {affiliate?.referral_code && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={16} className="text-primary" />
                <h2 className="font-display text-base uppercase tracking-wide text-slate-900">
                  Mon code parrainage
                </h2>
              </div>
              <div className="font-display text-2xl tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-lg text-center border border-primary/10">
                {affiliate.referral_code}
              </div>
              <p className="font-body text-xs text-slate-400 mt-2">
                Code utilise dans tous vos liens de partage.
              </p>
            </div>
          )}
        </div>

        {/* Right column — Simulator link builder */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <Link2 size={18} className="text-primary" />
              <h2 className="font-display text-base uppercase tracking-wide text-slate-900">
                Generer un lien simulateur
              </h2>
            </div>

            {/* Work type selector */}
            <div className="mb-5">
              <p className="font-body text-sm font-medium text-slate-700 mb-3">
                Type de travaux <span className="text-slate-400 font-normal">(optionnel)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkType('')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-body transition-colors ${
                    selectedWorkType === ''
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Tous
                </button>
                {WORK_TYPES.map(wt => (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setSelectedWorkType(wt.value === selectedWorkType ? '' : wt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-body transition-colors ${
                      selectedWorkType === wt.value
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Link preview */}
            <div className="mb-4">
              <p className="font-body text-sm font-medium text-slate-700 mb-2">Votre lien</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={simLink}
                  className="flex-1 font-body text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 truncate focus:outline-none"
                />
                <button
                  onClick={() => void handleCopySim()}
                  disabled={!simLink}
                  className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
                  title="Copier le lien"
                >
                  {copiedSim
                    ? <CheckCircle size={18} className="text-green-500" />
                    : <Copy size={18} className="text-slate-500" />
                  }
                </button>
              </div>
              {copiedSim && (
                <p className="font-body text-xs text-green-600 mt-1">Lien copie !</p>
              )}
            </div>

            {/* Share buttons */}
            <div className="flex gap-2">
              <a
                href={simLink ? getWhatsAppShareUrl(
                  `Estimez votre projet de renovation avec BRH Habitat — c'est gratuit !`,
                  simLink,
                ) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-500 text-white rounded-lg font-body text-sm font-medium hover:bg-green-600 transition-colors ${!simLink ? 'pointer-events-none opacity-40' : ''}`}
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
              <a
                href={simLink ? getSmsShareUrl(
                  `Estimez votre projet de renovation avec BRH Habitat : ${simLink}`,
                ) : '#'}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-700 text-white rounded-lg font-body text-sm font-medium hover:bg-slate-800 transition-colors ${!simLink ? 'pointer-events-none opacity-40' : ''}`}
              >
                <Smartphone size={16} />
                SMS
              </a>
            </div>
          </div>

          {/* Stats placeholder */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={16} className="text-slate-400" />
              <h2 className="font-display text-base uppercase tracking-wide text-slate-400">
                Statistiques des liens
              </h2>
            </div>
            <p className="font-body text-sm text-slate-400">
              Fonctionnalite bientot disponible — le suivi des clics et des simulations generees par vos liens apparaitra ici.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
