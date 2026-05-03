/**
 * Phase 13.6.7 — Page admin gestion commissions BRH.
 *
 * Workflow admin :
 *   1. Sélectionne le mois à facturer
 *   2. Clique "Générer les factures" → agrège les leads completed du mois
 *   3. Voit la liste des factures (par artisan) avec statut + montant
 *   4. Marque "Facturée" / "Payée" / "Réconciliée" selon le suivi comptable
 *   5. Phase 13.6.7.1+ : Stripe Connect pour auto-prélèvement
 */

import { useMemo, useState } from 'react'
import {
  Euro,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  Wrench,
  Mail,
  FileText,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import {
  useCommissionInvoicesForPeriod,
  useGenerateInvoices,
  useMarkInvoicePaid,
  useUpdateInvoiceStatus,
  useUploadCommissionPdf,
  useSendCommissionInvoice,
  useLastCronRun,
} from '@/hooks/queries/admin-commissions'
import { adminCommissionsApi, type CommissionInvoiceEnriched, type CommissionInvoiceRow } from '@/api/admin-commissions'
import { CommissionInvoicePdf } from '@/components/admin/CommissionInvoicePdf'

const STATUS_LABELS: Record<CommissionInvoiceRow['status'], string> = {
  pending: 'À facturer',
  invoiced: 'Facturée',
  paid: 'Payée',
  reconciled: 'Réconciliée',
  canceled: 'Annulée',
  disputed: 'Litige',
}

const STATUS_COLORS: Record<CommissionInvoiceRow['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  invoiced: 'bg-blue-100 text-blue-900 border-blue-300',
  paid: 'bg-green-100 text-green-900 border-green-300',
  reconciled: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  canceled: 'bg-gray-100 text-gray-700 border-gray-300',
  disputed: 'bg-red-100 text-red-900 border-red-300',
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(Number(n))) return '0 €'
  return `${Math.round(Number(n)).toLocaleString('fr-FR')} €`
}

function defaultPeriod(): { year: number; month: number } {
  const now = new Date()
  // Par défaut, mois précédent (on facture le mois M en M+1)
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function AdminCommissionsArtisans() {
  const init = defaultPeriod()
  const [year, setYear] = useState(init.year)
  const [month, setMonth] = useState(init.month)
  const [error, setError] = useState<string | null>(null)
  const [genResult, setGenResult] = useState<{ created: number; skipped: number } | null>(null)

  const { data: invoices, isLoading } = useCommissionInvoicesForPeriod(year, month)
  const { data: lastCronRun } = useLastCronRun()
  const generate = useGenerateInvoices()
  const markPaid = useMarkInvoicePaid()
  const updateStatus = useUpdateInvoiceStatus()
  const uploadPdf = useUploadCommissionPdf()
  const sendEmail = useSendCommissionInvoice()
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; errors: number } | null>(null)

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, totalDue: 0, totalPaid: 0, nbInvoices: 0, nbArtisans: 0 }
    return {
      nbInvoices: invoices.length,
      nbArtisans: new Set(invoices.map((i) => i.artisan_id)).size,
      total: invoices.reduce((s, i) => s + Number(i.total_chantiers_ttc_eur ?? 0), 0),
      totalDue: invoices.reduce((s, i) => s + Number(i.total_commission_due_eur ?? 0), 0),
      totalPaid: invoices
        .filter((i) => i.status === 'paid' || i.status === 'reconciled')
        .reduce((s, i) => s + Number(i.total_commission_due_eur ?? 0), 0),
    }
  }, [invoices])

  const handleGenerate = async () => {
    setError(null)
    setGenResult(null)
    try {
      const results = await generate.mutateAsync({ year, month })
      const created = results.filter((r) => r.is_new).length
      const skipped = results.length - created
      setGenResult({ created, skipped })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleMarkPaid = async (invoiceId: string) => {
    setError(null)
    try {
      await markPaid.mutateAsync({ invoiceId })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleSetStatus = async (
    invoiceId: string,
    status: CommissionInvoiceRow['status'],
  ) => {
    setError(null)
    try {
      await updateStatus.mutateAsync({ invoiceId, patch: { status } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  /**
   * Phase 13.6.7.2 — Génère PDF + upload Storage + envoie email en 1 clic.
   */
  const handleSendInvoice = async (invoice: CommissionInvoiceEnriched) => {
    setError(null)
    setSendingId(invoice.id)
    try {
      // 1. Charge les leads liés (audit trail)
      const leads = await adminCommissionsApi.getLeadsForInvoice(invoice.id)

      // 2. Numéro facture : BRH-2026-04-{artisan_id_short}
      const invoiceNumber = `BRH-${invoice.period_year}-${String(invoice.period_month).padStart(2, '0')}-${invoice.artisan_id.slice(0, 8).toUpperCase()}`

      // 3. Génère PDF côté front
      const blob = await pdf(
        <CommissionInvoicePdf invoice={invoice} leads={leads} invoiceNumber={invoiceNumber} />,
      ).toBlob()

      // 4. Upload Storage
      await uploadPdf.mutateAsync({ invoice, blob })

      // 5. Envoie email Resend
      await sendEmail.mutateAsync(invoice.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSendingId(null)
    }
  }

  /**
   * Phase 13.6.7.3 — Envoi bulk de toutes les factures pending/invoiced sans pdf.
   * 3 envois parallèles + 500ms throttle pour respecter rate limit EF (30/min).
   */
  const handleSendAll = async () => {
    if (!invoices) return
    setError(null)
    const targets = invoices.filter((i) => i.status === 'pending' && (!i.pdf_path || !i.email_sent_at))
    if (targets.length === 0) {
      setError('Aucune facture pending à envoyer.')
      return
    }
    if (!confirm(`Envoyer ${targets.length} factures aux artisans ? Cela peut prendre ~${Math.ceil(targets.length / 3)} minutes.`)) {
      return
    }

    setBulkProgress({ done: 0, total: targets.length, errors: 0 })

    let cursor = 0
    let done = 0
    let errors = 0
    const PARALLEL = 3
    const PACE_MS = 500

    const launch = async (): Promise<void> => {
      if (cursor >= targets.length) return
      const idx = cursor++
      const inv = targets[idx]
      try {
        await handleSendInvoice(inv)
      } catch {
        errors++
      }
      done++
      setBulkProgress({ done, total: targets.length, errors })
      await new Promise((r) => setTimeout(r, PACE_MS))
      return launch()
    }

    await Promise.all(Array.from({ length: PARALLEL }, () => launch()))
    setBulkProgress(null)
  }

  const handleDownloadPdf = async (invoice: CommissionInvoiceEnriched) => {
    setError(null)
    try {
      const leads = await adminCommissionsApi.getLeadsForInvoice(invoice.id)
      const invoiceNumber = `BRH-${invoice.period_year}-${String(invoice.period_month).padStart(2, '0')}-${invoice.artisan_id.slice(0, 8).toUpperCase()}`
      const blob = await pdf(
        <CommissionInvoicePdf invoice={invoice} leads={leads} invoiceNumber={invoiceNumber} />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Euro className="h-6 w-6 text-emerald-700" /> Commissions artisans BRH
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Tracking des commissions BRH (5-10 % chantiers signés). Facturation mensuelle.
        </p>
      </div>

      {/* Phase 13.6.7.3.1 — Widget cron status */}
      {lastCronRun && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            lastCronRun.status === 'success'
              ? 'border-blue-200 bg-blue-50 text-blue-900'
              : lastCronRun.status === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-yellow-200 bg-yellow-50 text-yellow-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <strong>Dernière exécution cron auto-génération :</strong>{' '}
              {new Date(lastCronRun.started_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
              {' · '}
              <span className="capitalize">{lastCronRun.status}</span>
              {lastCronRun.status === 'success' && (
                <>
                  {' · '}
                  <strong>{lastCronRun.invoices_created ?? 0}</strong> nouvelle(s) facture(s)
                  {lastCronRun.total_commission_eur != null && (
                    <>
                      {' · '}
                      <strong>{formatEur(Number(lastCronRun.total_commission_eur))}</strong>{' '}
                      de commission générée
                    </>
                  )}
                </>
              )}
              {lastCronRun.status === 'error' && lastCronRun.error_message && (
                <span className="ml-2 italic">— {lastCronRun.error_message}</span>
              )}
            </div>
            <span className="text-[10px] opacity-70">
              Cron : 1er du mois à 02h UTC · pg_cron
            </span>
          </div>
        </div>
      )}

      {/* Sélecteur période */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Mois</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border-gray-300 text-sm"
          >
            {MONTHS_FR.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Année</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border-gray-300 text-sm"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {generate.isPending ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Générer les factures du mois
        </button>
        {invoices && invoices.some((i) => i.status === 'pending') && (
          <button
            type="button"
            onClick={handleSendAll}
            disabled={bulkProgress !== null}
            className="inline-flex items-center gap-2 rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            title="Envoie en bulk toutes les factures pending"
          >
            {bulkProgress ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {bulkProgress
              ? `Envoi ${bulkProgress.done}/${bulkProgress.total}`
              : `Envoyer tout (${invoices.filter((i) => i.status === 'pending').length})`}
          </button>
        )}
      </div>

      {/* Progress bulk */}
      {bulkProgress && (
        <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-purple-900">
              Envoi en cours : {bulkProgress.done}/{bulkProgress.total}
              {bulkProgress.errors > 0 && (
                <span className="ml-2 text-red-700">({bulkProgress.errors} erreurs)</span>
              )}
            </span>
            <span className="text-xs text-purple-700">
              {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-purple-200">
            <div
              className="h-full bg-purple-600 transition-all"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Notifications */}
      {genResult && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Génération terminée</div>
            <div className="text-xs">
              {genResult.created} nouvelle(s) facture(s) créée(s) ·{' '}
              {genResult.skipped} déjà existante(s) (skip idempotent)
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Erreur</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {/* Stats KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Factures" value={stats.nbInvoices} />
        <KpiCard label="Artisans" value={stats.nbArtisans} />
        <KpiCard label="CA chantiers TTC" value={formatEur(stats.total)} />
        <KpiCard label="Commission totale" value={formatEur(stats.totalDue)} accent="emerald" />
        <KpiCard label="Déjà encaissée" value={formatEur(stats.totalPaid)} accent="green" />
      </div>

      {/* Liste */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            <Euro className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <div className="font-medium">
              Aucune facture pour {MONTHS_FR[month - 1]} {year}
            </div>
            <p className="mt-1 text-xs">
              Cliquez sur &quot;Générer les factures du mois&quot; pour agréger les chantiers
              terminés sur cette période.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Artisan
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Dépt
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Leads
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    CA chantiers
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    %
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Commission
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-amber-600" />
                        <span className="font-medium text-gray-900">
                          {inv.artisan_nom_entreprise ?? inv.artisan_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{inv.artisan_commune}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{inv.artisan_departement}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{inv.nb_leads_completed}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {formatEur(inv.total_chantiers_ttc_eur)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-500">
                      {(Number(inv.commission_pct) * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">
                      {formatEur(inv.total_commission_due_eur)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status]}`}
                      >
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          title="Télécharger PDF (sans envoi)"
                        >
                          <FileText className="h-3 w-3" />
                        </button>
                        {(inv.status === 'pending' || inv.status === 'invoiced') && (
                          <button
                            type="button"
                            onClick={() => handleSendInvoice(inv)}
                            disabled={sendingId === inv.id}
                            className="inline-flex items-center gap-0.5 rounded-md bg-purple-700 px-2 py-1 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-50"
                            title="Génère PDF + Upload Storage + envoie email Resend"
                          >
                            {sendingId === inv.id ? (
                              <Loader className="h-3 w-3 animate-spin" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                            Envoyer
                          </button>
                        )}
                        {inv.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(inv.id, 'invoiced')}
                            disabled={updateStatus.isPending}
                            className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                            title="Marquer facturée (sans envoi)"
                          >
                            Facturée
                          </button>
                        )}
                        {(inv.status === 'pending' || inv.status === 'invoiced') && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={markPaid.isPending}
                            className="inline-flex items-center gap-0.5 rounded-md bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3 w-3" /> Payée
                          </button>
                        )}
                        {inv.status === 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(inv.id, 'reconciled')}
                            disabled={updateStatus.isPending}
                            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Réconciliée
                          </button>
                        )}
                        {(inv.status === 'pending' || inv.status === 'invoiced') && (
                          <button
                            type="button"
                            onClick={() => handleSetStatus(inv.id, 'canceled')}
                            disabled={updateStatus.isPending}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            title="Annuler"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
        <strong>Workflow facturation BRH</strong> : début du mois M+1, cliquez &quot;Générer
        factures&quot; pour le mois M. Chaque facture agrège les chantiers `completed` du mois.
        Status : <strong>À facturer</strong> → Émettre la facture → <strong>Facturée</strong>{' '}
        (Stripe Invoice ou PDF) → Encaissement → <strong>Payée</strong> (cascade
        commission_paid_eur sur leads) → <strong>Réconciliée</strong> (compta).
        <div className="mt-2 italic">
          Phase 13.6.7.1 (à venir) : intégration Stripe Connect pour auto-prélèvement SEPA.
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: 'emerald' | 'green'
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-700',
    green: 'text-green-700',
    default: 'text-gray-900',
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${colors[accent ?? 'default']}`}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </div>
    </div>
  )
}

