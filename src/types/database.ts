export type DiagnosticStatus = 'draft' | 'pending' | 'analyzed' | 'contacted' | 'closed'
export type CaseStatus = 'nouveau' | 'en_cours' | 'devis' | 'travaux' | 'termine'
export type AppointmentType = 'diagnostic' | 'devis' | 'visite' | 'suivi'
export type AppointmentStatus = 'pending' | 'demande' | 'confirme' | 'annule' | 'termine'
export type ContactStatus = 'nouveau' | 'lu' | 'traite'
export type DpeRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type UserRole = 'user' | 'admin'
export type Locale = 'fr' | 'en'
export type HealthDomain = 'humidite' | 'isolation' | 'ventilation' | 'menuiseries' | 'electricite' | 'toiture' | 'plomberie'
export type HealthUrgency = 'faible' | 'modere' | 'eleve' | 'critique'
export type WorkStatus = 'planifie' | 'en_cours' | 'termine'
export type DocumentType = 'dpe' | 'amiante' | 'plomb' | 'electricite' | 'gaz' | 'erp' | 'termites' | 'assainissement' | 'autre'

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
  current_step: number
  equipment: Record<string, unknown> | null
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
  health_score: number | null
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
  diagnostic_id: string | null
  type: AppointmentType
  requested_date: string
  confirmed_date: string | null
  status: AppointmentStatus
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  preferred_slot: string | null
  notes: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhContactRow {
  id: string
  nom: string
  email: string
  telephone: string | null
  sujet: string | null
  message: string
  status: ContactStatus
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

export interface BrhHealthRecordRow {
  id: string
  home_id: string
  user_id: string
  domain: HealthDomain
  score: number | null
  urgency: HealthUrgency | null
  symptoms: string[]
  notes: string | null
  assessed_at: string
  created_at: string
  updated_at: string
}

export interface BrhWorkHistoryRow {
  id: string
  home_id: string
  user_id: string
  domain: HealthDomain | 'autre'
  title: string
  description: string | null
  contractor: string | null
  cost: number | null
  status: WorkStatus
  work_date: string | null
  completed_at: string | null
  documents: string[]
  created_at: string
  updated_at: string
}

export interface BrhHomeDocumentRow {
  id: string
  home_id: string
  user_id: string
  doc_type: DocumentType
  title: string
  file_url: string | null
  issued_at: string | null
  expires_at: string | null
  notes: string | null
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
      brh_contacts: { Row: BrhContactRow; Insert: Omit<BrhContactRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhContactRow, 'id'>> }
      profiles: { Row: ProfileRow; Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>; Update: Partial<Omit<ProfileRow, 'id'>> }
      brh_health_records: { Row: BrhHealthRecordRow; Insert: Omit<BrhHealthRecordRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHealthRecordRow, 'id'>> }
      brh_work_history: { Row: BrhWorkHistoryRow; Insert: Omit<BrhWorkHistoryRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhWorkHistoryRow, 'id'>> }
      brh_home_documents: { Row: BrhHomeDocumentRow; Insert: Omit<BrhHomeDocumentRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHomeDocumentRow, 'id'>> }
    }
  }
}
