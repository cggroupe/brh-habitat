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
      <div className="p-8 lg:p-10 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Partage</p>
        <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
          Liens simulateur
        </h1>
        <p className="text-sm text-text-light mt-1">
          Partagez le simulateur BRH avec votre code de parrainage
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Short code block */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Zap size={16} className="text-amber-500" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Mon code court
              </p>
            </div>

            {shortCode ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-4xl font-bold tracking-[0.3em] text-amber-600 bg-amber-50 px-6 py-4 rounded-2xl flex-1 text-center">
                    {shortCode}
                  </span>
                  <button
                    onClick={() => void handleCopyShort()}
                    className="p-3.5 rounded-xl bg-background hover:bg-neutral-light transition-colors"
                    title="Copier le code court"
                  >
                    {copiedShort
                      ? <CheckCircle size={20} className="text-green-500" />
                      : <Copy size={20} className="text-text-secondary" />
                    }
                  </button>
                </div>
                {copiedShort && (
                  <p className="text-xs text-green-600 font-medium">Code copie !</p>
                )}
                <p className="text-xs text-text-light mt-2">
                  Donnez ce code a l'oral — vos contacts le saisissent directement sur le site.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-text-light mb-5">
                  Vous n'avez pas encore de code court memorisable.
                  Generez-en un en un clic pour le partager facilement a l'oral.
                </p>
                {codeError && (
                  <p className="text-xs text-red-600 mb-3">{codeError}</p>
                )}
                <button
                  onClick={() => void handleGenerateShortCode()}
                  disabled={generatingCode}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={generatingCode ? 'animate-spin' : ''} />
                  {generatingCode ? 'Generation...' : 'Generer mon code court'}
                </button>
              </>
            )}
          </div>

          {/* Referral code reminder */}
          {affiliate?.referral_code && (
            <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Link2 size={16} className="text-primary" />
                </div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                  Mon code parrainage
                </p>
              </div>
              <div className="font-display text-2xl font-bold tracking-widest text-primary bg-primary/5 px-4 py-3 rounded-xl text-center">
                {affiliate.referral_code}
              </div>
              <p className="text-xs text-text-light mt-2">
                Code utilise dans tous vos liens de partage.
              </p>
            </div>
          )}
        </div>

        {/* Right column — Simulator link builder */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Link2 size={16} className="text-primary" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Generer un lien simulateur
              </p>
            </div>

            {/* Work type selector */}
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-3">
                Type de travaux <span className="normal-case font-normal text-text-light/70">(optionnel)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkType('')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedWorkType === ''
                      ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
                      : 'bg-background text-text-secondary hover:bg-neutral-light'
                  }`}
                >
                  Tous
                </button>
                {WORK_TYPES.map(wt => (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setSelectedWorkType(wt.value === selectedWorkType ? '' : wt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      selectedWorkType === wt.value
                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
                        : 'bg-background text-text-secondary hover:bg-neutral-light'
                    }`}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Link preview */}
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-2">Votre lien</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={simLink}
                  className="flex-1 text-xs text-text-secondary bg-background rounded-xl px-4 py-3 truncate focus:outline-none"
                />
                <button
                  onClick={() => void handleCopySim()}
                  disabled={!simLink}
                  className="p-3 rounded-xl bg-background hover:bg-neutral-light transition-colors disabled:opacity-40"
                  title="Copier le lien"
                >
                  {copiedSim
                    ? <CheckCircle size={18} className="text-green-500" />
                    : <Copy size={18} className="text-text-secondary" />
                  }
                </button>
              </div>
              {copiedSim && (
                <p className="text-xs text-green-600 font-medium mt-1">Lien copie !</p>
              )}
            </div>

            {/* Share buttons */}
            <div className="flex gap-3">
              <a
                href={simLink ? getWhatsAppShareUrl(
                  `Estimez votre projet de renovation avec BRH Habitat — c'est gratuit !`,
                  simLink,
                ) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-600 transition-colors ${!simLink ? 'pointer-events-none opacity-40' : ''}`}
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
              <a
                href={simLink ? getSmsShareUrl(
                  `Estimez votre projet de renovation avec BRH Habitat : ${simLink}`,
                ) : '#'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-neutral-dark transition-colors ${!simLink ? 'pointer-events-none opacity-40' : ''}`}
              >
                <Smartphone size={15} />
                SMS
              </a>
            </div>
          </div>

          {/* Stats placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-background rounded-xl flex items-center justify-center">
                <Link2 size={16} className="text-text-light" />
              </div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">
                Statistiques des liens
              </p>
            </div>
            <p className="text-sm text-text-light">
              Fonctionnalite bientot disponible — le suivi des clics et des simulations generees par vos liens apparaitra ici.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
