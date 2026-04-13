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
  company_id: string | null
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatEur(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
}

export default function ProChiffrages() {
  const { user } = useAuth()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: chiffrages = [], isLoading } = useQuery({
    queryKey: ['chiffrages', 'pro', user?.id],
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
        partner_type: 'pro',
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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#707a6a] mb-1">Documents</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] text-[#1b1c1c] uppercase">
            Mes chiffrages
          </h1>
        </div>
        <Link
          to="/pro/chiffrage"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all"
        >
          <Calculator size={14} />
          Nouveau chiffrage
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#1c7b1d]/30 border-t-[#1c7b1d] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && chiffrages.length === 0 && (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f3f2] flex items-center justify-center mx-auto mb-5">
            <FileText size={28} className="text-[#707a6a]/30" />
          </div>
          <p className="font-display text-lg font-bold text-[#1b1c1c] uppercase tracking-wide mb-2">Aucun chiffrage</p>
          <p className="text-sm text-[#707a6a] mb-7">
            Utilisez le Chiffrage IA pour generer votre premier chiffrage.
          </p>
          <Link
            to="/pro/chiffrage"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#1c7b1d]/20 hover:-translate-y-0.5 transition-all"
          >
            <Calculator size={14} />
            Chiffrage IA
          </Link>
        </div>
      )}

      {/* Table — desktop */}
      {!isLoading && chiffrages.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-[0_8px_30px_rgba(27,28,28,0.04)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f3f2]">
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Reference</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Client</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Projet</th>
                  <th className="px-6 py-4 text-right text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Total TTC</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-[#707a6a]">Date</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {chiffrages.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f5f3f2]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-[10px] bg-[#1c7b1d]/10 text-[#1c7b1d] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                        {row.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1b1c1c]">{row.client_name}</td>
                    <td className="px-6 py-4 text-sm text-[#707a6a]">{row.projet_titre}</td>
                    <td className="px-6 py-4 text-right font-display text-sm font-bold text-[#1b1c1c]">
                      {formatEur(row.total_ttc)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#707a6a]">{formatDate(row.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => void handleDownload(row)}
                        disabled={downloadingId === row.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f5f3f2] text-[#404a3c] font-bold text-[10px] rounded-xl hover:bg-[#1c7b1d] hover:text-white transition-all disabled:opacity-50 uppercase tracking-widest"
                      >
                        {downloadingId === row.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <FileDown size={12} />}
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
              <div key={row.id} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] bg-[#1c7b1d]/10 text-[#1c7b1d] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                    {row.reference}
                  </span>
                  <span className="text-xs text-[#707a6a]">{formatDate(row.created_at)}</span>
                </div>
                <p className="font-bold text-sm text-[#1b1c1c] mb-0.5">{row.client_name}</p>
                <p className="text-xs text-[#707a6a] mb-4">{row.projet_titre}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-[#1b1c1c]">
                    {formatEur(row.total_ttc)}
                  </span>
                  <button
                    onClick={() => void handleDownload(row)}
                    disabled={downloadingId === row.id}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-br from-[#1c7b1d] to-[#0a4a0b] text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-[#1c7b1d]/20 transition-all disabled:opacity-50"
                  >
                    {downloadingId === row.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <FileDown size={12} />}
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
