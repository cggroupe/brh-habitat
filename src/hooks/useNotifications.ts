import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error'
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/partner-notifications'

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()

  const notifications = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchMyNotifications(userId!),
    enabled: !!userId,
  })

  const unreadCount = useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: Error) => logError('markNotificationRead failed', err),
  })

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (err: Error) => logError('markAllNotificationsRead failed', err),
  })

  // Supabase Realtime — ecouter les nouvelles notifications
  // Wrappe dans try/catch : une erreur realtime ne doit JAMAIS crasher l'espace affilie
  useEffect(() => {
    if (!userId) return

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', userId] })
    }

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`notifications:${userId}:${crypto.randomUUID()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'brh_notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          handler,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'brh_notifications',
            filter: `recipient_id=eq.${userId}`,
          },
          handler,
        )
        .subscribe()
    } catch (err) {
      logError('useNotifications realtime setup failed', err instanceof Error ? err : new Error(String(err)))
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel) } catch { /* ignore */ }
      }
    }
  }, [userId, queryClient])

  return {
    notifications: notifications.data ?? [],
    unreadCount: unreadCount.data ?? 0,
    isLoading: notifications.isLoading,
    markRead,
    markAllRead,
  }
}
