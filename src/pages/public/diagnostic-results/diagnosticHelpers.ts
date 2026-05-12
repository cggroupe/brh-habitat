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

// Libellés anxiogènes pour pousser à la prise de RDV (retour Philippe 12/05).
// Le score est désormais inversé en "score de santé" :
//   0-24  → critique (alarme rouge — agir tout de suite)
//   25-49 → eleve   (préoccupant — agir vite)
//   50-74 → modere  (état moyen — à améliorer)
//   75-100→ faible  (bon état — surveillance)
export const URGENCY_CONFIG: Record<UrgencyLevel, UrgencyConfig> = {
  critique: {
    label: 'État critique — agir maintenant',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-300',
    bar: 'bg-red-600',
    icon: AlertTriangle,
  },
  eleve: {
    label: 'État préoccupant — intervention conseillée',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    bar: 'bg-orange-500',
    icon: TrendingUp,
  },
  modere: {
    label: 'État moyen — à améliorer',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    bar: 'bg-yellow-500',
    icon: Info,
  },
  faible: {
    label: 'Bon état — surveillance',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    bar: 'bg-green-500',
    icon: CheckCircle2,
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
