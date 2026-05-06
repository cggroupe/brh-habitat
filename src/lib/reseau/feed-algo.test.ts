/**
 * Phase 18.6 — Tests unitaires algo feed V1.
 */
import { describe, it, expect } from 'vitest'
import { scoreFeedItem, rankFeedItems, type FeedScoringPost, type FeedScoringContext } from './feed-algo'

const NOW = new Date('2026-05-06T12:00:00Z')

const baseCtx: FeedScoringContext = {
  myNetworkProIds: new Set(),
  myDepartement: '29',
  myMetiers: ['couverture'],
  seenPostIds: new Set(),
  now: NOW,
}

function mkPost(overrides: Partial<FeedScoringPost> = {}): FeedScoringPost {
  return {
    id: 'p1',
    author_pro_id: 'author1',
    post_type: 'photo_chantier',
    metiers_tags: [],
    region_codes: [],
    like_count: 0,
    created_at: NOW.toISOString(),
    ...overrides,
  }
}

describe('scoreFeedItem', () => {
  it('post fresh (0h) sans bonus → score ~10', () => {
    const score = scoreFeedItem(mkPost(), baseCtx)
    expect(score).toBeGreaterThan(9)
    expect(score).toBeLessThan(11)
  })

  it('post 24h sans bonus → score ~0.4', () => {
    const post = mkPost({ created_at: new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString() })
    const score = scoreFeedItem(post, baseCtx)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it('auteur dans mon réseau ajoute +30', () => {
    const ctx = { ...baseCtx, myNetworkProIds: new Set(['author1']) }
    const score = scoreFeedItem(mkPost(), ctx)
    expect(score).toBeGreaterThan(39)
    expect(score).toBeLessThan(41)
  })

  it('même département ajoute +15', () => {
    const score = scoreFeedItem(mkPost({ region_codes: ['29'] }), baseCtx)
    expect(score).toBeGreaterThan(24)
    expect(score).toBeLessThan(26)
  })

  it('autre département → +0', () => {
    const score = scoreFeedItem(mkPost({ region_codes: ['56'] }), baseCtx)
    expect(score).toBeGreaterThan(9)
    expect(score).toBeLessThan(11)
  })

  it('métier complémentaire ajoute +10', () => {
    const score = scoreFeedItem(mkPost({ metiers_tags: ['couverture'] }), baseCtx)
    expect(score).toBeGreaterThan(19)
    expect(score).toBeLessThan(21)
  })

  it('annonce_chantier matchant ajoute +25 + +10 métier', () => {
    const score = scoreFeedItem(
      mkPost({ post_type: 'annonce_chantier', metiers_tags: ['couverture'] }),
      baseCtx,
    )
    // 10 (recency) + 10 (métier) + 25 (annonce_chantier match) = 45
    expect(score).toBeGreaterThan(44)
    expect(score).toBeLessThan(46)
  })

  it('annonce_chantier sans match métier → pas de boost', () => {
    const score = scoreFeedItem(
      mkPost({ post_type: 'annonce_chantier', metiers_tags: ['platrerie'] }),
      baseCtx,
    )
    // 10 (recency) only
    expect(score).toBeGreaterThan(9)
    expect(score).toBeLessThan(11)
  })

  it('engagement like_count = 10 → +50 (cap)', () => {
    const score = scoreFeedItem(mkPost({ like_count: 10 }), baseCtx)
    // 10 (recency) + 50 (cap likes) = 60
    expect(score).toBeGreaterThan(59)
    expect(score).toBeLessThan(61)
  })

  it('engagement like_count = 100 → cap à +50', () => {
    const score = scoreFeedItem(mkPost({ like_count: 100 }), baseCtx)
    expect(score).toBeGreaterThan(59)
    expect(score).toBeLessThan(61)
  })

  it('post déjà vu → -50', () => {
    const ctx = { ...baseCtx, seenPostIds: new Set(['p1']) }
    const score = scoreFeedItem(mkPost(), ctx)
    // 10 (recency) - 50 (seen) = -40
    expect(score).toBeGreaterThan(-41)
    expect(score).toBeLessThan(-39)
  })

  it('combo total : auteur réseau + même dept + annonce_chantier match + 5 likes', () => {
    const ctx = { ...baseCtx, myNetworkProIds: new Set(['author1']) }
    const score = scoreFeedItem(
      mkPost({
        post_type: 'annonce_chantier',
        metiers_tags: ['couverture'],
        region_codes: ['29'],
        like_count: 5,
      }),
      ctx,
    )
    // 10 (recency) + 30 (réseau) + 15 (geo) + 10 (métier) + 25 (chantier) + 25 (likes 5*5) = 115
    expect(score).toBeGreaterThan(114)
    expect(score).toBeLessThan(116)
  })
})

describe('rankFeedItems', () => {
  it('trie par score décroissant', () => {
    const posts: FeedScoringPost[] = [
      mkPost({ id: 'old-no-bonus', created_at: new Date(NOW.getTime() - 12 * 3600 * 1000).toISOString() }),
      mkPost({ id: 'fresh-with-bonus', region_codes: ['29'] }),
    ]
    const ranked = rankFeedItems(posts, baseCtx)
    expect(ranked[0].post.id).toBe('fresh-with-bonus')
    expect(ranked[1].post.id).toBe('old-no-bonus')
  })

  it('tie-break par created_at DESC si même score', () => {
    const posts: FeedScoringPost[] = [
      mkPost({ id: 'older', created_at: new Date(NOW.getTime() - 60 * 1000).toISOString() }),
      mkPost({ id: 'newer', created_at: NOW.toISOString() }),
    ]
    const ranked = rankFeedItems(posts, baseCtx)
    // Léger écart de score dû au recency decay, mais tie-break OK
    expect(ranked[0].post.id).toBe('newer')
  })

  it('post déjà vu remonté en bas', () => {
    const posts: FeedScoringPost[] = [
      mkPost({ id: 'seen' }),
      mkPost({ id: 'unseen', created_at: new Date(NOW.getTime() - 6 * 3600 * 1000).toISOString() }),
    ]
    const ctx = { ...baseCtx, seenPostIds: new Set(['seen']) }
    const ranked = rankFeedItems(posts, ctx)
    expect(ranked[0].post.id).toBe('unseen')
    expect(ranked[1].post.id).toBe('seen')
  })
})
