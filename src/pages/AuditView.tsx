/**
 * Page audit énergétique — vue particulier read-only.
 *
 * RLS Supabase filtre : seul le user_id de l'audit peut voir cet audit
 * (cf. policy `user_select_own_audit` migration brh_audits.sql).
 *
 * Affichage : 3 étiquettes DPE + détail postes + déperditions + bouton
 * "Discuter avec mon artisan" + téléchargement PDF.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, MessageCircle, Loader, Calendar } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useAudit } from '@/hooks/queries/audits'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import { VariantesCompare } from '@/components/audit/VariantesCompare'
import { AuditPdf } from '@/components/audit/pdf/AuditPdf'
import type { AuditInputs, DpeResult } from '@/lib/dpe-engine/types'

export default function AuditView() {
  const { id } = useParams<{ id: string }>()
  const { data: audit, isLoading, error } = useAudit(id)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    if (!audit) return
    setGeneratingPdf(true)
    try {
      const r = audit.results as DpeResult
      const blob = await pdf(<AuditPdf audit={audit} result={r} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mon-audit-energetique-${audit.id.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Erreur lors du téléchargement du PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-green-700" />
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Audit introuvable</h2>
          <p className="mt-2 text-sm text-red-600">
            Cet audit n'existe pas ou vous n'y avez pas accès.
          </p>
          <Link to="/tableau-de-bord" className="mt-4 inline-block text-sm text-red-700 underline">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const result = audit.results as DpeResult | Record<string, unknown>
  const hasResult = result && typeof result === 'object' && 'cepKwhEpM2An' in result

  if (!hasResult) {
    return (
      <div className="container mx-auto max-w-3xl p-6">
        <Link
          to="/tableau-de-bord"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Mon tableau de bord
        </Link>
        <div className="mt-6 rounded-lg bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-800">Audit en cours de réalisation</h2>
          <p className="mt-2 text-sm text-yellow-700">
            Votre artisan RGE n'a pas encore finalisé cet audit. Il vous sera communiqué dès
            qu'il sera prêt.
          </p>
        </div>
      </div>
    )
  }

  const r = result as DpeResult
  const dateFinalize = audit.finalized_at
    ? new Date(audit.finalized_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const isDraft = audit.status === 'draft'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl p-6">
        {/* Breadcrumb */}
        <Link
          to="/tableau-de-bord"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Mon tableau de bord
        </Link>

        {/* Header */}
        <div className="mt-4 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mon audit énergétique</h1>
              <p className="mt-1 text-sm text-gray-500">
                Audit réalisé selon la méthode officielle 3CL-DPE 2021
              </p>
              {dateFinalize && (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Finalisé le {dateFinalize}
                </div>
              )}
              {isDraft && (
                <div className="mt-2 inline-block rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                  ⚠ Brouillon — non encore finalisé par l'artisan
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generatingPdf}
                className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {generatingPdf ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Télécharger le PDF
              </button>
              <Link
                to="/messages"
                className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4" />
                Discuter avec mon artisan
              </Link>
            </div>
          </div>
        </div>

        {/* 3 étiquettes */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <DpeLabelGauge
            etiquette={r.etiquetteEnergie}
            value={r.cepKwhEpM2An}
            unit="kWh EP/m²·an"
            type="energie"
            title="Étiquette énergie"
          />
          <DpeLabelGauge
            etiquette={r.etiquetteClimat}
            value={r.gesKgCo2M2An}
            unit="kg CO₂/m²·an"
            type="climat"
            title="Étiquette climat"
          />
          <DpeLabelGauge
            etiquette={r.etiquetteDpe}
            value={r.cepKwhEpM2An}
            unit="kWh EP/m²·an"
            type="final"
            title="DPE final"
          />
        </div>

        {/* Explication grand public */}
        <div className="mt-6 rounded-lg bg-green-50 p-4">
          <h2 className="text-base font-bold text-green-900">Que signifient ces étiquettes ?</h2>
          <ul className="mt-2 space-y-1 text-sm text-green-800">
            <li>
              <strong>Étiquette énergie</strong> (CEP) : votre consommation d'énergie primaire par
              m² et par an. Plus la lettre est verte, moins votre logement consomme.
            </li>
            <li>
              <strong>Étiquette climat</strong> (GES) : vos émissions de CO₂ par m² et par an. Plus
              la lettre est verte, moins votre logement pollue.
            </li>
            <li>
              <strong>DPE final</strong> : c'est le pire des deux. C'est cette lettre qui apparaît
              officiellement sur les annonces immobilières.
            </li>
          </ul>
        </div>

        {/* Détail postes */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              D'où vient ma consommation ?
            </h3>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <PosteLine label="Chauffage" value={r.parPoste.chauffage} unit="kWh EP/an" />
                <PosteLine label="Eau chaude" value={r.parPoste.ecs} unit="kWh EP/an" />
                <PosteLine label="Éclairage" value={r.parPoste.eclairage} unit="kWh EP/an" />
                <PosteLine
                  label="Auxiliaires (ventilation, pompes)"
                  value={r.parPoste.auxiliaires}
                  unit="kWh EP/an"
                />
                {r.parPoste.refroidissement > 0 && (
                  <PosteLine
                    label="Climatisation"
                    value={r.parPoste.refroidissement}
                    unit="kWh EP/an"
                  />
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Où s'échappe la chaleur ?
            </h3>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <PosteLine
                  label="Murs, planchers, toiture"
                  value={r.deperditions.parois}
                  unit="W/K"
                />
                <PosteLine
                  label="Fenêtres, portes"
                  value={r.deperditions.ouvertures}
                  unit="W/K"
                />
                <PosteLine
                  label="Ponts thermiques"
                  value={r.deperditions.pontsThermiques}
                  unit="W/K"
                />
                <PosteLine
                  label="Renouvellement d'air"
                  value={r.deperditions.renouvellementAir}
                  unit="W/K"
                />
              </tbody>
            </table>
            <div className="mt-3 border-t pt-3 text-sm text-gray-700">
              Total :{' '}
              <span className="font-bold tabular-nums">
                {Math.round(r.deperditions.total)} W/K
              </span>
            </div>
          </div>
        </div>

        {/* Scénarios de rénovation */}
        <div className="mt-6">
          <VariantesCompare baseInputs={audit.inputs as AuditInputs} baseDpe={r} />
        </div>

        {/* CTA finale */}
        <div className="mt-6 rounded-lg bg-gradient-to-br from-green-700 to-green-800 p-6 text-white">
          <h2 className="text-xl font-bold">Prêt à passer à l'action ?</h2>
          <p className="mt-2 text-sm opacity-90">
            Votre audit révèle des opportunités d'économies. Discutez avec votre artisan RGE pour
            un plan de rénovation détaillé et chiffré.
          </p>
          <Link
            to="/messages"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-green-700 hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter mon artisan
          </Link>
        </div>
      </div>
    </div>
  )
}

function PosteLine({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <tr>
      <td className="py-1.5 text-gray-700">{label}</td>
      <td className="py-1.5 text-right tabular-nums text-gray-900">
        <span className="font-semibold">{Math.round(value)}</span>{' '}
        <span className="text-xs text-gray-500">{unit}</span>
      </td>
    </tr>
  )
}
