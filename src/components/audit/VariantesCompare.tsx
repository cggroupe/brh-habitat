/**
 * Comparateur de scénarios de rénovation.
 *
 * Affiche les 5 templates prédéfinis avec :
 * - Étiquette DPE avant → après
 * - Gain énergie en %
 * - Coût travaux + aides + reste à charge
 * - Payback simple (USP BRH, ADR-005)
 *
 * Phase 7 V1 : calcul live côté front (les 5 scénarios calculés en <100ms).
 * Phase 7.1+ : sauvegarde des scénarios sélectionnés dans `brh_audit_variantes`.
 */

import { useMemo } from 'react'
import { TrendingDown, ArrowRight, AlertCircle, CheckCircle, Wrench } from 'lucide-react'
import {
  computeAllScenarios,
  ORDER_DPE,
  type AuditInputs,
  type DpeResult,
  type ScenarioComputed,
  type EtiquetteDpe,
} from '@/lib/dpe-engine'

interface Props {
  baseInputs: AuditInputs
  baseDpe: DpeResult
}

const ETIQUETTE_BG: Record<EtiquetteDpe, string> = {
  A: 'bg-[#319834] text-white',
  B: 'bg-[#33CC33] text-white',
  C: 'bg-[#CCCC33] text-black',
  D: 'bg-[#FFCC33] text-black',
  E: 'bg-[#FF9933] text-white',
  F: 'bg-[#FF6633] text-white',
  G: 'bg-[#FF3333] text-white',
}

function fmtEuros(v: number): string {
  return v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
}

function EtiquetteBadge({ value }: { value: EtiquetteDpe }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-sm font-black ${ETIQUETTE_BG[value]}`}
    >
      {value}
    </span>
  )
}

export function VariantesCompare({ baseInputs, baseDpe }: Props) {
  const scenarios = useMemo<ScenarioComputed[]>(
    () => computeAllScenarios(baseInputs, baseDpe),
    [baseInputs, baseDpe],
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">
          Scénarios de rénovation comparés
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          5 packs prédéfinis du moins cher au plus complet. Le payback est le
          temps de retour sur investissement après aides.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Scénario</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                DPE
                <br />
                <span className="text-xs font-normal">avant → après</span>
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                Gain énergie
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                Coût TTC
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Aides</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                Reste à charge
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Payback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Ligne situation actuelle */}
            <tr className="bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-700">Situation actuelle</div>
                <div className="text-xs text-gray-500">Sans rénovation</div>
              </td>
              <td className="px-3 py-3 text-center">
                <EtiquetteBadge value={baseDpe.etiquetteDpe} />
                <div className="mt-1 text-xs text-gray-500">
                  {Math.round(baseDpe.cepKwhEpM2An)} kWh EP/m²
                </div>
              </td>
              <td className="px-3 py-3 text-right text-gray-400">—</td>
              <td className="px-3 py-3 text-right text-gray-400">—</td>
              <td className="px-3 py-3 text-right text-gray-400">—</td>
              <td className="px-3 py-3 text-right text-gray-400">—</td>
              <td className="px-3 py-3 text-right text-gray-400">—</td>
            </tr>

            {scenarios.map((s) => {
              const gainKwh = baseDpe.consoEfTotaleKwhAn - s.result.consoEfTotaleKwhAn
              const gainPct =
                baseDpe.consoEfTotaleKwhAn > 0
                  ? Math.round((gainKwh / baseDpe.consoEfTotaleKwhAn) * 100)
                  : 0
              const ameliorationClasses =
                ORDER_DPE[baseDpe.etiquetteDpe] - ORDER_DPE[s.result.etiquetteDpe]
              return (
                <tr key={s.template.id} className="hover:bg-green-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <Wrench className="h-4 w-4 text-green-700" />
                      {s.template.label}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{s.template.description}</div>
                    <div className="mt-1 text-xs text-gray-400">
                      {s.gestes.length} geste{s.gestes.length > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <EtiquetteBadge value={baseDpe.etiquetteDpe} />
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <EtiquetteBadge value={s.result.etiquetteDpe} />
                    </div>
                    {ameliorationClasses > 0 && (
                      <div className="mt-1 text-xs font-semibold text-green-700">
                        +{ameliorationClasses} classe{ameliorationClasses > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {gainPct > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                        <TrendingDown className="h-3 w-3" />
                        {gainPct}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    <div className="text-xs text-gray-500">
                      {Math.round(gainKwh).toLocaleString('fr-FR')} kWh/an
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="font-semibold">{fmtEuros(s.coutTtcEuros)}</div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="font-semibold text-blue-700">
                      {fmtEuros(s.aidesEuros.total)}
                    </div>
                    <div className="text-xs text-gray-500">
                      MPR {Math.round(s.aidesEuros.mpr / 100) / 10}k + CEE{' '}
                      {Math.round(s.aidesEuros.cee / 100) / 10}k
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="font-semibold text-green-700">
                      {fmtEuros(s.payback.resteACharge)}
                    </div>
                    <div className="text-xs text-gray-500">
                      après aides
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {s.payback.paybackAnnees != null ? (
                      <>
                        <div
                          className={`font-bold ${
                            s.payback.alerteSuperieur30Ans
                              ? 'text-orange-700'
                              : s.payback.paybackAnnees < 10
                                ? 'text-green-700'
                                : 'text-gray-700'
                          }`}
                        >
                          {s.payback.paybackAnnees < 30
                            ? `${s.payback.paybackAnnees.toFixed(1)} ans`
                            : '> 30 ans'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fmtEuros(s.payback.economieEurosAn)}/an
                        </div>
                        {s.payback.alerteSuperieur30Ans && (
                          <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-orange-600">
                            <AlertCircle className="h-3 w-3" />
                            Long
                          </div>
                        )}
                        {s.payback.paybackAnnees < 8 && (
                          <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Très rentable
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <strong>USP BRH</strong> : payback simple = (coût travaux − aides) / économie
        annuelle. Hypothèses prix énergie 2026, MPR + CEE forfaitaires V1. Phase 8+ :
        moteur aides détaillé par décile et plafonds réglementaires.
      </div>
    </div>
  )
}
