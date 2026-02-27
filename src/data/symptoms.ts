import type { DiagnosticType } from '@/stores/diagnosticStore'

export type UrgencyLevel = 'low' | 'medium' | 'high'

export interface Symptom {
  id: string
  label: string
  weight: 1 | 2 | 3
  urgency: UrgencyLevel
}

export const symptomsByType: Record<DiagnosticType, Symptom[]> = {
  humidite: [
    { id: 'humidite_moisissures', label: 'Moisissures visibles sur les murs ou plafonds', weight: 3, urgency: 'high' },
    { id: 'humidite_taches', label: 'Taches d\'humidité sur les murs', weight: 2, urgency: 'medium' },
    { id: 'humidite_condensation', label: 'Condensation sur les vitres', weight: 1, urgency: 'low' },
    { id: 'humidite_infiltrations', label: 'Infiltrations d\'eau visible', weight: 3, urgency: 'high' },
    { id: 'humidite_remontees', label: 'Remontées capillaires (murs du bas)', weight: 3, urgency: 'high' },
    { id: 'humidite_odeur', label: 'Odeur de moisi persistante', weight: 2, urgency: 'medium' },
    { id: 'humidite_peinture', label: 'Peinture qui cloque ou se décolle', weight: 2, urgency: 'medium' },
    { id: 'humidite_parquet', label: 'Parquet qui gondole ou gonfle', weight: 2, urgency: 'medium' },
  ],

  isolation: [
    { id: 'isolation_froid', label: 'Sensation de froid malgré le chauffage', weight: 2, urgency: 'medium' },
    { id: 'isolation_facture', label: 'Factures de chauffage très élevées', weight: 2, urgency: 'medium' },
    { id: 'isolation_courants', label: 'Courants d\'air perceptibles', weight: 2, urgency: 'medium' },
    { id: 'isolation_murs_froids', label: 'Murs froids au toucher en hiver', weight: 2, urgency: 'medium' },
    { id: 'isolation_plancher', label: 'Plancher froid (vide sanitaire)', weight: 2, urgency: 'medium' },
    { id: 'isolation_combles', label: 'Combles non isolés ou mal isolés', weight: 3, urgency: 'high' },
    { id: 'isolation_chaleur', label: 'Trop chaud en été malgré la climatisation', weight: 1, urgency: 'low' },
    { id: 'isolation_dpe', label: 'DPE classé F ou G', weight: 3, urgency: 'high' },
  ],

  ventilation: [
    { id: 'ventilation_odeurs', label: 'Odeurs persistantes dans les pièces', weight: 2, urgency: 'medium' },
    { id: 'ventilation_air_vicié', label: 'Air vicié, manque de fraîcheur', weight: 2, urgency: 'medium' },
    { id: 'ventilation_vmc_bruit', label: 'VMC bruyante ou silencieuse (en panne)', weight: 2, urgency: 'medium' },
    { id: 'ventilation_bouches', label: 'Bouches d\'aération bouchées ou encrassées', weight: 2, urgency: 'medium' },
    { id: 'ventilation_condensation_sdb', label: 'Condensation excessive en salle de bain', weight: 1, urgency: 'low' },
    { id: 'ventilation_moisissures_sdb', label: 'Moisissures dans les pièces humides', weight: 3, urgency: 'high' },
    { id: 'ventilation_absence', label: 'Absence totale de système de ventilation', weight: 3, urgency: 'high' },
  ],

  menuiseries: [
    { id: 'menuiseries_courants', label: 'Courants d\'air autour des fenêtres', weight: 2, urgency: 'medium' },
    { id: 'menuiseries_condensation', label: 'Condensation entre les vitres', weight: 2, urgency: 'medium' },
    { id: 'menuiseries_fermeture', label: 'Fenêtres ou portes qui ferment mal', weight: 2, urgency: 'medium' },
    { id: 'menuiseries_joints', label: 'Joints abîmés ou décollés', weight: 1, urgency: 'low' },
    { id: 'menuiseries_simple_vitrage', label: 'Simple vitrage (ancien)', weight: 3, urgency: 'high' },
    { id: 'menuiseries_volets', label: 'Volets défectueux ou absents', weight: 1, urgency: 'low' },
    { id: 'menuiseries_infiltration', label: 'Infiltration d\'eau par les menuiseries', weight: 3, urgency: 'high' },
    { id: 'menuiseries_bois_pourri', label: 'Menuiseries bois pourries ou déformées', weight: 3, urgency: 'high' },
  ],

  electricite: [
    { id: 'electricite_disjoncteur', label: 'Disjoncteurs qui sautent fréquemment', weight: 3, urgency: 'high' },
    { id: 'electricite_prises', label: 'Prises défectueuses ou brûlées', weight: 3, urgency: 'high' },
    { id: 'electricite_tableau_ancien', label: 'Tableau électrique vétuste (fusibles)', weight: 3, urgency: 'high' },
    { id: 'electricite_pas_terre', label: 'Pas de mise à la terre', weight: 3, urgency: 'high' },
    { id: 'electricite_ampoules', label: 'Ampoules qui grillent souvent', weight: 1, urgency: 'low' },
    { id: 'electricite_rallonges', label: 'Utilisation excessive de rallonges', weight: 2, urgency: 'medium' },
    { id: 'electricite_odeur_brule', label: 'Odeur de brûlé autour des prises', weight: 3, urgency: 'high' },
    { id: 'electricite_non_conforme', label: 'Installation non conforme aux normes', weight: 3, urgency: 'high' },
  ],

  toiture: [
    { id: 'toiture_tuiles', label: 'Tuiles cassées ou manquantes', weight: 3, urgency: 'high' },
    { id: 'toiture_infiltration', label: 'Infiltrations d\'eau dans les combles', weight: 3, urgency: 'high' },
    { id: 'toiture_mousse', label: 'Mousses ou végétation sur la toiture', weight: 2, urgency: 'medium' },
    { id: 'toiture_gouttières', label: 'Gouttières bouchées ou abîmées', weight: 2, urgency: 'medium' },
    { id: 'toiture_charpente', label: 'Charpente visible endommagée', weight: 3, urgency: 'high' },
    { id: 'toiture_solin', label: 'Solins ou arêtes défaillants', weight: 2, urgency: 'medium' },
    { id: 'toiture_age', label: 'Toiture de plus de 25 ans', weight: 2, urgency: 'medium' },
    { id: 'toiture_velux', label: 'Velux ou fenêtres de toit qui fuient', weight: 2, urgency: 'medium' },
  ],

  plomberie: [
    { id: 'plomberie_fuite', label: 'Fuite d\'eau visible', weight: 3, urgency: 'high' },
    { id: 'plomberie_pression', label: 'Pression d\'eau insuffisante', weight: 2, urgency: 'medium' },
    { id: 'plomberie_evacuation', label: 'Évacuations lentes ou bouchées', weight: 2, urgency: 'medium' },
    { id: 'plomberie_bruit', label: 'Bruits dans les canalisations', weight: 1, urgency: 'low' },
    { id: 'plomberie_rouille', label: 'Eau rouillée ou colorée', weight: 3, urgency: 'high' },
    { id: 'plomberie_plomb', label: 'Canalisations en plomb (avant 1948)', weight: 3, urgency: 'high' },
    { id: 'plomberie_chauffe_eau', label: 'Chauffe-eau vétuste ou défaillant', weight: 2, urgency: 'medium' },
    { id: 'plomberie_humidite_sous_evier', label: 'Humidité sous l\'évier ou lavabo', weight: 2, urgency: 'medium' },
  ],
}
