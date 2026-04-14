import { CheckCircle2, Info, TrendingUp, AlertTriangle } from 'lucide-react'

export type UrgencyLevel = 'faible' | 'modere' | 'eleve' | 'critique'

export interface UrgencyConfig {
  label: string
  color: string
  bg: string
  border: string
  bar: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  faible: {
    label: 'Etat satisfaisant',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    bar: 'bg-green-500',
    icon: CheckCircle2,
  },
  modere: {
    label: 'Attention recommandee',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    bar: 'bg-yellow-500',
    icon: Info,
  },
  eleve: {
    label: 'Intervention conseillee',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    icon: TrendingUp,
  },
  critique: {
    label: 'Intervention urgente',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-500',
    icon: AlertTriangle,
  },
}

export const PRIORITY_BADGE: Record<string, string> = {
  haute: 'bg-red-100 text-red-700 border border-red-200',
  moyenne: 'bg-orange-100 text-orange-700 border border-orange-200',
  basse: 'bg-gray-100 text-gray-600 border border-gray-200',
}

export const PRIORITY_LABEL: Record<string, string> = {
  haute: 'Priorite haute',
  moyenne: 'Priorite moyenne',
  basse: 'Priorite basse',
}

export const REVENUE_LABELS: Record<string, string> = {
  bleu: 'Profil Bleu — Revenus tres modestes',
  jaune: 'Profil Jaune — Revenus modestes',
  violet: 'Profil Violet — Revenus intermediaires',
  rose: 'Profil Rose — Revenus superieurs',
}

export function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function formatBudgetRange(min: number, max: number): string {
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
  return `${fmt(min)} — ${fmt(max)} EUR`
}
