/**
 * AuditComplet — Audit énergétique approfondi style CapRénov (`/audit-complet`).
 *
 * 8 étapes profondes avec saisie multi-objets (murs façade par façade,
 * ouvertures fenêtre par fenêtre, équipements détaillés). Réutilise le moteur
 * 3CL-DPE déjà livré (`src/lib/dpe-engine/computeDpe`) — 98 tests Vitest verts,
 * validé ADEME ±1 classe sur 99 DPE réels.
 *
 * Référence knowledge : caprenov-reverse/wiki/08-implementation-brh/ui-pro-wizard.md
 *   1. Géolocalisation (autocomplete adresse → INSEE)
 *   2. Bâtiment (type, surface, volume, période, inertie, mitoyenneté)
 *   3. Murs (façade par façade — multi-cards)
 *   4. Toitures / planchers
 *   5. Ouvertures (fenêtre par fenêtre — multi-cards)
 *   6. Ventilation
 *   7. Équipements (chauffage + ECS + clim + production)
 *   8. Résultat (étiquette DPE + détail + lead-magnet login)
 *
 * Save localStorage scope tenant à chaque change (anti-bug #3).
 * Lead-magnet : login obligatoire pour voir l'étiquette finale + détail.
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
  Plus,
  Trash2,
  Wind,
  Microscope,
  AlertCircle,
} from 'lucide-react'
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete'
import { computeDpe } from '@/lib/dpe-engine'
import {
  fetchDpeForAddress,
  fetchParcelleAt,
  analyzeToitureVision,
  anneeToPeriode,
  bdnbTypeToBatiment,
  visionTypeToToitureForm,
  type DpeLookupResult,
  type ParcelleCadastre,
  type VisionToiture,
} from '@/lib/audit-enrichment'
import type {
  AuditInputs,
  PeriodeConstruction,
  TypeBatiment,
  Ventilation as VentilationType,
  GenerateurChauffage,
  Emetteur,
  Inertie,
  DpeResult,
  ParoiInput,
  OuvertureInput,
} from '@/lib/dpe-engine/types'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import { useAidesLocales } from '@/hooks/queries/aides-locales'
import { auditsApi } from '@/api/audits'

const STORAGE_KEY = 'brh-audit-complet-v1'

// ──────────────────────────────────────────────────────────────────────────────
// TYPES UI (state form — séparé de AuditInputs pour faciliter la saisie)
// ──────────────────────────────────────────────────────────────────────────────

interface MurForm {
  id: string
  label: string // ex « Façade Nord »
  orientation: 'nord' | 'est' | 'sud' | 'ouest'
  materiau: 'parpaing' | 'beton' | 'brique' | 'pierre_avec_remplissage' | 'pierre_sans_remplissage' | 'ossature_bois' | 'ossature_metal' | 'mur_rideau'
  surface: number // m²
  adjacence: 'exterieur' | 'garage' | 'lnc' | 'ets' | 'sous_sol' | 'veranda'
  isolation: 'sans' | 'iti_60' | 'iti_100' | 'iti_120' | 'iti_160' | 'iti_200' | 'ite_100' | 'ite_140' | 'ite_180' | 'ite_220' | 'repartie'
  anneeIsolation?: number
}

interface OuvertureForm {
  id: string
  label: string
  type: 'fenetre' | 'porte_fenetre' | 'baie_vitree' | 'velux' | 'porte'
  orientation: 'nord' | 'est' | 'sud' | 'ouest' | 'horizontal'
  /** Largeur en cm (saisie utilisateur — convertie en m² pour le moteur). */
  largeurCm: number
  /** Hauteur en cm. */
  hauteurCm: number
  /** Nombre de fenêtres identiques (pour regrouper la saisie). */
  quantite: number
  menuiserie: 'pvc' | 'bois' | 'alu' | 'metal'
  vitrage: 'simple' | 'double' | 'triple' | 'survitrage'
  vir: boolean
  volet: 'sans' | 'persienne' | 'volet_battant_bois' | 'volet_ext_isolant'
  pose: 'tunnel' | 'nu_interieur' | 'nu_exterieur'
}

/** Convertit largeur×hauteur×quantité en surface m² total. */
function ouvSurfaceM2(o: OuvertureForm): number {
  return (o.largeurCm * o.hauteurCm * o.quantite) / 10000
}

type FormState = {
  // Step 1 — Géo
  adresse: string
  codeInsee: string
  altitude: number
  // Step 2 — Bâtiment
  typeBatiment: TypeBatiment
  surfaceHabitable: number
  hauteurSousPlafond: number
  nombreNiveaux: number
  periodeConstruction: PeriodeConstruction
  inertie: Inertie | string
  mitoyennete: 'isole' | 'mitoyen_1' | 'mitoyen_2' | 'mitoyen_3plus'
  // Step 3 — Murs (multi)
  murs: MurForm[]
  // Step 4 — Toitures / planchers
  toitureType: 'combles_perdus' | 'combles_amenages' | 'toiture_terrasse'
  toitureIsolation: 'sans' | 'iti_100' | 'iti_200' | 'iti_300' | 'iti_400'
  toitureAnneeIsolation?: number
  plancherBasType: 'vide_sanitaire' | 'terre_plein' | 'sous_sol' | 'lnc'
  plancherBasIsolation: 'sans' | 'iti_60' | 'iti_100' | 'iti_140'
  plancherBasAnneeIsolation?: number
  // Step 5 — Ouvertures (multi)
  ouvertures: OuvertureForm[]
  // Step 6 — Ventilation
  ventilation: VentilationType
  qualiteVentilation: 'mediocre' | 'standard' | 'bonne'
  // Step 7 — Équipements
  chauffageGenerateur: GenerateurChauffage
  chauffageEmetteur: Emetteur
  chauffageAnnee: number
  chauffageRegulation: boolean
  ecsGenerateur: 'electrique' | 'gaz' | 'fioul' | 'bois' | 'cet' | 'reseau_chaleur' | 'solaire_thermique'
  ecsStockageL: number
  ecsAnnee: number
  hasPv: boolean
  pvPuissance: number // kWc
  pvOrientation: 'nord' | 'est' | 'sud' | 'ouest' | 'horizontal'
  pvInclinaison: number
  hasClim: boolean
  climSeer: number
  // Composition foyer (pour aides)
  nbPersonnes: number
}

const DEFAULT_FORM: FormState = {
  adresse: '',
  codeInsee: '',
  altitude: 50,
  typeBatiment: 'maison',
  surfaceHabitable: 100,
  hauteurSousPlafond: 2.5,
  nombreNiveaux: 1,
  periodeConstruction: '1948-1974',
  inertie: 'moyenne',
  mitoyennete: 'isole',
  murs: [
    { id: 'mur-1', label: 'Façade Sud', orientation: 'sud', materiau: 'parpaing', surface: 30, adjacence: 'exterieur', isolation: 'sans' },
    { id: 'mur-2', label: 'Façade Nord', orientation: 'nord', materiau: 'parpaing', surface: 30, adjacence: 'exterieur', isolation: 'sans' },
  ],
  toitureType: 'combles_perdus',
  toitureIsolation: 'sans',
  plancherBasType: 'vide_sanitaire',
  plancherBasIsolation: 'sans',
  ouvertures: [
    { id: 'ouv-1', label: 'Fenêtres salon', type: 'fenetre', orientation: 'sud', largeurCm: 120, hauteurCm: 130, quantite: 2, menuiserie: 'pvc', vitrage: 'double', vir: false, volet: 'volet_battant_bois', pose: 'tunnel' },
    { id: 'ouv-2', label: 'Fenêtres chambres', type: 'fenetre', orientation: 'nord', largeurCm: 100, hauteurCm: 120, quantite: 2, menuiserie: 'pvc', vitrage: 'double', vir: false, volet: 'volet_battant_bois', pose: 'tunnel' },
    { id: 'ouv-3', label: 'Porte d\'entrée', type: 'porte', orientation: 'nord', largeurCm: 90, hauteurCm: 215, quantite: 1, menuiserie: 'bois', vitrage: 'simple', vir: false, volet: 'sans', pose: 'tunnel' },
  ],
  ventilation: 'naturelle',
  qualiteVentilation: 'standard',
  chauffageGenerateur: 'chaudiere_gaz_standard',
  chauffageEmetteur: 'radiateur_eau',
  chauffageAnnee: 2005,
  chauffageRegulation: true,
  ecsGenerateur: 'electrique',
  ecsStockageL: 200,
  ecsAnnee: 2010,
  hasPv: false,
  pvPuissance: 3,
  pvOrientation: 'sud',
  pvInclinaison: 30,
  hasClim: false,
  climSeer: 4.5,
  nbPersonnes: 2,
}

// ──────────────────────────────────────────────────────────────────────────────
// REFERENCE LOOKUPS (épaisseurs/lambda pour isolation → R équivalent)
// ──────────────────────────────────────────────────────────────────────────────

const ISOLATION_PARAMS: Record<string, { type: 'iti' | 'ite' | 'sans' | 'repartie'; epaisseur: number; lambda: number } | { type: 'sans' }> = {
  sans: { type: 'sans' },
  iti_60: { type: 'iti', epaisseur: 60, lambda: 0.04 },
  iti_100: { type: 'iti', epaisseur: 100, lambda: 0.04 },
  iti_120: { type: 'iti', epaisseur: 120, lambda: 0.04 },
  iti_140: { type: 'iti', epaisseur: 140, lambda: 0.04 },
  iti_160: { type: 'iti', epaisseur: 160, lambda: 0.04 },
  iti_200: { type: 'iti', epaisseur: 200, lambda: 0.04 },
  iti_300: { type: 'iti', epaisseur: 300, lambda: 0.04 },
  iti_400: { type: 'iti', epaisseur: 400, lambda: 0.04 },
  ite_100: { type: 'ite', epaisseur: 100, lambda: 0.038 },
  ite_140: { type: 'ite', epaisseur: 140, lambda: 0.038 },
  ite_180: { type: 'ite', epaisseur: 180, lambda: 0.038 },
  ite_220: { type: 'ite', epaisseur: 220, lambda: 0.038 },
  repartie: { type: 'repartie', epaisseur: 0, lambda: 0.1 },
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
  { id: 'geo', label: 'Adresse', Icon: MapPin },
  { id: 'batiment', label: 'Bâtiment', Icon: HomeIcon },
  { id: 'murs', label: 'Murs', Icon: Square },
  { id: 'toitures', label: 'Toiture & sols', Icon: Layers },
  { id: 'ouvertures', label: 'Fenêtres', Icon: Square },
  { id: 'ventilation', label: 'Ventilation', Icon: Wind },
  { id: 'equipements', label: 'Équipements', Icon: Flame },
  { id: 'resultat', label: 'Résultat', Icon: CheckCircle2 },
] as const

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

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

function saveToStorage(state: FormState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota — silent */
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function formToInputs(f: FormState): AuditInputs {
  const isolationToParam = (key: string): ParoiInput['isolation'] => {
    const def = ISOLATION_PARAMS[key]
    if (!def || def.type === 'sans') return { type: 'sans' }
    if (def.type === 'repartie') return { type: 'sans' }
    return { type: def.type as 'iti' | 'ite', epaisseur: def.epaisseur, lambda: def.lambda }
  }

  // Mur form → ParoiInput
  const paroisMurs: ParoiInput[] = f.murs.map((m) => ({
    type: 'mur',
    surface: m.surface,
    orientation: m.orientation,
    adjacence: m.adjacence,
    materiau: m.materiau,
    isolation: { ...(isolationToParam(m.isolation) ?? { type: 'sans' }), annee: m.anneeIsolation },
  }))

  const adjPb = f.plancherBasType === 'vide_sanitaire' ? 'vide_sanitaire'
    : f.plancherBasType === 'terre_plein' ? 'terre_plein'
    : f.plancherBasType === 'sous_sol' ? 'sous_sol'
    : 'lnc'

  const adjPh = f.toitureType === 'combles_perdus' ? 'combles_perdus'
    : f.toitureType === 'combles_amenages' ? 'combles_amenages'
    : 'exterieur'

  const parois: ParoiInput[] = [
    ...paroisMurs,
    {
      type: 'plancher_bas',
      surface: f.surfaceHabitable,
      adjacence: adjPb,
      isolation: { ...(isolationToParam(f.plancherBasIsolation) ?? { type: 'sans' }), annee: f.plancherBasAnneeIsolation },
    },
    {
      type: 'plancher_haut',
      surface: f.surfaceHabitable,
      adjacence: adjPh,
      isolation: { ...(isolationToParam(f.toitureIsolation) ?? { type: 'sans' }), annee: f.toitureAnneeIsolation },
    },
  ]

  const ouvertures: OuvertureInput[] = f.ouvertures.map((o) => ({
    type: o.type,
    surface: ouvSurfaceM2(o),
    orientation: o.orientation,
    menuiserie: o.menuiserie,
    vitrage: o.vitrage,
    vir: o.vir,
    volet: o.volet,
    pose: o.pose,
  }))

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
      parois,
      ouvertures,
    },
    equipements: {
      chauffage: {
        generateur: f.chauffageGenerateur,
        emetteur: f.chauffageEmetteur,
        anneeInstallation: f.chauffageAnnee,
        regulation: f.chauffageRegulation,
      },
      ecs: { generateur: f.ecsGenerateur, stockageL: f.ecsStockageL, anneeInstallation: f.ecsAnnee },
      ventilation: f.ventilation,
      ...(f.hasClim ? { climatisation: { seer: f.climSeer, surfaceClim: f.surfaceHabitable * 0.5 } } : {}),
      ...(f.hasPv ? { photovoltaique: { puissance: f.pvPuissance, orientation: f.pvOrientation, inclinaison: f.pvInclinaison } } : {}),
    },
    comportement: 'conventionnel',
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS UI (mini-composants)
// ──────────────────────────────────────────────────────────────────────────────

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

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
        {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
      </span>
      {children}
    </label>
  )
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 ${extra}`
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

export default function AuditComplet() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [hydrated, setHydrated] = useState(false)
  const [result, setResult] = useState<DpeResult | null>(null)
  const [computing, setComputing] = useState(false)
  const [computeError, setComputeError] = useState<string | null>(null)

  // ─── Enrichissement automatique post-sélection adresse ───────────────────
  const [enriching, setEnriching] = useState(false)
  const [dpeData, setDpeData] = useState<DpeLookupResult | null>(null)
  const [parcelle, setParcelle] = useState<ParcelleCadastre | null>(null)
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null)

  // Vision IA toiture (lancée à l'étape 4 sur clic explicite)
  const [analyzingToiture, setAnalyzingToiture] = useState(false)
  const [visionToiture, setVisionToiture] = useState<VisionToiture | null>(null)
  const [visionError, setVisionError] = useState<string | null>(null)

  // Sauvegarde de l'audit dans le compte particulier (lead-magnet post-login)
  const [saving, setSaving] = useState(false)
  const [savedAuditId, setSavedAuditId] = useState<string | null>(null)

  async function handleSaveAudit() {
    if (!isAuthenticated || !result) return
    setSaving(true)
    try {
      const inputs = formToInputs(form)
      const audit = await auditsApi.createForUser(inputs, {
        cep: result.cepKwhEpM2An,
        ges: result.gesKgCo2M2An,
        etiquetteDpe: result.etiquetteDpe,
        parPoste: result.parPoste,
        deperditions: result.deperditions,
      } as unknown as Record<string, unknown>)
      setSavedAuditId(audit.id)
      toast.success('Audit sauvegardé', {
        description: 'Vous pouvez le retrouver dans votre tableau de bord.',
      })
    } catch (err) {
      toast.error('Impossible de sauvegarder', {
        description: err instanceof Error ? err.message : 'Erreur inattendue',
      })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setForm(loadFromStorage())
      setHydrated(true)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveToStorage(form)
  }, [form, hydrated])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateMur(id: string, patch: Partial<MurForm>) {
    setForm((prev) => ({ ...prev, murs: prev.murs.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
  }
  function addMur() {
    const orientations: MurForm['orientation'][] = ['nord', 'est', 'sud', 'ouest']
    const used = new Set(form.murs.map((m) => m.orientation))
    const next = orientations.find((o) => !used.has(o)) ?? 'sud'
    setForm((prev) => ({
      ...prev,
      murs: [
        ...prev.murs,
        { id: newId('mur'), label: `Façade ${next.charAt(0).toUpperCase() + next.slice(1)}`, orientation: next, materiau: 'parpaing', surface: 20, adjacence: 'exterieur', isolation: 'sans' },
      ],
    }))
  }
  function removeMur(id: string) {
    setForm((prev) => ({ ...prev, murs: prev.murs.filter((m) => m.id !== id) }))
  }

  function updateOuv(id: string, patch: Partial<OuvertureForm>) {
    setForm((prev) => ({ ...prev, ouvertures: prev.ouvertures.map((o) => (o.id === id ? { ...o, ...patch } : o)) }))
  }
  function addOuv() {
    setForm((prev) => ({
      ...prev,
      ouvertures: [
        ...prev.ouvertures,
        { id: newId('ouv'), label: `Ouverture ${prev.ouvertures.length + 1}`, type: 'fenetre', orientation: 'sud', largeurCm: 100, hauteurCm: 120, quantite: 1, menuiserie: 'pvc', vitrage: 'double', vir: false, volet: 'sans', pose: 'tunnel' },
      ],
    }))
  }
  function removeOuv(id: string) {
    setForm((prev) => ({ ...prev, ouvertures: prev.ouvertures.filter((o) => o.id !== id) }))
  }

  function canGoNext(): boolean {
    if (step === 0) return form.codeInsee.length === 5
    if (step === 2) return form.murs.length > 0
    if (step === 4) return form.ouvertures.length > 0
    return true
  }

  function next() {
    if (!canGoNext()) return
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
      setStep(STEPS.length - 1)
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : 'Calcul impossible')
    } finally {
      setComputing(false)
    }
  }

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step])
  const StepIcon = STEPS[step]?.Icon

  if (computing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Calcul de votre étiquette DPE…</p>
          <p className="text-xs text-slate-500 mt-1">Moteur 3CL-DPE 2021 — peut prendre 1-2 secondes</p>
        </div>
      </div>
    )
  }

  // ── ÉTAPE 8 : RÉSULTAT (avec gating login) ───────────────────────────────
  if (result && step === STEPS.length - 1) {
    if (!authLoading && !isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 lg:p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Lock size={28} className="text-amber-700" />
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
              Votre audit complet est prêt !
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto mb-6">
              Pour voir votre <strong className="text-slate-900">étiquette DPE officielle</strong>,
              le <strong className="text-slate-900">détail des déperditions</strong> et les
              <strong className="text-slate-900"> scénarios de travaux chiffrés</strong>, créez votre
              compte gratuit. Vos 8 étapes de saisie restent sauvegardées localement.
            </p>
            <div className="inline-flex flex-col sm:flex-row gap-2">
              <Link
                to="/inscription/particulier?ref=audit-complet"
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
              Réponses sauvegardées localement (clé <code className="bg-slate-100 px-1 rounded">{STORAGE_KEY}</code>) —
              vous retrouverez votre audit après inscription.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => { setResult(null); setStep(STEPS.length - 2) }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft size={14} /> Modifier mes réponses
          </button>

          <header className="mb-6 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-widest mb-3">
              <CheckCircle2 size={11} /> Audit complet 3CL-DPE 2021
            </span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900">
              Votre étiquette énergétique
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
                Cet audit est calculé selon la méthode officielle <strong>3CL-DPE 2021</strong> de l'ADEME,
                à partir de vos {form.murs.length} façade{form.murs.length > 1 ? 's' : ''} et {form.ouvertures.length} ouverture{form.ouvertures.length > 1 ? 's' : ''} renseignées.
                Pour un audit certifié ouvrant droit à MaPrimeRénov' Ampleur, contactez un pro RGE BRH.
              </p>
            </div>
          </div>

          {/* Détail par poste de consommation */}
          {result.parPoste && (
            <ResultPostesPanel parPoste={result.parPoste as unknown as ConsoParPoste} consoTotale={result.consoEfTotaleKwhAn ?? 0} />
          )}

          {/* Déperditions */}
          {result.deperditions && (
            <ResultDeperditionsPanel deperditions={result.deperditions as unknown as DeperditionsResult} />
          )}

          {/* Aides locales Bretagne (lecture dynamique depuis brh_aides_locales) */}
          <ResultAidesLocalesPanel codeInsee={form.codeInsee} />

          {/* CTAs */}
          <div className="flex flex-col gap-2">
            {/* Sauvegarder dans le compte (visible si pas encore sauvegardé) */}
            {!savedAuditId && (
              <button
                type="button"
                onClick={() => void handleSaveAudit()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-60"
              >
                {saving ? (<><Loader2 size={14} className="animate-spin" /> Sauvegarde…</>) : (<><CheckCircle2 size={14} /> Sauvegarder cet audit dans mon compte</>)}
              </button>
            )}
            {savedAuditId && (
              <Link
                to={`/audit-energetique/${savedAuditId}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition"
              >
                <CheckCircle2 size={14} /> Voir mon audit détaillé →
              </Link>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/particulier"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition"
              >
                Mon tableau de bord
              </Link>
              <Link
                to="/contact"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition"
              >
                Discuter avec un pro RGE
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
                  setForm(DEFAULT_FORM)
                  setResult(null)
                  setStep(0)
                  setSavedAuditId(null)
                  navigate('/diagnostic')
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition"
              >
                Nouvel audit
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── WIZARD STEPS ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <Link
          to="/diagnostic"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={14} /> Quitter l'audit complet
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
            <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step header */}
        <header className="mb-6 flex items-center gap-3">
          {StepIcon && (
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
              <StepIcon size={18} className="text-white" />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-slate-900">
              {STEPS[step].label}
            </h1>
            <p className="text-xs text-slate-500">
              {step === 0 && 'Adresse du logement pour récupérer la zone climatique'}
              {step === 1 && 'Caractéristiques générales du bâti'}
              {step === 2 && 'Saisissez vos façades, une par une'}
              {step === 3 && 'Toiture / combles + plancher bas'}
              {step === 4 && 'Saisissez vos fenêtres, baies vitrées, portes'}
              {step === 5 && 'Système de ventilation'}
              {step === 6 && 'Chauffage, eau chaude, production solaire'}
            </p>
          </div>
        </header>

        {/* ── STEP 1 : GÉO ────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 space-y-5">
            <Field label="Adresse complète" tooltip="Tapez le début, sélectionnez dans la liste. On essaie ensuite de récupérer automatiquement la fiche DPE existante et la parcelle cadastrale pour vous éviter de tout ressaisir.">
              <div className="w-full">
                <AddressAutocomplete
                  value={form.adresse}
                  onChange={(v) => update('adresse', v)}
                  onSelect={async (sel) => {
                    const fullAddress = `${sel.address}, ${sel.postalCode} ${sel.city}`
                    setForm((prev) => ({
                      ...prev,
                      adresse: fullAddress,
                      codeInsee: sel.citycode,
                    }))
                    // Reset enrichissement précédent
                    setDpeData(null)
                    setParcelle(null)
                    setVisionToiture(null)
                    setEnrichmentError(null)
                    setVisionError(null)

                    if (sel.lat == null || sel.lng == null) return
                    setEnriching(true)
                    try {
                      // 2 appels parallèles — fail-soft individuel
                      const [dpe, parc] = await Promise.all([
                        fetchDpeForAddress({ query: fullAddress, lat: sel.lat, lng: sel.lng, postalCode: sel.postalCode }),
                        fetchParcelleAt(sel.lat, sel.lng),
                      ])
                      setDpeData(dpe)
                      setParcelle(parc)
                      // Pré-remplit le formulaire avec ce que BDNB renvoie
                      if (dpe?.found && dpe.logement) {
                        setForm((prev) => {
                          const patch: Partial<FormState> = {}
                          if (dpe.logement?.surface_m2 && dpe.logement.surface_m2 > 10) {
                            patch.surfaceHabitable = Math.round(dpe.logement.surface_m2)
                          }
                          const periode = anneeToPeriode(dpe.logement?.annee_construction)
                          if (periode) patch.periodeConstruction = periode
                          const tb = bdnbTypeToBatiment(dpe.logement?.type)
                          if (tb) patch.typeBatiment = tb
                          return { ...prev, ...patch }
                        })
                      }
                    } catch (err) {
                      setEnrichmentError(err instanceof Error ? err.message : 'Erreur enrichissement')
                    } finally {
                      setEnriching(false)
                    }
                  }}
                  placeholder="Ex : 5 rue de Siam, 29200 Brest"
                />
              </div>
              {form.adresse && (
                <p className="mt-2 text-xs text-slate-700 break-words leading-snug">
                  <span className="font-semibold">Adresse saisie :</span> {form.adresse}
                </p>
              )}
              {form.codeInsee && (
                <p className="mt-1 text-[11px] text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 size={11} /> Commune reconnue · code INSEE {form.codeInsee}
                </p>
              )}
            </Field>

            {/* Feedback enrichissement automatique */}
            {enriching && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Recherche de la fiche DPE et de la parcelle cadastrale…
              </div>
            )}
            {!enriching && dpeData && dpeData.found && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-1.5">
                <p className="text-sm font-bold text-emerald-900 inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Fiche DPE BDNB trouvée — pré-remplissage automatique
                </p>
                <ul className="text-xs text-emerald-800 space-y-0.5">
                  {dpeData.logement?.surface_m2 && (
                    <li>• Surface habitable : <strong>{Math.round(dpeData.logement.surface_m2)} m²</strong></li>
                  )}
                  {dpeData.logement?.annee_construction && (
                    <li>• Année de construction : <strong>{dpeData.logement.annee_construction}</strong></li>
                  )}
                  {dpeData.logement?.type && (
                    <li>• Type de bâtiment : <strong className="capitalize">{dpeData.logement.type}</strong></li>
                  )}
                  {dpeData.dpe?.actuel && (
                    <li>
                      • Étiquette DPE actuelle : <strong>{dpeData.dpe.actuel}</strong>
                      {dpeData.dpe.conso_ep_actuelle && <> ({Math.round(dpeData.dpe.conso_ep_actuelle)} kWh/m²/an)</>}
                    </li>
                  )}
                  {dpeData.dpe?.source && (
                    <li className="text-[10px] italic opacity-70 pt-1">Source : {dpeData.dpe.source}</li>
                  )}
                </ul>
                <p className="text-[11px] text-emerald-700 pt-1">
                  Vous pourrez ajuster les valeurs aux étapes suivantes si nécessaire.
                </p>
              </div>
            )}
            {!enriching && dpeData && !dpeData.found && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                Aucune fiche DPE trouvée pour cette adresse — vous saisirez les caractéristiques manuellement aux étapes suivantes.
              </div>
            )}
            {!enriching && parcelle && (
              <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 text-xs text-violet-800 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Parcelle cadastrale trouvée (IDU <code className="font-mono bg-white px-1 rounded">{parcelle.idu}</code>) — analyse de toiture par vision IA disponible à l'étape Toitures.
              </div>
            )}
            {enrichmentError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                Enrichissement automatique indisponible : {enrichmentError}. Vous pouvez quand même remplir manuellement.
              </div>
            )}
            <Field label="Altitude approximative (mètres)" tooltip="Compte pour le climat (Bch). 0 pour bord de mer, 50-150 en Bretagne intérieure, 500+ en montagne.">
              <input type="number" min={0} max={3000} value={form.altitude} onChange={(e) => update('altitude', Number(e.target.value))} className={inputCls()} />
            </Field>
          </div>
        )}

        {/* ── STEP 2 : BÂTIMENT ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 space-y-5">
            <Field label="Type de logement">
              <div className="grid grid-cols-3 gap-2">
                {(['maison', 'appartement', 'immeuble'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => update('typeBatiment', t)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition capitalize ${form.typeBatiment === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'}`}>
                    {t === 'maison' ? 'Maison' : t === 'appartement' ? 'Appartement' : 'Immeuble'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Surface habitable (m²)" tooltip="Surface au sol des pièces de vie chauffées (sans caves, garages, combles non aménagés).">
              <input type="number" min={10} max={1000} value={form.surfaceHabitable} onChange={(e) => update('surfaceHabitable', Number(e.target.value))} className={inputCls()} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hauteur sous plafond (m)">
                <input type="number" step="0.1" min={2} max={5} value={form.hauteurSousPlafond} onChange={(e) => update('hauteurSousPlafond', Number(e.target.value))} className={inputCls()} />
              </Field>
              <Field label="Nombre de niveaux chauffés">
                <input type="number" min={1} max={5} value={form.nombreNiveaux} onChange={(e) => update('nombreNiveaux', Number(e.target.value))} className={inputCls()} />
              </Field>
            </div>
            <Field label="Année / période de construction">
              <select value={form.periodeConstruction} onChange={(e) => update('periodeConstruction', e.target.value as PeriodeConstruction)} className={inputCls()}>
                {PERIODES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
              </select>
            </Field>
            <Field label="Inertie thermique" tooltip="Légère = ossature bois, métal. Moyenne = brique, parpaing. Lourde = pierre épaisse, béton plein, ancien bâti maçonné.">
              <select value={String(form.inertie)} onChange={(e) => update('inertie', e.target.value)} className={inputCls()}>
                <option value="legere">Légère (ossature bois, métal)</option>
                <option value="moyenne">Moyenne (brique, parpaing)</option>
                <option value="lourde">Lourde (pierre épaisse, béton plein)</option>
                <option value="tres_lourde">Très lourde (vieux bâti pierre {'>'} 50cm)</option>
              </select>
            </Field>
            <Field label="Mitoyenneté" tooltip="Combien de façades sont contre un autre logement chauffé ? Important pour les déperditions.">
              <select value={form.mitoyennete} onChange={(e) => update('mitoyennete', e.target.value as FormState['mitoyennete'])} className={inputCls()}>
                <option value="isole">Isolé (maison individuelle)</option>
                <option value="mitoyen_1">1 mur mitoyen</option>
                <option value="mitoyen_2">2 murs mitoyens (en bande)</option>
                <option value="mitoyen_3plus">Appartement / 3+ murs mitoyens</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 3 : MURS (multi) ───────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="bg-slate-100 rounded-xl px-4 py-3 text-xs text-slate-700">
              Ajoutez chaque <strong>façade</strong> de votre logement séparément. Précisez orientation, matériau et isolation actuelle.
              Plus c'est détaillé, plus le calcul DPE est précis.
            </div>
            {form.murs.map((m) => (
              <article key={m.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <header className="flex items-center justify-between gap-2">
                  <input type="text" value={m.label} onChange={(e) => updateMur(m.id, { label: e.target.value })}
                    className="flex-1 text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:outline-none px-0 py-1" />
                  {form.murs.length > 1 && (
                    <button type="button" onClick={() => removeMur(m.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" aria-label="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </header>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Orientation">
                    <select value={m.orientation} onChange={(e) => updateMur(m.id, { orientation: e.target.value as MurForm['orientation'] })} className={inputCls()}>
                      <option value="nord">Nord</option>
                      <option value="est">Est</option>
                      <option value="sud">Sud</option>
                      <option value="ouest">Ouest</option>
                    </select>
                  </Field>
                  <Field label="Surface (m²)" tooltip={`Longueur × hauteur, sans les fenêtres. Pour façade ${m.orientation}.`}>
                    <input type="number" min={1} max={500} value={m.surface} onChange={(e) => updateMur(m.id, { surface: Number(e.target.value) })} className={inputCls()} />
                  </Field>
                </div>
                <Field label="Matériau de la paroi">
                  <select value={m.materiau} onChange={(e) => updateMur(m.id, { materiau: e.target.value as MurForm['materiau'] })} className={inputCls()}>
                    <option value="parpaing">Parpaing creux</option>
                    <option value="beton">Béton plein</option>
                    <option value="brique">Brique</option>
                    <option value="pierre_avec_remplissage">Pierre + remplissage (terre, mortier)</option>
                    <option value="pierre_sans_remplissage">Pierre sans remplissage</option>
                    <option value="ossature_bois">Ossature bois</option>
                    <option value="ossature_metal">Ossature métallique</option>
                    <option value="mur_rideau">Mur rideau (façade vitrée)</option>
                  </select>
                </Field>
                <Field label="Donne sur…" tooltip="Adjacence de la face arrière. Important pour le coefficient b (déperditions plus fortes vers extérieur, plus faibles vers garage non chauffé).">
                  <select value={m.adjacence} onChange={(e) => updateMur(m.id, { adjacence: e.target.value as MurForm['adjacence'] })} className={inputCls()}>
                    <option value="exterieur">Extérieur (rue, jardin)</option>
                    <option value="garage">Garage non chauffé</option>
                    <option value="lnc">Local non chauffé (cellier, etc.)</option>
                    <option value="ets">Espace tampon solarisé (véranda fermée)</option>
                    <option value="sous_sol">Cave / sous-sol</option>
                    <option value="veranda">Véranda ouverte</option>
                  </select>
                </Field>
                <Field label="Isolation actuelle">
                  <select value={m.isolation} onChange={(e) => updateMur(m.id, { isolation: e.target.value as MurForm['isolation'] })} className={inputCls()}>
                    <option value="sans">Pas d'isolation</option>
                    <option value="iti_60">Intérieure (ITI) 60 mm</option>
                    <option value="iti_100">Intérieure (ITI) 100 mm</option>
                    <option value="iti_120">Intérieure (ITI) 120 mm</option>
                    <option value="iti_160">Intérieure (ITI) 160 mm</option>
                    <option value="iti_200">Intérieure (ITI) 200 mm</option>
                    <option value="ite_100">Extérieure (ITE) 100 mm</option>
                    <option value="ite_140">Extérieure (ITE) 140 mm</option>
                    <option value="ite_180">Extérieure (ITE) 180 mm</option>
                    <option value="ite_220">Extérieure (ITE) 220 mm</option>
                    <option value="repartie">Isolation répartie (brique monomur, béton cellulaire)</option>
                  </select>
                </Field>
                {m.isolation !== 'sans' && (
                  <Field label="Année de pose de l'isolation (optionnel)">
                    <input type="number" min={1950} max={2026} value={m.anneeIsolation ?? ''} onChange={(e) => updateMur(m.id, { anneeIsolation: e.target.value ? Number(e.target.value) : undefined })} className={inputCls()} placeholder="ex : 2005" />
                  </Field>
                )}
              </article>
            ))}
            <button type="button" onClick={addMur} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-sm font-bold text-slate-700 transition">
              <Plus size={14} /> Ajouter une façade
            </button>
          </div>
        )}

        {/* ── STEP 4 : TOITURES / SOLS ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3">
            {/* Vision IA toiture — disponible si une parcelle a été trouvée à l'étape 1. */}
            {parcelle && (
              <article className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-2 border-violet-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-violet-900 inline-flex items-center gap-1.5">
                      <Microscope size={14} className="text-violet-600" />
                      Analyse satellite IA de votre toiture
                    </h3>
                    <p className="text-[11px] text-violet-800 mt-1 leading-relaxed">
                      Claude Sonnet 4.6 vision analyse l'orthophoto IGN de votre parcelle pour détecter
                      le type de toit, l'orientation, la surface et le potentiel solaire. <strong>Gratuit, ~15-30 secondes.</strong>
                    </p>
                  </div>
                  {!visionToiture && !analyzingToiture && (
                    <button
                      type="button"
                      onClick={async () => {
                        setAnalyzingToiture(true)
                        setVisionError(null)
                        try {
                          const v = await analyzeToitureVision(parcelle.idu)
                          if (v) {
                            setVisionToiture(v)
                            // Pré-remplit le formulaire avec ce que la vision IA détecte
                            setForm((prev) => ({
                              ...prev,
                              toitureType: visionTypeToToitureForm(v.type_toiture),
                            }))
                          } else {
                            setVisionError('Aucune analyse retournée — réessayez ou continuez en saisie manuelle.')
                          }
                        } catch (err) {
                          setVisionError(err instanceof Error ? err.message : 'Erreur vision IA')
                        } finally {
                          setAnalyzingToiture(false)
                        }
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold transition"
                    >
                      <Microscope size={12} />
                      Lancer l'analyse
                    </button>
                  )}
                </div>

                {analyzingToiture && (
                  <div className="flex items-center gap-2 text-xs text-violet-800">
                    <Loader2 size={14} className="animate-spin" />
                    Analyse IA en cours (15-30s)…
                  </div>
                )}

                {visionToiture && (
                  <div className="bg-white rounded-xl border border-violet-200 p-3 space-y-2">
                    <p className="text-[11px] uppercase font-bold tracking-widest text-violet-700">
                      Résultat de l'analyse IA
                    </p>
                    <ul className="text-xs text-slate-700 space-y-0.5">
                      {visionToiture.type_toiture !== 'indetermine' && (
                        <li>• Type de toiture : <strong className="capitalize">{visionToiture.type_toiture.replace('_', ' ')}</strong></li>
                      )}
                      {visionToiture.nb_pans !== null && (
                        <li>• Nombre de pans : <strong>{visionToiture.nb_pans}</strong></li>
                      )}
                      {visionToiture.orientation_principale && visionToiture.orientation_principale !== 'plat' && (
                        <li>• Orientation principale : <strong>{visionToiture.orientation_principale}</strong></li>
                      )}
                      {visionToiture.surface_estimee_m2 && (
                        <li>• Surface estimée : <strong>{Math.round(visionToiture.surface_estimee_m2)} m²</strong></li>
                      )}
                      {visionToiture.etat_apparent !== 'indetermine' && (
                        <li>• État apparent : <strong className="capitalize">{visionToiture.etat_apparent.replace('_', ' ')}</strong></li>
                      )}
                      {visionToiture.ombre_solaire !== 'indetermine' && (
                        <li>• Ombre solaire : <strong className="capitalize">{visionToiture.ombre_solaire}</strong></li>
                      )}
                      {visionToiture.veluxes_visibles !== null && visionToiture.veluxes_visibles > 0 && (
                        <li>• Velux visibles : <strong>{visionToiture.veluxes_visibles}</strong></li>
                      )}
                      {visionToiture.potentiel_pv !== 'indetermine' && (
                        <li>• Potentiel photovoltaïque : <strong className="capitalize">{visionToiture.potentiel_pv}</strong></li>
                      )}
                    </ul>
                    {visionToiture.commentaires && (
                      <p className="text-[11px] text-slate-600 italic pt-1 border-t border-violet-100">
                        « {visionToiture.commentaires} »
                      </p>
                    )}
                    <p className="text-[10px] text-violet-700 pt-1">
                      Le type de toiture a été pré-rempli ci-dessous. Vous pouvez l'ajuster si besoin.
                    </p>
                  </div>
                )}

                {visionError && (
                  <p className="text-[11px] text-red-700">{visionError}</p>
                )}
              </article>
            )}

            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                <Layers size={14} className="text-slate-500" />
                Toiture / combles
              </h3>
              <Field label="Type de toiture">
                <select value={form.toitureType} onChange={(e) => update('toitureType', e.target.value as FormState['toitureType'])} className={inputCls()}>
                  <option value="combles_perdus">Combles perdus (grenier non aménagé)</option>
                  <option value="combles_amenages">Combles aménagés (chambres sous les rampants)</option>
                  <option value="toiture_terrasse">Toiture terrasse</option>
                </select>
              </Field>
              <Field label="Isolation toiture actuelle">
                <select value={form.toitureIsolation} onChange={(e) => update('toitureIsolation', e.target.value as FormState['toitureIsolation'])} className={inputCls()}>
                  <option value="sans">Pas d'isolation</option>
                  <option value="iti_100">100 mm</option>
                  <option value="iti_200">200 mm</option>
                  <option value="iti_300">300 mm (norme actuelle RT2012)</option>
                  <option value="iti_400">400 mm (passif)</option>
                </select>
              </Field>
              {form.toitureIsolation !== 'sans' && (
                <Field label="Année de pose (optionnel)">
                  <input type="number" min={1950} max={2026} value={form.toitureAnneeIsolation ?? ''} onChange={(e) => update('toitureAnneeIsolation', e.target.value ? Number(e.target.value) : undefined)} className={inputCls()} placeholder="ex : 2015" />
                </Field>
              )}
            </article>
            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                <Layers size={14} className="text-slate-500" />
                Plancher bas
              </h3>
              <Field label="Le plancher bas donne sur…" tooltip="L'espace situé EN-DESSOUS de votre sol RDC.">
                <select value={form.plancherBasType} onChange={(e) => update('plancherBasType', e.target.value as FormState['plancherBasType'])} className={inputCls()}>
                  <option value="vide_sanitaire">Vide sanitaire</option>
                  <option value="terre_plein">Sur terre-plein (dalle directe)</option>
                  <option value="sous_sol">Cave / sous-sol non chauffé</option>
                  <option value="lnc">Garage / local non chauffé</option>
                </select>
              </Field>
              <Field label="Isolation plancher bas actuelle">
                <select value={form.plancherBasIsolation} onChange={(e) => update('plancherBasIsolation', e.target.value as FormState['plancherBasIsolation'])} className={inputCls()}>
                  <option value="sans">Pas d'isolation</option>
                  <option value="iti_60">60 mm</option>
                  <option value="iti_100">100 mm</option>
                  <option value="iti_140">140 mm</option>
                </select>
              </Field>
              {form.plancherBasIsolation !== 'sans' && (
                <Field label="Année de pose (optionnel)">
                  <input type="number" min={1950} max={2026} value={form.plancherBasAnneeIsolation ?? ''} onChange={(e) => update('plancherBasAnneeIsolation', e.target.value ? Number(e.target.value) : undefined)} className={inputCls()} placeholder="ex : 2018" />
                </Field>
              )}
            </article>
          </div>
        )}

        {/* ── STEP 5 : OUVERTURES (multi) ─────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="bg-slate-100 rounded-xl px-4 py-3 text-xs text-slate-700">
              Ajoutez chaque <strong>fenêtre, baie vitrée ou porte</strong> séparément (ou groupez celles de mêmes caractéristiques).
              Pour chaque ouverture, précisez la menuiserie, le vitrage et les volets.
            </div>
            {form.ouvertures.map((o) => (
              <article key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <header className="flex items-center justify-between gap-2">
                  <input type="text" value={o.label} onChange={(e) => updateOuv(o.id, { label: e.target.value })}
                    className="flex-1 text-sm font-bold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:outline-none px-0 py-1" />
                  {form.ouvertures.length > 1 && (
                    <button type="button" onClick={() => removeOuv(o.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" aria-label="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </header>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type">
                    <select value={o.type} onChange={(e) => updateOuv(o.id, { type: e.target.value as OuvertureForm['type'] })} className={inputCls()}>
                      <option value="fenetre">Fenêtre</option>
                      <option value="porte_fenetre">Porte-fenêtre</option>
                      <option value="baie_vitree">Baie vitrée</option>
                      <option value="velux">Velux / fenêtre de toit</option>
                      <option value="porte">Porte d'entrée</option>
                    </select>
                  </Field>
                  <Field label="Orientation">
                    <select value={o.orientation} onChange={(e) => updateOuv(o.id, { orientation: e.target.value as OuvertureForm['orientation'] })} className={inputCls()}>
                      <option value="nord">Nord</option>
                      <option value="est">Est</option>
                      <option value="sud">Sud</option>
                      <option value="ouest">Ouest</option>
                      <option value="horizontal">Horizontale (velux)</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Largeur (cm)" tooltip="Largeur extérieure de l'ouverture en centimètres.">
                    <input type="number" min={10} max={500} value={o.largeurCm} onChange={(e) => updateOuv(o.id, { largeurCm: Number(e.target.value) })} className={inputCls()} />
                  </Field>
                  <Field label="Hauteur (cm)" tooltip="Hauteur extérieure de l'ouverture en centimètres.">
                    <input type="number" min={10} max={400} value={o.hauteurCm} onChange={(e) => updateOuv(o.id, { hauteurCm: Number(e.target.value) })} className={inputCls()} />
                  </Field>
                  <Field label="Nombre" tooltip="Si vous avez plusieurs fenêtres identiques (même façade, même dimensions), groupez-les ici.">
                    <input type="number" min={1} max={50} value={o.quantite} onChange={(e) => updateOuv(o.id, { quantite: Number(e.target.value) })} className={inputCls()} />
                  </Field>
                </div>
                <p className="text-[11px] text-slate-500 -mt-1">
                  Surface totale : <strong className="tabular-nums text-slate-700">{ouvSurfaceM2(o).toFixed(2)} m²</strong>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Matériau menuiserie">
                    <select value={o.menuiserie} onChange={(e) => updateOuv(o.id, { menuiserie: e.target.value as OuvertureForm['menuiserie'] })} className={inputCls()}>
                      <option value="pvc">PVC</option>
                      <option value="bois">Bois</option>
                      <option value="alu">Aluminium à rupture thermique</option>
                      <option value="metal">Métal sans rupture (ancien)</option>
                    </select>
                  </Field>
                  <Field label="Vitrage">
                    <select value={o.vitrage} onChange={(e) => updateOuv(o.id, { vitrage: e.target.value as OuvertureForm['vitrage'] })} className={inputCls()}>
                      <option value="simple">Simple vitrage</option>
                      <option value="double">Double vitrage</option>
                      <option value="triple">Triple vitrage</option>
                      <option value="survitrage">Survitrage (simple + rajout)</option>
                    </select>
                  </Field>
                </div>
                {o.vitrage === 'double' || o.vitrage === 'triple' ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={o.vir} onChange={(e) => updateOuv(o.id, { vir: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                    <Tooltip text="Vitrage à isolation renforcée (couche métallique transparente). Indiqué sur la facture du vitrier ou avec un logo « warm edge ».">
                      Vitrage à isolation renforcée (VIR)
                    </Tooltip>
                  </label>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Volet / protection">
                    <select value={o.volet} onChange={(e) => updateOuv(o.id, { volet: e.target.value as OuvertureForm['volet'] })} className={inputCls()}>
                      <option value="sans">Aucun</option>
                      <option value="persienne">Persienne / store ext.</option>
                      <option value="volet_battant_bois">Volet battant bois</option>
                      <option value="volet_ext_isolant">Volet extérieur isolant</option>
                    </select>
                  </Field>
                  <Field label="Position dans le mur" tooltip="Comment la fenêtre est posée dans l'épaisseur du mur. Si vous ne savez pas, choisissez « Au milieu » (cas le plus fréquent).">
                    <select value={o.pose} onChange={(e) => updateOuv(o.id, { pose: e.target.value as OuvertureForm['pose'] })} className={inputCls()}>
                      <option value="tunnel">Au milieu du mur (cas standard, rénovation)</option>
                      <option value="nu_interieur">Côté intérieur (fenêtre alignée avec le mur intérieur)</option>
                      <option value="nu_exterieur">Côté extérieur (fenêtre alignée avec la façade)</option>
                    </select>
                  </Field>
                </div>
              </article>
            ))}
            <button type="button" onClick={addOuv} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-sm font-bold text-slate-700 transition">
              <Plus size={14} /> Ajouter une ouverture
            </button>
          </div>
        )}

        {/* ── STEP 6 : VENTILATION ────────────────────────────────────── */}
        {step === 5 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 space-y-5">
            <Field label="Système de ventilation" tooltip="VMC = mécanique. Naturelle = grilles d'aération sans moteur. VMI = insufflation, plus rare mais utilisée en rénovation.">
              <select value={form.ventilation} onChange={(e) => update('ventilation', e.target.value as VentilationType)} className={inputCls()}>
                <option value="naturelle">Ventilation naturelle (grilles, aérations)</option>
                <option value="vmc_sf_auto_avant_1982">VMC simple flux autoréglable avant 1982</option>
                <option value="vmc_sf_auto_1982_2000">VMC simple flux autoréglable 1982-2000</option>
                <option value="vmc_sf_auto_apres_2000">VMC simple flux autoréglable après 2000</option>
                <option value="vmc_sf_hygro_a">VMC simple flux hygro A</option>
                <option value="vmc_sf_hygro_b_avant_2012">VMC simple flux hygro B avant 2012</option>
                <option value="vmc_sf_hygro_b_apres_2012">VMC simple flux hygro B après 2012</option>
                <option value="vmc_double_flux_sans_recup">VMC double flux sans récupération</option>
                <option value="vmc_double_flux_avec_recup">VMC double flux avec récupération de chaleur</option>
                <option value="vmc_gaz">VMC gaz (couplée à la chaudière)</option>
                <option value="vmc_sf_auto_apres_2000">VMI — Ventilation mécanique par insufflation</option>
              </select>
            </Field>
            <Field label="État d'entretien" tooltip="Une VMC mal entretenue perd 30-50% de son rendement. L'entretien annuel est la norme professionnelle pour ne pas perdre l'efficacité.">
              <select value={form.qualiteVentilation} onChange={(e) => update('qualiteVentilation', e.target.value as FormState['qualiteVentilation'])} className={inputCls()}>
                <option value="bonne">Bonne — entretien tous les ans (norme)</option>
                <option value="standard">Standard — entretien tous les 3-5 ans</option>
                <option value="mediocre">Médiocre — entretien tous les 5-10 ans ou jamais</option>
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 7 : ÉQUIPEMENTS ────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-3">
            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                <Flame size={14} className="text-amber-600" />
                Chauffage principal
              </h3>
              <Field label="Système de chauffage">
                <select value={form.chauffageGenerateur} onChange={(e) => update('chauffageGenerateur', e.target.value as GenerateurChauffage)} className={inputCls()}>
                  <option value="chaudiere_gaz_standard">Chaudière gaz standard</option>
                  <option value="chaudiere_gaz_basse_temp">Chaudière gaz basse température</option>
                  <option value="chaudiere_gaz_condensation">Chaudière gaz à condensation</option>
                  <option value="chaudiere_fioul">Chaudière fioul standard</option>
                  <option value="chaudiere_fioul_condensation">Chaudière fioul condensation</option>
                  <option value="chaudiere_bois_buche">Chaudière bois bûches</option>
                  <option value="chaudiere_granules_bois">Chaudière granulés bois</option>
                  <option value="pac_air_air">PAC air/air (clim réversible)</option>
                  <option value="pac_air_eau">PAC air/eau</option>
                  <option value="pac_eau_eau">PAC géothermique eau/eau</option>
                  <option value="effet_joule_direct">Radiateurs électriques (convecteurs)</option>
                  <option value="inertie_electrique">Radiateurs à inertie électrique</option>
                  <option value="reseau_chaleur">Réseau de chaleur urbain</option>
                </select>
              </Field>
              <Field label="Émetteur de chaleur">
                <select value={form.chauffageEmetteur} onChange={(e) => update('chauffageEmetteur', e.target.value as Emetteur)} className={inputCls()}>
                  <option value="radiateur_eau">Radiateurs à eau (acier ou fonte)</option>
                  <option value="plancher_chauffant">Plancher chauffant</option>
                  <option value="mural_chauffant">Mur chauffant</option>
                  <option value="air_souffle">Air soufflé (gainable)</option>
                  <option value="convecteur_electrique">Convecteur électrique</option>
                  <option value="panneau_rayonnant">Panneau rayonnant électrique</option>
                  <option value="split_air_air">Split air/air</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Année d'installation">
                  <input type="number" min={1950} max={2026} value={form.chauffageAnnee} onChange={(e) => update('chauffageAnnee', Number(e.target.value))} className={inputCls()} />
                </Field>
                <Field label="Régulation pièce/pièce ?">
                  <select value={form.chauffageRegulation ? 'oui' : 'non'} onChange={(e) => update('chauffageRegulation', e.target.value === 'oui')} className={inputCls()}>
                    <option value="oui">Oui (thermostat ou robinets thermostatiques)</option>
                    <option value="non">Non (chauffage global)</option>
                  </select>
                </Field>
              </div>
            </article>
            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Eau chaude sanitaire</h3>
              <Field label="Production ECS">
                <select value={form.ecsGenerateur} onChange={(e) => update('ecsGenerateur', e.target.value as FormState['ecsGenerateur'])} className={inputCls()}>
                  <option value="electrique">Ballon électrique</option>
                  <option value="cet">Chauffe-eau thermodynamique (CET)</option>
                  <option value="gaz">Gaz (chaudière mixte ou indépendant)</option>
                  <option value="fioul">Fioul</option>
                  <option value="bois">Bois</option>
                  <option value="solaire_thermique">Solaire thermique (CESI)</option>
                  <option value="reseau_chaleur">Réseau de chaleur</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Volume de stockage (L)">
                  <input type="number" min={0} max={1000} value={form.ecsStockageL} onChange={(e) => update('ecsStockageL', Number(e.target.value))} className={inputCls()} placeholder="200" />
                </Field>
                <Field label="Année d'installation">
                  <input type="number" min={1950} max={2026} value={form.ecsAnnee} onChange={(e) => update('ecsAnnee', Number(e.target.value))} className={inputCls()} />
                </Field>
              </div>
            </article>
            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Production solaire (optionnel)</h3>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.hasPv} onChange={(e) => update('hasPv', e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                J'ai des panneaux photovoltaïques
              </label>
              {form.hasPv && (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Puissance (kWc)">
                    <input type="number" step="0.5" min={0.5} max={50} value={form.pvPuissance} onChange={(e) => update('pvPuissance', Number(e.target.value))} className={inputCls()} />
                  </Field>
                  <Field label="Orientation">
                    <select value={form.pvOrientation} onChange={(e) => update('pvOrientation', e.target.value as FormState['pvOrientation'])} className={inputCls()}>
                      <option value="sud">Sud</option>
                      <option value="est">Est</option>
                      <option value="ouest">Ouest</option>
                      <option value="nord">Nord</option>
                      <option value="horizontal">Horizontal</option>
                    </select>
                  </Field>
                  <Field label="Inclinaison (°)">
                    <input type="number" min={0} max={90} value={form.pvInclinaison} onChange={(e) => update('pvInclinaison', Number(e.target.value))} className={inputCls()} />
                  </Field>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.hasClim} onChange={(e) => update('hasClim', e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                J'ai une climatisation
              </label>
              {form.hasClim && (
                <Field label="SEER (efficacité)" tooltip="Donné sur l'étiquette du climatiseur. 4-5 = standard, 6+ = performant.">
                  <input type="number" step="0.1" min={2} max={8} value={form.climSeer} onChange={(e) => update('climSeer', Number(e.target.value))} className={inputCls()} />
                </Field>
              )}
            </article>
            <article className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Composition du foyer (pour les aides)</h3>
              <Field label="Nombre de personnes" tooltip="Sert au calcul des plafonds de revenus pour MaPrimeRénov'.">
                <input type="number" min={1} max={15} value={form.nbPersonnes} onChange={(e) => update('nbPersonnes', Number(e.target.value))} className={inputCls()} />
              </Field>
            </article>
          </div>
        )}

        {computeError && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 inline-flex items-center gap-2">
            <AlertCircle size={14} />
            {computeError}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <button type="button" onClick={prev} disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
            <ArrowLeft size={14} /> Précédent
          </button>
          <button type="button" onClick={next} disabled={!canGoNext()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed">
            {step === STEPS.length - 2 ? (<><Microscope size={14} /> Calculer mon DPE</>) : (<>Continuer <ArrowRight size={14} /></>)}
          </button>
        </div>

        <p className="text-center mt-6 text-[11px] text-slate-500">
          Vos {form.murs.length} façade{form.murs.length > 1 ? 's' : ''} et {form.ouvertures.length} ouverture{form.ouvertures.length > 1 ? 's' : ''} sont sauvegardées localement à chaque étape. Vous pouvez revenir plus tard.
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS RÉSULTAT
// ──────────────────────────────────────────────────────────────────────────────

interface ConsoParPoste {
  chauffage?: number
  ecs?: number
  eclairage?: number
  auxiliaires?: number
  refroidissement?: number
  [k: string]: number | undefined
}

function ResultPostesPanel({ parPoste, consoTotale }: { parPoste: ConsoParPoste; consoTotale: number }) {
  const items = [
    { key: 'chauffage', label: 'Chauffage', color: 'bg-amber-500' },
    { key: 'ecs', label: 'Eau chaude sanitaire', color: 'bg-sky-500' },
    { key: 'eclairage', label: 'Éclairage', color: 'bg-yellow-400' },
    { key: 'auxiliaires', label: 'Auxiliaires', color: 'bg-slate-400' },
    { key: 'refroidissement', label: 'Climatisation', color: 'bg-cyan-500' },
  ].filter((i) => (parPoste[i.key] ?? 0) > 0)

  const total = items.reduce((s, i) => s + (parPoste[i.key] ?? 0), 0) || 1

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
      <h2 className="font-display text-lg font-bold text-slate-900 mb-3">
        Répartition de votre consommation
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Consommation totale annuelle : <strong className="tabular-nums text-slate-700">{Math.round(consoTotale).toLocaleString('fr-FR')} kWh/an</strong> (énergie finale)
      </p>
      <div className="space-y-2.5">
        {items.map((i) => {
          const value = parPoste[i.key] ?? 0
          const pct = Math.round((value / total) * 100)
          return (
            <div key={i.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">{i.label}</span>
                <span className="text-slate-500 tabular-nums">{Math.round(value).toLocaleString('fr-FR')} kWh/an · {pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${i.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

interface DeperditionsResult {
  murs?: number
  plancher_bas?: number
  plancher_haut?: number
  ouvertures?: number
  ponts_thermiques?: number
  renouvellement_air?: number
  [k: string]: number | undefined
}

function ResultDeperditionsPanel({ deperditions }: { deperditions: DeperditionsResult }) {
  const items = [
    { key: 'murs', label: 'Murs', icon: '🧱' },
    { key: 'plancher_haut', label: 'Toiture / plancher haut', icon: '🏠' },
    { key: 'plancher_bas', label: 'Plancher bas', icon: '🟫' },
    { key: 'ouvertures', label: 'Fenêtres & portes', icon: '🪟' },
    { key: 'ponts_thermiques', label: 'Ponts thermiques', icon: '🌡️' },
    { key: 'renouvellement_air', label: 'Ventilation (renouvellement air)', icon: '💨' },
  ].filter((i) => (deperditions[i.key] ?? 0) > 0)

  if (items.length === 0) return null

  const total = items.reduce((s, i) => s + (deperditions[i.key] ?? 0), 0) || 1
  const sorted = [...items].sort((a, b) => (deperditions[b.key] ?? 0) - (deperditions[a.key] ?? 0))

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6">
      <h2 className="font-display text-lg font-bold text-slate-900 mb-1">
        Où passe votre chaleur ?
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Classement des principales déperditions thermiques de votre logement.
        Les postes en tête sont les leviers prioritaires pour réduire votre facture.
      </p>
      <ol className="space-y-2">
        {sorted.map((i, idx) => {
          const value = deperditions[i.key] ?? 0
          const pct = Math.round((value / total) * 100)
          return (
            <li key={i.key} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-center font-bold text-slate-500 tabular-nums">#{idx + 1}</span>
              <span className="text-base shrink-0">{i.icon}</span>
              <span className="flex-1 font-semibold text-slate-800">{i.label}</span>
              <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                idx === 0 ? 'bg-red-100 text-red-800' :
                idx === 1 ? 'bg-amber-100 text-amber-800' :
                idx === 2 ? 'bg-yellow-100 text-yellow-800' :
                'bg-slate-100 text-slate-700'
              }`}>{pct}%</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function ResultAidesLocalesPanel({ codeInsee }: { codeInsee: string }) {
  const { data: aides = [], isLoading } = useAidesLocales({ codeInsee })

  // Pas en Bretagne (22/29/35/56) ou pas d'aide trouvée → pas d'affichage.
  if (isLoading) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Recherche des aides locales applicables…
        </p>
      </section>
    )
  }
  if (aides.length === 0) return null

  return (
    <section className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-2 border-emerald-200 rounded-2xl p-5 lg:p-6">
      <h2 className="font-display text-lg font-bold text-emerald-900 mb-1 inline-flex items-center gap-1.5">
        💶 Aides locales applicables ({aides.length})
      </h2>
      <p className="text-xs text-emerald-800 mb-4">
        Aides du Conseil régional Bretagne, du département et de votre intercommunalité, cumulables avec MaPrimeRénov' et CEE.
      </p>
      <div className="space-y-2">
        {aides.slice(0, 8).map((a) => (
          <article key={a.id} className="bg-white rounded-xl border border-emerald-100 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{a.programme}</p>
                <p className="text-[11px] text-slate-500">{a.organisme} · <span className="capitalize">{a.niveau}</span></p>
              </div>
              {a.forfait_euros && a.forfait_euros > 0 && (
                <span className="shrink-0 text-xs font-bold text-emerald-700 tabular-nums">
                  jusqu'à {a.forfait_euros.toLocaleString('fr-FR')} €
                </span>
              )}
              {a.taux_pct && a.taux_pct > 0 && !a.forfait_euros && (
                <span className="shrink-0 text-xs font-bold text-emerald-700 tabular-nums">
                  jusqu'à {a.taux_pct}%
                </span>
              )}
            </div>
          </article>
        ))}
        {aides.length > 8 && (
          <p className="text-[11px] text-emerald-700 text-center pt-1">
            + {aides.length - 8} autres aides disponibles — visibles dans votre tableau de bord après inscription.
          </p>
        )}
      </div>
    </section>
  )
}
