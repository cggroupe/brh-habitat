/**
 * Avatar — initiales colorées avec teinte déterministe depuis le nom.
 *
 * Pattern Stitch interne (`.stitch/designs/fiche-client-brh.png`) — visuel fort
 * en header de fiche dirigeant. Pas de photo, juste initiales + couleur stable
 * par hash. RGPD-neutre (pas de PII supplémentaire).
 */

interface Props {
  /** Nom complet. Si vide, fallback "??" + gris. */
  name: string | null | undefined
  /** Taille en px. Défaut 56. */
  size?: number
  /** Apparence : "circle" (défaut) ou "square" (badge entité). */
  shape?: 'circle' | 'square'
  className?: string
  /** Optional title (hover tooltip). */
  title?: string
}

/** Palette stable Editorial Habitat — teintes Tailwind stone/text-friendly. */
const PALETTE = [
  { bg: '#1f2937', fg: '#fff' }, // slate-800
  { bg: '#7f1d1d', fg: '#fee2e2' }, // red-900
  { bg: '#00600a', fg: '#ecfccb' }, // BRH green
  { bg: '#7c2d12', fg: '#fed7aa' }, // orange-900
  { bg: '#1e3a8a', fg: '#dbeafe' }, // blue-900
  { bg: '#581c87', fg: '#f3e8ff' }, // purple-900
  { bg: '#831843', fg: '#fce7f3' }, // pink-900
  { bg: '#365314', fg: '#ecfccb' }, // lime-900
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  // Prénom (1er mot) + nom (dernier mot)
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({
  name,
  size = 56,
  shape = 'circle',
  className = '',
  title,
}: Props) {
  const safe = (name ?? '').trim()
  const { bg, fg } = safe
    ? PALETTE[hashCode(safe) % PALETTE.length]
    : { bg: '#e7e5e4', fg: '#78716c' }
  const radius = shape === 'circle' ? 9999 : 8

  return (
    <span
      role="img"
      aria-label={safe ? `Avatar ${safe}` : 'Avatar inconnu'}
      title={title ?? safe ?? undefined}
      className={`inline-flex shrink-0 select-none items-center justify-center font-display font-bold leading-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {safe ? initials(safe) : '??'}
    </span>
  )
}
