/**
 * API artisan-invitations — Phase 13.6.5.
 */

import { supabase } from '@/lib/supabase'

export interface InviteVerifyResult {
  valid: boolean
  reason?: 'invalid' | 'expired' | 'accepted' | 'revoked' | 'rate_limit' | 'error'
  artisan?: {
    id: string
    nom_entreprise: string
    representant: string | null
    commune: string | null
    code_postal: string | null
    departement: string | null
    geste_specialites: string[]
  }
  emailTo?: string
  messagePersonnel?: string | null
  expiresAt?: string
}

export interface InviteAcceptResult {
  success: boolean
  artisanId?: string
  message?: string
}

export interface InviteCreateResult {
  invitationId: string
  token: string
  urlOnboarding: string
  sent: boolean
  emailTo: string
}

export const artisanInvitationsApi = {
  /**
   * Public — vérifie le token magic link.
   */
  async verify(token: string): Promise<InviteVerifyResult> {
    const { data, error } = await supabase.functions.invoke<InviteVerifyResult>(
      'artisan-invite-verify',
      { body: { token } },
    )
    if (error) throw error
    return data ?? { valid: false, reason: 'error' }
  },

  /**
   * Authentifié — accepte l'invitation et lie profile_id à artisan.
   */
  async accept(token: string): Promise<InviteAcceptResult> {
    const { data, error } = await supabase.functions.invoke<InviteAcceptResult>(
      'artisan-invite-accept',
      { body: { token } },
    )
    if (error) throw error
    return data ?? { success: false, message: 'Réponse vide' }
  },

  /**
   * Admin — crée une invitation pour un artisan.
   */
  async create(input: {
    artisanId: string
    emailTo?: string
    messagePersonnel?: string
  }): Promise<InviteCreateResult> {
    const { data, error } = await supabase.functions.invoke<InviteCreateResult>(
      'artisan-invite-create',
      { body: input },
    )
    if (error) throw error
    if (!data) throw new Error('Réponse vide artisan-invite-create')
    return data
  },

  /**
   * Envoie un OTP par email (magic link Supabase Auth standard).
   * Le user clique le lien dans l'email → arrive avec session Supabase active.
   */
  async sendMagicLink(email: string, redirectToken: string): Promise<void> {
    const redirectTo = `${window.location.origin}/artisan/onboarding/${redirectToken}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    })
    if (error) throw error
  },
}
