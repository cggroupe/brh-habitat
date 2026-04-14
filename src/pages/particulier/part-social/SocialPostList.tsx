import { isSafeUrl } from '@/lib/utils'
import { Share2, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import type { BrhSocialPostRow, SocialPlatform } from '@/types/partner'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn',
  tiktok: 'TikTok', google_business: 'Google Business',
}

function StatusBadge({ status }: { status: BrhSocialPostRow['status'] }) {
  const cfg = {
    validee:               { label: 'Validee',         cls: 'bg-green-100 text-green-700',   Icon: CheckCircle },
    en_attente:            { label: 'En attente',       cls: 'bg-yellow-100 text-yellow-700', Icon: Clock },
    en_cours_verification: { label: 'En verification',  cls: 'bg-blue-100 text-blue-700',     Icon: Clock },
    refusee:               { label: 'Refusee',          cls: 'bg-red-100 text-red-700',       Icon: XCircle },
    expiree:               { label: 'Expiree',          cls: 'bg-background text-text-light', Icon: AlertCircle },
  }[status]

  if (!cfg) return null
  const { label, cls, Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  )
}

interface SocialPostListProps {
  posts: BrhSocialPostRow[]
  isLoading: boolean
}

export function SocialPostList({ posts, isLoading }: SocialPostListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
        <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Share2 size={28} className="text-text-light" />
        </div>
        <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-text-secondary mb-2">
          Aucune publication soumise
        </p>
        <p className="text-sm text-text-light">
          Partagez vos publications BRH Habitat pour gagner des points.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div
          key={post.id}
          className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-sm text-text-primary uppercase tracking-wide">
                  {PLATFORM_LABELS[post.platform]}
                </span>
                <span className="text-text-light/40">·</span>
                <span className="text-xs text-text-light capitalize">{post.post_type}</span>
                <StatusBadge status={post.status} />
              </div>
              <a
                href={isSafeUrl(post.post_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate block max-w-xs"
              >
                {post.post_url}
              </a>
              {post.description && (
                <p className="text-xs text-text-light mt-1 line-clamp-2">{post.description}</p>
              )}
              {post.rejection_reason && (
                <p className="text-xs text-red-600 mt-1 font-medium">Motif : {post.rejection_reason}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {post.reward_points && (
                <p className="font-display font-bold text-sm text-amber-600">+{post.reward_points} pts</p>
              )}
              <p className="text-xs text-text-light mt-0.5">{formatDate(post.created_at)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
