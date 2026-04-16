// =============================================================================
// Moteur de calcul des aides financieres — MaPrimeRenov' 2026, CEE, Eco-PTZ
// =============================================================================

import { MPR_GESTES, CEE_ESTIMATES, type RevenueProfile } from '@/data/aides-renov'
import type { DiagnosticType } from '@/stores/diagnosticStore'
import type { DiagnosticResult } from '@/lib/diagnostic-engine'

export interface AideResult {
  mprTotal: number
  ceeTotal: number
  mprDetails: AideDetail[]
  ceeDetails: AideDetail[]
  ecoPtz: boolean
  tvaReduite: boolean
  resteAChargeMin: number
  resteAChargeMax: number
  estimated: boolean // true si profil revenu non fourni (estimation sur base 'jaune')
}

export interface AideDetail {
  label: string
  montant: number
  unit: string
}

// Nombre de fenetres par defaut pour une maison standard
const DEFAULT_WINDOWS = 5
// Surface par defaut si non fournie
const DEFAULT_SURFACE_M2 = 50

export function calculateAides(
  diagnosticResult: DiagnosticResult,
  selectedTypes: DiagnosticType[],
  revenueProfile: RevenueProfile | null,
  surface?: number,
): AideResult {
  const estimated = revenueProfile === null
  const profile: RevenueProfile = revenueProfile ?? 'jaune'

  // Si le profil est 'rose', aucune aide MPR
  const mprDetails: AideDetail[] = []
  let mprTotal = 0

  if (profile !== 'rose') {
    for (const geste of MPR_GESTES) {
      // Verifier si ce geste est lie a au moins un type selectionne
      const isRelated = geste.relatedDiagnosticTypes.some((t) =>
        selectedTypes.includes(t as DiagnosticType),
      )
      if (!isRelated) continue

      const montantUnitaire = geste.montants[profile]
      if (montantUnitaire === 0) continue

      let montant = 0
      let unit = ''

      switch (geste.unit) {
        case 'forfait':
          montant = montantUnitaire
          unit = 'forfait'
          break
        case 'par_m2': {
          const surf = surface ?? DEFAULT_SURFACE_M2
          montant = montantUnitaire * surf
          unit = `${surf} m²`
          break
        }
        case 'par_equipement':
          montant = montantUnitaire * DEFAULT_WINDOWS
          unit = `${DEFAULT_WINDOWS} fenetres`
          break
      }

      if (montant > 0) {
        mprDetails.push({ label: geste.label, montant, unit })
        mprTotal += montant
      }
    }
  }

  // Calcul CEE
  const ceeDetails: AideDetail[] = []
  let ceeTotal = 0

  for (const ceeEstimate of CEE_ESTIMATES) {
    if (!selectedTypes.includes(ceeEstimate.diagnosticType as DiagnosticType)) continue

    const estimateMoy = Math.round((ceeEstimate.estimateMin + ceeEstimate.estimateMax) / 2)

    let montant = 0
    let unit = ''

    if (ceeEstimate.unit === 'par_m2') {
      const surf = surface ?? DEFAULT_SURFACE_M2
      montant = estimateMoy * surf
      unit = `${surf} m²`
    } else {
      montant = estimateMoy
      unit = 'forfait'
    }

    ceeDetails.push({ label: ceeEstimate.label, montant, unit })
    ceeTotal += montant
  }

  // Eco-PTZ : eligible si au moins 1 geste finance par MPR
  const ecoPtz = mprDetails.length > 0

  // TVA 5.5% toujours applicable sur travaux renovation energetique
  const tvaReduite = true

  // Reste a charge = budget diagnostic - MPR - CEE (min 0)
  const totalAides = mprTotal + ceeTotal
  const resteAChargeMin = Math.max(0, diagnosticResult.totalBudgetMin - totalAides)
  const resteAChargeMax = Math.max(0, diagnosticResult.totalBudgetMax - totalAides)

  return {
    mprTotal,
    ceeTotal,
    mprDetails,
    ceeDetails,
    ecoPtz,
    tvaReduite,
    resteAChargeMin,
    resteAChargeMax,
    estimated,
  }
}
