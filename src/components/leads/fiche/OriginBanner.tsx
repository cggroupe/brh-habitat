import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNavStackStore } from '../../../stores/navStackStore'

/**
 * Bandeau "Depuis [entité d'origine]" affiché en haut des fiches drill-down
 * lorsque la pile de navigation a plus d'un élément.
 *
 * Pattern Data-B : "mini-récap de l'entité courante en sticky top" — ici un
 * mini-récap de l'entité d'ORIGINE pour ne jamais perdre la page de départ.
 */
export default function OriginBanner() {
  const origin = useNavStackStore((s) => s.getOrigin())
  if (!origin) return null
  return (
    <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-6 py-2 text-xs text-emerald-900">
      <ArrowLeft className="h-3.5 w-3.5 text-emerald-700" />
      <span>
        Vous explorez depuis{' '}
        <Link
          to={origin.path}
          className="font-medium text-emerald-900 underline-offset-2 hover:underline"
        >
          {origin.label}
        </Link>
        {origin.sublabel && (
          <span className="ml-1 text-emerald-700">· {origin.sublabel}</span>
        )}
      </span>
    </div>
  )
}
