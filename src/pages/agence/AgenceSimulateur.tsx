/**
 * Phase 16.1 — Simulateur Cap Rénov BRH dédié au portail agence.
 *
 * Permet de saisir N'IMPORTE QUELLE adresse (même pas dans nos 60k F/G)
 * et d'obtenir une étude virtuelle complète via BDNB CSTB :
 *   - DPE estimé + GES
 *   - 3 scénarios rénovation (Geste seul / Bouquet / BBC)
 *   - Travaux chiffrés Batichiffrage
 *   - Aides MPR + CEE par décile
 *   - Risques & dispositifs commune
 *   - Artisans RGE proches
 *
 * Workflow recommandé : utiliser pour les vendeurs qui demandent
 * "combien je peux gagner si je rénove avant de vendre ?".
 */
import { useEffect, useRef, useState } from 'react'
import { Search, Loader, Sparkles, Lightbulb, AlertCircle, Wand2, Sliders } from 'lucide-react'
import { scoreVenteApi } from '@/api/score-vente'
import { virtualToProspectStudy } from '@/lib/virtual-to-study'
import {
  ProspectStudyPanel,
  type ProspectStudy,
} from '@/components/agence/ProspectStudyPanel'
import ManualWizard from '@/components/agence/ManualWizard'

type SimMode = 'address' | 'manual'

interface BanFeature {
  properties: {
    label: string
    context?: string
    postcode?: string
    citycode?: string
  }
  geometry: { coordinates: [number, number] }
}

const EXAMPLES = [
  '12 rue de la Paix 35000 Rennes',
  '5 rue de Siam 29200 Brest',
  '8 place du Général de Gaulle 22000 Saint-Brieuc',
  '20 rue Thiers 56000 Vannes',
]

export default function AgenceSimulateur() {
  const [mode, setMode] = useState<SimMode>('address')
  const [addr, setAddr] = useState('')
  const [suggestions, setSuggestions] = useState<BanFeature[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchingAddr, setSearchingAddr] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [study, setStudy] = useState<ProspectStudy | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleAddrInput(value: string) {
    setAddr(value)
    setSearchError(null)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      setSearchingAddr(false)
      return
    }
    setSearchingAddr(true)
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=8&autocomplete=1`,
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        const features = (data.features ?? []) as BanFeature[]
        setSuggestions(features)
        setShowSuggestions(true)
        setSearchError(null)
      } catch (err) {
        console.error('BAN autocomplete failed', err)
        setSuggestions([])
        setShowSuggestions(true)
        setSearchError(
          'Connexion à l\'API adresse bloquée — vide le cache navigateur (Cmd+Shift+R sur Mac, Ctrl+F5 sur PC) puis réessaie.',
        )
      } finally {
        setSearchingAddr(false)
      }
    }, 200)
  }

  async function runStudy(f: BanFeature) {
    setAddr(f.properties.label)
    setShowSuggestions(false)
    setError(null)
    setLoading(true)
    const [lng, lat] = f.geometry.coordinates
    try {
      const cp = f.properties.postcode ?? ''
      const dept = cp.slice(0, 2) || null
      const commune = f.properties.context?.split(',')[1]?.trim() ?? null
      const data = (await scoreVenteApi.fetchVirtualStudy({
        q: f.properties.label,
        lat,
        lng,
        cp,
        foyer: 2,
        rfr: 30000,
      })) as Parameters<typeof virtualToProspectStudy>[0]
      const s = virtualToProspectStudy(data, {
        code_postal: cp || undefined,
        commune: commune ?? undefined,
        departement: dept ?? undefined,
      })
      setStudy(s)
    } catch (err) {
      setError(
        err instanceof Error
          ? `Étude impossible : ${err.message}`
          : 'Étude impossible pour cette adresse (peut-être hors zone ou bâtiment inconnu BDNB)',
      )
    } finally {
      setLoading(false)
    }
  }

  function tryExample(label: string) {
    handleAddrInput(label)
    // Focus l'input pour montrer la dropdown immédiatement
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className={`p-6 lg:p-10 ${mode === 'manual' ? 'max-w-6xl' : 'max-w-3xl'} mx-auto space-y-6`}>
      <header className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a5e2a] to-[#16a34a] mb-4 shadow-lg">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-display tracking-tight text-slate-900">
          Simulateur Cap Rénov
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
          Étudiez n'importe quelle adresse de Bretagne ou saisissez les caractéristiques
          précises avec votre client en RDV — calcul DPE temps réel.
        </p>
      </header>

      {/* Tabs mode */}
      <div className="flex bg-slate-100 rounded-xl p-1 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setMode('address')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            mode === 'address'
              ? 'bg-white text-[#0a5e2a] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wand2 size={14} />
          Adresse rapide
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
            mode === 'manual'
              ? 'bg-white text-[#0a5e2a] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={14} />
          Saisie manuelle (RDV)
        </button>
      </div>

      {mode === 'manual' ? (
        <ManualWizard />
      ) : (
        <AddressMode
          addr={addr}
          searchingAddr={searchingAddr}
          searchError={searchError}
          inputRef={inputRef}
          handleAddrInput={handleAddrInput}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          suggestions={suggestions}
          runStudy={runStudy}
          tryExample={tryExample}
          loading={loading}
          error={error}
          study={study}
        />
      )}

      {/* Slide-in panel quand étude prête */}
      {study ? (
        <ProspectStudyPanel
          study={study}
          onClose={() => {
            setStudy(null)
            setAddr('')
            inputRef.current?.focus()
          }}
          onClaim={() => {}}
          alreadyClaimed={false}
          quotaExhausted={false}
          isClaiming={false}
        />
      ) : null}
    </div>
  )
}

interface AddressModeProps {
  addr: string
  searchingAddr: boolean
  searchError: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  handleAddrInput: (v: string) => void
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  suggestions: BanFeature[]
  runStudy: (f: BanFeature) => Promise<void>
  tryExample: (label: string) => void
  loading: boolean
  error: string | null
  study: ProspectStudy | null
}

function AddressMode({
  addr,
  searchingAddr,
  searchError,
  inputRef,
  handleAddrInput,
  showSuggestions,
  setShowSuggestions,
  suggestions,
  runStudy,
  tryExample,
  loading,
  error,
  study,
}: AddressModeProps) {
  return (
    <>
      {/* Search box */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={addr}
          onChange={(e) => handleAddrInput(e.target.value)}
          onFocus={() => addr.length >= 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Tapez l'adresse — ex: 12 rue de la Paix, Rennes"
          className="w-full pl-11 pr-12 py-4 border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:border-[#0a5e2a] focus:ring-4 focus:ring-[#0a5e2a]/15 shadow-sm"
        />
        {searchingAddr ? (
          <Loader
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0a5e2a] animate-spin"
          />
        ) : null}

        {showSuggestions ? (
          <ul className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((f, i) => (
                <li
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    void runStudy(f)
                  }}
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-emerald-50 border-b border-slate-50 last:border-0"
                >
                  <p className="text-slate-800 font-medium">{f.properties.label}</p>
                  {f.properties.context ? (
                    <p className="text-[11px] text-slate-500 mt-0.5">{f.properties.context}</p>
                  ) : null}
                </li>
              ))
            ) : searchError ? (
              <li className="px-4 py-3 text-sm text-red-700 bg-red-50">
                <p className="font-bold mb-1">⚠ Erreur réseau</p>
                <p>{searchError}</p>
              </li>
            ) : !searchingAddr && addr.length >= 2 ? (
              <li className="px-4 py-3 text-sm text-slate-500 italic">
                Aucune adresse trouvée — tapez plus précisément
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {/* Examples */}
      {!study && !loading ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1">
            <Lightbulb size={14} />
            Exemples (cliquer pour pré-remplir)
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => tryExample(ex)}
                className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 text-xs rounded-full hover:border-emerald-400 hover:shadow-sm transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center gap-3">
          <Loader className="animate-spin text-[#0a5e2a]" size={28} />
          <p className="text-sm font-medium text-slate-700">
            Calcul de l'étude énergétique BDNB CSTB...
          </p>
          <p className="text-xs text-slate-500">
            Bâtiment, climat 3CL local, scénarios, aides, chiffrage...
          </p>
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-700">
            <p className="font-bold mb-1">Étude indisponible</p>
            <p>{error}</p>
            <p className="mt-2 text-xs">
              Si le bâtiment n'est pas dans BDNB CSTB, vous pouvez{' '}
              <a
                href="mailto:hello@renovation-brh.fr?subject=Demande%20audit%20RGE"
                className="text-red-800 underline font-semibold"
              >
                demander un audit officiel à un Pro RGE BRH
              </a>
              .
            </p>
          </div>
        </div>
      ) : null}

      {/* Tips */}
      {!study && !loading && !error ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" />
            Quand utiliser ce simulateur ?
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">→</span>
              <span>
                Un vendeur vous demande <strong>"combien je peux gagner si je rénove
                avant de vendre ?"</strong> — montrez-lui l'estimation chiffrée + aides
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">→</span>
              <span>
                Vous estimez le potentiel d'un bien <strong>avant un mandat de vente</strong>{' '}
                (gain DPE possible = argument premium)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">→</span>
              <span>
                Vous voulez <strong>orienter un acquéreur F/G</strong> vers les
                travaux prioritaires (info post-mutation)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">→</span>
              <span>
                Pour les biens <strong>SANS DPE en base ADEME</strong> (logement
                récent, locatif, etc.) — étude reconstruite via BDNB CSTB
              </span>
            </li>
          </ul>
          <p className="text-[11px] text-slate-500 mt-4 italic">
            ⚡ Précision étude virtuelle : ±1 classe DPE. Pour un audit officiel signé,
            commander un Pro RGE BRH (commission agence 5 % HT si chantier signé).
          </p>
        </div>
      ) : null}
    </>
  )
}
