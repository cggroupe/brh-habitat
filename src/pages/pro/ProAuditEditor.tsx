/**
 * Éditeur d'audit DPE — wizard simplifié sur une page avec calcul live.
 *
 * V1 : 5 sections (géo, bâtiment, parois, ouvertures, équipements)
 * + bouton Calculer + résultats (3 étiquettes DPE + détail postes + déperditions).
 *
 * Les parois/ouvertures sont pré-remplies via "smart defaults" basés sur
 * surface + type bâtiment + période, l'utilisateur peut ensuite ajuster.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Calculator, CheckCircle, Loader } from 'lucide-react'
import {
  useAudit,
  useCreateAudit,
  useUpdateAudit,
  useComputeAudit,
  useFinalizeAudit,
} from '@/hooks/queries/audits'
import { computeDpe } from '@/lib/dpe-engine'
import type {
  AuditInputs,
  PeriodeConstruction,
  TypeBatiment,
  Ventilation,
  GenerateurChauffage,
  Inertie,
} from '@/lib/dpe-engine/types'
import type { DpeResult } from '@/lib/dpe-engine/types'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'

type FormState = {
  codeInsee: string
  altitude: number
  surfaceHabitable: number
  hauteurSousPlafond: number
  nombreNiveaux: number
  periodeConstruction: PeriodeConstruction
  typeBatiment: TypeBatiment
  inertie: Inertie | string
  // Parois simplifiées
  surfaceMurs: number
  isolationMurs: 'sans' | 'iti_60' | 'iti_120' | 'iti_200' | 'ite_140' | 'ite_200'
  isolationToiture: 'sans' | 'iti_100' | 'iti_200' | 'iti_300'
  isolationPlancherBas: 'sans' | 'iti_60' | 'iti_120'
  // Ouvertures simplifiées
  surfaceFenetresSud: number
  surfaceFenetresNord: number
  vitrage: 'simple' | 'double' | 'triple'
  // Équipements
  chauffageGenerateur: GenerateurChauffage
  chauffageEmetteur: string
  chauffageAnnee: number
  chauffageRegulation: boolean
  ecsGenerateur: 'electrique' | 'gaz' | 'fioul' | 'bois' | 'cet' | 'reseau_chaleur' | 'solaire_thermique'
  ecsStockageL: number
  ventilation: Ventilation
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

const ISOLATION_PARAMS: Record<
  string,
  { type: 'iti' | 'ite' | 'sans'; epaisseur: number; lambda: number } | { type: 'sans' }
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
  codeInsee: '29019',
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
        {
          type: 'mur',
          surface: f.surfaceMurs,
          adjacence: 'exterieur',
          materiau: 'parpaing',
          isolation: ISOLATION_PARAMS[f.isolationMurs],
        },
        {
          type: 'plancher_bas',
          surface: f.surfaceHabitable,
          adjacence: 'vide_sanitaire',
          isolation: ISOLATION_PARAMS[f.isolationPlancherBas],
        },
        {
          type: 'plancher_haut',
          surface: f.surfaceHabitable,
          adjacence: 'combles_perdus',
          isolation: ISOLATION_PARAMS[f.isolationToiture],
        },
      ],
      ouvertures: [
        {
          type: 'fenetre',
          surface: f.surfaceFenetresSud,
          orientation: 'sud',
          menuiserie: 'pvc',
          vitrage: f.vitrage,
        },
        {
          type: 'fenetre',
          surface: f.surfaceFenetresNord,
          orientation: 'nord',
          menuiserie: 'pvc',
          vitrage: f.vitrage,
        },
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

export default function ProAuditEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'nouveau'

  const { data: audit, isLoading } = useAudit(isNew ? undefined : id)
  const createAudit = useCreateAudit()
  const updateAudit = useUpdateAudit()
  const computeAudit = useComputeAudit()
  const finalizeAudit = useFinalizeAudit()

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [livePreview, setLivePreview] = useState<DpeResult | null>(null)

  const isReadOnly = audit?.status === 'submitted' || audit?.status === 'archived'

  // Hydrate form from existing audit (deferred via setTimeout pour respecter
  // la règle anti-bug #5 react-hooks/set-state-in-effect)
  useEffect(() => {
    if (!audit?.inputs) return
    const t = setTimeout(() => {
      try {
        const inp = audit.inputs as AuditInputs
        setForm({
          codeInsee: inp.geo.codeInsee,
          altitude: inp.geo.altitude ?? 50,
          surfaceHabitable: inp.bati.surfaceHabitable,
          hauteurSousPlafond: inp.bati.hauteurSousPlafond ?? 2.5,
          nombreNiveaux: inp.bati.nombreNiveaux ?? 1,
          periodeConstruction: inp.bati.periodeConstruction,
          typeBatiment: inp.bati.typeBatiment,
          inertie: String(inp.bati.inertie),
          surfaceMurs: inp.bati.parois.find((p) => p.type === 'mur')?.surface ?? 80,
          isolationMurs: matchIsolation(inp.bati.parois.find((p) => p.type === 'mur')) as FormState['isolationMurs'],
          isolationToiture: matchIsolation(inp.bati.parois.find((p) => p.type === 'plancher_haut')) as FormState['isolationToiture'],
          isolationPlancherBas: matchIsolation(inp.bati.parois.find((p) => p.type === 'plancher_bas')) as FormState['isolationPlancherBas'],
          surfaceFenetresSud: inp.bati.ouvertures.find((o) => o.orientation === 'sud')?.surface ?? 6,
          surfaceFenetresNord: inp.bati.ouvertures.find((o) => o.orientation === 'nord')?.surface ?? 4,
          vitrage: (inp.bati.ouvertures[0]?.vitrage ?? 'double') as FormState['vitrage'],
          chauffageGenerateur: inp.equipements.chauffage.generateur,
          chauffageEmetteur: inp.equipements.chauffage.emetteur ?? 'radiateur_eau',
          chauffageAnnee: inp.equipements.chauffage.anneeInstallation ?? 2010,
          chauffageRegulation: inp.equipements.chauffage.regulation ?? true,
          ecsGenerateur: inp.equipements.ecs.generateur,
          ecsStockageL: inp.equipements.ecs.stockageL ?? 200,
          ventilation: inp.equipements.ventilation,
        })
      } catch {
        // ignore — form reste en valeurs par défaut
      }
    }, 0)
    return () => clearTimeout(t)
  }, [audit])

  // Calcul live (debounced)
  const inputs = useMemo(() => formToInputs(form), [form])
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setLivePreview(computeDpe(inputs))
      } catch {
        setLivePreview(null)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [inputs])

  const handleSave = async () => {
    if (isNew) {
      const created = await createAudit.mutateAsync(inputs)
      navigate(`/pro/audits/${created.id}`)
    } else if (id) {
      await updateAudit.mutateAsync({ id, partial: { inputs: inputs as never } })
    }
  }

  const handleCompute = async () => {
    if (!id || isNew) {
      const created = await createAudit.mutateAsync(inputs)
      await computeAudit.mutateAsync(created.id)
      navigate(`/pro/audits/${created.id}`)
    } else {
      await updateAudit.mutateAsync({ id, partial: { inputs: inputs as never } })
      await computeAudit.mutateAsync(id)
    }
  }

  const handleFinalize = async () => {
    if (!id) return
    if (!confirm('Finaliser cet audit ? L\'édition sera verrouillée après finalisation.')) return
    await finalizeAudit.mutateAsync(id)
    navigate(`/pro/audits/${id}/results`)
  }

  if (isLoading) {
    return <div className="p-6 text-gray-500">Chargement…</div>
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/pro/audits"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <div className="flex gap-2">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={createAudit.isPending || updateAudit.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Sauvegarder
              </button>
              <button
                type="button"
                onClick={handleCompute}
                disabled={computeAudit.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {computeAudit.isPending ? <Loader className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                Calculer & Sauvegarder
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={finalizeAudit.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" /> Finaliser
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form (2/3) */}
        <div className="space-y-4 lg:col-span-2">
          <Section title="1. Localisation">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code INSEE">
                <input
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.codeInsee}
                  onChange={(e) => setForm({ ...form, codeInsee: e.target.value })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Altitude (m)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.altitude}
                  onChange={(e) => setForm({ ...form, altitude: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
            </div>
          </Section>

          <Section title="2. Bâtiment">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.typeBatiment}
                  onChange={(e) => setForm({ ...form, typeBatiment: e.target.value as TypeBatiment })}
                  disabled={isReadOnly}
                >
                  <option value="maison">Maison individuelle</option>
                  <option value="appartement">Appartement</option>
                  <option value="immeuble">Immeuble</option>
                </select>
              </Field>
              <Field label="Période de construction">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.periodeConstruction}
                  onChange={(e) => setForm({ ...form, periodeConstruction: e.target.value as PeriodeConstruction })}
                  disabled={isReadOnly}
                >
                  {PERIODES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Surface habitable (m²)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.surfaceHabitable}
                  onChange={(e) => setForm({ ...form, surfaceHabitable: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Hauteur sous plafond (m)">
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.hauteurSousPlafond}
                  onChange={(e) => setForm({ ...form, hauteurSousPlafond: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Inertie">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.inertie as string}
                  onChange={(e) => setForm({ ...form, inertie: e.target.value })}
                  disabled={isReadOnly}
                >
                  <option value="LEGERE">Légère</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="LOURDE">Lourde</option>
                </select>
              </Field>
              <Field label="Nombre de niveaux">
                <input
                  type="number"
                  min="1"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.nombreNiveaux}
                  onChange={(e) => setForm({ ...form, nombreNiveaux: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
            </div>
          </Section>

          <Section title="3. Parois opaques">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Surface murs (m²)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.surfaceMurs}
                  onChange={(e) => setForm({ ...form, surfaceMurs: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Isolation murs">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.isolationMurs}
                  onChange={(e) => setForm({ ...form, isolationMurs: e.target.value as FormState['isolationMurs'] })}
                  disabled={isReadOnly}
                >
                  <option value="sans">Sans isolation</option>
                  <option value="iti_60">ITI 60mm</option>
                  <option value="iti_120">ITI 120mm</option>
                  <option value="iti_200">ITI 200mm</option>
                  <option value="ite_140">ITE 140mm</option>
                  <option value="ite_200">ITE 200mm</option>
                </select>
              </Field>
              <Field label="Isolation toiture/combles">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.isolationToiture}
                  onChange={(e) => setForm({ ...form, isolationToiture: e.target.value as FormState['isolationToiture'] })}
                  disabled={isReadOnly}
                >
                  <option value="sans">Sans isolation</option>
                  <option value="iti_100">100mm</option>
                  <option value="iti_200">200mm</option>
                  <option value="iti_300">300mm</option>
                </select>
              </Field>
              <Field label="Isolation plancher bas">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.isolationPlancherBas}
                  onChange={(e) => setForm({ ...form, isolationPlancherBas: e.target.value as FormState['isolationPlancherBas'] })}
                  disabled={isReadOnly}
                >
                  <option value="sans">Sans isolation</option>
                  <option value="iti_60">60mm</option>
                  <option value="iti_120">120mm</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="4. Ouvertures">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Fenêtres Sud (m²)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.surfaceFenetresSud}
                  onChange={(e) => setForm({ ...form, surfaceFenetresSud: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Fenêtres Nord (m²)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.surfaceFenetresNord}
                  onChange={(e) => setForm({ ...form, surfaceFenetresNord: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Vitrage">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.vitrage}
                  onChange={(e) => setForm({ ...form, vitrage: e.target.value as FormState['vitrage'] })}
                  disabled={isReadOnly}
                >
                  <option value="simple">Simple</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="5. Équipements">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Générateur chauffage">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.chauffageGenerateur}
                  onChange={(e) => setForm({ ...form, chauffageGenerateur: e.target.value as GenerateurChauffage })}
                  disabled={isReadOnly}
                >
                  <option value="chaudiere_gaz_standard">Chaudière gaz standard</option>
                  <option value="chaudiere_gaz_condensation">Chaudière gaz condensation</option>
                  <option value="chaudiere_fioul">Chaudière fioul</option>
                  <option value="chaudiere_fioul_condensation">Chaudière fioul condensation</option>
                  <option value="chaudiere_bois_buche">Chaudière bois bûche</option>
                  <option value="chaudiere_granules_bois">Chaudière granulés</option>
                  <option value="pac_air_air">PAC air/air</option>
                  <option value="pac_air_eau">PAC air/eau</option>
                  <option value="pac_eau_eau">PAC eau/eau</option>
                  <option value="effet_joule_direct">Convecteur électrique</option>
                  <option value="inertie_electrique">Inertie électrique</option>
                  <option value="reseau_chaleur">Réseau de chaleur</option>
                </select>
              </Field>
              <Field label="Émetteur">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.chauffageEmetteur}
                  onChange={(e) => setForm({ ...form, chauffageEmetteur: e.target.value })}
                  disabled={isReadOnly}
                >
                  <option value="radiateur_eau">Radiateur eau</option>
                  <option value="plancher_chauffant">Plancher chauffant</option>
                  <option value="convecteur_electrique">Convecteur électrique</option>
                  <option value="panneau_rayonnant">Panneau rayonnant</option>
                  <option value="split_air_air">Split air/air</option>
                </select>
              </Field>
              <Field label="Année installation">
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.chauffageAnnee}
                  onChange={(e) => setForm({ ...form, chauffageAnnee: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Régulation pièce par pièce">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.chauffageRegulation}
                  onChange={(e) => setForm({ ...form, chauffageRegulation: e.target.checked })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="ECS — Type">
                <select
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.ecsGenerateur}
                  onChange={(e) => setForm({ ...form, ecsGenerateur: e.target.value as FormState['ecsGenerateur'] })}
                  disabled={isReadOnly}
                >
                  <option value="electrique">Ballon électrique</option>
                  <option value="cet">Chauffe-eau thermodynamique (CET)</option>
                  <option value="gaz">Ballon gaz</option>
                  <option value="solaire_thermique">Solaire thermique</option>
                  <option value="reseau_chaleur">Réseau de chaleur</option>
                </select>
              </Field>
              <Field label="ECS — Stockage (L)">
                <input
                  type="number"
                  className="w-full rounded border-gray-300 text-sm"
                  value={form.ecsStockageL}
                  onChange={(e) => setForm({ ...form, ecsStockageL: Number(e.target.value) })}
                  disabled={isReadOnly}
                />
              </Field>
              <Field label="Ventilation">
                <select
                  className="col-span-2 w-full rounded border-gray-300 text-sm"
                  value={form.ventilation}
                  onChange={(e) => setForm({ ...form, ventilation: e.target.value as Ventilation })}
                  disabled={isReadOnly}
                >
                  <option value="naturelle">Naturelle</option>
                  <option value="vmc_sf_auto_apres_2000">VMC simple flux auto (post-2000)</option>
                  <option value="vmc_sf_hygro_a">VMC hygro A</option>
                  <option value="vmc_sf_hygro_b_apres_2012">VMC hygro B (post-2012)</option>
                  <option value="vmc_double_flux_avec_recup">VMC double flux avec récup.</option>
                </select>
              </Field>
            </div>
          </Section>
        </div>

        {/* Live preview (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Aperçu live
            </h3>
            {livePreview ? (
              <>
                <DpeLabelGauge
                  etiquette={livePreview.etiquetteDpe}
                  value={livePreview.cepKwhEpM2An}
                  unit="kWh EP/m²·an"
                  type="final"
                  title="DPE final"
                />
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
                  <div className="font-semibold text-gray-700">Détail</div>
                  <div className="mt-1 space-y-0.5 text-gray-600">
                    <div>Énergie : <strong>{livePreview.etiquetteEnergie}</strong> ({Math.round(livePreview.cepKwhEpM2An)} kWh EP/m²·an)</div>
                    <div>Climat : <strong>{livePreview.etiquetteClimat}</strong> ({livePreview.gesKgCo2M2An.toFixed(1)} kg CO₂/m²·an)</div>
                    <div>Zone : {livePreview.hypotheses.zoneClimatique}</div>
                    <div>Moteur : v{livePreview.hypotheses.moteurVersion}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500">
                Calcul en cours…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function matchIsolation(paroi: { isolation?: { type?: string; epaisseur?: number } } | undefined): string {
  if (!paroi || !paroi.isolation || paroi.isolation.type === 'sans') return 'sans'
  const ep = paroi.isolation.epaisseur ?? 0
  if (paroi.isolation.type === 'ite') {
    return ep >= 200 ? 'ite_200' : 'ite_140'
  }
  if (ep >= 300) return 'iti_300'
  if (ep >= 200) return 'iti_200'
  if (ep >= 120) return 'iti_120'
  if (ep >= 100) return 'iti_100'
  return 'iti_60'
}
