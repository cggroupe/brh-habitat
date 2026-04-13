import { useState } from 'react'
import { FileText, FileDown, Loader2, Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ChiffrageData, ChiffrageLineItem } from '@/lib/chiffrage-pdf'

interface ChiffrageRow {
  id: string
  reference: string
  client_name: string
  projet_titre: string
  total_ttc: number
  created_at: string
  client_address: string | null
  client_phone: string | null
  projet_description: string | null
  lignes: unknown
  total_ht: number
  tva_rate: number
  total_tva: number
  notes: string | null
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
}

export default function PartChiffrages() {
  const { user } = useAuth()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: chiffrages = [], isLoading } = useQuery({
    queryKey: ['chiffrages', 'particulier', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brh_chiffrages')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ChiffrageRow[]
    },
    enabled: !!user?.id,
  })

  async function handleDownload(row: ChiffrageRow) {
    setDownloadingId(row.id)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { ChiffragePDF } = await import('@/lib/chiffrage-pdf')
      const lignes = Array.isArray(row.lignes) ? (row.lignes as ChiffrageLineItem[]) : []
      const chiffrageData: ChiffrageData = {
        client_name: row.client_name,
        client_address: row.client_address ?? undefined,
        client_phone: row.client_phone ?? undefined,
        partner_name: user?.full_name ?? '',
        partner_type: 'particulier',
        projet_titre: row.projet_titre,
        projet_description: row.projet_description ?? undefined,
        lignes,
        total_ht: row.total_ht,
        tva_rate: row.tva_rate,
        total_tva: row.total_tva,
        total_ttc: row.total_ttc,
        notes: row.notes ?? undefined,
        date: formatDate(row.created_at),
        reference: row.reference,
      }
      const blob = await pdf(<ChiffragePDF data={chiffrageData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Chiffrage-BRH-${row.reference}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mes chiffrages
          </h1>
        </div>
        <Link
          to="/particulier/chiffrage"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
        >
          <Calculator size={16} />
          Nouveau chiffrage
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && chiffrages.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <FileText size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="font-display text-lg text-slate-500 mb-2">Aucun chiffrage</p>
          <p className="font-body text-sm text-slate-400 mb-6">
            Utilisez le Chiffrage IA pour generer votre premier chiffrage.
          </p>
          <Link
            to="/particulier/chiffrage"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-display text-sm rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wide"
          >
            <Calculator size={16} />
            Chiffrage IA
          </Link>
        </div>
      )}

      {/* Table — desktop */}
      {!isLoading && chiffrages.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-display text-xs uppercase tracking-wide text-slate-500">Reference</th>
                  <th className="px-5 py-3 text-left font-display text-xs uppercase tracking-wide text-slate-500">Client</th>
                  <th className="px-5 py-3 text-left font-display text-xs uppercase tracking-wide text-slate-500">Projet</th>
                  <th className="px-5 py-3 text-right font-display text-xs uppercase tracking-wide text-slate-500">Total TTC</th>
                  <th className="px-5 py-3 text-left font-display text-xs uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {chiffrages.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-body text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {row.reference}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-body text-sm text-slate-800">{row.client_name}</td>
                    <td className="px-5 py-4 font-body text-sm text-slate-600">{row.projet_titre}</td>
                    <td className="px-5 py-4 text-right font-display text-sm font-semibold text-slate-900">
                      {formatEur(row.total_ttc)}
                    </td>
                    <td className="px-5 py-4 font-body text-sm text-slate-500">{formatDate(row.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => void handleDownload(row)}
                        disabled={downloadingId === row.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary font-display text-xs rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50 uppercase tracking-wide"
                      >
                        {downloadingId === row.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <FileDown size={13} />}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden space-y-3">
            {chiffrages.map((row) => (
              <div key={row.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-body text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                    {row.reference}
                  </span>
                  <span className="font-body text-xs text-slate-400">{formatDate(row.created_at)}</span>
                </div>
                <p className="font-display text-sm text-slate-900 mb-0.5">{row.client_name}</p>
                <p className="font-body text-xs text-slate-500 mb-3">{row.projet_titre}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold text-slate-900">
                    {formatEur(row.total_ttc)}
                  </span>
                  <button
                    onClick={() => void handleDownload(row)}
                    disabled={downloadingId === row.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white font-display text-xs rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 uppercase tracking-wide"
                  >
                    {downloadingId === row.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <FileDown size={13} />}
                    Re-telecharger PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
