import type { HealthUrgency } from '@/types/database'

export function getUrgencyFromScore(score: number): HealthUrgency {
  if (score >= 75) return 'critique'
  if (score >= 50) return 'eleve'
  if (score >= 25) return 'modere'
  return 'faible'
}
