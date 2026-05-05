/**
 * Phase 16.1 — Wizard de saisie manuelle façon CapRénov+ (multi-étapes guidé).
 *
 * 6 étapes avec cards visuelles + progress bar + preview évolutif :
 *   1. Logement (type + période + surface + niveaux)
 *   2. Localisation (code INSEE + altitude)
 *   3. Isolation parois (murs + toiture + plancher)
 *   4. Ouvertures (vitrage + surfaces sud/nord)
 *   5. Chauffage + ECS
 *   6. Ventilation + Synthèse
 *
 * Calcul live via computeDpe (TS pure) à chaque changement de step.
 * Réutilise le moteur DPE 3CL de src/lib/dpe-engine/ (calque CapRénov+).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Wand2,
  CheckCheck,
  AlertCircle,
  Building2,
  Building,
  Calendar,
  Ruler,
  MapPin,
  Layers,
  Maximize2,
  Sun,
  Wind,
  Thermometer,
  Droplets,
  CheckCircle2,
  Loader,
  Calculator,
  RotateCcw,
} from 'lucide-react'
import { computeDpe } from '@/lib/dpe-engine'
import { computeAllScenarios, type ScenarioComputed } from '@/lib/dpe-engine/variantes'
import { scoreVenteApi } from '@/api/score-vente'
import { useCreateSimulation } from '@/hooks/queries/agence-simulations'
import { useMyAgenceMembership } from '@/hooks/queries/agence-membership'
import type {
  AuditInputs,
  PeriodeConstruction,
  TypeBatiment,
  Ventilation,
  GenerateurChauffage,
  Inertie,
  DpeResult,
} from '@/lib/dpe-engine/types'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import { StudyReport } from './StudyReport'
import { Printer, Save } from 'lucide-react'

type FormState = {
  codeInsee: string
  altitude: number
  surfaceHabitable: number
  hauteurSousPlafond: number
  nombreNiveaux: number
  periodeConstruction: PeriodeConstruction
  typeBatiment: TypeBatiment
  inertie: Inertie | string
  surfaceMurs: number
  isolationMurs: 'sans' | 'iti_60' | 'iti_120' | 'iti_200' | 'ite_140' | 'ite_200'
  isolationToiture: 'sans' | 'iti_100' | 'iti_200' | 'iti_300'
  isolationPlancherBas: 'sans' | 'iti_60' | 'iti_120'
  surfaceFenetresSud: number
  surfaceFenetresNord: number
  vitrage: 'simple' | 'double' | 'triple'
  chauffageGenerateur: GenerateurChauffage
  chauffageEmetteur: string
  chauffageAnnee: number
  chauffageRegulation: boolean
  ecsGenerateur: 'electrique' | 'gaz' | 'fioul' | 'bois' | 'cet' | 'reseau_chaleur' | 'solaire_thermique'
  ecsStockageL: number
  ventilation: Ventilation
}

const ISOLATION_PARAMS: Record<
  string,
  | { type: 'iti' | 'ite' | 'sans'; epaisseur: number; lambda: number }
  | { type: 'sans' }
> = {
  sans: { type: 'sans' },
  iti_60: { type: 'iti', epaisseur: 60, lambda: 0.04 },
  iti_100: { type: 'iti', epaisseur: 100, lambda: 0.04 },
  iti_120: { type: 'iti', epaisseur: 120, lambda: 0.04 },
  iti_200: { type: 'iti', epaisseur: 200, lambda: 0.035 },
  iti_300: { type: 'iti', epaisseur: 300, lambda: 0.035 },
  ite_140: { type: 'ite', epaisseur: 140, lambda: 0.032 },
  ite_200: { type: 'ite', epaisseur: 200, lambda: 0.032 },
}

const DEFAULT_FORM: FormState = {
  codeInsee: '35238',
  altitude: 50,
  surfaceHabitable: 100,
  hauteurSousPlafond: 2.5,
  nombreNiveaux: 1,
  periodeConstruction: '1948-1974',
  typeBatiment: 'maison',
  inertie: 'moyenne',
  surfaceMurs: 80,
  isolationMurs: 'sans',
  isolationToiture: 'sans',
  isolationPlancherBas: 'sans',
  surfaceFenetresSud: 6,
  surfaceFenetresNord: 4,
  vitrage: 'double',
  chauffageGenerateur: 'chaudiere_fioul',
  chauffageEmetteur: 'radiateur_eau',
  chauffageAnnee: 2010,
  chauffageRegulation: true,
  ecsGenerateur: 'electrique',
  ecsStockageL: 200,
  ventilation: 'naturelle',
}

function formToInputs(f: FormState): AuditInputs {
  return {
    geo: { codeInsee: f.codeInsee, altitude: f.altitude },
    bati: {
      surfaceHabitable: f.surfaceHabitable,
      volume: f.surfaceHabitable * f.hauteurSousPlafond,
      hauteurSousPlafond: f.hauteurSousPlafond,
      nombreNiveaux: f.nombreNiveaux,
      periodeConstruction: f.periodeConstruction,
      inertie: f.inertie as Inertie,
      typeBatiment: f.typeBatiment,
      parois: [
        { type: 'mur', surface: f.surfaceMurs, adjacence: 'exterieur', materiau: 'parpaing', isolation: ISOLATION_PARAMS[f.isolationMurs] },
        { type: 'plancher_bas', surface: f.surfaceHabitable, adjacence: 'vide_sanitaire', isolation: ISOLATION_PARAMS[f.isolationPlancherBas] },
        { type: 'plancher_haut', surface: f.surfaceHabitable, adjacence: 'combles_perdus', isolation: ISOLATION_PARAMS[f.isolationToiture] },
      ],
      ouvertures: [
        { type: 'fenetre', surface: f.surfaceFenetresSud, orientation: 'sud', menuiserie: 'pvc', vitrage: f.vitrage },
        { type: 'fenetre', surface: f.surfaceFenetresNord, orientation: 'nord', menuiserie: 'pvc', vitrage: f.vitrage },
        { type: 'porte', surface: 2, menuiserie: 'bois' },
      ],
    },
    equipements: {
      chauffage: {
        generateur: f.chauffageGenerateur,
        emetteur: f.chauffageEmetteur as never,
        anneeInstallation: f.chauffageAnnee,
        regulation: f.chauffageRegulation,
      },
      ecs: { generateur: f.ecsGenerateur, stockageL: f.ecsStockageL },
      ventilation: f.ventilation,
    },
    comportement: 'conventionnel',
  }
}

// =============================================================================
// MAPPING BDNB CSTB → FormState (pré-remplissage)
// =============================================================================

function mapPeriode(annee: number | null | undefined): PeriodeConstruction {
  if (!annee || annee < 1900) return '1948-1974'
  if (annee < 1948) return 'avant_1948'
  if (annee <= 1974) return '1948-1974'
  if (annee <= 1977) return '1975-1977'
  if (annee <= 1982) return '1978-1982'
  if (annee <= 1988) return '1983-1988'
  if (annee <= 2000) return '1989-2000'
  if (annee <= 2005) return '2001-2005'
  if (annee <= 2012) return '2006-2012'
  return 'apres_2013'
}

function mapTypeBatiment(t: string | null | undefined): TypeBatiment {
  if (!t) return 'maison'
  const lower = t.toLowerCase()
  if (lower.includes('immeuble') || lower.includes('collectif')) return 'immeuble'
  if (lower.includes('appart')) return 'appartement'
  return 'maison'
}

function mapChauffage(t: string | null | undefined): GenerateurChauffage {
  if (!t) return 'chaudiere_gaz_standard'
  const lower = t.toLowerCase()
  if (lower.includes('électr') || lower.includes('elec')) return 'effet_joule_direct'
  if (lower.includes('fioul')) return 'chaudiere_fioul'
  if (lower.includes('gaz')) return 'chaudiere_gaz_standard'
  if (lower.includes('bois') || lower.includes('granul')) return 'chaudiere_bois_buche'
  if (lower.includes('pac') || lower.includes('pompe')) return 'pac_air_eau'
  if (lower.includes('reseau') || lower.includes('chaleur')) return 'reseau_chaleur'
  return 'chaudiere_gaz_standard'
}

interface PrefillResult {
  source: 'BDNB CSTB' | 'BAN seul'
  fields: string[]
  partial: Partial<FormState>
}

interface VirtualPayload {
  found?: boolean
  logement?: {
    type?: string | null
    surface_m2?: number | null
    annee_construction?: number | null
    type_chauffage?: string | null
  }
  dpe?: {
    actuel?: string
  }
}

function mapBdnbToForm(
  payload: VirtualPayload,
  citycode: string | null,
  postcode: string | null,
): PrefillResult {
  const filled: string[] = []
  const partial: Partial<FormState> = {}

  // Code INSEE — toujours dispo via citycode BAN
  if (citycode) {
    partial.codeInsee = citycode
    filled.push('Code INSEE')
  } else if (postcode) {
    partial.codeInsee = postcode
    filled.push('Code postal (fallback)')
  }

  const logement = payload.logement
  const found = payload.found && logement

  if (found && logement) {
    if (logement.surface_m2) {
      partial.surfaceHabitable = Math.round(logement.surface_m2)
      filled.push(`Surface (${partial.surfaceHabitable} m²)`)
    }
    if (logement.annee_construction) {
      partial.periodeConstruction = mapPeriode(logement.annee_construction)
      filled.push(`Période (${partial.periodeConstruction})`)
    }
    if (logement.type) {
      partial.typeBatiment = mapTypeBatiment(logement.type)
      filled.push(`Type (${partial.typeBatiment})`)
    }
    if (logement.type_chauffage) {
      partial.chauffageGenerateur = mapChauffage(logement.type_chauffage)
      filled.push(`Chauffage (${partial.chauffageGenerateur.replace(/_/g, ' ')})`)
    }
  }

  return {
    source: found ? 'BDNB CSTB' : 'BAN seul',
    fields: filled,
    partial,
  }
}

// =============================================================================
// STEPPER
// =============================================================================

const STEPS = [
  { id: 1, title: 'Logement', icon: Home },
  { id: 2, title: 'Localisation', icon: MapPin },
  { id: 3, title: 'Isolation', icon: Layers },
  { id: 4, title: 'Ouvertures', icon: Sun },
  { id: 5, title: 'Chauffage & ECS', icon: Thermometer },
  { id: 6, title: 'Synthèse', icon: CheckCircle2 },
] as const

interface BanFeat {
  properties: { label: string; context?: string; postcode?: string; citycode?: string }
  geometry: { coordinates: [number, number] }
}

interface ManualWizardProps {
  /** FormState initial pour reprendre une simulation sauvegardée. */
  initialForm?: Partial<FormState>
  /** Adresse pré-saisie (ex : depuis une card lead). */
  initialAddress?: { adresse: string; code_postal: string | null; commune: string | null }
  /** Lien vers un lead pour rattacher la simulation. */
  leadAssignmentId?: string | null
  /** Lien vers un prospect DPE. */
  prospectDpeId?: number | null
}

export default function ManualWizard({
  initialForm,
  initialAddress,
  leadAssignmentId,
  prospectDpeId,
}: ManualWizardProps = {}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(() => ({ ...DEFAULT_FORM, ...initialForm }))
  const [livePreview, setLivePreview] = useState<DpeResult | null>(null)

  // Save simulation
  const { data: membership } = useMyAgenceMembership()
  const createSim = useCreateSimulation()
  const [saveModal, setSaveModal] = useState(false)
  const [saveTitre, setSaveTitre] = useState('')
  const [saveNotes, setSaveNotes] = useState('')
  const [saveDone, setSaveDone] = useState(false)
  const [saveAdresse, setSaveAdresse] = useState(initialAddress?.adresse ?? '')
  const [saveCodePostal, setSaveCodePostal] = useState(initialAddress?.code_postal ?? '')
  const [saveCommune, setSaveCommune] = useState(initialAddress?.commune ?? '')

  // Pré-remplissage adresse
  const [addr, setAddr] = useState('')
  const [suggestions, setSuggestions] = useState<BanFeat[]>([])
  const [showSug, setShowSug] = useState(false)
  const [searching, setSearching] = useState(false)
  const [prefilling, setPrefilling] = useState(false)
  const [prefillResult, setPrefillResult] = useState<PrefillResult | null>(null)
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const debRef = useRef<number | null>(null)

  const inputs = useMemo(() => formToInputs(form), [form])
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setLivePreview(computeDpe(inputs))
      } catch {
        setLivePreview(null)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [inputs])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Search BAN
  function handleAddrInput(value: string) {
    setAddr(value)
    setPrefillError(null)
    if (debRef.current) window.clearTimeout(debRef.current)
    if (value.length < 2) {
      setSuggestions([])
      setShowSug(false)
      setSearching(false)
      return
    }
    setSearching(true)
    debRef.current = window.setTimeout(async () => {
      try {
        const r = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=6&autocomplete=1`,
        )
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        setSuggestions((data.features ?? []) as BanFeat[])
        setShowSug(true)
      } catch (err) {
        console.error('BAN failed', err)
        setSuggestions([])
        setShowSug(true)
        setPrefillError('Connexion API adresse échouée — vide cache (Cmd+Shift+R)')
      } finally {
        setSearching(false)
      }
    }, 200)
  }

  async function handlePrefill(f: BanFeat) {
    setAddr(f.properties.label)
    setShowSug(false)
    setPrefilling(true)
    setPrefillError(null)
    setPrefillResult(null)
    const [lng, lat] = f.geometry.coordinates
    const cp = f.properties.postcode ?? null
    const citycode = f.properties.citycode ?? null

    try {
      let payload: VirtualPayload = { found: false }
      try {
        payload = (await scoreVenteApi.fetchVirtualStudy({
          q: f.properties.label,
          lat,
          lng,
          cp: cp ?? '',
          foyer: 2,
          rfr: 30000,
        })) as VirtualPayload
      } catch {
        // BDNB peut ne pas avoir le bâtiment → on continue avec citycode seul
      }

      const result = mapBdnbToForm(payload, citycode, cp)
      setForm((cur) => ({ ...cur, ...result.partial }))
      setPrefillResult(result)
    } catch (err) {
      setPrefillError(
        err instanceof Error
          ? `Pré-remplissage impossible : ${err.message}`
          : 'Pré-remplissage impossible',
      )
    } finally {
      setPrefilling(false)
    }
  }

  const progressPct = Math.round((step / STEPS.length) * 100)

  return (
    <div className="space-y-5">
      {/* Pré-remplissage adresse */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 size={16} className="text-emerald-600" />
          <p className="text-sm font-bold text-slate-800">
            Pré-remplir avec les données du secteur
          </p>
          <span className="ml-auto text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
            optionnel
          </span>
        </div>
        <p className="text-[11px] text-slate-600 mb-3 leading-snug">
          Saisissez l'adresse du bien — on récupère automatiquement <strong>code INSEE</strong>{' '}
          (zone climatique) + <strong>surface</strong>, <strong>période</strong>,{' '}
          <strong>type bâti</strong> et <strong>chauffage</strong> via BDNB CSTB et cadastre RNB
          quand disponibles. Vous ajustez ensuite ce qui n'est pas connu.
        </p>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={addr}
            onChange={(e) => handleAddrInput(e.target.value)}
            onFocus={() => addr.length >= 2 && setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 200)}
            placeholder="ex : 5 rue de Siam 29200 Brest"
            className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          {searching || prefilling ? (
            <Loader
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin"
            />
          ) : null}

          {showSug ? (
            <ul className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-72 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((f, i) => (
                  <li
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      void handlePrefill(f)
                    }}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-emerald-50 border-b border-slate-50 last:border-0"
                  >
                    <p className="text-slate-800 font-medium">{f.properties.label}</p>
                    {f.properties.context ? (
                      <p className="text-[10px] text-slate-500">{f.properties.context}</p>
                    ) : null}
                  </li>
                ))
              ) : prefillError ? (
                <li className="px-4 py-3 text-sm text-red-700 bg-red-50">
                  <p className="font-bold">⚠ Erreur réseau</p>
                  <p>{prefillError}</p>
                </li>
              ) : !searching && addr.length >= 2 ? (
                <li className="px-4 py-3 text-sm text-slate-500 italic">
                  Aucune adresse trouvée
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {prefillResult ? (
          <div
            className={`mt-3 rounded-lg p-3 text-xs ${
              prefillResult.source === 'BDNB CSTB'
                ? 'bg-emerald-100 border border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {prefillResult.source === 'BDNB CSTB' ? (
                <CheckCheck size={14} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-bold mb-1">
                  Source : {prefillResult.source}
                  {prefillResult.source === 'BAN seul'
                    ? ' (bâtiment pas dans BDNB)'
                    : ''}
                </p>
                {prefillResult.fields.length > 0 ? (
                  <p>
                    Champs pré-remplis :{' '}
                    <strong>{prefillResult.fields.join(' · ')}</strong>
                  </p>
                ) : (
                  <p>Aucune donnée trouvée — saisissez tout manuellement.</p>
                )}
                <p className="mt-1 italic opacity-80">
                  Vérifiez et ajustez si besoin dans les étapes ci-dessous.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
            Étape {step} / {STEPS.length}
          </p>
          <p className="text-xs text-slate-500">{progressPct} %</p>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-[#0a5e2a] to-[#16a34a] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          {STEPS.map((s) => {
            const reached = step >= s.id
            const current = step === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => reached && setStep(s.id)}
                disabled={!reached}
                className={`flex flex-col items-center gap-1 ${
                  reached ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    current
                      ? 'bg-[#0a5e2a] text-white shadow-md ring-4 ring-emerald-100'
                      : reached
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <s.icon size={14} />
                </div>
                <span
                  className={`text-[10px] font-semibold hidden md:block ${
                    current ? 'text-[#0a5e2a]' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Step content */}
        <div className="lg:col-span-2 space-y-4">
          {step === 1 && <Step1Logement form={form} set={set} />}
          {step === 2 && <Step2Localisation form={form} set={set} />}
          {step === 3 && <Step3Isolation form={form} set={set} />}
          {step === 4 && <Step4Ouvertures form={form} set={set} />}
          {step === 5 && <Step5Equipements form={form} set={set} />}
          {step === 6 && (
            <Step6Synthese
              form={form}
              preview={livePreview}
              inputs={inputs}
              onSave={() => {
                setSaveTitre(
                  initialAddress?.adresse ??
                    `${form.codeInsee} · ${form.surfaceHabitable}m² · ${form.typeBatiment}`,
                )
                setSaveModal(true)
              }}
              saveDone={saveDone}
            />
          )}

          {/* Nav */}
          <div className="flex items-center justify-between gap-2 pt-3">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setForm(DEFAULT_FORM)}
              className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
            >
              <RotateCcw size={11} />
              Réinitialiser
            </button>
            {step < STEPS.length ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-gradient-to-br from-[#0a5e2a] to-[#16a34a] text-white text-sm font-bold rounded-lg shadow hover:shadow-md"
              >
                Suivant
                <ChevronRight size={14} />
              </button>
            ) : (
              <a
                href={`mailto:hello@renovation-brh.fr?subject=${encodeURIComponent(
                  'Demande audit RGE — simulation manuelle',
                )}&body=${encodeURIComponent(
                  `Bonjour,\n\nJ'ai effectué une simulation manuelle pour mon client :\n\n` +
                    `Type : ${form.typeBatiment}\nPériode : ${form.periodeConstruction}\n` +
                    `Surface : ${form.surfaceHabitable} m²\nDPE estimé : ${livePreview?.etiquetteDpe ?? '?'}\n` +
                    `Conso : ${Math.round(livePreview?.cepKwhEpM2An ?? 0)} kWh EP/m²/an\n\n` +
                    `Merci de me contacter pour planifier un audit officiel.\n\nCordialement`,
                )}`}
                className="inline-flex items-center gap-1 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow hover:bg-emerald-700"
              >
                Demander un audit RGE
                <CheckCircle2 size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Live preview sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
              <Calculator size={12} />
              DPE estimé en temps réel
            </h3>
            {livePreview ? (
              <>
                <DpeLabelGauge
                  etiquette={livePreview.etiquetteDpe}
                  value={livePreview.cepKwhEpM2An}
                  unit="kWh EP/m²·an"
                  type="final"
                  title="DPE estimé"
                />
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1">
                  <Row label="Énergie">
                    <strong>{livePreview.etiquetteEnergie}</strong> ·{' '}
                    {Math.round(livePreview.cepKwhEpM2An)} kWh EP/m²/an
                  </Row>
                  <Row label="GES">
                    <strong>{livePreview.etiquetteClimat}</strong> ·{' '}
                    {livePreview.gesKgCo2M2An.toFixed(1)} kg CO₂/m²/an
                  </Row>
                  <Row label="Zone clim.">
                    {livePreview.hypotheses.zoneClimatique}
                  </Row>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">
                  <p className="font-bold text-emerald-900 mb-1">💡 Astuce</p>
                  <p className="text-emerald-800 leading-snug">
                    Ajustez les paramètres à chaque étape — l'étiquette se met à jour en
                    temps réel. Idéal pour comparer "tel quel" vs "post-rénovation".
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader size={12} className="animate-spin" />
                Calcul…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Save simulation */}
      {saveModal ? (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSaveModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              Sauvegarder cette simulation
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Tu pourras la retrouver dans <strong>Mes simulations</strong> et la rouvrir pour
              l'éditer ou imprimer le rapport.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre (obligatoire)
                </label>
                <input
                  type="text"
                  value={saveTitre}
                  onChange={(e) => setSaveTitre(e.target.value)}
                  placeholder="ex : 12 rue de la Paix — vendeur Dupont"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={saveAdresse}
                  onChange={(e) => setSaveAdresse(e.target.value)}
                  placeholder="12 rue de la Paix"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={saveCodePostal}
                  onChange={(e) => setSaveCodePostal(e.target.value)}
                  placeholder="Code postal"
                  maxLength={5}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={saveCommune}
                  onChange={(e) => setSaveCommune(e.target.value)}
                  placeholder="Commune"
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="ex : RDV avec M. Dupont — bien intéressé par PAC + ITE"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSaveModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!saveTitre || !membership?.agenceId || createSim.isPending}
                onClick={async () => {
                  if (!membership?.agenceId) return
                  try {
                    await createSim.mutateAsync({
                      agence_id: membership.agenceId,
                      created_by: null,
                      lead_assignment_id: leadAssignmentId ?? null,
                      prospect_dpe_id: prospectDpeId ?? null,
                      titre: saveTitre,
                      adresse: saveAdresse || null,
                      code_postal: saveCodePostal || null,
                      commune: saveCommune || null,
                      code_insee: form.codeInsee || null,
                      notes: saveNotes || null,
                      inputs: form as unknown as Record<string, unknown>,
                      result: livePreview as unknown as Record<string, unknown> | null,
                      scenarios: null,
                      etiquette_dpe: livePreview?.etiquetteDpe ?? null,
                      cep_kwh_ep_m2_an: livePreview?.cepKwhEpM2An ?? null,
                    })
                    setSaveModal(false)
                    setSaveDone(true)
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? `Erreur sauvegarde : ${err.message}`
                        : 'Erreur sauvegarde',
                    )
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-lg shadow hover:shadow-md disabled:opacity-50"
              >
                {createSim.isPending ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// =============================================================================
// STEPS
// =============================================================================

interface StepProps {
  form: FormState
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

function Step1Logement({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Home className="text-emerald-600" size={20} />}
        title="Type de logement"
        subtitle="Quel est le type de bien à étudier ?"
      />
      <div className="grid grid-cols-3 gap-3">
        <CardChoice
          active={form.typeBatiment === 'maison'}
          onClick={() => set('typeBatiment', 'maison')}
          icon={<Home size={28} />}
          label="Maison"
          desc="Individuelle"
        />
        <CardChoice
          active={form.typeBatiment === 'appartement'}
          onClick={() => set('typeBatiment', 'appartement')}
          icon={<Building size={28} />}
          label="Appartement"
          desc="Dans copro"
        />
        <CardChoice
          active={form.typeBatiment === 'immeuble'}
          onClick={() => set('typeBatiment', 'immeuble')}
          icon={<Building2 size={28} />}
          label="Immeuble"
          desc="Collectif entier"
        />
      </div>

      <StepHeader
        icon={<Calendar className="text-emerald-600" size={20} />}
        title="Période de construction"
        subtitle="Année ou décennie de construction du bâti d'origine"
      />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { v: 'avant_1948' as const, label: '<1948', sub: 'Pierre' },
          { v: '1948-1974' as const, label: '1948-74', sub: 'RT0' },
          { v: '1975-1977' as const, label: '1975-77', sub: 'RT1' },
          { v: '1978-1982' as const, label: '1978-82', sub: 'RT2' },
          { v: '1983-1988' as const, label: '1983-88', sub: 'RT3' },
          { v: '1989-2000' as const, label: '1989-2000', sub: 'RT88' },
          { v: '2001-2005' as const, label: '2001-05', sub: 'RT2000' },
          { v: '2006-2012' as const, label: '2006-12', sub: 'RT2005' },
          { v: 'apres_2013' as const, label: '>2013', sub: 'RT2012+' },
        ].map((p) => (
          <button
            key={p.v}
            type="button"
            onClick={() => set('periodeConstruction', p.v)}
            className={`px-3 py-2 rounded-lg border-2 text-center transition ${
              form.periodeConstruction === p.v
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <p className="text-xs font-bold text-slate-800">{p.label}</p>
            <p className="text-[10px] text-slate-500">{p.sub}</p>
          </button>
        ))}
      </div>

      <StepHeader
        icon={<Ruler className="text-emerald-600" size={20} />}
        title="Dimensions"
        subtitle="Surface habitable mesurée et hauteur sous plafond"
      />
      <div className="grid grid-cols-3 gap-3">
        <NumField
          label="Surface habitable"
          value={form.surfaceHabitable}
          onChange={(v) => set('surfaceHabitable', v)}
          unit="m²"
          min={20}
          max={500}
        />
        <NumField
          label="Hauteur sous plafond"
          value={form.hauteurSousPlafond}
          onChange={(v) => set('hauteurSousPlafond', v)}
          unit="m"
          step={0.1}
          min={2}
          max={5}
        />
        <NumField
          label="Niveaux"
          value={form.nombreNiveaux}
          onChange={(v) => set('nombreNiveaux', v)}
          unit="ét."
          min={1}
          max={5}
        />
      </div>

      <StepHeader
        icon={<Maximize2 className="text-emerald-600" size={20} />}
        title="Inertie thermique"
        subtitle="Capacité à conserver chaleur/fraîcheur"
      />
      <div className="grid grid-cols-3 gap-3">
        <CardChoice
          small
          active={form.inertie === 'LEGERE'}
          onClick={() => set('inertie', 'LEGERE')}
          label="Légère"
          desc="Bois, ossature"
        />
        <CardChoice
          small
          active={form.inertie === 'moyenne'}
          onClick={() => set('inertie', 'moyenne')}
          label="Moyenne"
          desc="Parpaing, brique"
        />
        <CardChoice
          small
          active={form.inertie === 'LOURDE'}
          onClick={() => set('inertie', 'LOURDE')}
          label="Lourde"
          desc="Pierre épaisse"
        />
      </div>
    </div>
  )
}

function Step2Localisation({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<MapPin className="text-emerald-600" size={20} />}
        title="Localisation du bien"
        subtitle="Code INSEE de la commune (5 chiffres)"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Code INSEE
          </label>
          <input
            type="text"
            value={form.codeInsee}
            onChange={(e) => set('codeInsee', e.target.value)}
            maxLength={5}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Ex: 35238 (Rennes), 29019 (Brest), 22278 (St-Brieuc), 56260 (Vannes)
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Altitude
          </label>
          <input
            type="number"
            value={form.altitude}
            onChange={(e) => set('altitude', Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
          />
          <p className="text-[10px] text-slate-500 mt-1">m au-dessus du niveau mer</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <p className="font-bold mb-1">⚡ Pourquoi le code INSEE ?</p>
        <p className="leading-snug">
          La commune détermine la <strong>zone climatique 3CL</strong> (H1a, H2a, H2b...) qui
          impacte directement les besoins de chauffage. La Bretagne est en H2a (climat océanique
          tempéré, hivers doux).
        </p>
      </div>
    </div>
  )
}

function Step3Isolation({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Layers className="text-emerald-600" size={20} />}
        title="Isolation des murs"
        subtitle="État actuel — sans = murs nus = passoire thermique"
      />
      <NumField
        label="Surface murs déperditifs"
        value={form.surfaceMurs}
        onChange={(v) => set('surfaceMurs', v)}
        unit="m²"
        min={20}
        max={500}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { v: 'sans' as const, label: 'Sans isolation', desc: 'Murs nus', bad: true },
          { v: 'iti_60' as const, label: 'ITI 60mm', desc: 'Faible' },
          { v: 'iti_120' as const, label: 'ITI 120mm', desc: 'Standard' },
          { v: 'iti_200' as const, label: 'ITI 200mm', desc: 'Bon' },
          { v: 'ite_140' as const, label: 'ITE 140mm', desc: 'Bon' },
          { v: 'ite_200' as const, label: 'ITE 200mm', desc: 'Excellent' },
        ].map((iso) => (
          <CardChoice
            key={iso.v}
            small
            active={form.isolationMurs === iso.v}
            onClick={() => set('isolationMurs', iso.v)}
            label={iso.label}
            desc={iso.desc}
            danger={iso.bad}
          />
        ))}
      </div>

      <StepHeader
        icon={<Layers className="text-emerald-600" size={20} />}
        title="Isolation toiture / combles"
        subtitle="30 % des déperditions énergétiques en moyenne"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { v: 'sans' as const, label: 'Sans', desc: 'Aucune', bad: true },
          { v: 'iti_100' as const, label: '100mm', desc: 'Faible' },
          { v: 'iti_200' as const, label: '200mm', desc: 'Bon' },
          { v: 'iti_300' as const, label: '300mm', desc: 'Excellent' },
        ].map((iso) => (
          <CardChoice
            key={iso.v}
            small
            active={form.isolationToiture === iso.v}
            onClick={() => set('isolationToiture', iso.v)}
            label={iso.label}
            desc={iso.desc}
            danger={iso.bad}
          />
        ))}
      </div>

      <StepHeader
        icon={<Layers className="text-emerald-600" size={20} />}
        title="Isolation plancher bas"
        subtitle="Vide sanitaire / cave / sol direct"
      />
      <div className="grid grid-cols-3 gap-3">
        {[
          { v: 'sans' as const, label: 'Sans', desc: 'Aucune', bad: true },
          { v: 'iti_60' as const, label: '60mm', desc: 'Faible' },
          { v: 'iti_120' as const, label: '120mm', desc: 'Bon' },
        ].map((iso) => (
          <CardChoice
            key={iso.v}
            small
            active={form.isolationPlancherBas === iso.v}
            onClick={() => set('isolationPlancherBas', iso.v)}
            label={iso.label}
            desc={iso.desc}
            danger={iso.bad}
          />
        ))}
      </div>
    </div>
  )
}

function Step4Ouvertures({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Sun className="text-emerald-600" size={20} />}
        title="Type de vitrage"
        subtitle="Le simple vitrage est très énergivore (passoire)"
      />
      <div className="grid grid-cols-3 gap-3">
        <CardChoice
          active={form.vitrage === 'simple'}
          onClick={() => set('vitrage', 'simple')}
          icon={<Sun size={24} />}
          label="Simple"
          desc="Très déperditif"
          danger
        />
        <CardChoice
          active={form.vitrage === 'double'}
          onClick={() => set('vitrage', 'double')}
          icon={<Sun size={24} />}
          label="Double"
          desc="Standard"
        />
        <CardChoice
          active={form.vitrage === 'triple'}
          onClick={() => set('vitrage', 'triple')}
          icon={<Sun size={24} />}
          label="Triple"
          desc="Performant"
        />
      </div>

      <StepHeader
        icon={<Maximize2 className="text-emerald-600" size={20} />}
        title="Surfaces vitrées"
        subtitle="Mesurez approximativement par orientation"
      />
      <div className="grid grid-cols-2 gap-3">
        <NumField
          label="Sud (apports solaires)"
          value={form.surfaceFenetresSud}
          onChange={(v) => set('surfaceFenetresSud', v)}
          unit="m²"
          step={0.5}
          min={0}
          max={50}
        />
        <NumField
          label="Nord (déperditions)"
          value={form.surfaceFenetresNord}
          onChange={(v) => set('surfaceFenetresNord', v)}
          unit="m²"
          step={0.5}
          min={0}
          max={50}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
        <p className="font-bold mb-1">💡 Mesure rapide en RDV</p>
        <p className="leading-snug">
          Multipliez largeur × hauteur de chaque fenêtre. Une fenêtre standard = 1.2 × 1.5 m
          ≈ 1.8 m². Une baie vitrée = 2.5 × 2.2 m ≈ 5.5 m².
        </p>
      </div>
    </div>
  )
}

function Step5Equipements({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Thermometer className="text-emerald-600" size={20} />}
        title="Système de chauffage"
        subtitle="Le poste #1 de consommation énergétique"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(
          [
            { v: 'chaudiere_fioul', label: 'Fioul', icon: '🛢️', danger: true },
            { v: 'chaudiere_fioul_condensation', label: 'Fioul cond.', icon: '🛢️', danger: true },
            { v: 'chaudiere_gaz_standard', label: 'Gaz std', icon: '🔥', danger: false },
            { v: 'chaudiere_gaz_condensation', label: 'Gaz cond.', icon: '🔥', danger: false },
            { v: 'chaudiere_bois_buche', label: 'Bois bûche', icon: '🪵', danger: false },
            { v: 'chaudiere_granules_bois', label: 'Granulés', icon: '🪵', danger: false },
            { v: 'pac_air_air', label: 'PAC air/air', icon: '❄️', danger: false },
            { v: 'pac_air_eau', label: 'PAC air/eau', icon: '💧', danger: false },
            { v: 'pac_eau_eau', label: 'PAC eau/eau', icon: '🌊', danger: false },
            { v: 'effet_joule_direct', label: 'Conv. élec', icon: '⚡', danger: true },
            { v: 'inertie_electrique', label: 'Inertie élec', icon: '⚡', danger: false },
            { v: 'reseau_chaleur', label: 'Réseau ch.', icon: '🏭', danger: false },
          ] as const
        ).map((g) => (
          <button
            key={g.v}
            type="button"
            onClick={() => set('chauffageGenerateur', g.v as GenerateurChauffage)}
            className={`px-2 py-2.5 rounded-lg border-2 text-center transition ${
              form.chauffageGenerateur === g.v
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : g.danger
                ? 'border-red-100 bg-white hover:border-red-300'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <span className="text-xl block">{g.icon}</span>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{g.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Émetteur
          </label>
          <select
            value={form.chauffageEmetteur}
            onChange={(e) => set('chauffageEmetteur', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
          >
            <option value="radiateur_eau">Radiateur eau</option>
            <option value="plancher_chauffant">Plancher chauffant</option>
            <option value="convecteur_electrique">Convecteur électrique</option>
            <option value="panneau_rayonnant">Panneau rayonnant</option>
            <option value="split_air_air">Split air/air</option>
          </select>
        </div>
        <NumField
          label="Année installation"
          value={form.chauffageAnnee}
          onChange={(v) => set('chauffageAnnee', v)}
          unit=""
          min={1950}
          max={2100}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.chauffageRegulation}
          onChange={(e) => set('chauffageRegulation', e.target.checked)}
        />
        Régulation pièce par pièce (thermostat)
      </label>

      <StepHeader
        icon={<Droplets className="text-emerald-600" size={20} />}
        title="Eau chaude sanitaire"
        subtitle="2e poste de consommation"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(
          [
            { v: 'electrique', label: 'Ballon élec', icon: '⚡', danger: true },
            { v: 'cet', label: 'Thermo CET', icon: '♨️' },
            { v: 'gaz', label: 'Ballon gaz', icon: '🔥' },
            { v: 'solaire_thermique', label: 'Solaire', icon: '☀️' },
            { v: 'reseau_chaleur', label: 'Réseau ch.', icon: '🏭' },
          ] as const
        ).map((e) => (
          <button
            key={e.v}
            type="button"
            onClick={() => set('ecsGenerateur', e.v)}
            className={`px-2 py-2.5 rounded-lg border-2 text-center transition ${
              form.ecsGenerateur === e.v
                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <span className="text-xl block">{e.icon}</span>
            <p className="text-[11px] font-bold text-slate-800 mt-0.5">{e.label}</p>
          </button>
        ))}
      </div>

      <NumField
        label="Capacité ballon ECS"
        value={form.ecsStockageL}
        onChange={(v) => set('ecsStockageL', v)}
        unit="L"
        min={50}
        max={500}
      />

      <StepHeader
        icon={<Wind className="text-emerald-600" size={20} />}
        title="Ventilation"
        subtitle="VMC double flux = -15 % conso après isolation"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {(
          [
            { v: 'naturelle', label: 'Naturelle', desc: 'Trous murs', danger: true },
            { v: 'vmc_sf_auto_apres_2000', label: 'VMC SF auto', desc: 'Standard', danger: false },
            { v: 'vmc_sf_hygro_a', label: 'Hygro A', desc: 'Bon', danger: false },
            { v: 'vmc_sf_hygro_b_apres_2012', label: 'Hygro B', desc: 'Très bon', danger: false },
            { v: 'vmc_double_flux_avec_recup', label: 'Double flux', desc: 'Excellent', danger: false },
          ] as const
        ).map((v) => (
          <CardChoice
            key={v.v}
            small
            active={form.ventilation === v.v}
            onClick={() => set('ventilation', v.v as Ventilation)}
            label={v.label}
            desc={v.desc}
            danger={v.danger}
          />
        ))}
      </div>
    </div>
  )
}

function Step6Synthese({
  form,
  preview,
  inputs,
  onSave,
  saveDone,
}: {
  form: FormState
  preview: DpeResult | null
  inputs: AuditInputs
  onSave: () => void
  saveDone: boolean
}) {
  const [showReport, setShowReport] = useState(false)

  // Calcul des 3 scénarios chiffrés (geste seul / bouquet / rénovation BBC)
  const scenarios: ScenarioComputed[] = useMemo(() => {
    if (!preview) return []
    try {
      const all = computeAllScenarios(inputs, preview)
      // On garde 3 scénarios pertinents : isolation_combles + enveloppe_iti + isolation_pac
      const ids = ['isolation_combles', 'enveloppe_iti', 'isolation_pac']
      return ids
        .map((id) => all.find((s) => s.template.id === id))
        .filter((s): s is ScenarioComputed => !!s)
    } catch {
      return []
    }
  }, [inputs, preview])

  if (!preview) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Loader className="mx-auto animate-spin text-emerald-500 mb-2" />
        <p className="text-slate-500">Calcul en cours...</p>
      </div>
    )
  }

  const scenarioLabels: Record<string, { title: string; subtitle: string }> = {
    isolation_combles: { title: 'Geste seul', subtitle: 'Isolation combles 300mm' },
    enveloppe_iti: { title: 'Bouquet enveloppe', subtitle: 'Murs + combles + plancher bas' },
    isolation_pac: {
      title: 'Rénovation globale',
      subtitle: 'Enveloppe + PAC air/eau + ECS thermo.',
    },
  }

  return (
    <div className="space-y-4">
      <StepHeader
        icon={<CheckCircle2 className="text-emerald-600" size={20} />}
        title="Synthèse de la simulation"
        subtitle="DPE estimé · 3 scénarios chiffrés · rapport imprimable"
      />

      {/* Big DPE result */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white text-center">
        <p className="text-xs uppercase tracking-wider text-emerald-300 font-bold mb-2">
          DPE estimé — état actuel
        </p>
        <p className="text-7xl font-bold my-2">{preview.etiquetteDpe}</p>
        <p className="text-sm text-slate-300">
          {Math.round(preview.cepKwhEpM2An)} kWh EP/m²/an · GES {preview.etiquetteClimat}
        </p>
      </div>

      {/* 3 scénarios chiffrés */}
      {scenarios.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">3 scénarios de rénovation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((sc) => {
              const labels = scenarioLabels[sc.template.id] ?? {
                title: sc.template.label,
                subtitle: sc.template.description,
              }
              const reste = Math.max(0, sc.coutTtcEuros - sc.aidesEuros.total)
              const gainPct =
                preview.cepKwhEpM2An > 0
                  ? Math.round(
                      ((preview.cepKwhEpM2An - sc.result.cepKwhEpM2An) /
                        preview.cepKwhEpM2An) *
                        100,
                    )
                  : 0
              return (
                <div
                  key={sc.template.id}
                  className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-800 text-sm">{labels.title}</p>
                    <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      −{gainPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{labels.subtitle}</p>
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span className="text-[10px] text-slate-500">Avant</span>
                    <span
                      className="inline-block w-7 h-7 rounded-md text-white font-bold text-sm flex items-center justify-center"
                      style={{ background: dpeBg(preview.etiquetteDpe) }}
                    >
                      {preview.etiquetteDpe}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span
                      className="inline-block w-7 h-7 rounded-md text-white font-bold text-sm flex items-center justify-center"
                      style={{ background: dpeBg(sc.result.etiquetteDpe) }}
                    >
                      {sc.result.etiquetteDpe}
                    </span>
                    <span className="text-[10px] text-slate-500">Après</span>
                  </div>
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Coût TTC</span>
                      <span className="font-bold text-blue-700 tabular-nums">
                        {Math.round(sc.coutTtcEuros).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Aides estimées</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        −{Math.round(sc.aidesEuros.total).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-dashed border-slate-200 text-sm">
                      <span className="font-bold text-slate-700">Reste à charge</span>
                      <span className="font-bold text-[#0a5e2a] tabular-nums">
                        {Math.round(reste).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    {sc.payback.paybackAnnees != null && sc.payback.paybackAnnees > 0 && sc.payback.paybackAnnees < 99 ? (
                      <p className="text-[11px] text-slate-500 pt-1">
                        Retour sur invest. : ~{Math.round(sc.payback.paybackAnnees)} ans
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Récap caractéristiques */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2">Récap des caractéristiques</h3>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Type" value={form.typeBatiment} />
          <SummaryCard label="Période" value={form.periodeConstruction} />
          <SummaryCard label="Surface" value={`${form.surfaceHabitable} m²`} />
          <SummaryCard label="Niveaux" value={String(form.nombreNiveaux)} />
          <SummaryCard label="Murs" value={form.isolationMurs} />
          <SummaryCard label="Toiture" value={form.isolationToiture} />
          <SummaryCard label="Vitrage" value={form.vitrage} />
          <SummaryCard
            label="Chauffage"
            value={form.chauffageGenerateur.replace(/_/g, ' ')}
          />
          <SummaryCard label="ECS" value={form.ecsGenerateur} />
          <SummaryCard label="Ventilation" value={form.ventilation.replace(/_/g, ' ')} />
        </div>
      </div>

      {/* Boutons rapport + sauvegarder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition"
        >
          <Printer size={16} />
          Rapport imprimable
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDone}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition"
        >
          {saveDone ? (
            <>
              <CheckCircle2 size={16} />
              Simulation enregistrée ✓
            </>
          ) : (
            <>
              <Save size={16} />
              Sauvegarder cette simulation
            </>
          )}
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900">
        <p className="font-bold mb-2">🎯 Et maintenant ?</p>
        <ul className="space-y-1 text-emerald-800 leading-snug">
          <li>
            <strong>Imprimer le rapport</strong> ci-dessus → PDF complet à donner au client
          </li>
          <li>
            <strong>Comparer post-travaux</strong> : revenez à l'étape 3 et changez l'isolation
            pour voir la nouvelle étiquette
          </li>
          <li>
            <strong>Audit officiel signé</strong> : bouton ci-dessous (commission 5 % HT si
            chantier signé)
          </li>
        </ul>
      </div>

      {/* Modal rapport imprimable */}
      {showReport ? (
        <StudyReport
          form={form}
          preview={preview}
          scenarios={scenarios}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </div>
  )
}

function dpeBg(letter: string): string {
  const colors: Record<string, string> = {
    A: '#00a651',
    B: '#50b748',
    C: '#aed136',
    D: '#fbe600',
    E: '#f7a823',
    F: '#e87a30',
    G: '#d11919',
  }
  return colors[letter] ?? '#888'
}

// =============================================================================
// HELPERS UI
// =============================================================================

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function CardChoice({
  active,
  onClick,
  icon,
  label,
  desc,
  small,
  danger,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
  desc?: string
  small?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-xl border-2 text-center transition ${
        active
          ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-100'
          : danger
          ? 'border-red-100 bg-white hover:border-red-300'
          : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      {icon ? (
        <div
          className={`mx-auto mb-1 ${
            active ? 'text-emerald-600' : danger ? 'text-red-500' : 'text-slate-500'
          }`}
        >
          {icon}
        </div>
      ) : null}
      <p
        className={`font-bold text-slate-800 ${small ? 'text-xs' : 'text-sm'}`}
      >
        {label}
      </p>
      {desc ? (
        <p
          className={`text-slate-500 ${small ? 'text-[10px]' : 'text-[11px]'} mt-0.5`}
        >
          {desc}
        </p>
      ) : null}
    </button>
  )
}

function NumField({
  label,
  value,
  onChange,
  unit,
  step,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit: string
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          step={step ?? 1}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm font-semibold tabular-nums"
        />
        {unit ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5 capitalize">{value}</p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 text-slate-600">
      <span>{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
