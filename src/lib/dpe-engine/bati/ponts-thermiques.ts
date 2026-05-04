/**
 * Ponts thermiques — `Σ ψ × L`.
 *
 * Source : CapRénov+ `fra/CalcPontsThermiques.as` (6 familles : PB-mur,
 * PI-mur, PH-mur, refends, autre logement, menuiserie).
 * Wiki : caprenov-reverse/wiki/02-moteur-bati/ponts-thermiques.md
 *
 * V1 : forfait simplifié (8% des déperditions enveloppe pour bâti non isolé,
 * 12% pour bâti isolé partiellement, 5% pour RT2012+).
 *
 * Phase 3+ : implémentation complète avec tables ψ (PB, PH, PI, refends,
 * menuiserie) + longueurs L calculées depuis géométrie. Nécessite des inputs
 * plus détaillés (matériau gros œuvre lourd/léger, position isolation, ratio
 * surfaces parois/sol, etc.).
 */

import type { BatiInputs } from '../types'

/**
 * Estime la part des ponts thermiques en pourcentage des déperditions
 * enveloppe selon période et niveau d'isolation.
 *
 * Justification : les ponts thermiques ITE bien faits = 5%, ITI bien fait
 * = 10-12%, sans isolation = 8% (plus faible relativement parce que les
 * déperditions parois sont déjà énormes).
 *
 * Source : retours d'expérience audits ADEME + valeurs CapRénov+ moyennes.
 */
function tauxPontsThermiques(bati: BatiInputs): number {
  const periode = bati.periodeConstruction
  const hasIsoMur = bati.parois.some(
    (p) => p.type === 'mur' && p.isolation?.type && p.isolation.type !== 'sans',
  )
  const isITE = bati.parois.some(
    (p) => p.type === 'mur' && p.isolation?.type === 'ite',
  )

  // RT2012+ : ponts thermiques traités, taux faible
  if (periode === 'apres_2013') return 0.05

  // ITE bien faite (post-1990) : taux faible
  if (isITE && (periode === '1989-2000' || periode === '2001-2005' || periode === '2006-2012')) {
    return 0.06
  }

  // ITI sur bâti ancien : taux élevé (ponts non traités)
  if (hasIsoMur && (periode === 'avant_1948' || periode === '1948-1974')) {
    return 0.12
  }

  // ITI sur bâti récent
  if (hasIsoMur) return 0.10

  // Aucune isolation : taux moyen
  return 0.08
}

/**
 * Déperdition forfaitaire par ponts thermiques (W/K).
 *
 * V1 : `DP_pt = taux × DP_enveloppe`.
 * Le calcul exact selon CapRénov+ (Σ ψ × L par famille) sera Phase 3+.
 */
export function calcPontsThermiquesForfait(
  bati: BatiInputs,
  deperEnveloppe: number,
): number {
  return tauxPontsThermiques(bati) * deperEnveloppe
}
