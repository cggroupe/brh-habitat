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
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Documents</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
            Mes chiffrages
          </h1>
        </div>
        <Link
          to="/particulier/chiffrage"
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
        >
          <Calculator size={15} />
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
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FileText size={28} className="text-text-light" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-text-secondary mb-2">
            Aucun chiffrage
          </p>
          <p className="text-sm text-text-light mb-8">
            Utilisez le Chiffrage IA pour generer votre premier chiffrage.
          </p>
          <Link
            to="/particulier/chiffrage"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-primary to-primary-dark text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity"
          >
            <Calculator size={15} />
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
                <tr className="bg-background">
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-text-light">Reference</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-text-light">Client</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-text-light">Projet</th>
                  <th className="px-6 py-4 text-right text-[10px] uppercase tracking-widest font-bold text-text-light">Total TTC</th>
                  <th className="px-6 py-4 text-left text-[10px] uppercase tracking-widest font-bold text-text-light">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {chiffrages.map((row) => (
                  <tr key={row.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide">
                        {row.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-text-primary">{row.client_name}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{row.projet_titre}</td>
                    <td className="px-6 py-4 text-right font-display font-bold text-sm text-text-primary">
                      {formatEur(row.total_ttc)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-light">{formatDate(row.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => void handleDownload(row)}
                        disabled={downloadingId === row.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl hover:bg-gradient-to-br hover:from-primary hover:to-primary-dark hover:text-white transition-all uppercase tracking-widest disabled:opacity-50"
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
          <div className="md:hidden space-y-4">
            {chiffrages.map((row) => (
              <div key={row.id} className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold uppercase tracking-wide">
                    {row.reference}
                  </span>
                  <span className="text-xs text-text-light">{formatDate(row.created_at)}</span>
                </div>
                <p className="font-bold text-sm text-text-primary mb-0.5">{row.client_name}</p>
                <p className="text-xs text-text-light mb-4">{row.projet_titre}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-base text-text-primary">
                    {formatEur(row.total_ttc)}
                  </span>
                  <button
                    onClick={() => void handleDownload(row)}
                    disabled={downloadingId === row.id}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-br from-primary to-primary-dark text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {downloadingId === row.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <FileDown size={13} />}
                    PDF
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
