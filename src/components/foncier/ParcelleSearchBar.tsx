/**
 * Phase 19 Sprint A — Barre de recherche parcelles (BAN autocomplete).
 *
 * 2 modes :
 *   1. Recherche par adresse (BAN autocomplete) → centre la carte sur le point
 *   2. Recherche par référence cadastrale (insee + section + numéro)
 */
import { useState } from 'react'
import { Search, MapPin, FileSearch, Loader2 } from 'lucide-react'
import { useGeocodeAddress } from '@/hooks/queries/foncier-parcelles'

interface ParcelleSearchBarProps {
  onSelectAddress: (point: { lat: number; lng: number; label: string }) => void
  onSearchByRef: (ref: { code_insee: string; section: string; numero: string; prefixe?: string }) => void
}

type Mode = 'address' | 'ref'

export default function ParcelleSearchBar({
  onSelectAddress,
  onSearchByRef,
}: ParcelleSearchBarProps) {
  const [mode, setMode] = useState<Mode>('address')

  // Address mode
  const [addressQuery, setAddressQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const geocode = useGeocodeAddress(addressQuery)

  // Ref mode
  const [insee, setInsee] = useState('')
  const [section, setSection] = useState('')
  const [numero, setNumero] = useState('')
  const [prefixe, setPrefixe] = useState('')

  function handleSubmitRef(e: React.FormEvent) {
    e.preventDefault()
    if (!insee || !section || !numero) return
    onSearchByRef({
      code_insee: insee.trim(),
      section: section.trim().toUpperCase(),
      numero: numero.trim(),
      prefixe: prefixe.trim() || undefined,
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('address')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            mode === 'address' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <MapPin size={12} /> Adresse
        </button>
        <button
          type="button"
          onClick={() => setMode('ref')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            mode === 'ref' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <FileSearch size={12} /> Réf cadastrale
        </button>
      </div>

      {/* Address autocomplete */}
      {mode === 'address' && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => {
              setAddressQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="12 rue de Brest, 29000 Quimper…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {geocode.isLoading && (
            <Loader2
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
            />
          )}

          {showSuggestions && (geocode.data ?? []).length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden z-10">
              {(geocode.data ?? []).map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectAddress({ lat: s.lat, lng: s.lng, label: s.label })
                      setAddressQuery(s.label)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 transition flex items-center gap-2"
                  >
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Ref cadastrale form */}
      {mode === 'ref' && (
        <form onSubmit={handleSubmitRef} className="grid grid-cols-12 gap-2">
          <input
            type="text"
            value={insee}
            onChange={(e) => setInsee(e.target.value)}
            placeholder="INSEE (29232)"
            maxLength={5}
            required
            className="col-span-3 rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={prefixe}
            onChange={(e) => setPrefixe(e.target.value)}
            placeholder="Préfixe (000)"
            maxLength={3}
            className="col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="Section (AB)"
            maxLength={2}
            required
            className="col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
          />
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Numéro (0123)"
            maxLength={4}
            required
            className="col-span-3 rounded-lg border border-slate-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
          >
            <Search size={12} /> OK
          </button>
        </form>
      )}
    </div>
  )
}
