/**
 * Phase 13.6.2 — Vue pro de ses recommandations artisans (suivi conversion).
 *
 * Affiche le funnel : pending → accepted → quoted → signed → completed.
 * Stats temps réel : commission cumulée, taux de conversion, top artisans.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  ExternalLink,
  Loader,
  CheckCircle,
  Clock,
  XCircle,
  Euro,
  TrendingUp,
} from 'lucide-react'
import { useMyArtisanLeads } from '@/hooks/queries/artisans-rge'
import type { ArtisanLeadRow } from '@/api/artisans-rge'

const STATUS_LABELS: Record<ArtisanLeadRow['status'], string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
  quoted: 'Devis fait',
  signed: 'Chantier signé',
  completed: 'Chantier terminé',
  canceled: 'Annulé',
}

const STATUS_COLORS: Record<ArtisanLeadRow['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-900',
  accepted: 'bg-blue-100 text-blue-900',
  declined: 'bg-red-100 text-red-900',
  quoted: 'bg-purple-100 text-purple-900',
  signed: 'bg-green-100 text-green-900',
  completed: 'bg-emerald-100 text-emerald-900',
  canceled: 'bg-gray-100 text-gray-700',
}

const STATUS_ICONS: Record<ArtisanLeadRow['status'], React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  accepted: CheckCircle,
  declined: XCircle,
  quoted: Clock,
  signed: CheckCircle,
  completed: CheckCircle,
  canceled: XCircle,
}

function formatEur(n: number | null | undefined): string {
  if (!n || !Number.isFinite(n)) return '–'
  return `${Math.round(n).toLocaleString('fr-FR')} €`
}

function formatDate(s: string | null): string {
  if (!s) return '–'
  const d = new Date(s)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy}`
}

export default function ProMesLeadsArtisans() {
  const { data: leads, isLoading } = useMyArtisanLeads()

  const stats = useMemo(() => {
    if (!leads) {
      return {
        total: 0,
        signed: 0,
        completed: 0,
        commissionExpected: 0,
        commissionPaid: 0,
        conversionRate: 0,
      }
    }
    const signed = leads.filter((l) => l.status === 'signed' || l.status === 'completed').length
    const completed = leads.filter((l) => l.status === 'completed').length
    const commissionExpected = leads.reduce((s, l) => s + (l.expected_commission_eur ?? 0), 0)
    const commissionPaid = leads.reduce((s, l) => s + (l.commission_paid_eur ?? 0), 0)
    return {
      total: leads.length,
      signed,
      completed,
      commissionExpected,
      commissionPaid,
      conversionRate: leads.length > 0 ? Math.round((signed / leads.length) * 100) : 0,
    }
  }, [leads])

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wrench className="h-6 w-6 text-amber-700" /> Mes recommandations artisans
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Suivi des leads transmis aux artisans RGE. Commission BRH 5-10 % sur chantiers signés.
          </p>
        </div>
        <Link
          to="/pro/marketplace-artisans"
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-3 w-3" /> Marketplace
        </Link>
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total recommandations
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Chantiers signés
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-green-700">{stats.signed}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" /> {stats.conversionRate}% conversion
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Commission attendue
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
            {formatEur(stats.commissionExpected)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Commission perçue
          </div>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-bold tabular-nums text-emerald-700">
            <Euro className="h-5 w-5" />
            {formatEur(stats.commissionPaid).replace(' €', '')}
          </div>
        </div>
      </div>

      {/* Liste leads */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !leads || leads.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            <Wrench className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <div className="font-medium">Aucune recommandation artisan</div>
            <p className="mt-1 text-xs">
              Recommandez votre premier artisan depuis un courrier IA généré ou la fiche prospect.
            </p>
            <Link
              to="/pro/prospects-bretagne"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-800"
            >
              Voir mes prospects →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Prospect
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Geste
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-700">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Chantier
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-700">
                    Commission
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((l) => {
                  const Icon = STATUS_ICONS[l.status]
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-600">{formatDate(l.created_at)}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/pro/prospects/${l.prospect_id}`}
                          className="text-blue-700 hover:text-blue-900"
                        >
                          #{l.prospect_id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{l.geste}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status]}`}
                        >
                          <Icon className="h-3 w-3" />
                          {STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-700">
                        {formatEur(l.actual_chantier_ttc_eur ?? l.estimated_chantier_ttc_eur)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {l.commission_paid_eur ? (
                          <span className="font-bold text-emerald-700">
                            {formatEur(l.commission_paid_eur)}
                          </span>
                        ) : (
                          <span className="text-gray-500">{formatEur(l.expected_commission_eur)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {leads && leads.length > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
          <strong>Workflow lead :</strong> En attente → Acceptée par l&apos;artisan → Devis fait →
          Chantier signé → Chantier terminé. Commission payée à BRH après réception facture
          chantier (paiement mensuel).
        </div>
      )}
    </div>
  )
}
