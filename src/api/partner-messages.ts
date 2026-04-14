import { supabase } from '@/lib/supabase'
import type { BrhMessageThreadRow, BrhMessageRow } from '@/types/partner'
import { createThreadSchema, sendMessageSchema, brhMessageRowSchema, brhMessageThreadRowSchema } from './schemas'

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
  return brhMessageRowSchema.array().parse(data ?? []) as BrhMessageRow[]
}

export async function createThread(params: {
  subject: string
  participantId: string
  participantType: 'pro' | 'particulier'
  firstMessage: string
}): Promise<BrhMessageThreadRow> {
  const validated = createThreadSchema.parse(params)

  const { data: thread, error: threadError } = await supabase
    .from('brh_message_threads')
    .insert({
      subject: validated.subject,
      participant_id: validated.participantId,
      participant_type: validated.participantType,
    })
    .select()
    .single()

  if (threadError) throw threadError

  const { error: msgError } = await supabase
    .from('brh_messages')
    .insert({
      thread_id: brhMessageThreadRowSchema.parse(thread).id,
      sender_id: validated.participantId,
      body: validated.firstMessage,
    })

  if (msgError) throw msgError

  return brhMessageThreadRowSchema.parse(thread) as BrhMessageThreadRow
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string,
  attachmentUrl?: string,
  attachmentName?: string,
): Promise<BrhMessageRow> {
  const validated = sendMessageSchema.parse({ threadId, senderId, body, attachmentUrl, attachmentName })

  const dbPayload: Record<string, unknown> = {
    thread_id: validated.threadId,
    sender_id: validated.senderId,
    body: validated.body,
  }
  if (validated.attachmentUrl) dbPayload.attachment_url = validated.attachmentUrl
  if (validated.attachmentName) dbPayload.attachment_name = validated.attachmentName

  const { data, error } = await supabase
    .from('brh_messages')
    .insert(dbPayload)
    .select()
    .single()

  if (error) throw error

  const { error: threadError } = await supabase
    .from('brh_message_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', validated.threadId)

  if (threadError) console.error('Failed to update thread last_message_at:', threadError)

  return brhMessageRowSchema.parse(data) as BrhMessageRow
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
