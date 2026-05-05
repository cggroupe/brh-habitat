/**
 * Phase 16.1 — Rapport d'étude énergétique imprimable (A4 print-friendly).
 *
 * Affiché dans un modal full-screen. L'utilisateur clique sur "Imprimer"
 * pour générer un PDF via le navigateur (Cmd+P → Save as PDF).
 *
 * Layout : 1ʳᵉ page synthèse + caractéristiques · 2ᵉ page 3 scénarios chiffrés.
 */
import { X, Printer } from 'lucide-react'
import type { ScenarioComputed } from '@/lib/dpe-engine/variantes'
import type { DpeResult } from '@/lib/dpe-engine/types'

interface FormSummary {
  typeBatiment: string
  periodeConstruction: string
  surfaceHabitable: number
  nombreNiveaux: number
  hauteurSousPlafond: number
  isolationMurs: string
  isolationToiture: string
  isolationPlancherBas: string
  vitrage: string
  surfaceFenetresSud: number
  surfaceFenetresNord: number
  chauffageGenerateur: string
  chauffageEmetteur: string
  chauffageAnnee: number
  ecsGenerateur: string
  ecsStockageL: number
  ventilation: string
  codeInsee: string
  altitude: number
}

interface Props {
  form: FormSummary
  preview: DpeResult
  scenarios: ScenarioComputed[]
  onClose: () => void
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

const SCENARIO_LABELS: Record<string, string> = {
  isolation_combles: 'Geste seul — isolation combles',
  enveloppe_iti: 'Bouquet — enveloppe complète',
  isolation_pac: 'Rénovation globale — enveloppe + PAC + ECS thermo.',
}

export function StudyReport({ form, preview, scenarios, onClose }: Props) {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-[1500] bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible"
      onClick={onClose}
    >
      {/* Toolbar (caché en print) */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-md print:hidden">
        <p className="text-sm font-semibold text-slate-700">
          Aperçu rapport d'étude énergétique
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-sm font-bold rounded-lg shadow hover:shadow-md"
          >
            <Printer size={14} />
            Imprimer / PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            <X size={14} />
            Fermer
          </button>
        </div>
      </div>

      {/* Page A4 */}
      <div
        className="mx-auto my-6 bg-white shadow-2xl print:shadow-none print:my-0"
        style={{ maxWidth: '210mm', minHeight: '297mm' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-12 space-y-8 print:p-10">
          {/* === HEADER ===  */}
          <header className="border-b-4 border-[#0a5e2a] pb-4 flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#0a5e2a] font-bold">
                Rapport d'étude énergétique
              </p>
              <h1 className="text-3xl font-bold text-slate-900 mt-1">BRH Habitat</h1>
              <p className="text-xs text-slate-500 mt-1">
                Bretagne Rénovation Habitat — Étude virtuelle simplifiée
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Édité le</p>
              <p className="text-sm font-semibold text-slate-800">{today}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                Code INSEE : {form.codeInsee} · Altitude {form.altitude} m
              </p>
            </div>
          </header>

          {/* === DPE BIG ===  */}
          <section className="text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
              Diagnostic de Performance Énergétique estimé
            </p>
            <div className="flex items-center justify-center gap-6 my-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase mb-1">Énergie</p>
                <span
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white font-bold text-5xl shadow-lg"
                  style={{
                    background: DPE_BG[preview.etiquetteDpe],
                    color: preview.etiquetteDpe === 'D' ? '#333' : '#fff',
                  }}
                >
                  {preview.etiquetteDpe}
                </span>
                <p className="text-[11px] text-slate-600 mt-2">
                  {Math.round(preview.cepKwhEpM2An)} kWh EP/m²/an
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase mb-1">Climat (GES)</p>
                <span
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white font-bold text-5xl shadow-lg"
                  style={{
                    background: DPE_BG[preview.etiquetteClimat],
                    color: preview.etiquetteClimat === 'D' ? '#333' : '#fff',
                  }}
                >
                  {preview.etiquetteClimat}
                </span>
                <p className="text-[11px] text-slate-600 mt-2">
                  {preview.gesKgCo2M2An.toFixed(1)} kg CO₂/m²/an
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Zone climatique : {preview.hypotheses.zoneClimatique} · Moteur 3CL v
              {preview.hypotheses.moteurVersion}
            </p>
          </section>

          {/* === CARACTÉRISTIQUES ===  */}
          <section>
            <h2 className="text-sm font-bold text-[#0a5e2a] mb-3 pb-1.5 border-b-2 border-emerald-100 uppercase tracking-wider">
              Caractéristiques du logement
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Type de bâtiment" value={cap(form.typeBatiment)} />
              <Row label="Période de construction" value={form.periodeConstruction} />
              <Row label="Surface habitable" value={`${form.surfaceHabitable} m²`} />
              <Row
                label="Hauteur sous plafond"
                value={`${form.hauteurSousPlafond} m`}
              />
              <Row label="Niveaux" value={String(form.nombreNiveaux)} />
              <Row
                label="Volume habitable"
                value={`${(form.surfaceHabitable * form.hauteurSousPlafond).toFixed(0)} m³`}
              />
            </div>
          </section>

          {/* === ENVELOPPE / ÉQUIPEMENTS ===  */}
          <section className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-bold text-[#0a5e2a] mb-3 pb-1.5 border-b-2 border-emerald-100 uppercase tracking-wider">
                Enveloppe
              </h2>
              <div className="space-y-1.5 text-sm">
                <Row label="Isolation murs" value={cap(form.isolationMurs)} />
                <Row label="Isolation toiture" value={cap(form.isolationToiture)} />
                <Row
                  label="Isolation plancher"
                  value={cap(form.isolationPlancherBas)}
                />
                <Row label="Vitrage" value={cap(form.vitrage)} />
                <Row
                  label="Fenêtres sud"
                  value={`${form.surfaceFenetresSud} m²`}
                />
                <Row
                  label="Fenêtres nord"
                  value={`${form.surfaceFenetresNord} m²`}
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#0a5e2a] mb-3 pb-1.5 border-b-2 border-emerald-100 uppercase tracking-wider">
                Équipements énergétiques
              </h2>
              <div className="space-y-1.5 text-sm">
                <Row
                  label="Chauffage"
                  value={cap(form.chauffageGenerateur.replace(/_/g, ' '))}
                />
                <Row
                  label="Émetteur"
                  value={cap(form.chauffageEmetteur.replace(/_/g, ' '))}
                />
                <Row
                  label="Année installation"
                  value={String(form.chauffageAnnee)}
                />
                <Row label="ECS" value={cap(form.ecsGenerateur)} />
                <Row label="Stockage ECS" value={`${form.ecsStockageL} L`} />
                <Row
                  label="Ventilation"
                  value={cap(form.ventilation.replace(/_/g, ' '))}
                />
              </div>
            </div>
          </section>

          {/* === SCÉNARIOS ===  */}
          <section className="page-break-before">
            <h2 className="text-sm font-bold text-[#0a5e2a] mb-3 pb-1.5 border-b-2 border-emerald-100 uppercase tracking-wider">
              3 scénarios de rénovation chiffrés
            </h2>

            <div className="space-y-3">
              {scenarios.map((sc, i) => {
                const labelTitle =
                  SCENARIO_LABELS[sc.template.id] ?? sc.template.label
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
                    className="border-2 border-slate-200 rounded-lg p-4 print:break-inside-avoid"
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="font-bold text-slate-800">
                        Scénario {i + 1} — {labelTitle}
                      </p>
                      <span className="text-xs uppercase tracking-wider bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        −{gainPct} % conso
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      {sc.template.description}
                    </p>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Avant</p>
                        <span
                          className="inline-block w-10 h-10 rounded-md text-white font-bold text-lg flex items-center justify-center mt-1"
                          style={{ background: DPE_BG[preview.etiquetteDpe] }}
                        >
                          {preview.etiquetteDpe}
                        </span>
                      </div>
                      <span className="text-2xl text-slate-400">→</span>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase">Après</p>
                        <span
                          className="inline-block w-10 h-10 rounded-md text-white font-bold text-lg flex items-center justify-center mt-1"
                          style={{ background: DPE_BG[sc.result.etiquetteDpe] }}
                        >
                          {sc.result.etiquetteDpe}
                        </span>
                      </div>
                      <div className="ml-auto text-right text-xs">
                        <p className="text-slate-500">Conso après</p>
                        <p className="font-bold text-slate-800">
                          {Math.round(sc.result.cepKwhEpM2An)} kWh EP/m²/an
                        </p>
                      </div>
                    </div>

                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-t border-slate-100">
                          <td className="py-1.5 text-slate-600">Coût total TTC</td>
                          <td className="py-1.5 text-right font-bold text-blue-700 tabular-nums">
                            {Math.round(sc.coutTtcEuros).toLocaleString('fr-FR')} €
                          </td>
                        </tr>
                        <tr className="border-t border-slate-100">
                          <td className="py-1.5 text-slate-600">
                            Aides estimées (MaPrimeRénov' + CEE)
                          </td>
                          <td className="py-1.5 text-right font-bold text-emerald-700 tabular-nums">
                            −{Math.round(sc.aidesEuros.total).toLocaleString('fr-FR')} €
                          </td>
                        </tr>
                        <tr className="border-t-2 border-slate-300 bg-emerald-50">
                          <td className="py-2 px-1 font-bold text-slate-800">
                            Reste à charge estimé
                          </td>
                          <td className="py-2 px-1 text-right font-bold text-[#0a5e2a] text-base tabular-nums">
                            {Math.round(reste).toLocaleString('fr-FR')} €
                          </td>
                        </tr>
                        {sc.payback.paybackAnnees != null &&
                        sc.payback.paybackAnnees > 0 &&
                        sc.payback.paybackAnnees < 99 ? (
                          <tr>
                            <td className="py-1 text-[11px] text-slate-500 italic">
                              Retour sur investissement
                            </td>
                            <td className="py-1 text-right text-[11px] text-slate-500 italic">
                              ~{Math.round(sc.payback.paybackAnnees)} ans
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </section>

          {/* === FOOTER LÉGAL === */}
          <footer className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1">Mentions légales</p>
            <p>
              Étude indicative basée sur les déclarations de l'utilisateur et le moteur
              de calcul 3CL-DPE intégré BRH Habitat. Précision ±1 classe DPE par rapport
              à un audit officiel signé. Les chiffrages sont des forfaits estimatifs
              Bretagne 2026, hors taxes spécifiques. Aides MaPrimeRénov' + CEE selon
              barèmes 2026 (couleur Jaune par défaut). Les valeurs réelles peuvent
              varier selon le contexte du chantier, la couleur MPR du foyer et la zone
              climatique exacte.
            </p>
            <p className="mt-2">
              Pour un audit officiel signé éligible à toutes les aides : contacter un
              professionnel RGE BRH Habitat à hello@renovation-brh.fr.
            </p>
            <p className="mt-2 text-center font-semibold">
              www.renovation-brh.fr · BRH Habitat · Bretagne Rénovation Habitat
            </p>
          </footer>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .page-break-before { page-break-before: always; }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-100 pb-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  )
}

function cap(s: string): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}
