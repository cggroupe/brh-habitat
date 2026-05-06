/**
 * Phase 18.6 — Item du fil d'actualité `/reseau`.
 *
 * Affiche : header (auteur + post_type + date) + body + medias + actions (like, signaler).
 * Tracking impressions au mount via IntersectionObserver (event 'view').
 */
import { useEffect, useRef, useState } from 'react'
import { Heart, Flag, Briefcase, Sparkles, Wrench, MessageCircleQuestion, Users, Newspaper } from 'lucide-react'
import { reseauPostsApi, type FeedPost } from '@/api/reseau-posts'
import { useToggleReaction } from '@/hooks/queries/reseau-reactions'
import { useTrackImpression } from '@/hooks/queries/reseau-impressions'

const POST_TYPE_LABELS: Record<string, string> = {
  photo_chantier: 'Photo chantier',
  realisation: 'Réalisation',
  recommandation: 'Recommandation',
  question_metier: 'Question',
  recherche_partenaire: 'Cherche partenaire',
  annonce_chantier: 'Annonce chantier',
  actu: 'Actualité',
  autre: 'Autre',
}

const POST_TYPE_ICON: Record<string, React.ElementType> = {
  photo_chantier: Briefcase,
  realisation: Sparkles,
  recommandation: Heart,
  question_metier: MessageCircleQuestion,
  recherche_partenaire: Users,
  annonce_chantier: Wrench,
  actu: Newspaper,
  autre: Briefcase,
}

interface FeedItemProps {
  post: FeedPost
  liked?: boolean
  onReport?: (postId: string) => void
}

export default function FeedItem({ post, liked = false, onReport }: FeedItemProps) {
  const [signedMediaUrls, setSignedMediaUrls] = useState<string[]>([])
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const itemRef = useRef<HTMLElement | null>(null)

  const toggle = useToggleReaction()
  const track = useTrackImpression()

  // Charger signed URLs des médias
  useEffect(() => {
    if (post.media_urls.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentionnel : reset URLs si post n'a plus de média
      setSignedMediaUrls([])
      return
    }
    let cancelled = false
    void (async () => {
      const urls = await Promise.all(
        post.media_urls.map((p) => reseauPostsApi.getSignedMediaUrl(p, 3600)),
      )
      if (!cancelled) setSignedMediaUrls(urls.filter((u): u is string => !!u))
    })()
    return () => {
      cancelled = true
    }
  }, [post.media_urls])

  // Tracking impression view via IntersectionObserver
  useEffect(() => {
    if (hasTrackedView || !itemRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            track.mutate({ postId: post.id, eventType: 'view' })
            setHasTrackedView(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(itemRef.current)
    return () => observer.disconnect()
  }, [post.id, hasTrackedView, track])

  function handleLike() {
    toggle.mutate({ postId: post.id, reactionType: 'like' })
  }

  const Icon = POST_TYPE_ICON[post.post_type] ?? Briefcase
  const typeLabel = POST_TYPE_LABELS[post.post_type] ?? post.post_type

  return (
    <article
      ref={itemRef}
      className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center text-white">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              <span className="text-cyan-700">{typeLabel}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {new Date(post.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {post.visibility !== 'public' && ` · ${post.visibility === 'reseau' ? 'Réseau' : 'Privé'}`}
            </p>
          </div>
        </div>
        {onReport && (
          <button
            onClick={() => onReport(post.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            aria-label="Signaler"
            title="Signaler"
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      {post.body && (
        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{post.body}</p>
        </div>
      )}

      {/* Métiers tags */}
      {post.metiers_tags.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5">
          {post.metiers_tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md font-medium"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Media grid */}
      {signedMediaUrls.length > 0 && (
        <div className={`grid gap-1 ${signedMediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {signedMediaUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt=""
              className="w-full h-72 object-cover bg-slate-100"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Actions footer */}
      <div className="px-5 py-3 flex items-center gap-4 border-t border-slate-100">
        <button
          onClick={handleLike}
          disabled={toggle.isPending}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold transition ${
            liked ? 'text-red-600' : 'text-slate-500 hover:text-red-600'
          }`}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          {post.like_count}
        </button>

        <div className="text-xs text-slate-400">
          {post.comment_count > 0 && `${post.comment_count} commentaire${post.comment_count > 1 ? 's' : ''}`}
        </div>
      </div>
    </article>
  )
}
