import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

interface AddressSuggestion {
  label: string
  housenumber: string
  street: string
  postcode: string
  city: string
  citycode: string // code INSEE commune (utile pour calculs DPE)
  context: string
  lat: number | null
  lng: number | null
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: {
    address: string
    city: string
    postalCode: string
    citycode: string
    lat: number | null
    lng: number | null
  }) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '12 rue de la Paix, 29000 Quimper',
  className = '',
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const abortRef = useRef<AbortController | undefined>(undefined)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber&autocomplete=1`,
        { signal: controller.signal },
      )
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const results: AddressSuggestion[] = (data.features ?? []).map(
        (f: { properties: Record<string, string>; geometry?: { coordinates?: [number, number] } }) => ({
          label: f.properties.label,
          housenumber: f.properties.housenumber ?? '',
          street: f.properties.street ?? f.properties.name ?? '',
          postcode: f.properties.postcode ?? '',
          city: f.properties.city ?? '',
          citycode: f.properties.citycode ?? '',
          context: f.properties.context ?? '',
          lng: f.geometry?.coordinates?.[0] ?? null,
          lat: f.geometry?.coordinates?.[1] ?? null,
        })
      )
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(val)
    }, 300)
  }

  function handleSelect(suggestion: AddressSuggestion) {
    const fullAddress = suggestion.housenumber
      ? `${suggestion.housenumber} ${suggestion.street}`
      : suggestion.street

    onChange(suggestion.label)
    setSuggestions([])
    setIsOpen(false)

    onSelect?.({
      address: fullAddress,
      city: suggestion.city,
      postalCode: suggestion.postcode,
      citycode: suggestion.citycode,
      lat: suggestion.lat,
      lng: suggestion.lng,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlightedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Fermer au clic exterieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce + abort
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className={className}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 size={16} className="text-slate-400 animate-spin" />
          ) : (
            <MapPin size={16} className="text-slate-300" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[60] w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden animate-fadeIn">
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                i === highlightedIndex ? 'bg-primary/5' : 'hover:bg-slate-50'
              }`}
            >
              <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-body text-sm text-slate-900 leading-snug">{s.label}</p>
                <p className="font-body text-xs text-slate-400">{s.context}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
