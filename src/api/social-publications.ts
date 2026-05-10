/**
 * API brh_social_publications + brh_social_post_templates — Phase Employé V2.4.
 */
import { supabase } from '@/lib/supabase'

export type SocialPlatform = 'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'twitter' | 'autre'
export type PublicationStatus = 'pending' | 'validated' | 'rejected'

export interface SocialPostTemplate {
  id: string
  slug: string
  platform: SocialPlatform | 'all'
  title: string
  content: string
  hashtags: string[] | null
  is_active: boolean
}

export interface SocialPublication {
  id: string
  employee_id: string
  platform: SocialPlatform
  content_text: string
  publication_url: string | null
  status: PublicationStatus
  reach_count: number | null
  engagement_count: number | null
  template_id: string | null
  notes: string | null
  created_at: string
  validated_at: string | null
}

export const socialPublicationsApi = {
  async listTemplates(): Promise<SocialPostTemplate[]> {
    const { data, error } = await supabase
      .from('brh_social_post_templates')
      .select('*')
      .eq('is_active', true)
      .order('platform')
    if (error) throw error
    return (data ?? []) as SocialPostTemplate[]
  },

  async myRecent(employeeId: string, limit = 20): Promise<SocialPublication[]> {
    const { data, error } = await supabase
      .from('brh_social_publications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as SocialPublication[]
  },

  async create(input: {
    employee_id: string
    platform: SocialPlatform
    content_text: string
    publication_url?: string
    template_id?: string
  }): Promise<SocialPublication> {
    const { data, error } = await supabase
      .from('brh_social_publications')
      .insert({
        employee_id: input.employee_id,
        platform: input.platform,
        content_text: input.content_text,
        publication_url: input.publication_url ?? null,
        template_id: input.template_id ?? null,
        status: 'validated', // V1 : auto-validé
      })
      .select()
      .single()
    if (error) throw error
    return data as SocialPublication
  },
}
