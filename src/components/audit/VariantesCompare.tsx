/**
 * Comparateur de scénarios de rénovation (Phase 7 + Phase 8.1).
 *
 * Phase 7 : 5 templates prédéfinis avec calcul live (~100ms).
 * Phase 8.1 : sélecteur décile MPR + aides détaillées (MPR + CEE + ÉcoPTZ + plafond).
 *
 * Affiche pour chaque scénario :
 * - Étiquette DPE avant → après + gain énergie %
 * - Coût TTC + détail aides (MPR/CEE/ÉcoPTZ) + plafond global
 * - Reste à charge final + Payback simple (USP BRH)
 */

import { useMemo, useState } from 'react'
import {
  TrendingDown,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Wrench,
  Calculator,
  Award,
  Sparkles,
} from 'lucide-react'
import {
  calcCouleurFromAudit,
  calcCouleurMpr,
  computeAllScenarios,
  ORDER_DPE,
  PLAFOND_GLOBAL_HT_PCT,
  type AuditInputs,
  type CouleurMPR,
  type DpeResult,
  type EtiquetteDpe,
  type ScenarioComputed,
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

const COULEUR_BG: Record<CouleurMPR, string> = {
  bleu: 'bg-blue-100 text-blue-800 border-blue-300',
  jaune: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  violet: 'bg-purple-100 text-purple-800 border-purple-300',
  rose: 'bg-pink-100 text-pink-800 border-pink-300',
}

const COULEUR_LABEL: Record<CouleurMPR, string> = {
  bleu: 'Bleu (très modeste)',
  jaune: 'Jaune (modeste)',
  violet: 'Violet (intermédiaire)',
  rose: 'Rose (non modeste)',
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
  // Décile par défaut depuis l'audit (si renseigné), sinon Jaune (médian)
  const couleurInitiale = useMemo<CouleurMPR>(() => {
    const fromAudit = calcCouleurFromAudit(baseInputs)
    return fromAudit?.couleur ?? 'jaune'
  }, [baseInputs])

  const [couleur, setCouleur] = useState<CouleurMPR>(couleurInitiale)
  const [foyer, setFoyer] = useState({
    nbPersonnes: (baseInputs.foyer?.nbAdultes ?? 2) + (baseInputs.foyer?.nbEnfants ?? 0),
    rfr: baseInputs.foyer?.revenuFiscalReference ?? 35000,
  })
  const [autoDecile, setAutoDecile] = useState(true)

  // Recalcul du décile quand foyer change (mode auto)
  const decileAuto = useMemo(() => {
    return calcCouleurMpr({
      revenuFiscalReference: foyer.rfr,
      nbPersonnes: foyer.nbPersonnes,
      codeInsee: baseInputs.geo.codeInsee,
    })
  }, [foyer, baseInputs.geo.codeInsee])

  const couleurEffective = autoDecile ? decileAuto.couleur : couleur

  // Calcul du saut DPE entre situation actuelle et le meilleur scénario (V1 : on ne le pré-calcule pas, c'est par scénario)
  const scenarios = useMemo<ScenarioComputed[]>(() => {
    return computeAllScenarios(baseInputs, baseDpe, {
      couleur: couleurEffective,
      zoneClimat: baseDpe.hypotheses.zoneClimatique,
    })
  }, [baseInputs, baseDpe, couleurEffective])

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">
          Scénarios de rénovation comparés
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          5 packs prédéfinis avec aides détaillées MaPrimeRénov' + CEE + Éco-PTZ selon votre profil.
        </p>
      </div>

      {/* Sélecteur foyer / décile */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-700">Foyer (personnes)</span>
            <input
              type="number"
              min="1"
              max="10"
              value={foyer.nbPersonnes}
              onChange={(e) =>
                setFoyer({ ...foyer, nbPersonnes: Math.max(1, Number(e.target.value)) })
              }
              className="mt-1 w-20 rounded border-gray-300 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700">
              Revenu fiscal de référence (€/an)
            </span>
            <input
              type="number"
              step="1000"
              value={foyer.rfr}
              onChange={(e) => setFoyer({ ...foyer, rfr: Number(e.target.value) })}
              className="mt-1 w-32 rounded border-gray-300 text-sm"
            />
          </label>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-decile"
              checked={autoDecile}
              onChange={(e) => setAutoDecile(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-decile" className="text-xs text-gray-700">
              Auto
            </label>
          </div>

          {!autoDecile && (
            <label className="block">
              <span className="block text-xs font-medium text-gray-700">Décile MPR</span>
              <select
                value={couleur}
                onChange={(e) => setCouleur(e.target.value as CouleurMPR)}
                className="mt-1 rounded border-gray-300 text-sm"
              >
                <option value="bleu">Bleu (très modeste)</option>
                <option value="jaune">Jaune (modeste)</option>
                <option value="violet">Violet (intermédiaire)</option>
                <option value="rose">Rose (non modeste)</option>
              </select>
            </label>
          )}

          <div className="flex-1" />

          {/* Décile détecté */}
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">Décile MaPrimeRénov'</span>
            <span
              className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-semibold ${COULEUR_BG[couleurEffective]}`}
            >
              <Calculator className="h-3 w-3" />
              {COULEUR_LABEL[couleurEffective]}
            </span>
            <span className="mt-0.5 text-xs text-gray-500">
              Plafond global : {Math.round(PLAFOND_GLOBAL_HT_PCT[couleurEffective] * 100)}% HT
            </span>
          </div>
        </div>

        {autoDecile && (
          <div className="mt-2 text-xs text-gray-500">
            Plafonds {decileAuto.zone === 'idf' ? 'IDF' : 'Régions'} :{' '}
            <span className="text-gray-700">
              ≤{decileAuto.plafonds.tresModeste.toLocaleString('fr-FR')}€ Bleu, ≤
              {decileAuto.plafonds.modeste.toLocaleString('fr-FR')}€ Jaune, ≤
              {decileAuto.plafonds.intermediaire.toLocaleString('fr-FR')}€ Violet
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Scénario</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700">DPE</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Gain</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Coût TTC</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">MPR</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">CEE</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">ÉcoPTZ</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Reste</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Payback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Situation actuelle */}
            <tr className="bg-gray-50">
              <td className="px-3 py-3">
                <div className="font-semibold text-gray-700">Situation actuelle</div>
                <div className="text-xs text-gray-500">Sans rénovation</div>
              </td>
              <td className="px-3 py-3 text-center">
                <EtiquetteBadge value={baseDpe.etiquetteDpe} />
              </td>
              <td colSpan={6} className="px-3 py-3 text-center text-gray-400">
                —
              </td>
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

              const aides = s.aidesDetaillees
              const mprEuros = aides?.mpr.totalEuros ?? s.aidesEuros.mpr
              const ceeEuros = aides?.cee.totalEuros ?? s.aidesEuros.cee
              const ecoPtzEuros = aides?.ecoPtz.montantEligibleEuros ?? 0
              const ecoPtzMode = aides?.ecoPtz.mode

              return (
                <tr key={s.template.id} className="hover:bg-green-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <Wrench className="h-4 w-4 text-green-700" />
                      {s.template.label}
                    </div>
                    <div className="mt-1 max-w-md text-xs text-gray-500">
                      {s.template.description}
                    </div>
                    {/* Badges Phase 9 : MPR Ampleur + bonus */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {aides?.ampleurChosen && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                          <Award className="h-3 w-3" />
                          MPR Ampleur
                          {aides.mprAmpleur?.nbSautsCalcules &&
                            ` (${aides.mprAmpleur.nbSautsCalcules}+ classes)`}
                        </span>
                      )}
                      {aides?.mprAmpleur?.bonusSortiePassoire && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                          <Sparkles className="h-3 w-3" />
                          +10% Sortie passoire
                        </span>
                      )}
                      {aides?.mprAmpleur?.bonusBbc && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Sparkles className="h-3 w-3" />
                          +10% BBC
                        </span>
                      )}
                    </div>
                    {aides?.cumul.ratioEcretement && aides.cumul.ratioEcretement < 1 && (
                      <div className="mt-1 inline-flex items-center gap-0.5 text-xs text-orange-600">
                        <AlertCircle className="h-3 w-3" />
                        Aides écrêtées (plafond {Math.round(PLAFOND_GLOBAL_HT_PCT[couleurEffective] * 100)}%)
                      </div>
                    )}
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
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold">
                    {fmtEuros(s.coutTtcEuros)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className="font-semibold text-blue-700">{fmtEuros(mprEuros)}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className="font-semibold text-blue-700">{fmtEuros(ceeEuros)}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className="font-semibold text-purple-700">{fmtEuros(ecoPtzEuros)}</span>
                    {ecoPtzMode && (
                      <div className="text-[10px] text-gray-500">mode {ecoPtzMode}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="font-bold text-green-700">
                      {fmtEuros(s.payback.resteACharge)}
                    </div>
                    {ecoPtzEuros > 0 && (
                      <div className="text-[10px] text-gray-500">
                        ou {fmtEuros(Math.max(0, s.payback.resteACharge - ecoPtzEuros))}{' '}
                        cash
                      </div>
                    )}
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

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 leading-relaxed">
        <strong>Légende</strong> :{' '}
        <span className="text-blue-700 font-semibold">MPR</span> = MaPrimeRénov' subvention,{' '}
        <span className="text-blue-700 font-semibold">CEE</span> = Certificats d'Économie d'Énergie,{' '}
        <span className="text-purple-700 font-semibold">ÉcoPTZ</span> = Prêt à Taux Zéro (jusqu'à
        20 ans), <span className="text-green-700 font-semibold">Reste</span> = ce qu'il reste après
        MPR + CEE (l'ÉcoPTZ peut couvrir tout ou partie en prêt 0 %). Plafond global d'écrêtement
        appliqué selon le décile :{' '}
        <span className={COULEUR_BG[couleurEffective].split(' ').slice(0, 2).join(' ') + ' rounded px-1'}>
          {Math.round(PLAFOND_GLOBAL_HT_PCT[couleurEffective] * 100)}% HT
        </span>
        .
      </div>
    </div>
  )
}
