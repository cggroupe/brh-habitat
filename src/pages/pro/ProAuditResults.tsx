/**
 * Page résultats audit — affichage détaillé après calcul + finalisation.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, FileCode, Edit, Loader, Mail, X, CheckCircle } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useAudit, useUploadAuditPdf, useSendAuditByEmail } from '@/hooks/queries/audits'
import { DpeLabelGauge } from '@/components/audit/DpeLabelGauge'
import { VariantesCompare } from '@/components/audit/VariantesCompare'
import { AuditPdf } from '@/components/audit/pdf/AuditPdf'
import type { AuditInputs, DpeResult } from '@/lib/dpe-engine/types'
import { buildAuditXml, suggestXmlFilename } from '@/lib/dpe-engine/exports/xml-ademe'

export default function ProAuditResults() {
  const { id } = useParams<{ id: string }>()
  const { data: audit, isLoading } = useAudit(id)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const uploadPdf = useUploadAuditPdf()
  const sendEmail = useSendAuditByEmail()

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!audit) return null
    const r = audit.results as DpeResult
    return pdf(<AuditPdf audit={audit} result={r} />).toBlob()
  }

  const handleGeneratePdf = async () => {
    if (!audit) return
    setGeneratingPdf(true)
    try {
      const blob = await generatePdfBlob()
      if (!blob) return
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

  const handleDownloadXml = () => {
    if (!audit) return
    try {
      const xml = buildAuditXml({
        audit: {
          id: audit.id,
          created_at: audit.created_at,
          finalized_at: audit.finalized_at,
        },
        inputs: audit.inputs as AuditInputs,
        result: audit.results as DpeResult,
      })
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = suggestXmlFilename({
        id: audit.id,
        finalized_at: audit.finalized_at,
      })
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du XML : ' + String(e))
    }
  }

  const handleSendEmail = async () => {
    if (!audit || !emailRecipient) return
    try {
      // 1) Génère le PDF côté front
      const blob = await generatePdfBlob()
      if (!blob) throw new Error('Génération PDF échouée')

      // 2) Upload dans Supabase Storage
      await uploadPdf.mutateAsync({ id: audit.id, blob })

      // 3) EF send-audit-email envoie le mail Resend avec lien
      await sendEmail.mutateAsync({
        auditId: audit.id,
        recipientEmail: emailRecipient,
        message: emailMessage || undefined,
      })

      setEmailSent(true)
      setTimeout(() => {
        setEmailDialogOpen(false)
        setEmailSent(false)
        setEmailRecipient('')
        setEmailMessage('')
      }, 2000)
    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'envoi : " + String(e))
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
            Télécharger PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadXml}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Export XML conforme schéma ADEME 5.3.1 (audit opposable)"
          >
            <FileCode className="h-4 w-4" /> XML ADEME
          </button>
          <button
            type="button"
            onClick={() => setEmailDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            <Mail className="h-4 w-4" /> Envoyer par email
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

      {/* Variantes / Scénarios de rénovation */}
      <div className="mt-6">
        <VariantesCompare baseInputs={audit.inputs as AuditInputs} baseDpe={r} />
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

      {/* Dialog Envoyer par email */}
      {emailDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Envoyer l'audit au client</h2>
              <button
                type="button"
                onClick={() => setEmailDialogOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {emailSent ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-600" />
                <p className="text-lg font-semibold text-green-700">Email envoyé !</p>
                <p className="text-sm text-gray-600">
                  Le client recevra l'audit dans quelques instants.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Email du client
                  </span>
                  <input
                    type="email"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="client@exemple.fr"
                    className="w-full rounded border-gray-300 text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Message personnalisé (optionnel)
                  </span>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                    placeholder="Bonjour, voici votre audit énergétique..."
                    className="w-full rounded border-gray-300 text-sm"
                  />
                </label>

                <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
                  Le PDF sera généré, sauvegardé dans votre espace BRH, et envoyé au client avec
                  un lien de téléchargement valable 30 jours.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailDialogOpen(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={
                      !emailRecipient ||
                      uploadPdf.isPending ||
                      sendEmail.isPending ||
                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)
                    }
                    className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                  >
                    {(uploadPdf.isPending || sendEmail.isPending) ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {uploadPdf.isPending
                      ? 'Génération PDF…'
                      : sendEmail.isPending
                        ? 'Envoi en cours…'
                        : 'Envoyer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
