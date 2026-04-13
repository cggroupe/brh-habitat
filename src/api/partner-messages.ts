import { supabase } from '@/lib/supabase'
import type { BrhMessageThreadRow, BrhMessageRow } from '@/types/partner'

export interface ThreadWithLastMessage extends BrhMessageThreadRow {
  last_message?: string
  unread_count: number
}

export async function fetchMyThreads(userId: string): Promise<ThreadWithLastMessage[]> {
  // Requete unique via RPC (pas de N+1)
  const { data, error } = await supabase.rpc('get_my_threads_enriched', { p_user_id: userId })

  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    subject: row.subject as string,
    participant_id: row.participant_id as string | null,
    participant_type: row.participant_type as 'pro' | 'particulier',
    last_message_at: row.last_message_at as string,
    is_archived: row.is_archived as boolean,
    created_at: row.created_at as string,
    last_message: (row.last_message as string) ?? undefined,
    unread_count: Number(row.unread_count ?? 0),
  }))
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

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string,
  attachmentUrl?: string,
  attachmentName?: string,
): Promise<BrhMessageRow> {
  const payload: Record<string, unknown> = { thread_id: threadId, sender_id: senderId, body }
  if (attachmentUrl) payload.attachment_url = attachmentUrl
  if (attachmentName) payload.attachment_name = attachmentName

  const { data, error } = await supabase
    .from('brh_messages')
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('brh_message_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', threadId)

  return data as unknown as BrhMessageRow
}

export async function uploadMessageAttachment(
  userId: string,
  threadId: string,
  file: File,
): Promise<{ url: string; name: string }> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${threadId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('message-attachments')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error

  const { data: publicData } = supabase.storage.from('message-attachments').getPublicUrl(path)

  return { url: publicData.publicUrl, name: file.name }
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
