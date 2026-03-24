// =============================================================================
// Baremes MaPrimeRenov' 2026 + CEE + Eco-PTZ + TVA
// Source : economie.gouv.fr, primesenergie.fr, effy.fr (mars 2026)
// =============================================================================

// ---------------------------------------------------------------------------
// Profils de revenus (plafonds Ile-de-France / Hors IDF pour 2026)
// ---------------------------------------------------------------------------

export type RevenueProfile = 'bleu' | 'jaune' | 'violet' | 'rose'

export interface RevenueThreshold {
  persons: number
  idf: number    // plafond Ile-de-France
  other: number  // plafond hors IDF
}

// Plafonds de revenus fiscaux de reference (RFR) — annee N-1
export const REVENUE_THRESHOLDS: Record<RevenueProfile, RevenueThreshold[]> = {
  bleu: [
    { persons: 1, idf: 23541, other: 17009 },
    { persons: 2, idf: 34551, other: 24875 },
    { persons: 3, idf: 41493, other: 29917 },
    { persons: 4, idf: 48447, other: 34948 },
    { persons: 5, idf: 55427, other: 40002 },
  ],
  jaune: [
    { persons: 1, idf: 28657, other: 21805 },
    { persons: 2, idf: 42058, other: 31889 },
    { persons: 3, idf: 50513, other: 38349 },
    { persons: 4, idf: 58981, other: 44802 },
    { persons: 5, idf: 67473, other: 51281 },
  ],
  violet: [
    { persons: 1, idf: 40018, other: 30549 },
    { persons: 2, idf: 58827, other: 44907 },
    { persons: 3, idf: 70382, other: 54071 },
    { persons: 4, idf: 82839, other: 63235 },
    { persons: 5, idf: 94844, other: 72400 },
  ],
  rose: [
    { persons: 1, idf: Infinity, other: Infinity },
    { persons: 2, idf: Infinity, other: Infinity },
    { persons: 3, idf: Infinity, other: Infinity },
    { persons: 4, idf: Infinity, other: Infinity },
    { persons: 5, idf: Infinity, other: Infinity },
  ],
}

export const REVENUE_PROFILE_LABELS: Record<RevenueProfile, string> = {
  bleu: 'Revenus tres modestes',
  jaune: 'Revenus modestes',
  violet: 'Revenus intermediaires',
  rose: 'Revenus superieurs',
}

export const REVENUE_PROFILE_COLORS: Record<RevenueProfile, string> = {
  bleu: 'bg-blue-100 text-blue-700',
  jaune: 'bg-yellow-100 text-yellow-700',
  violet: 'bg-purple-100 text-purple-700',
  rose: 'bg-pink-100 text-pink-700',
}

// ---------------------------------------------------------------------------
// Tranches simplifiees pour le wizard (hors IDF — Bretagne)
// ---------------------------------------------------------------------------

export interface SimpleRevenueRange {
  profile: RevenueProfile
  label: string
  description: string
  maxFor1Person: number // plafond pour 1 personne hors IDF
}

export const SIMPLE_REVENUE_RANGES: SimpleRevenueRange[] = [
  {
    profile: 'bleu',
    label: 'Revenus tres modestes',
    description: 'Jusqu\'a 17 009 EUR pour 1 personne',
    maxFor1Person: 17009,
  },
  {
    profile: 'jaune',
    label: 'Revenus modestes',
    description: 'Jusqu\'a 21 805 EUR pour 1 personne',
    maxFor1Person: 21805,
  },
  {
    profile: 'violet',
    label: 'Revenus intermediaires',
    description: 'Jusqu\'a 30 549 EUR pour 1 personne',
    maxFor1Person: 30549,
  },
  {
    profile: 'rose',
    label: 'Revenus superieurs',
    description: 'Au-dessus des plafonds',
    maxFor1Person: Infinity,
  },
]

// ---------------------------------------------------------------------------
// MaPrimeRenov' 2026 — Montants par geste
// ---------------------------------------------------------------------------

export type AideGeste =
  | 'pac_air_eau'
  | 'pac_geothermique'
  | 'chauffe_eau_solaire'
  | 'chauffe_eau_thermo'
  | 'poele_granules'
  | 'insert_cheminee'
  | 'vmc_double_flux'
  | 'isolation_combles'     // EUR/m2
  | 'isolation_planchers'   // EUR/m2
  | 'isolation_toiture_terrasse' // EUR/m2
  | 'fenetres'              // EUR par equipement

export interface MprGeste {
  id: AideGeste
  label: string
  unit: 'forfait' | 'par_m2' | 'par_equipement'
  montants: Record<RevenueProfile, number>
  relatedDiagnosticTypes: string[] // lie aux types de diagnostic BRH
}

export const MPR_GESTES: MprGeste[] = [
  {
    id: 'pac_air_eau',
    label: 'Pompe a chaleur air/eau',
    unit: 'forfait',
    montants: { bleu: 5000, jaune: 4000, violet: 3000, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'pac_geothermique',
    label: 'Pompe a chaleur geothermique',
    unit: 'forfait',
    montants: { bleu: 11000, jaune: 9000, violet: 6000, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'chauffe_eau_solaire',
    label: 'Chauffe-eau solaire individuel',
    unit: 'forfait',
    montants: { bleu: 4000, jaune: 3000, violet: 2000, rose: 0 },
    relatedDiagnosticTypes: ['plomberie'],
  },
  {
    id: 'chauffe_eau_thermo',
    label: 'Chauffe-eau thermodynamique',
    unit: 'forfait',
    montants: { bleu: 1200, jaune: 800, violet: 400, rose: 0 },
    relatedDiagnosticTypes: ['plomberie'],
  },
  {
    id: 'poele_granules',
    label: 'Poele a granules',
    unit: 'forfait',
    montants: { bleu: 1800, jaune: 1500, violet: 700, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'insert_cheminee',
    label: 'Insert de cheminee',
    unit: 'forfait',
    montants: { bleu: 1800, jaune: 1000, violet: 600, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'vmc_double_flux',
    label: 'VMC double flux',
    unit: 'forfait',
    montants: { bleu: 2500, jaune: 2000, violet: 1500, rose: 0 },
    relatedDiagnosticTypes: ['ventilation'],
  },
  {
    id: 'isolation_combles',
    label: 'Isolation des combles',
    unit: 'par_m2',
    montants: { bleu: 25, jaune: 20, violet: 15, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'isolation_planchers',
    label: 'Isolation des planchers bas',
    unit: 'par_m2',
    montants: { bleu: 25, jaune: 20, violet: 15, rose: 0 },
    relatedDiagnosticTypes: ['isolation'],
  },
  {
    id: 'isolation_toiture_terrasse',
    label: 'Isolation toiture-terrasse',
    unit: 'par_m2',
    montants: { bleu: 75, jaune: 60, violet: 40, rose: 0 },
    relatedDiagnosticTypes: ['toiture'],
  },
  {
    id: 'fenetres',
    label: 'Fenetres / portes-fenetres',
    unit: 'par_equipement',
    montants: { bleu: 100, jaune: 80, violet: 40, rose: 0 },
    relatedDiagnosticTypes: ['menuiseries'],
  },
]

// ---------------------------------------------------------------------------
// CEE (Certificats d'Economie d'Energie) — Estimations moyennes 2026
// ---------------------------------------------------------------------------

export interface CeeEstimate {
  diagnosticType: string
  label: string
  estimateMin: number
  estimateMax: number
  unit: 'forfait' | 'par_m2'
}

export const CEE_ESTIMATES: CeeEstimate[] = [
  { diagnosticType: 'isolation', label: 'Isolation combles', estimateMin: 8, estimateMax: 12, unit: 'par_m2' },
  { diagnosticType: 'isolation', label: 'Isolation plancher', estimateMin: 5, estimateMax: 10, unit: 'par_m2' },
  { diagnosticType: 'ventilation', label: 'VMC double flux', estimateMin: 300, estimateMax: 500, unit: 'forfait' },
  { diagnosticType: 'menuiseries', label: 'Fenetres', estimateMin: 50, estimateMax: 80, unit: 'forfait' },
  { diagnosticType: 'plomberie', label: 'Chauffe-eau thermodynamique', estimateMin: 100, estimateMax: 200, unit: 'forfait' },
  { diagnosticType: 'toiture', label: 'Isolation toiture', estimateMin: 8, estimateMax: 15, unit: 'par_m2' },
]

// ---------------------------------------------------------------------------
// Eco-PTZ et TVA
// ---------------------------------------------------------------------------

export const ECO_PTZ = {
  maxAmount: 50000,     // max eco-PTZ pour renovation globale
  maxAmountGeste: 15000, // max pour 1 geste
  maxAmount2Gestes: 25000,
  maxAmount3Gestes: 30000,
  duration: 20,          // ans
  rate: 0,               // taux 0%
}

export const TVA_REDUITE = {
  rate: 5.5,             // %
  description: 'TVA a 5,5% sur les travaux de renovation energetique',
  eligibleTypes: ['isolation', 'ventilation', 'menuiseries', 'toiture', 'electricite', 'plomberie'],
}

// ---------------------------------------------------------------------------
// DPE — Estimation gains par type de travaux
// ---------------------------------------------------------------------------

export interface DpeGainEstimate {
  workCombination: string[]
  gainMin: number  // classes gagnees (0.5, 1, 2...)
  gainMax: number
  label: string
}

export const DPE_GAIN_ESTIMATES: DpeGainEstimate[] = [
  { workCombination: ['isolation'], gainMin: 0.5, gainMax: 2, label: 'Isolation seule' },
  { workCombination: ['menuiseries'], gainMin: 0.5, gainMax: 1, label: 'Fenetres seules' },
  { workCombination: ['ventilation'], gainMin: 0.5, gainMax: 0.5, label: 'VMC seule' },
  { workCombination: ['electricite'], gainMin: 0, gainMax: 0, label: 'Electricite (pas d\'impact DPE)' },
  { workCombination: ['toiture'], gainMin: 0.5, gainMax: 1, label: 'Toiture / isolation toiture' },
  { workCombination: ['humidite'], gainMin: 0, gainMax: 0.5, label: 'Traitement humidite' },
  { workCombination: ['plomberie'], gainMin: 0, gainMax: 0.5, label: 'Plomberie / chauffage' },
  { workCombination: ['isolation', 'menuiseries'], gainMin: 1, gainMax: 2.5, label: 'Isolation + fenetres' },
  { workCombination: ['isolation', 'menuiseries', 'ventilation'], gainMin: 1.5, gainMax: 3, label: 'Enveloppe complete' },
  { workCombination: ['isolation', 'menuiseries', 'ventilation', 'toiture'], gainMin: 2, gainMax: 4, label: 'Renovation globale' },
]

export const DPE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type DpeClass = (typeof DPE_CLASSES)[number]

export const DPE_CLASS_COLORS: Record<DpeClass, string> = {
  A: '#319834',
  B: '#55a03a',
  C: '#8ebd3b',
  D: '#f2e500',
  E: '#f0b41a',
  F: '#eb6825',
  G: '#e42a1d',
}
