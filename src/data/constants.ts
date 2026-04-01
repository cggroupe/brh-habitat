import type {
  DiagnosticStatus,
  CaseStatus,
  AppointmentType,
  AppointmentStatus,
  DpeRating,
  HealthDomain,
  HealthUrgency,
  WorkStatus,
  DocumentType,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Diagnostic statuses
// ---------------------------------------------------------------------------
export const DIAGNOSTIC_STATUSES: DiagnosticStatus[] = ['draft', 'pending', 'analyzed', 'contacted', 'closed']

export const DIAGNOSTIC_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  analyzed: 'Analyse',
  contacted: 'Contacte',
  closed: 'Cloture',
}

export const DIAGNOSTIC_STATUS_COLORS: Record<DiagnosticStatus, string> = {
  draft: 'bg-slate-100 text-slate-400',
  pending: 'bg-amber-100 text-amber-700',
  analyzed: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  closed: 'bg-slate-100 text-slate-500',
}

// ---------------------------------------------------------------------------
// Case statuses
// ---------------------------------------------------------------------------
export const CASE_STATUSES: CaseStatus[] = ['nouveau', 'en_cours', 'devis', 'travaux', 'termine']

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  devis: 'Devis',
  travaux: 'Travaux',
  termine: 'Termine',
}

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  nouveau: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  devis: 'bg-purple-100 text-purple-700',
  travaux: 'bg-green-100 text-green-700',
  termine: 'bg-slate-100 text-slate-500',
}

// ---------------------------------------------------------------------------
// Appointment types & statuses
// ---------------------------------------------------------------------------
export const APPOINTMENT_TYPES: AppointmentType[] = ['diagnostic', 'devis', 'visite', 'suivi']

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  diagnostic: 'Diagnostic',
  devis: 'Devis',
  visite: 'Visite',
  suivi: 'Suivi',
}

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['demande', 'pending', 'confirme', 'annule', 'termine']

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  demande: 'Demande',
  pending: 'En attente',
  confirme: 'Confirme',
  annule: 'Annule',
  termine: 'Termine',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  demande: 'bg-amber-100 text-amber-700',
  pending: 'bg-orange-100 text-orange-700',
  confirme: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-500',
  termine: 'bg-slate-100 text-slate-500',
}

// ---------------------------------------------------------------------------
// DPE ratings
// ---------------------------------------------------------------------------
export const DPE_RATINGS: DpeRating[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export const DPE_COLORS: Record<DpeRating, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-400',
  D: 'bg-amber-400',
  E: 'bg-orange-500',
  F: 'bg-red-500',
  G: 'bg-red-700',
}

// ---------------------------------------------------------------------------
// Article categories
// ---------------------------------------------------------------------------
export const ARTICLE_CATEGORIES = [
  'isolation',
  'ventilation',
  'toiture',
  'electricite',
  'renovation',
  'aides',
  'humidite',
  'menuiseries',
  'plomberie',
  'chauffage',
  'reglementation',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

// ---------------------------------------------------------------------------
// Property types
// ---------------------------------------------------------------------------
export const PROPERTY_TYPES = [
  'Maison individuelle',
  'Appartement',
  'Maison mitoyenne',
  'Immeuble',
  'Local commercial',
  'Autre',
] as const

// ---------------------------------------------------------------------------
// Health domains (Carnet de sante)
// ---------------------------------------------------------------------------
export const HEALTH_DOMAINS: HealthDomain[] = ['humidite', 'isolation', 'ventilation', 'menuiseries', 'electricite', 'toiture', 'plomberie']

export const HEALTH_DOMAIN_LABELS: Record<HealthDomain, string> = {
  humidite: 'Humidite',
  isolation: 'Isolation',
  ventilation: 'Ventilation',
  menuiseries: 'Menuiseries',
  electricite: 'Electricite',
  toiture: 'Toiture',
  plomberie: 'Plomberie',
}

export const HEALTH_DOMAIN_COLORS: Record<HealthDomain, { text: string; bg: string }> = {
  humidite: { text: 'text-blue-600', bg: 'bg-blue-50' },
  isolation: { text: 'text-orange-600', bg: 'bg-orange-50' },
  ventilation: { text: 'text-cyan-600', bg: 'bg-cyan-50' },
  menuiseries: { text: 'text-amber-700', bg: 'bg-amber-50' },
  electricite: { text: 'text-yellow-600', bg: 'bg-yellow-50' },
  toiture: { text: 'text-red-600', bg: 'bg-red-50' },
  plomberie: { text: 'text-primary', bg: 'bg-green-50' },
}

export const HEALTH_DOMAIN_ICONS: Record<HealthDomain, string> = {
  humidite: 'Droplets',
  isolation: 'Thermometer',
  ventilation: 'Wind',
  menuiseries: 'Square',
  electricite: 'Zap',
  toiture: 'Home',
  plomberie: 'Wrench',
}

export const URGENCY_LABELS: Record<HealthUrgency, string> = {
  faible: 'Etat satisfaisant',
  modere: 'Attention recommandee',
  eleve: 'Intervention conseillee',
  critique: 'Intervention urgente',
}

export const URGENCY_COLORS: Record<HealthUrgency, { text: string; bg: string; border: string; bar: string }> = {
  faible: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500' },
  modere: { text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-500' },
  eleve: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' },
  critique: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500' },
}

// ---------------------------------------------------------------------------
// Work statuses (Historique travaux)
// ---------------------------------------------------------------------------
export const WORK_STATUSES: WorkStatus[] = ['planifie', 'en_cours', 'termine']

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  planifie: 'Planifie',
  en_cours: 'En cours',
  termine: 'Termine',
}

export const WORK_STATUS_COLORS: Record<WorkStatus, string> = {
  planifie: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-amber-100 text-amber-700',
  termine: 'bg-green-100 text-green-700',
}

// ---------------------------------------------------------------------------
// Document types (Diagnostics obligatoires)
// ---------------------------------------------------------------------------
export const DOCUMENT_TYPES: DocumentType[] = ['dpe', 'amiante', 'plomb', 'electricite', 'gaz', 'erp', 'termites', 'assainissement', 'autre']

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  dpe: 'DPE',
  amiante: 'Amiante',
  plomb: 'Plomb',
  electricite: 'Electricite',
  gaz: 'Gaz',
  erp: 'Etat des risques',
  termites: 'Termites',
  assainissement: 'Assainissement',
  autre: 'Autre',
}

// Validite en annees (null = pas d'expiration)
export const DOCUMENT_VALIDITY_YEARS: Record<DocumentType, number | null> = {
  dpe: 10,
  amiante: null,
  plomb: null,
  electricite: 3,
  gaz: 3,
  erp: 0.5,
  termites: 0.5,
  assainissement: 3,
  autre: null,
}
