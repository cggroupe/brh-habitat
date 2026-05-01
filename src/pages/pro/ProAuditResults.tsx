/**
 * Page résultats audit — affichage détaillé après calcul + finalisation.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Edit, Loader } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useAudit } from '@/hooks/queries/audits'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import { AuditPdf } from '@/components/audit/pdf/AuditPdf'
import type { DpeResult } from '@/lib/dpe-engine/types'

export default function ProAuditResults() {
  const { id } = useParams<{ id: string }>()
  const { data: audit, isLoading } = useAudit(id)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const handleGeneratePdf = async () => {
    if (!audit) return
    setGeneratingPdf(true)
    try {
      const r = audit.results as DpeResult
      const blob = await pdf(<AuditPdf audit={audit} result={r} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-energetique-${audit.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF : ' + String(e))
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (isLoading) return <div className="p-6 text-gray-500">Chargement…</div>
  if (!audit) return <div className="p-6 text-red-600">Audit introuvable</div>

  const result = audit.results as DpeResult | Record<string, unknown>
  const hasResult =
    result && typeof result === 'object' && 'cepKwhEpM2An' in result

  if (!hasResult) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Link
          to={`/pro/audits/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'éditeur
        </Link>
        <div className="mt-6 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
          Cet audit n'a pas encore été calculé. Lancez le calcul depuis l'éditeur.
        </div>
      </div>
    )
  }

  const r = result as DpeResult

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
          {audit.status === 'draft' && (
            <Link
              to={`/pro/audits/${id}`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" /> Modifier
            </Link>
          )}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {generatingPdf ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Générer PDF
          </button>
        </div>
      </div>

      {/* 3 étiquettes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DpeLabelGauge
          etiquette={r.etiquetteEnergie}
          value={r.cepKwhEpM2An}
          unit="kWh EP/m²·an"
          type="energie"
          title="Étiquette énergie (CEP)"
        />
        <DpeLabelGauge
          etiquette={r.etiquetteClimat}
          value={r.gesKgCo2M2An}
          unit="kg CO₂/m²·an"
          type="climat"
          title="Étiquette climat (GES)"
        />
        <DpeLabelGauge
          etiquette={r.etiquetteDpe}
          value={r.cepKwhEpM2An}
          unit="kWh EP/m²·an"
          type="final"
          title="DPE final (max)"
        />
      </div>

      {/* Détail par poste */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Consommations par poste (kWh EP/an)
          </h3>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <PosteLine label="Chauffage" value={r.parPoste.chauffage} />
              <PosteLine label="Eau chaude sanitaire" value={r.parPoste.ecs} />
              <PosteLine label="Éclairage" value={r.parPoste.eclairage} />
              <PosteLine label="Auxiliaires (ventilation, pompes)" value={r.parPoste.auxiliaires} />
              <PosteLine label="Climatisation" value={r.parPoste.refroidissement} />
            </tbody>
          </table>
          <div className="mt-3 border-t pt-3 text-sm font-semibold text-gray-900">
            Total CEP : {Math.round(r.cepKwhEpM2An * audit.cep_kwh_ep_m2_an! * 0)}
            <span className="ml-2 text-base font-bold tabular-nums">
              {Math.round((r.parPoste.chauffage + r.parPoste.ecs + r.parPoste.eclairage + r.parPoste.auxiliaires + r.parPoste.refroidissement))} kWh/an
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Déperditions thermiques (W/K)
          </h3>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <PosteLine label="Parois opaques" value={r.deperditions.parois} />
              <PosteLine label="Ouvertures" value={r.deperditions.ouvertures} />
              <PosteLine label="Ponts thermiques" value={r.deperditions.pontsThermiques} />
              <PosteLine label="Renouvellement air" value={r.deperditions.renouvellementAir} />
            </tbody>
          </table>
          <div className="mt-3 border-t pt-3 text-sm font-semibold text-gray-900">
            GV total : <span className="font-bold tabular-nums">{Math.round(r.deperditions.total)} W/K</span>
          </div>
          <div className="text-sm text-gray-700">
            Ubat : <span className="font-bold tabular-nums">{r.deperditions.ubat.toFixed(2)} W/m²·K</span>
          </div>
        </div>
      </div>

      {/* Hypothèses */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <h3 className="font-bold text-gray-700">Hypothèses du calcul</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div>
            <div className="text-xs text-gray-500">Zone climatique</div>
            <div className="font-mono">{r.hypotheses.zoneClimatique}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Altitude</div>
            <div className="font-mono">{r.hypotheses.altitude} m</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">N adeq</div>
            <div className="font-mono">{r.hypotheses.nadeq.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Moteur</div>
            <div className="font-mono">v{r.hypotheses.moteurVersion}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PosteLine({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td className="py-1.5 text-gray-700">{label}</td>
      <td className="py-1.5 text-right tabular-nums text-gray-900">{Math.round(value)}</td>
    </tr>
  )
}
