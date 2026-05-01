/**
 * Simulateur fiscal affilie particulier — calculs purs, aucun appel reseau.
 * Base : regime micro-entrepreneur BNC (apporteur d'affaires) France 2026.
 * Sources : URSSAF, impots.gouv.fr, DGFiP BOI-BNC-DECLA-10.
 */

export type SituationFiscale = 'faible' | 'moyenne' | 'elevee'
export type Profile = 'loisirs' | 'occasionnel' | 'regulier' | 'metier'

// ─── Seuils legaux 2026 ─────────────────────────────────────────────────────
export const SEUILS = {
  CADEAUX_EXONERES: 196,         // URSSAF : plafond cadeau en nature exonere/an
  BNC_NON_PRO: 1_200,            // DAS2 obligatoire au-dela (cash)
  STATUT_RECOMMANDE: 5_000,      // Micro-entreprise fortement conseillee
  FRANCHISE_TVA_BNC: 36_800,     // Seuil TVA BNC (base 2026)
  MICRO_BNC_MAX: 77_700,         // Sortie regime micro-BNC
  VL_REVENU_MAX_CELIB: 28_797,   // Revenu fiscal de ref pour option VL (celib)
} as const

// Taux 2026 micro-BNC apporteur d'affaires
export const TAUX = {
  COTIS_SSI: 0.212,    // Securite sociale independants
  CFP: 0.002,          // Contribution formation pro
  VL_BNC: 0.022,       // Versement liberatoire BNC (si eligible)
  ABATTEMENT_BNC: 0.34, // Abattement forfaitaire BNC (IR classique)
} as const

// Taux marginal d'imposition indicatif selon situation
const TMI_MAP: Record<SituationFiscale, number> = {
  faible: 0.11,   // Tranche 11%
  moyenne: 0.30,  // Tranche 30%
  elevee: 0.41,   // Tranche 41%
}

export interface SimulationInput {
  /** CA annuel estime en euros */
  caAnnuel: number
  /** Niveau de revenu principal (pour calcul IR) */
  situation: SituationFiscale
  /** A deja un SIRET / activite independante */
  hasSiret: boolean
}

export interface SimulationResult {
  profile: Profile
  caAnnuel: number
  caMensuel: number
  // Charges
  cotisationsSSI: number
  cfp: number
  impotRevenu: number
  totalCharges: number
  // Net
  net: number
  netMensuel: number
  tauxPrelevementGlobal: number // en %
  // Fiscal
  optionVersementLiberatoire: boolean
  franchiseTVA: boolean
  // Obligations
  obligations: string[]
  obligationsBrh: string[]
  avantagesAffilie: string[]
  alertes: string[]
  // CTA
  ctaLabel: string
  ctaUrl: string
}

// ─── Logique ────────────────────────────────────────────────────────────────

function getProfile(ca: number): Profile {
  if (ca <= SEUILS.CADEAUX_EXONERES) return 'loisirs'
  if (ca <= SEUILS.BNC_NON_PRO) return 'occasionnel'
  if (ca <= SEUILS.STATUT_RECOMMANDE) return 'regulier'
  return 'metier'
}

function canUseVL(situation: SituationFiscale): boolean {
  // Versement liberatoire reserve aux revenus modestes (celib RFR < 28 797 EUR)
  return situation === 'faible'
}

export function simulate(input: SimulationInput): SimulationResult {
  const ca = Math.max(0, Math.round(input.caAnnuel))
  const profile = getProfile(ca)

  // Charges sociales (identiques regime micro-BNC)
  const cotisationsSSI = ca * TAUX.COTIS_SSI
  const cfp = ca * TAUX.CFP

  // IR : soit versement liberatoire, soit IR classique avec abattement 34%
  const useVL = canUseVL(input.situation)
  let impotRevenu: number
  if (profile === 'loisirs') {
    impotRevenu = 0
  } else if (useVL) {
    impotRevenu = ca * TAUX.VL_BNC
  } else {
    const baseImposable = ca * (1 - TAUX.ABATTEMENT_BNC)
    impotRevenu = baseImposable * TMI_MAP[input.situation]
  }

  // Les profils "loisirs" et "occasionnel" n'ont pas de cotisations SSI
  // (on est en BNC non professionnel, pas en micro-entreprise)
  const charges = profile === 'loisirs' || profile === 'occasionnel'
    ? impotRevenu
    : cotisationsSSI + cfp + impotRevenu

  const net = Math.max(0, ca - charges)
  const taux = ca > 0 ? (charges / ca) * 100 : 0

  return {
    profile,
    caAnnuel: ca,
    caMensuel: ca / 12,
    cotisationsSSI: profile === 'loisirs' || profile === 'occasionnel' ? 0 : cotisationsSSI,
    cfp: profile === 'loisirs' || profile === 'occasionnel' ? 0 : cfp,
    impotRevenu,
    totalCharges: charges,
    net,
    netMensuel: net / 12,
    tauxPrelevementGlobal: taux,
    optionVersementLiberatoire: useVL && profile !== 'loisirs',
    franchiseTVA: ca < SEUILS.FRANCHISE_TVA_BNC,
    obligations: getObligations(profile, ca),
    obligationsBrh: getBrhActions(profile),
    avantagesAffilie: getAdvantages(profile),
    alertes: getAlerts(ca, input.hasSiret, profile),
    ctaLabel: getCta(profile).label,
    ctaUrl: getCta(profile).url,
  }
}

function getObligations(profile: Profile, ca: number): string[] {
  switch (profile) {
    case 'loisirs':
      return ['Rien du tout. Tu profites de tes cadeaux tranquillement.']
    case 'occasionnel':
      return [
        'Declarer les sommes recues en BNC non professionnel sur ta 2042-C-PRO',
        'Estimation : 5 min/an au moment de ta declaration de revenus',
      ]
    case 'regulier':
      return [
        'Creer ta micro-entreprise en ligne (15 min, gratuit, sur autoentrepreneur.urssaf.fr)',
        'Donner ton SIRET a BRH',
        'Declarer ton CA chaque mois ou trimestre sur autoentrepreneur.urssaf.fr',
      ]
    case 'metier':
      return [
        'Micro-entreprise obligatoire (15 min, gratuit)',
        'Donner ton SIRET a BRH',
        'Declaration mensuelle du CA a l\'URSSAF',
        ca >= SEUILS.FRANCHISE_TVA_BNC
          ? 'Au-dela de 36 800 EUR/an : facturer la TVA'
          : 'Franchise de TVA active : pas de TVA a facturer',
      ]
  }
}

function getBrhActions(profile: Profile): string[] {
  switch (profile) {
    case 'loisirs':
      return ['Te livre tes cadeaux du catalogue', 'Aucune demarche administrative']
    case 'occasionnel':
      return [
        'Aucune formalite cote BRH en dessous de 1 200 EUR/an',
        'T\'envoie ton recap annuel pour ta declaration',
      ]
    case 'regulier':
    case 'metier':
      return [
        'Genere automatiquement tes factures mensuelles',
        'Declare tes revenus en DAS2 (formulaire auto, 5 min/an)',
        'T\'envoie ton recap fiscal annuel',
        'Accompagne les premieres demarches via support dedie',
      ]
  }
}

function getAdvantages(profile: Profile): string[] {
  switch (profile) {
    case 'loisirs':
      return ['Zero paperasse', 'Tes cadeaux sont 100% a toi']
    case 'occasionnel':
      return ['Tres faible fiscalite', 'Une seule ligne a remplir en fin d\'annee']
    case 'regulier':
      return [
        'Regime social leger (21,4 % au total)',
        'Tu restes libre, pas de salariat ni d\'horaires',
        'Tu peux arreter a tout moment en 1 clic',
      ]
    case 'metier':
      return [
        'Vrai complement de revenu declare et protege',
        'Liberte totale d\'organisation',
        'Validation de trimestres retraite',
        'Cumul possible avec un salaire, chomage, retraite',
      ]
  }
}

function getAlerts(ca: number, hasSiret: boolean, profile: Profile): string[] {
  const alerts: string[] = []

  if (profile === 'metier' && !hasSiret) {
    alerts.push('Tu dois creer ta micro-entreprise AVANT de toucher tes commissions cash')
  }
  if (ca >= SEUILS.FRANCHISE_TVA_BNC && ca < SEUILS.MICRO_BNC_MAX) {
    alerts.push('Au-dela de 36 800 EUR/an : sortie franchise TVA, il faut facturer la TVA')
  }
  if (ca >= SEUILS.MICRO_BNC_MAX) {
    alerts.push('Au-dela de 77 700 EUR/an : passage oblige en regime reel (comptable recommande)')
  }
  return alerts
}

function getCta(profile: Profile): { label: string; url: string } {
  switch (profile) {
    case 'loisirs':
      return { label: 'Voir le catalogue cadeaux', url: '/particulier/catalogue' }
    case 'occasionnel':
      return {
        label: 'Comment declarer en BNC ? Guide 2 min',
        url: 'https://www.impots.gouv.fr/particulier/je-declare-mes-revenus-non-commerciaux-bnc',
      }
    case 'regulier':
    case 'metier':
      return {
        label: 'Creer ma micro-entreprise (15 min, gratuit)',
        url: 'https://www.autoentrepreneur.urssaf.fr/portail/accueil/creer-mon-auto-entreprise.html',
      }
  }
}

// ─── Formats ────────────────────────────────────────────────────────────────

export function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export const PROFILE_META: Record<Profile, { label: string; description: string; color: string; emoji: string }> = {
  loisirs: {
    label: 'Loisirs',
    description: 'Quelques parrainages par an, tu restes sur les cadeaux',
    color: 'emerald',
    emoji: '🌱',
  },
  occasionnel: {
    label: 'Complement occasionnel',
    description: 'Tu rends service a quelques voisins, ca reste leger',
    color: 'lime',
    emoji: '🌿',
  },
  regulier: {
    label: 'Activite reguliere',
    description: 'Tu en fais une activite suivie, statut recommande',
    color: 'amber',
    emoji: '🎯',
  },
  metier: {
    label: 'Second metier',
    description: 'Vrai complement de revenu, on t\'accompagne pour tout cadrer',
    color: 'blue',
    emoji: '💼',
  },
}
