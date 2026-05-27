/**
 * ScoreTierBadge — affiche un score 0-100 sous forme de tier sémantique (A/B/C/D).
 *
 * Pattern Data-B #6 — score = catégorie sémantique, pas chiffre brut.
 * Reproduit la grammaire `.stitch/designs/fiche-client-brh.png` (large pill
 * tier au-dessus du KPI hero).
 *
 * Tiers :
 *   - A (Premium)  : 80-100  · vert profond
 *   - B (Chaud)    : 60-79   · ambre
 *   - C (Tiède)    : 40-59   · stone
 *   - D (Froid)    : 0-39    · stone discret
 *
 * Quand score est null/undefined : affiche "Non scoré" (gris).
 */

interface Props {
  score: number | null | undefined
  /** Label avant le tier (ex: "Score Vente", "Score V2"). */
  label?: string
  /** Sublabel (ex: "Phase 16 · 13 règles"). */
  sublabel?: string
  /** Compact pill horizontal. Défaut false = card vertical large. */
  compact?: boolean
  className?: string
}

function tierOf(score: number): { tier: 'A' | 'B' | 'C' | 'D'; name: string; ring: string; dot: string; text: string; bg: string } {
  if (score >= 80) {
    return { tier: 'A', name: 'Premium', ring: 'ring-[#00600a]/40', dot: 'bg-[#00600a]', text: 'text-[#00600a]', bg: 'bg-[#00600a]/5' }
  }
  if (score >= 60) {
    return { tier: 'B', name: 'Chaud', ring: 'ring-amber-300', dot: 'bg-amber-500', text: 'text-amber-900', bg: 'bg-amber-50' }
  }
  if (score >= 40) {
    return { tier: 'C', name: 'Tiède', ring: 'ring-stone-300', dot: 'bg-stone-500', text: 'text-text', bg: 'bg-stone-50' }
  }
  return { tier: 'D', name: 'Froid', ring: 'ring-stone-200', dot: 'bg-stone-400', text: 'text-text-muted', bg: 'bg-stone-50/60' }
}

export default function ScoreTierBadge({
  score,
  label,
  sublabel,
  compact = false,
  className = '',
}: Props) {
  if (score == null) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-2xl bg-stone-50 px-4 py-2 text-xs text-text-muted ring-1 ring-stone-200 ${className}`}
        title={label}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
        {label && <span className="font-medium">{label} :</span>}
        Non scoré
      </div>
    )
  }
  const t = tierOf(score)

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${t.bg} ${t.text} ${t.ring} ${className}`}
        title={`${label ?? 'Score'} : ${score}/100 (tier ${t.tier} — ${t.name})${sublabel ? ` · ${sublabel}` : ''}`}
      >
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${t.dot} text-[10px] font-bold text-white`}>
          {t.tier}
        </span>
        <span className="tabular-nums font-bold">{score}</span>
        <span className="opacity-70">/ 100</span>
      </span>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-4 rounded-2xl px-5 py-3 ring-1 ${t.bg} ${t.ring} ${className}`}
      title={`Score ${score}/100`}
    >
      <span
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-xl font-bold text-white ${t.dot}`}
        aria-hidden="true"
      >
        {t.tier}
      </span>
      <div className="leading-tight">
        {label && (
          <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">
            {label}
          </div>
        )}
        <div className={`font-display text-2xl font-bold tabular-nums ${t.text}`}>
          {score}
          <span className="text-sm text-text-muted font-medium"> / 100</span>
        </div>
        <div className={`text-xs font-medium ${t.text}`}>
          Tier {t.tier} — {t.name}
          {sublabel && <span className="ml-1 text-text-muted font-normal">· {sublabel}</span>}
        </div>
      </div>
    </div>
  )
}
