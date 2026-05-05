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
import { Search, Loader, Sparkles, Lightbulb, AlertCircle } from 'lucide-react'
import { scoreVenteApi } from '@/api/score-vente'
import { virtualToProspectStudy } from '@/lib/virtual-to-study'
import {
  ProspectStudyPanel,
  type ProspectStudy,
} from '@/components/agence/ProspectStudyPanel'

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
  '12 rue de la Paix, Rennes',
  '5 rue de Siam, Brest',
  '8 place Sadi-Carnot, Saint-Brieuc',
  '20 rue du Mené, Vannes',
]

export default function AgenceSimulateur() {
  const [addr, setAddr] = useState('')
  const [suggestions, setSuggestions] = useState<BanFeature[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
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
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (value.length < 4) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=8&autocomplete=1`,
        )
        const data = await r.json()
        setSuggestions((data.features ?? []) as BanFeature[])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 220)
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
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a5e2a] to-[#16a34a] mb-4 shadow-lg">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-display tracking-tight text-slate-900">
          Simulateur Cap Rénov
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
          Étudiez n'importe quelle adresse de Bretagne — DPE estimé via BDNB CSTB,
          3 scénarios de rénovation, travaux chiffrés, aides MPR + CEE par décile,
          artisans RGE proches.
        </p>
      </header>

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
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Tapez l'adresse — ex: 12 rue de la Paix, Rennes"
          className="w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-2xl text-base focus:outline-none focus:border-[#0a5e2a] focus:ring-4 focus:ring-[#0a5e2a]/15 shadow-sm"
        />

        {showSuggestions && suggestions.length > 0 ? (
          <ul className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
            {suggestions.map((f, i) => (
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
            ))}
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
