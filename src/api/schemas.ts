import { z } from 'zod'

// ---------------------------------------------------------------------------
// Helpers réutilisables
// ---------------------------------------------------------------------------
const uuid = z.string().uuid()
const optionalUuid = z.string().uuid().nullable().optional()
const optionalString = z.string().nullable().optional()

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
