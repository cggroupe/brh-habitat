/**
 * Phase 18.5 — Carte de pro pour suggestions / demandes.
 */
import { UserPlus, Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ConnectionCardProps {
  proId: string
  partnerType: string
  fullName: string
  city?: string | null
  postalCode?: string | null
  departement?: string | null
  /** Mode d'affichage. */
  variant: 'suggestion' | 'incoming' | 'outgoing' | 'connection'
  loading?: boolean
  onSendRequest?: () => void
  onAccept?: () => void
  onDecline?: () => void
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  agence_immo: 'Agence immo',
  artisan_rge: 'Artisan RGE',
  pro_company: 'Pro BRH',
  architecte: 'Architecte',
  maitre_oeuvre: "Maître d'œuvre",
  apporteur_affaires: "Apporteur d'affaires",
  courtier: 'Courtier',
  syndic: 'Syndic',
  autre: 'Autre pro',
}

export default function ConnectionCard({
  proId,
  partnerType,
  fullName,
  city,
  postalCode,
  departement,
  variant,
  loading,
  onSendRequest,
  onAccept,
  onDecline,
}: ConnectionCardProps) {
  const typeLabel = PARTNER_TYPE_LABELS[partnerType] ?? partnerType
  const location = [city, postalCode, departement].filter(Boolean).join(' · ')

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center justify-between gap-3 hover:border-cyan-300/60 transition">
      <Link to={`/reseau/profil/${proId}`} className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{fullName}</p>
        <p className="text-xs text-cyan-700 mt-0.5">{typeLabel}</p>
        {location && <p className="text-xs text-slate-500 mt-0.5 truncate">{location}</p>}
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        {variant === 'suggestion' && onSendRequest && (
          <button
            onClick={onSendRequest}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white text-xs font-semibold transition"
          >
            <UserPlus size={14} /> Connecter
          </button>
        )}

        {variant === 'incoming' && (
          <>
            <button
              onClick={onDecline}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              aria-label="Décliner"
            >
              <X size={16} />
            </button>
            <button
              onClick={onAccept}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold transition"
            >
              <Check size={14} /> Accepter
            </button>
          </>
        )}

        {variant === 'outgoing' && (
          <span className="text-xs text-slate-400 italic px-2">En attente…</span>
        )}

        {variant === 'connection' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide">
            <Check size={10} /> Connecté
          </span>
        )}
      </div>
    </div>
  )
}
