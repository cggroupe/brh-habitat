export type DiagnosticStatus = 'pending' | 'analyzed' | 'contacted' | 'closed'
export type CaseStatus = 'nouveau' | 'en_cours' | 'devis' | 'travaux' | 'termine'
export type AppointmentType = 'diagnostic' | 'devis' | 'visite' | 'suivi'
export type AppointmentStatus = 'demande' | 'confirme' | 'annule' | 'termine'
export type DpeRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type UserRole = 'user' | 'admin'
export type Locale = 'fr' | 'en'

export interface BrhDiagnosticRow {
  id: string
  user_id: string | null
  types: string[]
  property_type: string
  property_address: string
  property_surface: number
  property_year: number
  property_floors: number
  symptoms: Record<string, string[]>
  photos: string[]
  contact_name: string
  contact_phone: string
  contact_email: string
  results: Record<string, unknown> | null
  status: DiagnosticStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhHomeRow {
  id: string
  user_id: string
  address: string
  city: string
  postal_code: string
  property_type: string
  surface: number
  year_built: number
  floors: number
  heating_type: string | null
  insulation_type: string | null
  dpe_rating: DpeRating | null
  photos: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhCaseRow {
  id: string
  user_id: string
  home_id: string | null
  diagnostic_id: string | null
  title: string
  description: string | null
  work_types: string[]
  status: CaseStatus
  estimated_budget: number | null
  start_date: string | null
  end_date: string | null
  documents: string[]
  admin_notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface BrhAppointmentRow {
  id: string
  user_id: string | null
  case_id: string | null
  home_id: string | null
  type: AppointmentType
  requested_date: string
  confirmed_date: string | null
  status: AppointmentStatus
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhArticleRow {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  cover_image: string | null
  author: string
  seo_title: string | null
  seo_description: string | null
  published: boolean
  read_time: number | null
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  locale: Locale | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      brh_diagnostics: { Row: BrhDiagnosticRow; Insert: Omit<BrhDiagnosticRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhDiagnosticRow, 'id'>> }
      brh_homes: { Row: BrhHomeRow; Insert: Omit<BrhHomeRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHomeRow, 'id'>> }
      brh_cases: { Row: BrhCaseRow; Insert: Omit<BrhCaseRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhCaseRow, 'id'>> }
      brh_appointments: { Row: BrhAppointmentRow; Insert: Omit<BrhAppointmentRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhAppointmentRow, 'id'>> }
      brh_articles: { Row: BrhArticleRow; Insert: Omit<BrhArticleRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhArticleRow, 'id'>> }
      profiles: { Row: ProfileRow; Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>; Update: Partial<Omit<ProfileRow, 'id'>> }
    }
  }
}
