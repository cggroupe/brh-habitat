import type { DiagnosticType } from '@/stores/diagnosticStore'

export interface DiagnosticTypeConfig {
  id: DiagnosticType
  label: string
  icon: string
  description: string
  color: string
  bgColor: string
}

export const diagnosticTypes: DiagnosticTypeConfig[] = [
  {
    id: 'humidite',
    label: 'Humidité',
    icon: 'Droplets',
    description: 'Infiltrations, condensation, moisissures, remontées capillaires',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'isolation',
    label: 'Isolation',
    icon: 'Thermometer',
    description: 'Déperditions thermiques, ponts thermiques, isolation insuffisante',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'ventilation',
    label: 'Ventilation',
    icon: 'Wind',
    description: 'VMC défaillante, air vicié, manque de renouvellement d\'air',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'menuiseries',
    label: 'Menuiseries',
    icon: 'Square',
    description: 'Fenêtres, portes, volets, joints défaillants ou vétustes',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'electricite',
    label: 'Électricité',
    icon: 'Zap',
    description: 'Installation vétuste, tableau électrique non conforme, prises défectueuses',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'toiture',
    label: 'Toiture',
    icon: 'Home',
    description: 'Tuiles cassées, gouttières bouchées, charpente endommagée',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'plomberie',
    label: 'Plomberie',
    icon: 'Wrench',
    description: 'Fuites, canalisations vétustes, problèmes de pression ou d\'évacuation',
    color: 'text-primary',
    bgColor: 'bg-green-50',
  },
]

export function getDiagnosticType(id: DiagnosticType): DiagnosticTypeConfig | undefined {
  return diagnosticTypes.find((t) => t.id === id)
}
