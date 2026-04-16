import type { BrhHomeRow, BrhHealthRecordRow, HealthDomain } from '@/types/database'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface BretagneAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  relatedDomain: HealthDomain | null
}

interface AlertRule {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  relatedDomain: HealthDomain | null
  condition: (home: BrhHomeRow, records: BrhHealthRecordRow[]) => boolean
}

const ALERT_RULES: AlertRule[] = [
  {
    id: 'granit_humidite',
    severity: 'warning',
    title: 'Murs en granit et humidite',
    message: 'Les maisons bretonnes en pierre/granit anterieures a 1950 sont particulierement sensibles aux remontees capillaires et a l\'humidite. Un diagnostic humidite est recommande.',
    relatedDomain: 'humidite',
    condition: (home) => home.year_built < 1950 && home.property_type?.toLowerCase().includes('maison'),
  },
  {
    id: 'climat_oceanique',
    severity: 'warning',
    title: 'Climat oceanique — risque humidite eleve',
    message: 'Le score humidite de votre logement est eleve. Le climat breton (pluies frequentes, hygrometrie elevee) aggrave les problemes d\'humidite. Verifiez vos murs, toiture et ventilation.',
    relatedDomain: 'humidite',
    condition: (_home, records) => {
      const rec = records.find((r) => r.domain === 'humidite')
      return !!rec && (rec.score ?? 0) >= 60
    },
  },
  {
    id: 'ardoise_toiture',
    severity: 'info',
    title: 'Toiture en ardoise — entretien specifique',
    message: 'Les ardoises bretonnes sont sensibles aux lichens et au delitage. Un traitement hydrofuge adapte (jamais de nettoyeur haute pression) est recommande tous les 10 ans.',
    relatedDomain: 'toiture',
    condition: (_home, records) => {
      const rec = records.find((r) => r.domain === 'toiture')
      return !!rec && rec.symptoms.some((s) => s.toLowerCase().includes('ardoise'))
    },
  },
  {
    id: 'ventilation_condensation',
    severity: 'warning',
    title: 'Absence de ventilation mecanique',
    message: 'Sans VMC, la condensation est inevitable en Bretagne (ecart temperature interieur/exterieur + humidite ambiante). Une VMC simple ou double flux est fortement recommandee.',
    relatedDomain: 'ventilation',
    condition: (_home, records) => {
      const rec = records.find((r) => r.domain === 'ventilation')
      // Verifier si un enregistrement de ventilation existe avec un score eleve
      // Note: pas de champ ventilation_type dans brh_homes, on se base sur les health records
      return !!rec && (rec.score ?? 0) >= 40
    },
  },
  {
    id: 'passoire_thermique',
    severity: 'critical',
    title: 'Passoire thermique — DPE F ou G',
    message: 'Votre logement est classe passoire thermique. Depuis 2025, les logements classes G sont interdits a la location. Des aides MaPrimeRenov\' renforcees sont disponibles pour les renovations globales.',
    relatedDomain: 'isolation',
    condition: (home) => home.dpe_rating === 'F' || home.dpe_rating === 'G',
  },
  {
    id: 'electricite_ancienne',
    severity: 'warning',
    title: 'Installation electrique ancienne',
    message: 'Les installations anterieures a 1990 ne sont generalement pas conformes aux normes NF C 15-100 actuelles. Une mise aux normes est recommandee pour la securite.',
    relatedDomain: 'electricite',
    condition: (home, records) => {
      const rec = records.find((r) => r.domain === 'electricite')
      return home.year_built < 1990 && !!rec && (rec.score ?? 0) >= 40
    },
  },
  {
    id: 'isolation_ancienne',
    severity: 'info',
    title: 'Isolation potentiellement insuffisante',
    message: 'Les maisons construites avant 1975 (premiere reglementation thermique) sont souvent mal isolees. L\'isolation des combles est le geste le plus rentable avec un retour sur investissement de 3 a 5 ans.',
    relatedDomain: 'isolation',
    condition: (home) => home.year_built < 1975,
  },
]

export function computeBretagneAlerts(
  home: BrhHomeRow,
  records: BrhHealthRecordRow[],
): BretagneAlert[] {
  return ALERT_RULES
    .filter((rule) => rule.condition(home, records))
    .map(({ id, severity, title, message, relatedDomain }) => ({
      id,
      severity,
      title,
      message,
      relatedDomain,
    }))
}
