/**
 * Phase 19 Sprint A — Carte détail parcelle (popup ou panel latéral).
 */
import { Star, StarOff, MapPin, Ruler, Hash, Loader2 } from 'lucide-react'
import { useIsFavori, useAddFavori, useRemoveFavori } from '@/hooks/queries/foncier-favoris'
import type { FoncierParcelle } from '@/api/foncier-parcelles'

interface ParcelleDetailCardProps {
  parcelle: FoncierParcelle
  compact?: boolean
}

export default function ParcelleDetailCard({ parcelle, compact = false }: ParcelleDetailCardProps) {
  const fav = useIsFavori(parcelle.idu)
  const add = useAddFavori()
  const remove = useRemoveFavori()

  async function handleToggleFavori() {
    if (fav.data?.isFavori && fav.data.favoriId) {
      await remove.mutateAsync(fav.data.favoriId)
    } else {
      await add.mutateAsync({
        parcelleIdu: parcelle.idu,
        parcelleCommune: parcelle.commune ?? undefined,
        parcelleDepartement: parcelle.departement ?? undefined,
        parcelleContenanceM2: parcelle.contenance_m2 ?? undefined,
      })
    }
  }

  const isFav = fav.data?.isFavori ?? false
  const busy = fav.isLoading || add.isPending || remove.isPending

  return (
    <div className={`bg-white ${compact ? 'p-3' : 'p-4'} rounded-xl border border-slate-200`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">
            {parcelle.commune ?? 'Commune inconnue'}
          </p>
          <p className="text-[10px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
            <Hash size={10} />
            <code className="text-[10px] bg-slate-100 px-1 rounded">{parcelle.idu}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleFavori}
          disabled={busy}
          className={`p-1.5 rounded-lg transition ${
            isFav
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
          }`}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : isFav ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
        </button>
      </div>

      <div className="space-y-1 text-xs text-slate-600">
        {parcelle.contenance_m2 !== null && (
          <p className="inline-flex items-center gap-1.5">
            <Ruler size={11} className="text-slate-400" />
            Surface : <strong>{parcelle.contenance_m2.toLocaleString('fr-FR')} m²</strong>
          </p>
        )}
        {parcelle.section && parcelle.numero && (
          <p className="text-[11px] text-slate-500">
            Section {parcelle.section} · Parcelle {parcelle.numero}
            {parcelle.prefixe && parcelle.prefixe !== '000' && ` · Préfixe ${parcelle.prefixe}`}
          </p>
        )}
        {parcelle.centroid_lat !== null && parcelle.centroid_lng !== null && (
          <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <MapPin size={10} />
            {parcelle.centroid_lat.toFixed(5)}, {parcelle.centroid_lng.toFixed(5)}
          </p>
        )}
      </div>

      {!compact && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
          Sprints à venir : DVF historique · PLU IA · Vision toiture · Permis · Sociodémo
        </div>
      )}
    </div>
  )
}
