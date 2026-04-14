import { supabase } from '@/lib/supabase'

export async function unlockBadges(userId: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return

  const { error } = await supabase
    .from('brh_user_badges')
    .upsert(
      badgeIds.map((badge_id) => ({ user_id: userId, badge_id })),
      { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
    )

  if (error) throw error
}
