import { useEffect } from 'react'
import {
  Award, Lock, Star, Trophy, Zap, Target, Users, TrendingUp,
  Heart, Shield, Flame, Crown, Gift, Medal, Rocket, CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useAffiliateProspects, useMyRecruitTree } from '@/hooks/queries'
import { unlockBadges } from '@/api/badges'

// Map icon name strings to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Star, Trophy, Zap, Target, Users, TrendingUp, Heart, Shield,
  Flame, Crown, Gift, Medal, Rocket, CheckCircle, Award,
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  condition_type: string
  condition_value: number
  sort_order: number
}

interface UserBadge {
  badge_id: string
  unlocked_at?: string
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PartBadges() {
  const { user } = useAuth()
  const { data: affiliate } = useMyAffiliate(user?.id)
  const { data: prospects = [] } = useAffiliateProspects(affiliate?.id)
  const { data: recruits = [] } = useMyRecruitTree(affiliate?.id)

  const { data: allBadges = [] } = useQuery({
    queryKey: ['badges', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brh_badges')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Badge[]
    },
  })

  const { data: userBadges = [], refetch: refetchUserBadges } = useQuery({
    queryKey: ['badges', 'user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brh_user_badges')
        .select('badge_id, unlocked_at')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? []) as UserBadge[]
    },
    enabled: !!user?.id,
  })

  // Compute stats
  const parrainages_total = prospects.length
  const parrainages_signes = prospects.filter(
    (p: { status?: string }) => p.status === 'signe' || p.status === 'termine'
  ).length
  const points_earned = affiliate?.total_points_earned ?? 0
  const recruits_total = recruits.length

  const { data: chiffrages_total = 0 } = useQuery({
    queryKey: ['chiffrages', 'count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('brh_chiffrages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!user?.id,
  })

  const unlockedIds = new Set(userBadges.map((ub) => ub.badge_id))

  // Auto-unlock: check conditions and insert if met
  useEffect(() => {
    if (!user?.id || allBadges.length === 0) return

    async function checkAndUnlock() {
      const toUnlock: string[] = []
      for (const badge of allBadges) {
        if (unlockedIds.has(badge.id)) continue
        let currentValue = 0
        switch (badge.condition_type) {
          case 'parrainages_total': currentValue = parrainages_total; break
          case 'parrainages_signes': currentValue = parrainages_signes; break
          case 'points_earned': currentValue = points_earned; break
          case 'recruits_total': currentValue = recruits_total; break
          case 'chiffrages_total': currentValue = chiffrages_total; break
          case 'level_reached': currentValue = points_earned; break
        }
        if (currentValue >= badge.condition_value) {
          toUnlock.push(badge.id)
        }
      }
      if (toUnlock.length === 0) return
      await unlockBadges(user!.id, toUnlock)
      void refetchUserBadges()
    }

    void checkAndUnlock()
  }, [
    allBadges, user?.id, parrainages_total, parrainages_signes,
    points_earned, recruits_total, chiffrages_total,
    unlockedIds, refetchUserBadges,
  ])

  const unlockedCount = userBadges.length

  function getProgress(badge: Badge): { current: number; total: number } {
    let current = 0
    switch (badge.condition_type) {
      case 'parrainages_total': current = parrainages_total; break
      case 'parrainages_signes': current = parrainages_signes; break
      case 'points_earned': current = points_earned; break
      case 'recruits_total': current = recruits_total; break
      case 'chiffrages_total': current = chiffrages_total; break
      case 'level_reached': current = points_earned; break
    }
    return { current: Math.min(current, badge.condition_value), total: badge.condition_value }
  }

  return (
    <div className="p-8 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-light mb-1">Progression</p>
          <h1 className="font-display text-3xl font-bold tracking-[0.05em] uppercase text-text-primary">
            Mes badges
          </h1>
        </div>
        <div className="bg-white rounded-2xl px-5 py-3 shadow-[0_8px_30px_rgba(27,28,28,0.04)] flex items-center gap-2.5">
          <Trophy size={16} className="text-amber-500" />
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-text-light">Obtenus</p>
            <p className="font-display font-bold text-sm text-text-primary">
              {unlockedCount} / {allBadges.length}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar global */}
      {allBadges.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(27,28,28,0.04)] mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-secondary font-medium">Progression generale</span>
            <span className="font-display font-bold text-sm text-primary">
              {Math.round((unlockedCount / allBadges.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-700"
              style={{ width: `${(unlockedCount / allBadges.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges grid */}
      {allBadges.length === 0 ? (
        <div className="bg-white rounded-2xl p-14 shadow-[0_8px_30px_rgba(27,28,28,0.04)] text-center">
          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Award size={28} className="text-text-light" />
          </div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.05em] text-text-secondary">
            Aucun badge disponible pour l'instant
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allBadges.map((badge) => {
            const isUnlocked = unlockedIds.has(badge.id)
            const userBadge = userBadges.find((ub) => ub.badge_id === badge.id)
            const { current, total } = getProgress(badge)
            const IconComponent = ICON_MAP[badge.icon] ?? Award
            const pct = Math.round((current / total) * 100)

            return (
              <div
                key={badge.id}
                className={`bg-white rounded-2xl p-5 text-center relative overflow-hidden transition-all ${
                  isUnlocked
                    ? 'shadow-[0_8px_30px_rgba(28,123,29,0.15)] ring-1 ring-primary/20'
                    : 'shadow-[0_8px_30px_rgba(27,28,28,0.04)] opacity-70'
                }`}
              >
                {/* Glow effect for unlocked */}
                {isUnlocked && (
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl pointer-events-none" />
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center relative ${
                    isUnlocked ? 'bg-primary/10' : 'bg-background'
                  }`}
                >
                  <IconComponent
                    size={26}
                    className={isUnlocked ? '' : 'text-text-light/50'}
                    style={isUnlocked ? { color: badge.color } : undefined}
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 rounded-2xl bg-background/80 flex items-center justify-center">
                      <Lock size={14} className="text-text-light" />
                    </div>
                  )}
                </div>

                {/* Name + desc */}
                <p className={`font-bold text-xs uppercase tracking-wide mb-1 ${isUnlocked ? 'text-text-primary' : 'text-text-light'}`}>
                  {badge.name}
                </p>
                <p className="text-xs text-text-light leading-snug mb-3">
                  {badge.description}
                </p>

                {/* Unlocked date or progress */}
                {isUnlocked ? (
                  <span className="inline-block bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                    {userBadge?.unlocked_at ? formatDate(userBadge.unlocked_at) : 'Obtenu'}
                  </span>
                ) : (
                  <div>
                    <div className="w-full bg-background rounded-full h-1.5 mb-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary to-primary-dark h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-light font-medium">
                      {current} / {total} pour debloquer
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
