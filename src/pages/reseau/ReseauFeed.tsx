/**
 * Phase 18.6 — Page fil d'actualité `/reseau`.
 *
 * V1 = composer + algo feed déterministe (5/8 composantes AUTAF V2 simplifiées).
 * V1 simplifications : myDepartement / myMetiers = null/[] (geo + métier bonus = 0
 *   tant que profil pro n'a pas ces champs persistants côté front). Bonus réseau
 *   et "déjà vu" déjà fonctionnels.
 */
import { useMemo, useState } from 'react'
import { Home, Loader2 } from 'lucide-react'
import PostComposer from '@/components/reseau/PostComposer'
import FeedItem from '@/components/reseau/FeedItem'
import ReportDialog from '@/components/reseau/ReportDialog'
import { useFeedPosts } from '@/hooks/queries/reseau-posts'
import { useMyReactionsForPosts } from '@/hooks/queries/reseau-reactions'
import { useMyViewedPostIds } from '@/hooks/queries/reseau-impressions'
import { useMyConnections } from '@/hooks/queries/reseau-connections'
import { rankFeedItems, type FeedScoringPost } from '@/lib/reseau/feed-algo'

export default function ReseauFeed() {
  const [reportingPostId, setReportingPostId] = useState<string | null>(null)

  const posts = useFeedPosts({ limit: 50 })
  const connections = useMyConnections()
  const viewed = useMyViewedPostIds(200)

  const postIds = useMemo(() => (posts.data ?? []).map((p) => p.id), [posts.data])
  const reactions = useMyReactionsForPosts(postIds)

  // Network IDs (pour bonus +30)
  const networkProIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of connections.data ?? []) {
      // L'autre partie est celle qui n'est pas moi (mais on n'a pas mon ID ici,
      // on prend les 2 et on filtre les self-edges via le DB CHECK)
      ids.add(c.requester_pro_id)
      ids.add(c.recipient_pro_id)
    }
    return ids
  }, [connections.data])

  const seenIds = useMemo(() => new Set(viewed.data ?? []), [viewed.data])

  // Ranking côté front (V1)
  const ranked = useMemo(() => {
    const items: FeedScoringPost[] = (posts.data ?? []).map((p) => ({
      id: p.id,
      author_pro_id: p.author_pro_id,
      post_type: p.post_type,
      metiers_tags: p.metiers_tags,
      region_codes: p.region_codes,
      like_count: p.like_count,
      created_at: p.created_at,
    }))
    return rankFeedItems(items, {
      myNetworkProIds: networkProIds,
      myDepartement: null, // V1.5 : récupérer depuis partner_contract → table partenaire
      myMetiers: [], // V1.5 : depuis profil pro
      seenPostIds: seenIds,
    })
  }, [posts.data, networkProIds, seenIds])

  const likedSet = useMemo(() => {
    const s = new Set<string>()
    for (const r of reactions.data ?? []) {
      if (r.reaction_type === 'like') s.add(r.post_id)
    }
    return s
  }, [reactions.data])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
          <Home size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display">Fil d'actualité</h1>
          <p className="text-sm text-slate-500">Bretagne · 22 / 29 / 35 / 56 / 44</p>
        </div>
      </div>

      {/* Composer */}
      <PostComposer
        onPosted={() => {
          void posts.refetch()
        }}
      />

      {/* Loading */}
      {posts.isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!posts.isLoading && (posts.data ?? []).length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-50/30 p-8 text-center">
          <p className="text-sm text-slate-700 font-medium">Le fil est vide pour le moment.</p>
          <p className="text-xs text-slate-500 mt-1">
            Soyez le premier à partager un chantier, une réalisation ou une question.
          </p>
        </div>
      )}

      {/* Feed items */}
      <div className="space-y-4">
        {ranked.map((r) => {
          const fullPost = posts.data?.find((p) => p.id === r.post.id)
          if (!fullPost) return null
          return (
            <FeedItem
              key={fullPost.id}
              post={fullPost}
              liked={likedSet.has(fullPost.id)}
              onReport={(postId) => setReportingPostId(postId)}
            />
          )
        })}
      </div>

      {/* Report dialog */}
      <ReportDialog postId={reportingPostId} onClose={() => setReportingPostId(null)} />
    </div>
  )
}
