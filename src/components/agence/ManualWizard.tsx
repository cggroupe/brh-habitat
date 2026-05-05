/**
 * Phase 16.1 — Wizard de saisie manuelle pour le simulateur agence.
 *
 * Clone du Pro Audit Editor sans save DB : calcul live pur via computeDpe
 * (TS pure, pas d'EF). Pour les cas où l'agence est avec son client en
 * face et veut affiner les valeurs en temps réel.
 */
import { useEffect, useMemo, useState } from 'react'
import { Calculator, Loader, RotateCcw } from 'lucide-react'
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

export default function ManualWizard() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [livePreview, setLivePreview] = useState<DpeResult | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)

  const inputs = useMemo(() => formToInputs(form), [form])
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setLivePreview(computeDpe(inputs))
        setCalcError(null)
      } catch (err) {
        setLivePreview(null)
        setCalcError(err instanceof Error ? err.message : 'Erreur calcul')
      }
    }, 250)
    return () => clearTimeout(t)
  }, [inputs])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Form 2/3 */}
      <div className="space-y-3 lg:col-span-2">
        <Section title="1. Localisation">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code INSEE">
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.codeInsee}
                onChange={(e) => setForm({ ...form, codeInsee: e.target.value })}
                placeholder="ex 35238 = Rennes"
              />
            </Field>
            <Field label="Altitude (m)">
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.altitude}
                onChange={(e) => setForm({ ...form, altitude: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Section>

        <Section title="2. Bâtiment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.typeBatiment}
                onChange={(e) => setForm({ ...form, typeBatiment: e.target.value as TypeBatiment })}
              >
                <option value="maison">Maison individuelle</option>
                <option value="appartement">Appartement</option>
                <option value="immeuble">Immeuble</option>
              </select>
            </Field>
            <Field label="Période de construction">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.periodeConstruction}
                onChange={(e) =>
                  setForm({ ...form, periodeConstruction: e.target.value as PeriodeConstruction })
                }
              >
                {PERIODES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Surface habitable (m²)">
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.surfaceHabitable}
                onChange={(e) =>
                  setForm({ ...form, surfaceHabitable: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Hauteur sous plafond (m)">
              <input
                type="number"
                step="0.1"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.hauteurSousPlafond}
                onChange={(e) =>
                  setForm({ ...form, hauteurSousPlafond: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Inertie">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.inertie as string}
                onChange={(e) => setForm({ ...form, inertie: e.target.value })}
              >
                <option value="LEGERE">Légère</option>
                <option value="moyenne">Moyenne</option>
                <option value="LOURDE">Lourde</option>
              </select>
            </Field>
            <Field label="Niveaux">
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.nombreNiveaux}
                onChange={(e) =>
                  setForm({ ...form, nombreNiveaux: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </Section>

        <Section title="3. Isolation parois">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Surface murs (m²)">
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.surfaceMurs}
                onChange={(e) => setForm({ ...form, surfaceMurs: Number(e.target.value) })}
              />
            </Field>
            <Field label="Isolation murs">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.isolationMurs}
                onChange={(e) =>
                  setForm({ ...form, isolationMurs: e.target.value as FormState['isolationMurs'] })
                }
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
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.isolationToiture}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isolationToiture: e.target.value as FormState['isolationToiture'],
                  })
                }
              >
                <option value="sans">Sans</option>
                <option value="iti_100">100mm</option>
                <option value="iti_200">200mm</option>
                <option value="iti_300">300mm</option>
              </select>
            </Field>
            <Field label="Isolation plancher bas">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.isolationPlancherBas}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isolationPlancherBas: e.target.value as FormState['isolationPlancherBas'],
                  })
                }
              >
                <option value="sans">Sans</option>
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
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.surfaceFenetresSud}
                onChange={(e) =>
                  setForm({ ...form, surfaceFenetresSud: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Fenêtres Nord (m²)">
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.surfaceFenetresNord}
                onChange={(e) =>
                  setForm({ ...form, surfaceFenetresNord: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Vitrage">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.vitrage}
                onChange={(e) =>
                  setForm({ ...form, vitrage: e.target.value as FormState['vitrage'] })
                }
              >
                <option value="simple">Simple</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="5. Équipements énergétiques">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Générateur chauffage">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.chauffageGenerateur}
                onChange={(e) =>
                  setForm({
                    ...form,
                    chauffageGenerateur: e.target.value as GenerateurChauffage,
                  })
                }
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
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.chauffageEmetteur}
                onChange={(e) => setForm({ ...form, chauffageEmetteur: e.target.value })}
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
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.chauffageAnnee}
                onChange={(e) =>
                  setForm({ ...form, chauffageAnnee: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Régulation pièce/pièce">
              <input
                type="checkbox"
                className="rounded mt-2"
                checked={form.chauffageRegulation}
                onChange={(e) =>
                  setForm({ ...form, chauffageRegulation: e.target.checked })
                }
              />
            </Field>
            <Field label="ECS — Type">
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.ecsGenerateur}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ecsGenerateur: e.target.value as FormState['ecsGenerateur'],
                  })
                }
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
                className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                value={form.ecsStockageL}
                onChange={(e) =>
                  setForm({ ...form, ecsStockageL: Number(e.target.value) })
                }
              />
            </Field>
            <div className="col-span-2">
              <Field label="Ventilation">
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm"
                  value={form.ventilation}
                  onChange={(e) =>
                    setForm({ ...form, ventilation: e.target.value as Ventilation })
                  }
                >
                  <option value="naturelle">Naturelle</option>
                  <option value="vmc_sf_auto_apres_2000">VMC simple flux auto</option>
                  <option value="vmc_sf_hygro_a">VMC hygro A</option>
                  <option value="vmc_sf_hygro_b_apres_2012">VMC hygro B (post-2012)</option>
                  <option value="vmc_double_flux_avec_recup">VMC double flux + récup.</option>
                </select>
              </Field>
            </div>
          </div>
        </Section>

        <button
          type="button"
          onClick={() => setForm(DEFAULT_FORM)}
          className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mt-2"
        >
          <RotateCcw size={12} />
          Réinitialiser le formulaire
        </button>
      </div>

      {/* Live preview 1/3 (sticky) */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <Calculator size={12} />
            Calcul live
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
                <div className="font-semibold text-slate-700 mb-1.5">Détail calcul</div>
                <Row label="Énergie (CEP)">
                  <strong>{livePreview.etiquetteEnergie}</strong> ·{' '}
                  {Math.round(livePreview.cepKwhEpM2An)} kWh EP/m²/an
                </Row>
                <Row label="Climat (GES)">
                  <strong>{livePreview.etiquetteClimat}</strong> ·{' '}
                  {livePreview.gesKgCo2M2An.toFixed(1)} kg CO₂/m²/an
                </Row>
                <Row label="Zone climatique">
                  {livePreview.hypotheses.zoneClimatique}
                </Row>
                <Row label="Moteur 3CL">
                  v{livePreview.hypotheses.moteurVersion}
                </Row>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">
                <p className="font-bold text-emerald-900 mb-1">💡 Astuce</p>
                <p className="text-emerald-800 leading-snug">
                  Modifiez les paramètres ci-contre — le calcul se met à jour en temps réel.
                  Idéal en RDV client pour comparer les scénarios "tel quel" vs "post-rénovation".
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 flex items-center gap-2">
              {calcError ? (
                <span className="text-red-600">⚠ {calcError}</span>
              ) : (
                <>
                  <Loader size={12} className="animate-spin" />
                  Calcul…
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-bold text-[#0a5e2a]">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-700">{label}</span>
      {children}
    </label>
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
