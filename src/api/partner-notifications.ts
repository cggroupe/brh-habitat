import { supabase } from '@/lib/supabase'
import type { BrhNotificationRow } from '@/types/partner'

export async function fetchMyNotifications(userId: string): Promise<BrhNotificationRow[]> {
  const { data, error } = await supabase
    .from('brh_notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as unknown as BrhNotificationRow[]
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('brh_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) throw error
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('brh_notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) throw error
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('brh_notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

export async function createNotification(params: {
  recipientId: string
  type: string
  title: string
  body?: string
  referenceType?: string
  referenceId?: string
}): Promise<BrhNotificationRow> {
  const { data, error } = await supabase
    .from('brh_notifications')
    .insert({
      recipient_id: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as BrhNotificationRow
}
