/**
 * SimulateurComplet — Wizard particulier 5 étapes (vocabulaire simplifié + tooltips).
 *
 * Audit-ux-2026-05-12 #7. Reprend le moteur 3CL-DPE (src/lib/dpe-engine) déjà
 * livré et validé ADEME. Adaptation pour les particuliers :
 *   - Wizard multi-step (1 page = 1 section) plutôt que one-page.
 *   - Vocabulaire grand public (« mètres carrés » vs « surface habitable SH »).
 *   - Tooltips d'aide sur les champs techniques.
 *   - Sauvegarde localStorage anonyme (résilience refresh).
 *   - Lead-magnet : login obligatoire pour voir étiquette DPE + scénarios + aides.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Home as HomeIcon,
  Layers,
  Square,
  Flame,
  Lock,
  HelpCircle,
} from 'lucide-react'
import { computeDpe } from '@/lib/dpe-engine'
import type {
  AuditInputs,
  PeriodeConstruction,
  TypeBatiment,
  Ventilation,
  GenerateurChauffage,
  Inertie,
  DpeResult,
} from '@/lib/dpe-engine/types'
import { useAuth } from '@/hooks/useAuth'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'

const STORAGE_KEY = 'brh-simulateur-complet-v1'

type FormState = {
  codeInsee: string
  communeLabel: string // pour réafficher l'adresse dans le résumé
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

const DEFAULT_FORM: FormState = {
  codeInsee: '',
  communeLabel: '',
  altitude: 50,
  surfaceHabitable: 100,
  hauteurSousPlafond: 2.5,
  nombreNiveaux: 1,
  periodeConstruction: '1948-1974',
  typeBatiment: 'maison',
  inertie: 'moyenne',
  surfaceMurs: 100,
  isolationMurs: 'sans',
  isolationToiture: 'sans',
  isolationPlancherBas: 'sans',
  surfaceFenetresSud: 8,
  surfaceFenetresNord: 6,
  vitrage: 'double',
  chauffageGenerateur: 'chaudiere_gaz_standard',
  chauffageEmetteur: 'radiateurs_eau',
  chauffageAnnee: 2005,
  chauffageRegulation: true,
  ecsGenerateur: 'electrique',
  ecsStockageL: 200,
  ventilation: 'naturelle',
}

const ISOLATION_PARAMS: Record<
  string,
  { type: 'iti' | 'ite' | 'sans'; epaisseur: number; lambda: number } | { type: 'sans' }
> = {
  sans: { type: 'sans' },
  iti_60: { type: 'iti', epaisseur: 60, lambda: 0.04 },
  iti_100: { type: 'iti', epaisseur: 100, lambda: 0.04 },
  iti_120: { type: 'iti', epaisseur: 120, lambda: 0.04 },
  iti_200: { type: 'iti', epaisseur: 200, lambda: 0.04 },
  iti_300: { type: 'iti', epaisseur: 300, lambda: 0.04 },
  ite_140: { type: 'ite', epaisseur: 140, lambda: 0.038 },
  ite_200: { type: 'ite', epaisseur: 200, lambda: 0.038 },
}

const PERIODES: { value: PeriodeConstruction; label: string }[] = [
  { value: 'avant_1948', label: 'Avant 1948' },
  { value: '1948-1974', label: '1948–1974' },
  { value: '1975-1977', label: '1975–1977' },
  { value: '1978-1982', label: '1978–1982' },
  { value: '1983-1988', label: '1983–1988' },
  { value: '1989-2000', label: '1989–2000' },
  { value: '2001-2005', label: '2001–2005' },
  { value: '2006-2012', label: '2006–2012' },
  { value: 'apres_2013', label: 'Après 2013 (RT2012+)' },
]

const STEPS = [
  { id: 'localisation', label: 'Localisation', Icon: MapPin },
  { id: 'logement', label: 'Logement', Icon: HomeIcon },
  { id: 'isolation', label: 'Isolation', Icon: Layers },
  { id: 'ouvertures', label: 'Fenêtres', Icon: Square },
  { id: 'chauffage', label: 'Chauffage', Icon: Flame },
] as const

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

function loadFromStorage(): FormState {
  if (typeof window === 'undefined') return DEFAULT_FORM
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FORM
    const parsed = JSON.parse(raw) as Partial<FormState>
    return { ...DEFAULT_FORM, ...parsed }
  } catch {
    return DEFAULT_FORM
  }
}

function saveToStorage(state: FormState, step: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _step: step }))
  } catch {
    /* quota exceeded — silent */
  }
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="relative inline-flex items-center gap-1 group">
      {children}
      <HelpCircle size={11} className="text-slate-400 cursor-help" aria-label={text} />
      <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block px-2 py-1.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg max-w-xs z-10 leading-tight">
        {text}
      </span>
    </span>
  )
}

export default function SimulateurComplet() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [hydrated, setHydrated] = useState(false)
  const [result, setResult] = useState<DpeResult | null>(null)
  const [computing, setComputing] = useState(false)
  const [computeError, setComputeError] = useState<string | null>(null)

  // Hydrate from localStorage at mount
  useEffect(() => {
    const t = setTimeout(() => {
      setForm(loadFromStorage())
      setHydrated(true)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  // Auto-save on each form change (debounced via React batching)
  useEffect(() => {
    if (!hydrated) return
    saveToStorage(form, step)
  }, [form, step, hydrated])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1)
    else handleSubmit()
  }
  function prev() {
    if (step > 0) setStep(step - 1)
  }

  function handleSubmit() {
    setComputing(true)
    setComputeError(null)
    try {
      const inputs = formToInputs(form)
      const res = computeDpe(inputs)
      setResult(res)
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : 'Calcul impossible')
    } finally {
      setComputing(false)
    }
  }

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])
  const StepIcon = STEPS[step]?.Icon

  // === Écran résultat ===
  if (result) {
    // Lead-magnet : si pas loggé, afficher écran « créez un compte pour voir »
    if (!authLoading && !isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 lg:p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Lock size={28} className="text-amber-700" />
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
              Votre audit est prêt&nbsp;!
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto mb-6">
              Pour voir votre <strong className="text-slate-900">étiquette DPE officielle</strong>,
              les <strong className="text-slate-900">5 scénarios de travaux chiffrés</strong> et
              les <strong className="text-slate-900">aides détaillées</strong>, créez votre
              compte gratuit. Vous pourrez aussi sauvegarder votre audit et le partager avec un artisan.
            </p>
            <div className="inline-flex flex-col sm:flex-row gap-2">
              <Link
                to="/inscription/particulier?ref=simulateur-complet"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
              >
                Créer mon compte gratuit <ArrowRight size={14} />
              </Link>
              <Link
                to="/connexion"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-bold text-slate-700 transition"
              >
                J'ai déjà un compte
              </Link>
            </div>
            <p className="mt-6 text-[11px] text-slate-500">
              Vos réponses sont conservées localement — vous retrouverez votre audit après inscription.
            </p>
          </div>
        </div>
      )
    }

    // Utilisateur loggé : afficher le résultat complet
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft size={14} /> Modifier mes réponses
          </button>

          <header className="mb-6 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-3">
              <CheckCircle2 size={11} /> Audit terminé
            </span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900">
              Votre étiquette DPE
            </h1>
          </header>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-sm space-y-6">
            <div className="flex flex-col items-center gap-4">
              <DpeLabelGauge etiquette={result.etiquetteDpe ?? 'D'} value={result.cepKwhEpM2An ?? 0} unit="kWh/m²/an" />
              <p className="text-xs text-slate-500 text-center">
                Consommation : <strong className="text-slate-900 tabular-nums">{Math.round(result.cepKwhEpM2An ?? 0)} kWh/m²/an</strong>
                {result.gesKgCo2M2An !== undefined && (
                  <> · GES : <strong className="text-slate-900 tabular-nums">{Math.round(result.gesKgCo2M2An)} kg CO₂/m²/an</strong></>
                )}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-2 text-sm text-slate-700">
              <p>
                Cet audit est calculé selon la méthode officielle <strong>3CL-DPE 2021</strong> de l'ADEME.
                Pour obtenir un audit certifié et des aides MaPrimeRénov' Ampleur, contactez un pro RGE BRH.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/particulier"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
              >
                Voir mon tableau de bord
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
                  navigate('/simulateur')
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-bold text-slate-700 transition"
              >
                Nouvelle simulation
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (computing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Calcul de votre étiquette DPE…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Link
          to="/simulateur"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={14} /> Quitter le simulateur
        </Link>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-bold text-slate-700">
              Étape {step + 1} / {STEPS.length} — {STEPS[step].label}
            </span>
            <span className="text-slate-500 tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step header */}
        <header className="mb-6 flex items-center gap-3">
          {StepIcon && (
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <StepIcon size={18} className="text-white" />
            </div>
          )}
          <h1 className="font-display text-xl lg:text-2xl font-bold text-slate-900">
            {STEPS[step].label}
          </h1>
        </header>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 space-y-5">
          {step === 0 && (
            <>
              <Field label="Code INSEE de votre commune" tooltip="5 chiffres officiels (ex : 29019 pour Brest). Vous le trouvez sur https://www.insee.fr/fr/recherche">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={form.codeInsee}
                  onChange={(e) => update('codeInsee', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="29019"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </Field>
              <Field label="Altitude approximative (mètres)" tooltip="Compte pour le climat. 0 pour bord de mer, 50-100 en Bretagne intérieure, 500+ en montagne.">
                <input
                  type="number"
                  min={0}
                  max={3000}
                  value={form.altitude}
                  onChange={(e) => update('altitude', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Type de logement">
                <div className="grid grid-cols-2 gap-2">
                  {(['maison', 'appartement'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update('typeBatiment', t)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                        form.typeBatiment === t
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {t === 'maison' ? 'Maison individuelle' : 'Appartement'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Surface habitable (m²)" tooltip="Surface au sol des pièces de vie (sans les caves, garages, combles non aménagés).">
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={form.surfaceHabitable}
                  onChange={(e) => update('surfaceHabitable', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hauteur sous plafond (m)">
                  <input
                    type="number"
                    step="0.1"
                    min={2}
                    max={5}
                    value={form.hauteurSousPlafond}
                    onChange={(e) => update('hauteurSousPlafond', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </Field>
                <Field label="Nombre de niveaux">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={form.nombreNiveaux}
                    onChange={(e) => update('nombreNiveaux', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </Field>
              </div>
              <Field label="Année de construction">
                <select
                  value={form.periodeConstruction}
                  onChange={(e) => update('periodeConstruction', e.target.value as PeriodeConstruction)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  {PERIODES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Inertie thermique" tooltip="Légère = construction bois, métallique. Moyenne = brique, parpaing standard. Lourde = pierre épaisse, béton plein.">
                <select
                  value={String(form.inertie)}
                  onChange={(e) => update('inertie', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="legere">Légère (ossature bois, métal)</option>
                  <option value="moyenne">Moyenne (brique, parpaing)</option>
                  <option value="lourde">Lourde (pierre, béton plein)</option>
                </select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Surface totale des murs extérieurs (m²)" tooltip="Estimation rapide : périmètre × hauteur, sans les fenêtres. Pour un 100 m² rectangulaire R+0 : ~100 m².">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={form.surfaceMurs}
                  onChange={(e) => update('surfaceMurs', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </Field>
              <Field label="Isolation des murs">
                <select
                  value={form.isolationMurs}
                  onChange={(e) => update('isolationMurs', e.target.value as FormState['isolationMurs'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="sans">Aucune isolation</option>
                  <option value="iti_60">Isolation intérieure 60 mm</option>
                  <option value="iti_120">Isolation intérieure 120 mm</option>
                  <option value="iti_200">Isolation intérieure 200 mm</option>
                  <option value="ite_140">Isolation extérieure 140 mm</option>
                  <option value="ite_200">Isolation extérieure 200 mm</option>
                </select>
              </Field>
              <Field label="Isolation de la toiture / combles">
                <select
                  value={form.isolationToiture}
                  onChange={(e) => update('isolationToiture', e.target.value as FormState['isolationToiture'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="sans">Aucune isolation</option>
                  <option value="iti_100">100 mm</option>
                  <option value="iti_200">200 mm</option>
                  <option value="iti_300">300 mm (norme actuelle)</option>
                </select>
              </Field>
              <Field label="Isolation du plancher bas" tooltip="Plancher bas = sol en contact avec un vide sanitaire, une cave ou un garage non chauffé.">
                <select
                  value={form.isolationPlancherBas}
                  onChange={(e) => update('isolationPlancherBas', e.target.value as FormState['isolationPlancherBas'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="sans">Aucune isolation</option>
                  <option value="iti_60">60 mm</option>
                  <option value="iti_120">120 mm</option>
                </select>
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Surface fenêtres au sud (m²)" tooltip="Comptez aussi les portes-fenêtres et baies vitrées. Apport solaire principal.">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.surfaceFenetresSud}
                  onChange={(e) => update('surfaceFenetresSud', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </Field>
              <Field label="Surface fenêtres au nord/est/ouest (m²)" tooltip="Toutes les autres fenêtres cumulées (hors sud).">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.surfaceFenetresNord}
                  onChange={(e) => update('surfaceFenetresNord', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </Field>
              <Field label="Type de vitrage">
                <div className="grid grid-cols-3 gap-2">
                  {(['simple', 'double', 'triple'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => update('vitrage', v)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold transition capitalize ${
                        form.vitrage === v
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <Field label="Système de chauffage principal">
                <select
                  value={form.chauffageGenerateur}
                  onChange={(e) => update('chauffageGenerateur', e.target.value as GenerateurChauffage)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="chaudiere_gaz_standard">Chaudière gaz standard</option>
                  <option value="chaudiere_gaz_condensation">Chaudière gaz à condensation</option>
                  <option value="chaudiere_fioul">Chaudière fioul</option>
                  <option value="chaudiere_bois">Chaudière bois / pellets</option>
                  <option value="poele_bois">Poêle bois</option>
                  <option value="pac_air_air">PAC air/air (clim réversible)</option>
                  <option value="pac_air_eau">PAC air/eau</option>
                  <option value="pac_geothermique">PAC géothermique</option>
                  <option value="effet_joule">Radiateurs électriques (convecteurs)</option>
                  <option value="reseau_chaleur">Réseau de chaleur urbain</option>
                </select>
              </Field>
              <Field label="Année d'installation (approx)">
                <input
                  type="number"
                  min={1950}
                  max={2026}
                  value={form.chauffageAnnee}
                  onChange={(e) => update('chauffageAnnee', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </Field>
              <Field label="Eau chaude sanitaire">
                <select
                  value={form.ecsGenerateur}
                  onChange={(e) => update('ecsGenerateur', e.target.value as FormState['ecsGenerateur'])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="electrique">Ballon électrique</option>
                  <option value="cet">Chauffe-eau thermodynamique</option>
                  <option value="gaz">Gaz</option>
                  <option value="fioul">Fioul</option>
                  <option value="bois">Bois</option>
                  <option value="solaire_thermique">Solaire thermique</option>
                  <option value="reseau_chaleur">Réseau de chaleur</option>
                </select>
              </Field>
              <Field label="Ventilation" tooltip="VMC = mécanique. Naturelle = grilles d'aération sans moteur.">
                <select
                  value={form.ventilation}
                  onChange={(e) => update('ventilation', e.target.value as Ventilation)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="naturelle">Ventilation naturelle</option>
                  <option value="vmc_simple">VMC simple flux</option>
                  <option value="vmc_hygro">VMC hygro B</option>
                  <option value="vmc_double_flux">VMC double flux</option>
                </select>
              </Field>
            </>
          )}
        </div>

        {computeError && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {computeError}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ArrowLeft size={14} /> Précédent
          </button>
          <button
            type="button"
            onClick={next}
            disabled={step === 0 && (!form.codeInsee || form.codeInsee.length !== 5)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === STEPS.length - 1 ? (
              <>
                <CheckCircle2 size={14} /> Calculer mon étiquette DPE
              </>
            ) : (
              <>
                Continuer <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        <p className="text-center mt-6 text-[11px] text-slate-500">
          Vos réponses sont sauvegardées localement à chaque étape. Vous pouvez revenir plus tard.
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  tooltip,
}: {
  label: string
  children: React.ReactNode
  tooltip?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
      </span>
      {children}
    </label>
  )
}
