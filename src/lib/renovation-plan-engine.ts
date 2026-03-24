// =============================================================================
// Moteur d'ordonnancement des travaux — Logique ADEME
// =============================================================================

import type { DiagnosticResult, TypeResult } from '@/lib/diagnostic-engine'
import type { DiagnosticType } from '@/stores/diagnosticStore'

export interface RenovationStep {
  order: number
  phase: string
  phaseIcon: string
  types: TypeResult[]
  reason: string
  budgetMin: number
  budgetMax: number
  timing: string
}

export interface RenovationPlan {
  steps: RenovationStep[]
  totalBudgetMin: number
  totalBudgetMax: number
  estimatedDuration: string
  warnings: InteractionWarning[]
}

export interface InteractionWarning {
  icon: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

// Seuils de score par phase
const PHASE_DEFINITIONS: Array<{
  phase: string
  phaseIcon: string
  types: DiagnosticType[]
  scoreMin: number
  reason: string
}> = [
  {
    phase: 'Urgences',
    phaseIcon: '⚡',
    types: ['electricite'],
    scoreMin: 50,
    reason: 'La securite electrique est prioritaire : un defaut electrique peut causer un incendie ou une electrocution.',
  },
  {
    phase: 'Traitement',
    phaseIcon: '💧',
    types: ['humidite', 'plomberie'],
    scoreMin: 25,
    reason: "L'humidite et les fuites doivent etre resolues avant tout autre travaux pour eviter d'aggraver les degradations.",
  },
  {
    phase: 'Enveloppe',
    phaseIcon: '🏠',
    types: ['isolation', 'menuiseries'],
    scoreMin: 0,
    reason: "L'isolation et les menuiseries forment l'enveloppe du batiment : les traiter ensemble maximise les gains energetiques.",
  },
  {
    phase: 'Ventilation',
    phaseIcon: '🌬️',
    types: ['ventilation'],
    scoreMin: 0,
    reason: "La ventilation s'installe apres l'isolation pour eviter les risques de moisissures dans un batiment rendu etanche.",
  },
  {
    phase: 'Toiture',
    phaseIcon: '🏗️',
    types: ['toiture'],
    scoreMin: 0,
    reason: "La toiture protege l'ensemble du logement : son traitement est essentiel pour perenniser les autres travaux.",
  },
]

function getTiming(score: number): string {
  if (score >= 75) return 'Immediat'
  if (score >= 50) return 'Dans les 3 mois'
  if (score >= 25) return 'Dans les 6 mois'
  return 'A planifier sous 12 mois'
}

function getEstimatedDuration(stepCount: number, hasUrgency: boolean): string {
  if (stepCount <= 1) return hasUrgency ? '1 a 3 mois' : '3 a 6 mois'
  if (stepCount === 2) return '6 a 12 mois'
  if (stepCount === 3) return '12 a 18 mois'
  return '18 a 24 mois'
}

export function generateRenovationPlan(result: DiagnosticResult): RenovationPlan {
  const typeResultMap = new Map<DiagnosticType, TypeResult>()
  for (const tr of result.typeResults) {
    typeResultMap.set(tr.type, tr)
  }

  const steps: RenovationStep[] = []
  const placedTypes = new Set<DiagnosticType>()

  let orderIndex = 1

  for (const phaseDef of PHASE_DEFINITIONS) {
    const matchingResults: TypeResult[] = []

    for (const type of phaseDef.types) {
      const tr = typeResultMap.get(type)
      if (!tr) continue
      if (placedTypes.has(type)) continue
      // Pour les urgences et traitements, filtrer par score minimum
      if (phaseDef.scoreMin > 0 && tr.score < phaseDef.scoreMin) continue

      matchingResults.push(tr)
      placedTypes.add(type)
    }

    if (matchingResults.length === 0) continue

    const maxScore = Math.max(...matchingResults.map((tr) => tr.score))
    const budgetMin = matchingResults.reduce((sum, tr) => sum + tr.budgetMin, 0)
    const budgetMax = matchingResults.reduce((sum, tr) => sum + tr.budgetMax, 0)

    steps.push({
      order: orderIndex++,
      phase: phaseDef.phase,
      phaseIcon: phaseDef.phaseIcon,
      types: matchingResults,
      reason: phaseDef.reason,
      budgetMin,
      budgetMax,
      timing: getTiming(maxScore),
    })
  }

  // Phase "Confort" : tout ce qui reste avec score < 25 (et types non encore places)
  const confortTypes: TypeResult[] = []
  for (const tr of result.typeResults) {
    if (!placedTypes.has(tr.type)) {
      confortTypes.push(tr)
      placedTypes.add(tr.type)
    }
  }

  if (confortTypes.length > 0) {
    const maxScore = Math.max(...confortTypes.map((tr) => tr.score))
    const budgetMin = confortTypes.reduce((sum, tr) => sum + tr.budgetMin, 0)
    const budgetMax = confortTypes.reduce((sum, tr) => sum + tr.budgetMax, 0)

    steps.push({
      order: orderIndex,
      phase: 'Confort',
      phaseIcon: '✨',
      types: confortTypes,
      reason: 'Ces travaux ameliorent le confort general et peuvent etre planifies une fois les priorites realisees.',
      budgetMin,
      budgetMax,
      timing: getTiming(maxScore),
    })
  }

  // Warnings d'interactions
  const warnings: InteractionWarning[] = []

  const hasIsolation = typeResultMap.has('isolation')
  const hasVentilation = typeResultMap.has('ventilation')
  const hasHumidite = typeResultMap.has('humidite')

  if (hasIsolation && hasVentilation) {
    warnings.push({
      icon: '⚠️',
      title: 'Isolation avant VMC : attention',
      message:
        'Isoler sans ventiler provoque des moisissures. La VMC sera installee juste apres l\'isolation.',
      severity: 'warning',
    })
  }

  if (hasHumidite && hasIsolation) {
    warnings.push({
      icon: '🚫',
      title: 'Humidite a traiter en premier',
      message:
        "L'humidite doit etre traitee AVANT l'isolation. Isoler un mur humide aggrave les degats.",
      severity: 'critical',
    })
  }

  return {
    steps,
    totalBudgetMin: result.totalBudgetMin,
    totalBudgetMax: result.totalBudgetMax,
    estimatedDuration: getEstimatedDuration(steps.length, steps.some((s) => s.timing === 'Immediat')),
    warnings,
  }
}
