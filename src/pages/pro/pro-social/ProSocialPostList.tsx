import { isSafeUrl } from '@/lib/utils'
import { Share2, CheckCircle, Clock, XCircle, ExternalLink, Star } from 'lucide-react'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon } from '@/components/ui/SocialIcons'
import type { SocialPlatform, SocialPostStatus } from '@/types/partner'

const PLATFORMS_CONFIG: { value: SocialPlatform; label: string; icon: React.ReactNode }[] = [
  { value: 'facebook', label: 'Facebook', icon: <FacebookIcon size={15} /> },
  { value: 'instagram', label: 'Instagram', icon: <InstagramIcon size={15} /> },
  { value: 'linkedin', label: 'LinkedIn', icon: <LinkedinIcon size={15} /> },
  { value: 'tiktok', label: 'TikTok (video)', icon: <TiktokIcon size={15} /> },
  { value: 'google_business', label: 'Google Business', icon: <Star size={15} /> },
]

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; className: string; icon: React.ReactNode }> = {
  en_attente:            { label: 'En attente',      className: 'bg-amber-50 text-amber-700',  icon: <Clock size={11} /> },
  en_cours_verification: { label: 'En verification', className: 'bg-blue-50 text-blue-700',    icon: <Clock size={11} /> },
  validee:               { label: 'Validee',         className: 'bg-primary/10 text-primary',  icon: <CheckCircle size={11} /> },
  refusee:               { label: 'Refusee',         className: 'bg-red-50 text-red-600',      icon: <XCircle size={11} /> },
  expiree:               { label: 'Expiree',         className: 'bg-background text-text-light', icon: <XCircle size={11} /> },
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

interface ProSocialPost {
  id: string
  platform: SocialPlatform | string
  post_url: string
  status: SocialPostStatus | string | null
  reward_amount_cents: number | null
  created_at: string | null
  rejection_reason?: string | null
}

interface ProSocialPostListProps {
  posts: ProSocialPost[]
  isLoading: boolean
}

export function ProSocialPostList({ posts, isLoading }: ProSocialPostListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
        <div className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
        <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center mx-auto mb-3">
          <Share2 size={22} className="text-text-light/30" />
        </div>
        <p className="text-sm font-medium text-text-light">Aucune publication soumise.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const cfg = STATUS_CONFIG[(post.status ?? 'en_attente') as SocialPostStatus] ?? STATUS_CONFIG.en_attente
        const platformCfg = PLATFORMS_CONFIG.find((p) => p.value === post.platform)
        return (
          <div key={post.id} className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgba(27,28,28,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center text-text-light shrink-0">
                  {platformCfg?.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{platformCfg?.label}</p>
                  <a
                    href={isSafeUrl(post.post_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline truncate font-medium"
                  >
                    Voir la publication <ExternalLink size={9} />
                  </a>
                </div>
              </div>
              <span className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-text-light">
                {post.created_at ? new Date(post.created_at).toLocaleDateString('fr-FR') : '—'}
              </span>
              {post.reward_amount_cents != null && (
                <span className="text-xs font-bold text-primary">
                  {formatEur(post.reward_amount_cents)}
                </span>
              )}
            </div>
            {post.rejection_reason && (
              <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 rounded-xl px-3 py-2">
                Motif : {post.rejection_reason}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
