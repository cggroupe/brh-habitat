import { useEffect } from 'react'
import {
  Award, Lock, Star, Trophy, Zap, Target, Users, TrendingUp,
  Heart, Shield, Flame, Crown, Gift, Medal, Rocket, CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useMyAffiliate, useAffiliateProspects, useMyRecruitTree } from '@/hooks/queries'

// Map icon name strings to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Star, Trophy, Zap, Target, Users, TrendingUp, Heart, Shield,
  Flame, Crown, Gift, Medal, Rocket, CheckCircle, Award,
}

interface Badge {
  id: string
  name: string
  description: string
  icon_name: string
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
        }
        if (currentValue >= badge.condition_value) {
          toUnlock.push(badge.id)
        }
      }
      if (toUnlock.length === 0) return
      await supabase.from('brh_user_badges').upsert(
        toUnlock.map((badge_id) => ({ user_id: user!.id, badge_id })),
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      )
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
    }
    return { current: Math.min(current, badge.condition_value), total: badge.condition_value }
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Award size={24} className="text-primary" />
          <h1 className="font-display text-2xl uppercase tracking-wide text-slate-900">
            Mes badges
          </h1>
        </div>
        <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100 flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <span className="font-display text-sm text-slate-700">
            {unlockedCount} / {allBadges.length} obtenus
          </span>
        </div>
      </div>

      {/* Progress bar global */}
      {allBadges.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-sm text-slate-600">Progression generale</span>
            <span className="font-display text-sm text-primary">
              {Math.round((unlockedCount / allBadges.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${(unlockedCount / allBadges.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges grid */}
      {allBadges.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <Award size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="font-display text-lg text-slate-500">Aucun badge disponible pour l'instant</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allBadges.map((badge) => {
            const isUnlocked = unlockedIds.has(badge.id)
            const userBadge = userBadges.find((ub) => ub.badge_id === badge.id)
            const { current, total } = getProgress(badge)
            const IconComponent = ICON_MAP[badge.icon_name] ?? Award
            const pct = Math.round((current / total) * 100)

            return (
              <div
                key={badge.id}
                className={`bg-white rounded-xl p-5 shadow-sm border text-center relative overflow-hidden transition-all ${
                  isUnlocked
                    ? 'border-primary/30 ring-1 ring-primary/20'
                    : 'border-slate-100 opacity-70'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center relative ${
                    isUnlocked ? 'bg-primary/10' : 'bg-slate-100'
                  }`}
                >
                  <IconComponent
                    size={26}
                    className={isUnlocked ? 'text-primary' : 'text-slate-400'}
                    style={isUnlocked ? { color: badge.color } : undefined}
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 rounded-full bg-slate-200/60 flex items-center justify-center">
                      <Lock size={14} className="text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Name + desc */}
                <p className={`font-display text-xs uppercase tracking-wide mb-1 ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>
                  {badge.name}
                </p>
                <p className="font-body text-xs text-slate-400 leading-snug mb-3">
                  {badge.description}
                </p>

                {/* Unlocked date or progress */}
                {isUnlocked ? (
                  <span className="inline-block bg-primary/10 text-primary font-body text-xs px-2 py-0.5 rounded-full">
                    {userBadge?.unlocked_at ? formatDate(userBadge.unlocked_at) : 'Obtenu'}
                  </span>
                ) : (
                  <div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                      <div
                        className="bg-primary/40 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-body text-xs text-slate-400">
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
