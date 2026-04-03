import { supabase } from '@/lib/supabase'
import type { BrhMessageThreadRow, BrhMessageRow } from '@/types/partner'

export interface ThreadWithLastMessage extends BrhMessageThreadRow {
  last_message?: string
  unread_count: number
}

export async function fetchMyThreads(userId: string): Promise<ThreadWithLastMessage[]> {
  const { data: threads, error } = await supabase
    .from('brh_message_threads')
    .select('*')
    .eq('participant_id', userId)
    .eq('is_archived', false)
    .order('last_message_at', { ascending: false })

  if (error) throw error

  const enriched: ThreadWithLastMessage[] = []
  for (const thread of threads ?? []) {
    const { data: messages } = await supabase
      .from('brh_messages')
      .select('body, is_read, sender_id')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const unreadCount = await supabase
      .from('brh_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .eq('is_read', false)
      .neq('sender_id', userId)

    enriched.push({
      ...(thread as unknown as BrhMessageThreadRow),
      last_message: messages?.[0]?.body ?? undefined,
      unread_count: unreadCount.count ?? 0,
    })
  }

  return enriched
}

export async function fetchThreadMessages(threadId: string): Promise<BrhMessageRow[]> {
  const { data, error } = await supabase
    .from('brh_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as BrhMessageRow[]
}

export async function createThread(params: {
  subject: string
  participantId: string
  participantType: 'pro' | 'particulier'
  firstMessage: string
}): Promise<BrhMessageThreadRow> {
  const { data: thread, error: threadError } = await supabase
    .from('brh_message_threads')
    .insert({
      subject: params.subject,
      participant_id: params.participantId,
      participant_type: params.participantType,
    })
    .select()
    .single()

  if (threadError) throw threadError

  const { error: msgError } = await supabase
    .from('brh_messages')
    .insert({
      thread_id: (thread as unknown as BrhMessageThreadRow).id,
      sender_id: params.participantId,
      body: params.firstMessage,
    })

  if (msgError) throw msgError

  return thread as unknown as BrhMessageThreadRow
}

export async function sendMessage(threadId: string, senderId: string, body: string): Promise<BrhMessageRow> {
  const { data, error } = await supabase
    .from('brh_messages')
    .insert({ thread_id: threadId, sender_id: senderId, body })
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('brh_message_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId)

  return data as unknown as BrhMessageRow
}

export async function markThreadMessagesRead(threadId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('brh_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('is_read', false)
    .neq('sender_id', userId)

  if (error) throw error
}
