import { z } from 'zod'

// ---------------------------------------------------------------------------
// Helpers réutilisables
// ---------------------------------------------------------------------------
const uuid = z.string().uuid()
const optionalUuid = z.string().uuid().nullable().optional()
const optionalString = z.string().nullable().optional()

// ---------------------------------------------------------------------------
// Row schemas — utilisés pour valider les retours Supabase avec JOINs
// ---------------------------------------------------------------------------

export const affiliateWithProfileSchema = z.object({
  id: z.string(),
  referral_code: z.string(),
  short_code: z.string().nullable().optional(),
  points_balance: z.number(),
  total_points_earned: z.number(),
  level: z.string(),
  created_at: z.string(),
  profile: z.object({
    full_name: z.string(),
    email: z.string(),
    avatar_url: z.string().nullable(),
  }),
}).passthrough()

export const brhProspectRowSchema = z.object({
  id: z.string(),
  source_type: z.string(),
  company_id: z.string().nullable(),
  submitted_by: z.string().nullable(),
  affiliate_id: z.string().nullable(),
  client_first_name: z.string(),
  client_last_name: z.string(),
  client_phone: z.string(),
  client_email: z.string().nullable(),
  client_address: z.string().nullable(),
  client_city: z.string().nullable(),
  client_postal_code: z.string().nullable(),
  work_type: z.array(z.string()),
  estimated_budget: z.string().nullable(),
  urgency: z.string().nullable(),
  status: z.string(),
  status_updated_at: z.string(),
  notes: z.string().nullable(),
  admin_notes: z.string().nullable(),
  lead_score: z.number(),
  crm_id: z.string().nullable(),
  crm_synced_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough()

export const companyMemberWithProfileSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  profile_id: z.string(),
  member_role: z.string(),
  joined_at: z.string(),
  profile: z.object({
    id: z.string(),
    email: z.string(),
    full_name: z.string(),
    avatar_url: z.string().nullable(),
  }),
}).passthrough()

export const brhSocialPostRowSchema = z.object({
  id: z.string(),
  submitted_by: z.string(),
  submitter_role: z.string(),
  company_id: z.string().nullable(),
  platform: z.string(),
  post_type: z.string(),
  post_url: z.string(),
  screenshot_path: z.string(),
  description: z.string().nullable(),
  reward_amount_cents: z.number().nullable(),
  reward_points: z.number().nullable(),
  reward_type: z.string(),
  status: z.string(),
  rejection_reason: z.string().nullable(),
  validated_at: z.string().nullable(),
  expiry_check_date: z.string().nullable(),
  expiry_confirmed: z.boolean(),
  is_duplicate: z.boolean(),
  admin_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough()

export const brhMessageRowSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  sender_id: z.string().nullable(),
  body: z.string(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  attachment_url: z.string().nullable(),
  attachment_name: z.string().nullable(),
  created_at: z.string(),
}).passthrough()

export const brhMessageThreadRowSchema = z.object({
  id: z.string(),
  subject: z.string(),
  participant_id: z.string().nullable(),
  participant_type: z.string(),
  last_message_at: z.string(),
  is_archived: z.boolean(),
  created_at: z.string(),
}).passthrough()

export const brhNotificationRowSchema = z.object({
  id: z.string(),
  recipient_id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  reference_type: z.string().nullable(),
  reference_id: z.string().nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
}).passthrough()

// ---------------------------------------------------------------------------
// Chiffrage
// ---------------------------------------------------------------------------
export const chiffrageLineSchema = z.object({
  description: z.string().min(1),
  quantite: z.number().nonnegative().optional(),
  unite: z.string().optional(),
  prix_unitaire: z.number().nonnegative().optional(),
  montant: z.number(),
})

export const chiffrageInsertSchema = z.object({
  user_id: uuid,
  company_id: optionalUuid,
  reference: z.string().min(1).max(50),
  client_name: z.string().min(1).max(200),
  client_address: optionalString,
  client_phone: z.string().max(20).nullable().optional(),
  projet_titre: z.string().min(1).max(300),
  projet_description: optionalString,
  lignes: z.array(chiffrageLineSchema),
  total_ht: z.number().nonnegative(),
  tva_rate: z.number().min(0).max(100),
  total_tva: z.number().nonnegative(),
  total_ttc: z.number().nonnegative(),
  notes: optionalString,
})

export type ChiffrageInsert = z.infer<typeof chiffrageInsertSchema>
export type ChiffrageLine = z.infer<typeof chiffrageLineSchema>

// ---------------------------------------------------------------------------
// Prospect
// ---------------------------------------------------------------------------
export const prospectInsertSchema = z.object({
  source_type: z.enum(['pro', 'particulier']),
  company_id: optionalUuid,
  submitted_by: optionalUuid,
  affiliate_id: optionalUuid,
  client_first_name: z.string().min(1).max(100),
  client_last_name: z.string().min(1).max(100),
  client_phone: z.string().min(6).max(20),
  client_email: z.string().email().nullable().optional(),
  client_address: optionalString,
  client_city: optionalString,
  client_postal_code: z.string().max(10).nullable().optional(),
  work_type: z.array(z.string()).optional(),
  estimated_budget: optionalString,
  urgency: z.string().max(30).nullable().optional(),
  notes: optionalString,
})

export type ProspectInsert = z.infer<typeof prospectInsertSchema>

// ---------------------------------------------------------------------------
// Social Post
// ---------------------------------------------------------------------------
export const socialPostInsertSchema = z.object({
  submitted_by: uuid,
  submitter_role: z.enum(['pro', 'particulier']),
  company_id: optionalUuid,
  platform: z.string().min(1).max(50),
  post_type: z.string().min(1).max(50),
  post_url: z.string().url(),
  screenshot_path: z.string().min(1),
  description: optionalString,
  reward_type: z.enum(['carte_cadeau', 'points']),
  reward_amount_cents: z.number().int().nonnegative().nullable().optional(),
  reward_points: z.number().int().nonnegative().nullable().optional(),
})

export type SocialPostInsert = z.infer<typeof socialPostInsertSchema>

// ---------------------------------------------------------------------------
// Messages / Threads
// ---------------------------------------------------------------------------
export const createThreadSchema = z.object({
  subject: z.string().min(1).max(200),
  participantId: uuid,
  participantType: z.enum(['pro', 'particulier']),
  firstMessage: z.string().min(1).max(5000),
})

export const sendMessageSchema = z.object({
  threadId: uuid,
  senderId: uuid,
  body: z.string().min(1).max(5000),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().max(255).optional(),
})

export type CreateThreadParams = z.infer<typeof createThreadSchema>
export type SendMessageParams = z.infer<typeof sendMessageSchema>
