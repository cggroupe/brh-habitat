import type {
  DiagnosticStatus,
  CaseStatus,
  AppointmentType,
  AppointmentStatus,
  DpeRating,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Diagnostic statuses
// ---------------------------------------------------------------------------
export const DIAGNOSTIC_STATUSES: DiagnosticStatus[] = ['pending', 'analyzed', 'contacted', 'closed']

export const DIAGNOSTIC_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  pending: 'En attente',
  analyzed: 'Analyse',
  contacted: 'Contacte',
  closed: 'Cloture',
}

export const DIAGNOSTIC_STATUS_COLORS: Record<DiagnosticStatus, string> = {
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

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['demande', 'confirme', 'annule', 'termine']

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  demande: 'Demande',
  confirme: 'Confirme',
  annule: 'Annule',
  termine: 'Termine',
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  demande: 'bg-amber-100 text-amber-700',
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
