import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNavStackStore } from '../../../stores/navStackStore'

/**
 * Bandeau "Depuis [entité d'origine]" — palette stone sobre.
 */
export default function OriginBanner() {
  const origin = useNavStackStore((s) => s.getOrigin())
  if (!origin) return null
  return (
    <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-6 py-2 text-xs text-stone-700">
      <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
      <span>
        Vous explorez depuis{' '}
        <Link
          to={origin.path}
          className="font-medium text-[#00600a] underline-offset-2 hover:underline"
        >
          {origin.label}
        </Link>
        {origin.sublabel && (
          <span className="ml-1 text-stone-500">· {origin.sublabel}</span>
        )}
      </span>
    </div>
  )
}
