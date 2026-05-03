/**
 * Phase 13.6.7.5 — Page artisan : historique factures commission BRH.
 *
 * L'artisan voit toutes ses factures BRH passées (3 ans), peut télécharger
 * le PDF de chacune via signed URL temporaire 5 minutes (RLS Storage path-based).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Euro,
  Loader,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'
import {
  useMyArtisan,
  useMyCommissionInvoices,
} from '@/hooks/queries/artisan-portal'
import { artisanPortalApi } from '@/api/artisan-portal'

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente d\'émission',
  invoiced: 'Facturée',
  paid: 'Payée',
  reconciled: 'Réconciliée',
  canceled: 'Annulée',
  disputed: 'En litige',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  invoiced: 'bg-blue-100 text-blue-900 border-blue-300',
  paid: 'bg-green-100 text-green-900 border-green-300',
  reconciled: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  canceled: 'bg-gray-100 text-gray-700 border-gray-300',
  disputed: 'bg-red-100 text-red-900 border-red-300',
}

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(Number(n))) return '–'
  return `${Number(n).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

function formatDate(s: string | null): string {
  if (!s) return '–'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ArtisanFactures() {
  const { data: artisan, isLoading: aLoading } = useMyArtisan()
  const { data: invoices, isLoading: iLoading } = useMyCommissionInvoices()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (invoiceId: string, pdfPath: string | null) => {
    if (!pdfPath) {
      setError('PDF pas encore généré pour cette facture. Contactez BRH si > 5 jours après l\'émission.')
      return
    }
    setError(null)
    setDownloadingId(invoiceId)
    try {
      const url = await artisanPortalApi.getInvoicePdfUrl(pdfPath)
      if (!url) {
        setError('Impossible de générer l\'URL de téléchargement.')
        return
      }
      window.open(url, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingId(null)
    }
  }

  const stats = invoices
    ? {
        total: invoices.length,
        totalDue: invoices.reduce((s, i) => s + Number(i.total_commission_due_eur), 0),
        totalPaid: invoices
          .filter((i) => i.status === 'paid' || i.status === 'reconciled')
          .reduce((s, i) => s + Number(i.total_commission_due_eur), 0),
        nbPending: invoices.filter((i) => i.status === 'pending' || i.status === 'invoiced').length,
      }
    : { total: 0, totalDue: 0, totalPaid: 0, nbPending: 0 }

  if (aLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="container mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Euro className="h-6 w-6 text-emerald-700" /> Mes factures BRH
        </h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <div className="font-semibold">Compte non lié à un artisan</div>
          <p className="mt-1 text-xs">
            Connectez-vous avec votre compte artisan BRH pour voir vos factures.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/artisan/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft className="h-3 w-3" /> Retour au dashboard
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Euro className="h-6 w-6 text-emerald-700" /> Mes factures BRH
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Historique des factures commission BRH ({artisan.nom_entreprise}).
            Téléchargement PDF disponible 30 jours après émission.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Erreur</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total factures" value={stats.total} icon={<FileText className="h-4 w-4" />} />
        <KpiCard
          label="À régler"
          value={stats.nbPending}
          icon={<Clock className="h-4 w-4" />}
          color="yellow"
        />
        <KpiCard
          label="Commissions cumulées"
          value={formatEur(stats.totalDue)}
          icon={<Euro className="h-4 w-4" />}
          color="emerald"
        />
        <KpiCard
          label="Réglées"
          value={formatEur(stats.totalPaid)}
          icon={<CheckCircle className="h-4 w-4" />}
          color="green"
        />
      </div>

      {/* Liste */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {iLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <div className="font-medium">Aucune facture pour l&apos;instant</div>
            <p className="mt-1 text-xs">
              Vos factures commission BRH apparaîtront ici dès qu&apos;un chantier signé sera
              terminé. Émission le 1er du mois suivant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Période
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Chantiers
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    CA TTC
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Commission
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Émise / Payée
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">
                        {MONTHS_FR[inv.period_month - 1]} {inv.period_year}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {inv.nb_leads_completed}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {formatEur(inv.total_chantiers_ttc_eur)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">
                      {formatEur(inv.total_commission_due_eur)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[inv.status] ?? STATUS_COLORS.pending
                        }`}
                      >
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {inv.invoiced_at && (
                        <div>
                          Émise : <strong>{formatDate(inv.invoiced_at)}</strong>
                        </div>
                      )}
                      {inv.paid_at && (
                        <div className="text-green-700">
                          Payée : <strong>{formatDate(inv.paid_at)}</strong>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {inv.pdf_path ? (
                        <button
                          type="button"
                          onClick={() => handleDownload(inv.id, inv.pdf_path)}
                          disabled={downloadingId === inv.id}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                        >
                          {downloadingId === inv.id ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          Télécharger
                        </button>
                      ) : (
                        <span className="text-xs italic text-gray-400">PDF en cours…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <strong>Comment ça marche ?</strong> Le 1er du mois M+1, BRH agrège tous vos chantiers
        terminés du mois M et génère votre facture commission ({((Number(invoices?.[0]?.total_commission_due_eur ?? 0) / Number(invoices?.[0]?.total_chantiers_ttc_eur ?? 1)) * 100).toFixed(1) || '5'}{' '}
        % en moyenne). Vous recevez le PDF par email. Paiement par virement à 30 jours sur le RIB
        indiqué dans la facture.
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  color = 'gray',
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: 'gray' | 'yellow' | 'emerald' | 'green'
}) {
  const colors: Record<typeof color, string> = {
    gray: 'text-gray-700',
    yellow: 'text-yellow-700',
    emerald: 'text-emerald-700',
    green: 'text-green-700',
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <span className={colors[color]}>{icon}</span>
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${colors[color]}`}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </div>
    </div>
  )
}
