/**
 * Phase 16 — Étude prospect agence (clone fidèle du simulateur BRH 8915).
 *
 * Réplique le panel slide-in droit de /opt/stack/simulateur-brh/templates/index.html :
 *   - DPE strip (étiquette actuelle + GES + après travaux + gain)
 *   - KPI row (surface, année, conso, chauffage, coût/an, niveaux)
 *   - Détail dépenses énergétiques (chauffage / ECS / éclairage)
 *   - Bloc propriétaire (SCI / personne morale)
 *   - État isolation (badges colorés bad/medium/good)
 *   - Transaction DVF proche
 *   - 3 scénarios cliquables (Geste seul / Bouquet / BBC) avec filtrage
 *   - Travaux recommandés (liste avec qté + prix)
 *   - Aides personnalisées avec form foyer + RFR + recalcul décile
 *   - Itinéraire Google Maps + Waze
 *   - + Spécifique agence : footer "Claim ce lead"
 */
import { useMemo, useState } from 'react'
import { X, MapPin, Lock, AlertTriangle, AlertOctagon, Phone, Mail } from 'lucide-react'
import { useProspectEnrichment } from '@/hooks/queries/enrichment'

type Decile = 'bleu' | 'jaune' | 'violet' | 'rose'

type Scenario = {
  label: string
  gestes: string[]
  gain_pct: number
  cep_projete: number
  deperditions_used?: string
}

type ChiffrageItem = {
  qte: number
  unite: string
  montant_ttc: number
  prix_unitaire_ttc: number
  mot_cle_batichiffrage?: string
}

type AidesGeste = {
  cee: number
  qte: number
  mpr_bleu: number
  mpr_jaune: number
  mpr_violet: number
  mpr_rose: number
  cee_modeste: number
}

export type ProspectStudy = {
  id: number
  iris_code?: string | null
  adresse: string | null
  adresse_ban: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  latitude: number | null
  longitude: number | null
  etiquette_dpe: string | null
  etiquette_ges: string | null
  type_batiment: string | null
  periode_construction: string | null
  surface_habitable: number | null
  annee_construction: number | null
  cout_energie_annuel: number | null
  conso_m2_ep: number | null
  energie_chauffage: string | null
  type_energie_chauffage: string | null
  type_energie_ecs: string | null
  type_ventilation: string | null
  cout_chauffage: number | null
  cout_ecs: number | null
  cout_eclairage: number | null
  hauteur_sous_plafond: number | null
  nombre_niveau: number | null
  qualite_isolation_murs: string | null
  qualite_isolation_plancher_haut: string | null
  qualite_isolation_plancher_bas: string | null
  qualite_isolation_menuiseries: string | null
  isolation_toiture_detail: string | null
  owner_name: string | null
  owner_siren: string | null
  owner_type: string | null
  dvf_prix: number | null
  dvf_date: string | null
  dvf_prix_m2: number | null
  dvf_distance_m: number | null
  dvf_type: string | null
  mpr_bleu_total: number
  mpr_jaune_total: number
  mpr_violet_total: number
  mpr_rose_total: number
  cee_total: number
  aides_detail: { detail?: Record<string, AidesGeste>; cee_total_modeste?: number }
  chiffrage_total_ttc: number
  chiffrage_total_ht?: number
  chiffrage_detail: Record<string, ChiffrageItem>
  dpe_saut_s1: Scenario
  dpe_saut_s2: Scenario
  dpe_saut_s3: Scenario
}

const SCENARIO_TITLES: Record<string, { title: string; tag: string }> = {
  s1: { title: 'Geste seul', tag: '1 geste' },
  s2: { title: 'Bouquet', tag: '3-4 gestes' },
  s3: { title: 'BBC', tag: 'Tous gestes' },
}

const GESTE_LABELS: Record<string, string> = {
  pac_air_eau: 'Pompe à chaleur air/eau',
  pac_air_air: 'Pompe à chaleur air/air',
  pac_eau_eau: 'Pompe à chaleur eau/eau',
  isolation_combles: 'Isolation des combles',
  isolation_murs_ite: 'Isolation murs (ITE)',
  isolation_murs_iti: 'Isolation murs (ITI)',
  isolation_planchers_bas: 'Isolation plancher bas',
  fenetres_double_vitrage: 'Fenêtres double vitrage',
  vmc_double_flux: 'VMC double flux',
  chaudiere_gaz_thpe: 'Chaudière gaz THPE',
  poele_a_bois: 'Poêle à bois',
  ballon_thermodynamique: 'Ballon thermodynamique',
  solaire_thermique: 'Solaire thermique',
}

function labelGeste(g: string): string {
  return GESTE_LABELS[g] ?? g.replace(/_/g, ' ')
}

const DECILE_LABELS: Record<Decile, string> = {
  bleu: 'Très modeste',
  jaune: 'Modeste',
  violet: 'Intermédiaire',
  rose: 'Supérieur',
}

function decileFromIncome(rfr: number, foyer: number): Decile {
  // Plafonds 2026 simplifiés ANAH par taille de foyer
  const PLAFONDS: Record<Decile, number[]> = {
    bleu: [22461, 32967, 39591, 46226, 52886],
    jaune: [27343, 40130, 48197, 56276, 64380],
    violet: [38184, 56130, 67585, 79041, 90496],
    rose: [Infinity, Infinity, Infinity, Infinity, Infinity],
  }
  const idx = Math.min(Math.max(foyer - 1, 0), 4)
  if (rfr <= PLAFONDS.bleu[idx]) return 'bleu'
  if (rfr <= PLAFONDS.jaune[idx]) return 'jaune'
  if (rfr <= PLAFONDS.violet[idx]) return 'violet'
  return 'rose'
}

function isoClass(v: string | null): string {
  const s = (v ?? '').toLowerCase()
  if (s.includes('insuf') || s.includes('non isol')) return 'iso-bad'
  if (s.includes('moyen')) return 'iso-medium'
  if (s.includes('bonn') || s.includes('élev')) return 'iso-good'
  return ''
}

const DPE_BG: Record<string, string> = {
  A: '#00a651',
  B: '#50b748',
  C: '#aed136',
  D: '#fbe600',
  E: '#f7a823',
  F: '#e87a30',
  G: '#d11919',
}

const ISO_BADGE_CLASS: Record<string, string> = {
  'iso-bad': 'bg-red-100 text-red-700 border-red-200',
  'iso-medium': 'bg-orange-100 text-orange-700 border-orange-200',
  'iso-good': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '': 'bg-slate-100 text-slate-600 border-slate-200',
}

interface Props {
  study: ProspectStudy
  onClose: () => void
  onClaim: () => void
  alreadyClaimed: boolean
  quotaExhausted: boolean
  isClaiming: boolean
  /** Footer custom pour remplacer le bouton "Claim" (utilisé par /agence/leads). */
  customFooter?: React.ReactNode
}

export function ProspectStudyPanel({
  study: d,
  onClose,
  onClaim,
  alreadyClaimed,
  quotaExhausted,
  isClaiming,
  customFooter,
}: Props) {
  const [scenario, setScenario] = useState<'s1' | 's2' | 's3'>('s2')
  const [foyer, setFoyer] = useState(2)
  const [rfr, setRfr] = useState(30000)
  const [recomputed, setRecomputed] = useState(false)

  // Enrichissement IRIS / commune / artisans / aides locales (non bloquant)
  const enrichmentInput = useMemo(
    () => ({
      irisCode: d.iris_code ?? null,
      codePostal: d.code_postal,
      lat: d.latitude,
      lng: d.longitude,
      departement: d.departement,
      gestesPrioritaires: d.dpe_saut_s2?.gestes ?? [],
    }),
    [d.iris_code, d.code_postal, d.latitude, d.longitude, d.departement, d.dpe_saut_s2],
  )
  const { data: enrichment } = useProspectEnrichment(enrichmentInput)

  const decile = useMemo(() => {
    // Auto-decile via IRIS quand RFR pas encore touché
    if (!recomputed && enrichment?.iris?.couleur_mpr) {
      return enrichment.iris.couleur_mpr
    }
    return decileFromIncome(rfr, foyer)
  }, [rfr, foyer, recomputed, enrichment])

  const scenarios = useMemo<Record<'s1' | 's2' | 's3', Scenario>>(
    () => ({
      s1: d.dpe_saut_s1,
      s2: d.dpe_saut_s2,
      s3: d.dpe_saut_s3,
    }),
    [d.dpe_saut_s1, d.dpe_saut_s2, d.dpe_saut_s3],
  )
  const sActive = scenarios[scenario] ?? ({ label: '?', gestes: [], gain_pct: 0, cep_projete: 0 } as Scenario)
  const cible = sActive.label
  const gainPct = Math.round(sActive.gain_pct ?? 0)
  const gestesActive = useMemo(() => sActive.gestes ?? [], [sActive.gestes])

  // Filtrer chiffrage et aides selon scénario actif
  const filteredDetail = useMemo(() => {
    const r: Record<string, ChiffrageItem> = {}
    for (const g of gestesActive) {
      if (d.chiffrage_detail[g]) r[g] = d.chiffrage_detail[g]
    }
    return r
  }, [d.chiffrage_detail, gestesActive])

  const totalFilteredTtc = useMemo(
    () => Object.values(filteredDetail).reduce((s, v) => s + (v.montant_ttc || 0), 0),
    [filteredDetail],
  )

  const { mprFiltered, ceeFiltered, ceeFilteredModeste } = useMemo(() => {
    const aidesParGeste = d.aides_detail?.detail ?? {}
    const mpr = { bleu: 0, jaune: 0, violet: 0, rose: 0 }
    let cee = 0
    let ceeModeste = 0
    for (const g of gestesActive) {
      const dg = aidesParGeste[g]
      if (!dg) continue
      mpr.bleu += dg.mpr_bleu || 0
      mpr.jaune += dg.mpr_jaune || 0
      mpr.violet += dg.mpr_violet || 0
      mpr.rose += dg.mpr_rose || 0
      cee += dg.cee || 0
      ceeModeste += dg.cee_modeste || 0
    }
    return { mprFiltered: mpr, ceeFiltered: cee, ceeFilteredModeste: ceeModeste }
  }, [d.aides_detail, gestesActive])

  const mprCur = mprFiltered[decile] ?? 0
  const ceeCur = decile === 'bleu' || decile === 'jaune' ? ceeFilteredModeste : ceeFiltered
  const reste = Math.max(0, totalFilteredTtc - mprCur - ceeCur)

  const adresse = d.adresse_ban ?? d.adresse ?? '—'
  const surface = Math.round(d.surface_habitable ?? 0)
  const annee = d.annee_construction ?? '—'
  const conso = Math.round(d.conso_m2_ep ?? 0)
  const chauf = (d.type_energie_chauffage ?? d.energie_chauffage ?? '—').replace(
    /electricite|électricité/i,
    'élec.',
  )
  const coutTotal = Math.round(d.cout_energie_annuel ?? 0)
  const coutCh = Math.round(d.cout_chauffage ?? 0)
  const coutEcs = Math.round(d.cout_ecs ?? 0)
  const coutEcl = Math.round(d.cout_eclairage ?? 0)

  const mapsQuery = encodeURIComponent((adresse || '') + ' Bretagne France')
  const wazeUrl = `https://www.waze.com/ul?ll=${d.latitude},${d.longitude}&navigate=yes`

  const ges = d.etiquette_ges
  const dpe = d.etiquette_dpe ?? '?'

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-stretch justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:w-[460px] sm:max-w-[460px] h-[90vh] sm:h-screen overflow-y-auto rounded-t-2xl sm:rounded-none shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-slate-50"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>

        <div className="p-6 space-y-4 flex-1">
          {/* Source badge */}
          <span className="inline-block text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 uppercase tracking-wider font-bold rounded-full">
            DPE ADEME officiel
          </span>

          {/* Title + adresse */}
          <div>
            <h1 className="text-xl font-bold text-[#0a5e2a] mb-1">Étude énergétique</h1>
            <p className="text-sm text-slate-600 flex items-start gap-1">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <span>
                {adresse}
                {d.commune ? <span className="text-slate-500"> · {d.commune}</span> : null}
              </span>
            </p>
          </div>

          {/* Owner block */}
          {d.owner_name ? (
            <div className="bg-gradient-to-br from-[#0f3460] to-[#16537e] text-white rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                Propriétaire identifié
              </p>
              <p className="font-bold text-base leading-tight">{d.owner_name}</p>
              <p className="text-xs opacity-80 mt-0.5">
                {d.owner_type ?? '—'}
                {d.owner_siren ? ` · SIREN ${d.owner_siren}` : ''}
              </p>
            </div>
          ) : null}

          {/* DPE strip */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl p-3">
            <div className="text-center flex-1">
              <span
                className="inline-block px-3 py-1.5 rounded-md text-white font-bold text-2xl leading-none min-w-[40px]"
                style={{
                  background: DPE_BG[dpe] ?? '#888',
                  color: dpe === 'D' ? '#333' : '#fff',
                }}
              >
                {dpe}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">DPE actuel</p>
            </div>
            {ges ? (
              <div className="text-center flex-1">
                <span
                  className="inline-block px-2 py-1 rounded-md text-white font-bold text-base leading-none"
                  style={{ background: DPE_BG[ges] ?? '#888', color: ges === 'D' ? '#333' : '#fff' }}
                >
                  {ges}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">GES</p>
              </div>
            ) : null}
            <span className="text-slate-400 text-xl">→</span>
            <div className="text-center flex-1">
              <span
                className="inline-block px-3 py-1.5 rounded-md text-white font-bold text-2xl leading-none min-w-[40px]"
                style={{ background: DPE_BG[cible] ?? '#888', color: cible === 'D' ? '#333' : '#fff' }}
              >
                {cible}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Après travaux</p>
            </div>
            <div className="bg-amber-50 border-2 border-orange-400 rounded-md p-2 text-center">
              <p className="text-orange-600 font-bold text-base leading-none">−{gainPct}%</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Conso énergie</p>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2">
            <Kpi value={`${surface} m²`} label="Surface" />
            <Kpi value={String(annee)} label="Année" />
            <Kpi value={String(conso)} label="kWh/m²/an EP" />
            <Kpi value={chauf} label="Chauffage" />
            {coutTotal ? (
              <Kpi value={`${coutTotal.toLocaleString('fr-FR')} €`} label="Coût énergie/an" />
            ) : null}
            {d.nombre_niveau ? <Kpi value={String(d.nombre_niveau)} label="Niveaux" /> : null}
          </div>

          {/* Détail dépenses */}
          {coutCh || coutEcs ? (
            <Section title="Détail des dépenses énergétiques annuelles">
              <div className="grid grid-cols-3 gap-2">
                {coutCh ? (
                  <Kpi
                    value={`${coutCh.toLocaleString('fr-FR')} €`}
                    label="Chauffage"
                    color="#e87a30"
                  />
                ) : null}
                {coutEcs ? (
                  <Kpi
                    value={`${coutEcs.toLocaleString('fr-FR')} €`}
                    label="Eau chaude"
                    color="#1565c0"
                  />
                ) : null}
                {coutEcl ? (
                  <Kpi
                    value={`${coutEcl.toLocaleString('fr-FR')} €`}
                    label="Éclairage"
                    color="#fbc02d"
                  />
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Isolation */}
          {d.qualite_isolation_murs ||
          d.qualite_isolation_plancher_haut ||
          d.qualite_isolation_plancher_bas ||
          d.qualite_isolation_menuiseries ? (
            <Section title="État de l'isolation">
              <ul className="divide-y divide-slate-100">
                {d.qualite_isolation_murs ? (
                  <IsoRow label="Murs" value={d.qualite_isolation_murs} />
                ) : null}
                {d.qualite_isolation_plancher_haut ? (
                  <IsoRow
                    label="Toiture / combles"
                    value={d.isolation_toiture_detail || d.qualite_isolation_plancher_haut}
                  />
                ) : null}
                {d.qualite_isolation_plancher_bas ? (
                  <IsoRow label="Plancher bas" value={d.qualite_isolation_plancher_bas} />
                ) : null}
                {d.qualite_isolation_menuiseries ? (
                  <IsoRow label="Fenêtres" value={d.qualite_isolation_menuiseries} />
                ) : null}
              </ul>
            </Section>
          ) : null}

          {/* DVF */}
          {d.dvf_prix ? (
            <Section title="Transaction immo à proximité">
              <div className="grid grid-cols-2 gap-2">
                <Kpi
                  value={`${d.dvf_prix.toLocaleString('fr-FR')} €`}
                  label="Prix vente"
                  color="#0a5e2a"
                />
                <Kpi
                  value={d.dvf_prix_m2 ? `${d.dvf_prix_m2.toLocaleString('fr-FR')} €/m²` : '—'}
                  label="Prix/m²"
                  color="#0a5e2a"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {d.dvf_date} · {d.dvf_type ?? 'Vente'} · à {d.dvf_distance_m}m
              </p>
            </Section>
          ) : null}

          {/* 3 scénarios */}
          <Section title="3 scénarios de rénovation">
            <div className="grid grid-cols-3 gap-2">
              {(['s1', 's2', 's3'] as const).map((s) => {
                const sc = scenarios[s]
                const lab = sc?.label ?? '—'
                const g = Math.round(sc?.gain_pct ?? 0)
                const titles = SCENARIO_TITLES[s]
                const active = s === scenario
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScenario(s)}
                    className={`p-2 rounded-xl border-2 text-center transition ${
                      active
                        ? 'border-orange-400 bg-amber-50'
                        : 'border-slate-200 bg-white hover:border-[#0a5e2a]'
                    }`}
                  >
                    <p className="font-bold text-xs text-[#0a5e2a]">{titles.title}</p>
                    <p className="text-[10px] uppercase text-slate-500">{titles.tag}</p>
                    <span
                      className="inline-block px-2 py-0.5 mt-1 rounded text-white font-bold text-base"
                      style={{
                        background: DPE_BG[lab] ?? '#888',
                        color: lab === 'D' ? '#333' : '#fff',
                      }}
                    >
                      {lab}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">−{g}%</p>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Travaux */}
          <Section title="Travaux recommandés">
            {Object.keys(filteredDetail).length === 0 ? (
              <p className="text-xs text-slate-500 italic">Pas de travaux à proposer.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {Object.entries(filteredDetail).map(([g, info]) => (
                  <li key={g} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800 truncate">{labelGeste(g)}</p>
                      <p className="text-[11px] text-slate-500">
                        {info.qte} {info.unite}
                      </p>
                    </div>
                    <p className="font-bold text-blue-700 text-sm tabular-nums whitespace-nowrap">
                      {Math.round(info.montant_ttc).toLocaleString('fr-FR')} €
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-slate-200 text-sm">
              <span>Total estimé TTC</span>
              <b className="text-[#0a5e2a] text-base">
                {Math.round(totalFilteredTtc).toLocaleString('fr-FR')} €
              </b>
            </div>
          </Section>

          {/* Aides */}
          <Section title="Aides personnalisées">
            <div className="flex gap-2 items-end mb-3">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-600 mb-1">Personnes</label>
                <select
                  value={foyer}
                  onChange={(e) => {
                    setFoyer(Number(e.target.value))
                    setRecomputed(true)
                  }}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                      {n === 5 ? '+' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-slate-600 mb-1">Revenu fiscal</label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={rfr}
                  onChange={(e) => {
                    setRfr(Number(e.target.value))
                    setRecomputed(true)
                  }}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>
                  <b>Catégorie :</b> {DECILE_LABELS[decile]}
                  {recomputed ? <span className="text-emerald-600 ml-1">·  recalculé</span> : null}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>MaPrimeRénov'</span>
                <span className="font-bold text-[#0a5e2a]">
                  {Math.round(mprCur).toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prime CEE</span>
                <span className="font-bold text-[#0a5e2a]">
                  {Math.round(ceeCur).toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 mt-1 border-t-2 border-dashed border-emerald-300">
                <span>
                  <b>Reste à charge</b>
                </span>
                <span className="font-bold text-[#0a5e2a] text-lg">
                  {Math.round(reste).toLocaleString('fr-FR')} €
                </span>
              </div>
            </div>
          </Section>

          {/* Itinéraire */}
          {/* === NOUVELLES SECTIONS ENRICHISSEMENT === */}

          {/* Contexte socio-économique IRIS */}
          {enrichment?.iris ? (
            <Section title="Contexte socio-économique du quartier">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 space-y-1.5">
                {enrichment.iris.med21 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Revenu médian commune</span>
                    <span className="font-bold text-indigo-700">
                      {Math.round(enrichment.iris.med21).toLocaleString('fr-FR')} € / an
                    </span>
                  </div>
                ) : null}
                {enrichment.iris.couleur_mpr ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Catégorie MPR estimée</span>
                    <span className="font-bold text-indigo-700">
                      {DECILE_LABELS[enrichment.iris.couleur_mpr]} ({enrichment.iris.couleur_mpr})
                    </span>
                  </div>
                ) : null}
                {enrichment.iris.tx_proprio != null ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Taux propriétaires</span>
                    <span className="font-medium text-slate-800">
                      {Math.round(enrichment.iris.tx_proprio * 100)} %
                    </span>
                  </div>
                ) : null}
                {enrichment.iris.tx_avant_1975 != null ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Logements pré-1975 (cible rénovation)</span>
                    <span className="font-medium text-slate-800">
                      {Math.round(enrichment.iris.tx_avant_1975 * 100)} %
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Source : INSEE Filosofi 2021 · IRIS {enrichment.iris.iris_code}
              </p>
            </Section>
          ) : null}

          {/* Risques & dispositifs commune (Géorisques + OPAH) */}
          {enrichment?.commune ? (
            <Section title="Risques & dispositifs commune">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {enrichment.commune.radon_categorie != null ? (
                  <Tag
                    icon={<AlertOctagon size={12} />}
                    label="Radon"
                    value={`Catégorie ${enrichment.commune.radon_categorie}/3`}
                    danger={enrichment.commune.radon_categorie === 3}
                  />
                ) : null}
                {enrichment.commune.rga_alea ? (
                  <Tag
                    icon={<AlertOctagon size={12} />}
                    label="Argile"
                    value={enrichment.commune.rga_alea}
                    danger={enrichment.commune.rga_alea === 'fort'}
                  />
                ) : null}
                {enrichment.commune.ppri_present ? (
                  <Tag
                    icon={<AlertOctagon size={12} />}
                    label="PPRI"
                    value="Inondation"
                    danger
                  />
                ) : null}
                {enrichment.commune.sismique_zone != null && enrichment.commune.sismique_zone > 0 ? (
                  <Tag
                    icon={<AlertOctagon size={12} />}
                    label="Sismique"
                    value={`Zone ${enrichment.commune.sismique_zone}`}
                  />
                ) : null}
              </div>
              {enrichment.commune.opah_active ? (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                  <p className="font-bold text-emerald-900 mb-0.5">
                    🌟 OPAH active — {enrichment.commune.opah_type ?? 'Programme local'}
                  </p>
                  <p className="text-emerald-700">
                    Opérateur : {enrichment.commune.opah_operateur ?? '—'}
                    {enrichment.commune.opah_fin_validite
                      ? ` · Jusqu'au ${new Date(
                          enrichment.commune.opah_fin_validite,
                        ).toLocaleDateString('fr-FR')}`
                      : ''}
                  </p>
                </div>
              ) : null}
              {enrichment.commune.tx_vacance_struct != null && enrichment.commune.tx_vacance_struct > 0.05 ? (
                <p className="text-[11px] text-amber-700 mt-2">
                  ⚠ Taux vacance structurelle : {Math.round(enrichment.commune.tx_vacance_struct * 100)} %
                  (signal marché tendu)
                </p>
              ) : null}
            </Section>
          ) : null}

          {/* Artisans RGE proches */}
          {enrichment?.artisans_proches && enrichment.artisans_proches.length > 0 ? (
            <Section title="Artisans RGE proches du bien">
              <ul className="space-y-2">
                {enrichment.artisans_proches.map((a) => (
                  <li
                    key={a.id}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm truncate">
                          {a.nom_entreprise}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {a.commune}
                          {a.code_postal ? ` (${a.code_postal})` : ''} · à {a.distance_km.toFixed(1)} km
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                        RGE
                      </span>
                    </div>
                    {a.geste_specialites.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {a.geste_specialites.slice(0, 4).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                          >
                            {g.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex gap-2 text-xs">
                      {a.telephone ? (
                        <a
                          href={`tel:${a.telephone}`}
                          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                        >
                          <Phone size={11} />
                          {a.telephone}
                        </a>
                      ) : null}
                      {a.email ? (
                        <a
                          href={`mailto:${a.email}`}
                          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 truncate"
                        >
                          <Mail size={11} />
                          {a.email}
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 mt-2">
                Source : registre RGE France-rénov · {enrichment.artisans_proches.length} suggestions filtrées par dept + spécialités
              </p>
            </Section>
          ) : null}

          {/* Aides locales Bretagne */}
          {enrichment?.aides_locales && enrichment.aides_locales.length > 0 ? (
            <Section title="Aides locales Bretagne (cumulables MPR/CEE)">
              <ul className="space-y-1.5">
                {enrichment.aides_locales.slice(0, 6).map((aide) => (
                  <li
                    key={aide.id}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-amber-900 truncate flex-1">
                        {aide.programme}
                      </p>
                      {aide.forfait_euros ? (
                        <span className="font-mono font-bold text-amber-700 whitespace-nowrap">
                          {aide.forfait_euros.toLocaleString('fr-FR')} €
                        </span>
                      ) : aide.taux_pct ? (
                        <span className="font-mono font-bold text-amber-700 whitespace-nowrap">
                          {aide.taux_pct} %
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-600">
                      {aide.organisme} · geste {aide.geste_id.replace(/_/g, ' ')}
                      {aide.plafond_euros ? ` · plafond ${aide.plafond_euros.toLocaleString('fr-FR')} €` : ''}
                    </p>
                    {aide.url_officielle ? (
                      <a
                        href={aide.url_officielle}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-amber-700 hover:underline"
                      >
                        Plus d'infos →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Itinéraire vers le logement">
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1a73e8] text-white text-sm font-bold rounded-lg hover:bg-[#155bb5]"
              >
                📍 Google Maps
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#33ccff] text-white text-sm font-bold rounded-lg hover:bg-[#00aae0]"
              >
                🚗 Waze
              </a>
            </div>
          </Section>

          <p className="text-[10px] text-slate-400 leading-relaxed">
            Étude indicative. Source : DPE ADEME officiel. Barèmes MaPrimeRénov' 2026. Audit RGE
            requis pour signature.
          </p>
        </div>

        {/* Sticky footer */}
        <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {customFooter ? (
            customFooter
          ) : alreadyClaimed ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Lock size={16} />
              Lead déjà réservé
            </div>
          ) : quotaExhausted ? (
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertTriangle size={16} />
              Quota mensuel atteint
            </div>
          ) : (
            <button
              type="button"
              onClick={onClaim}
              disabled={isClaiming}
              className="w-full px-4 py-3 bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
            >
              {isClaiming ? 'Claim en cours…' : 'Claim ce lead — exclusivité 30j'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

function Kpi({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2 text-center">
      <p className="font-bold text-base" style={{ color: color ?? '#0a5e2a' }}>
        {value}
      </p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-[#0a5e2a] pb-1.5 border-b-2 border-emerald-100">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Tag({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
        danger
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-slate-50 border border-slate-200 text-slate-700'
      }`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
      <span className="ml-auto">{value}</span>
    </div>
  )
}

function IsoRow({ label, value }: { label: string; value: string }) {
  const cls = isoClass(value)
  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span>{label}</span>
      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${ISO_BADGE_CLASS[cls]}`}>
        {value}
      </span>
    </li>
  )
}
