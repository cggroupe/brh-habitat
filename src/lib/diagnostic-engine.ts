import type { DiagnosticType, DiagnosticEquipment } from '@/stores/diagnosticStore'
import { symptomsByType } from '@/data/symptoms'
import { DPE_GAIN_ESTIMATES, DPE_CLASSES, type DpeClass } from '@/data/aides-renov'

export interface DiagnosticResult {
  overallScore: number
  urgencyLevel: 'faible' | 'modere' | 'eleve' | 'critique'
  typeResults: TypeResult[]
  totalBudgetMin: number
  totalBudgetMax: number
  recommendations: Recommendation[]
}

export interface TypeResult {
  type: DiagnosticType
  score: number
  urgencyLevel: 'faible' | 'modere' | 'eleve' | 'critique'
  selectedSymptoms: string[]
  budgetMin: number
  budgetMax: number
  recommendations: Recommendation[]
}

export interface Recommendation {
  title: string
  description: string
  priority: 'haute' | 'moyenne' | 'basse'
  estimatedBudget: string
  relatedType: DiagnosticType
}

const BUDGET_RANGES: Record<DiagnosticType, { min: number; max: number }> = {
  humidite: { min: 2000, max: 15000 },
  isolation: { min: 5000, max: 30000 },
  ventilation: { min: 2000, max: 8000 },
  menuiseries: { min: 3000, max: 20000 },
  electricite: { min: 3000, max: 15000 },
  toiture: { min: 5000, max: 40000 },
  plomberie: { min: 1500, max: 12000 },
}

const RECOMMENDATION_MAP: Record<string, Recommendation> = {
  humidite_moisissures: {
    title: 'Traitement anti-moisissures',
    description: 'Un traitement fongicide professionnel suivi d\'une amelioration de la ventilation est necessaire.',
    priority: 'haute',
    estimatedBudget: '500 - 2 000 EUR',
    relatedType: 'humidite',
  },
  humidite_taches: {
    title: 'Identification et traitement de la source',
    description: 'Les taches d\'humidite sont le symptome visible d\'un probleme sous-jacent. Il faut identifier la source.',
    priority: 'haute',
    estimatedBudget: '1 000 - 5 000 EUR',
    relatedType: 'humidite',
  },
  humidite_condensation: {
    title: 'Amelioration de la ventilation',
    description: 'La condensation indique un exces d\'humidite interieure. L\'installation d\'une VMC est recommandee.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 6 000 EUR',
    relatedType: 'humidite',
  },
  humidite_infiltrations: {
    title: 'Reparation d\'etancheite urgente',
    description: 'Les infiltrations peuvent causer des degats structurels importants. Intervention rapide necessaire.',
    priority: 'haute',
    estimatedBudget: '1 000 - 8 000 EUR',
    relatedType: 'humidite',
  },
  humidite_remontees: {
    title: 'Traitement des remontees capillaires',
    description: 'Injection de resine hydrophobe ou drainage peripherique pour stopper les remontees.',
    priority: 'haute',
    estimatedBudget: '3 000 - 10 000 EUR',
    relatedType: 'humidite',
  },
  humidite_odeur: {
    title: 'Diagnostic humidite approfondi',
    description: 'Une odeur persistante peut indiquer un probleme cache. Un diagnostic professionnel est recommande.',
    priority: 'moyenne',
    estimatedBudget: '200 - 500 EUR',
    relatedType: 'humidite',
  },
  humidite_peinture: {
    title: 'Assechement des murs',
    description: 'Le cloquage de la peinture indique une humidite dans les murs. Un traitement d\'assechement est necessaire.',
    priority: 'moyenne',
    estimatedBudget: '800 - 3 000 EUR',
    relatedType: 'humidite',
  },
  humidite_parquet: {
    title: 'Traitement de la source + renovation sol',
    description: 'Un parquet qui gondole signale une humidite au sol. Traiter la cause avant de renover.',
    priority: 'haute',
    estimatedBudget: '1 500 - 5 000 EUR',
    relatedType: 'humidite',
  },
  // --- Humidite Bretagne ---
  humidite_granit: {
    title: 'Traitement des murs en granit humides',
    description: 'Les maisons bretonnes en granit sont naturellement sensibles a l\'humidite : la pierre est poreuse et les murs epais retiennent l\'eau. Un drainage peripherique et un enduit perspirant (a la chaux, jamais au ciment) sont les solutions adaptees. Surtout, ne jamais appliquer un enduit etanche qui emprisonne l\'humidite.',
    priority: 'haute',
    estimatedBudget: '3 000 - 12 000 EUR',
    relatedType: 'humidite',
  },
  humidite_salpetre: {
    title: 'Traitement du salpetre et des remontees capillaires',
    description: 'Le salpetre (depots blancs cristallins) sur les murs en pierre indique des remontees capillaires : l\'eau du sol remonte dans les murs par capillarite et depose les sels mineraux en surface. En Bretagne, avec les nappes phreatiques hautes, c\'est tres courant. Solutions : drainage, injection de resine hydrophobe, ou cuvelage en cas extreme.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 8 000 EUR',
    relatedType: 'humidite',
  },
  humidite_cave_voutee: {
    title: 'Assainissement de la cave ou du sous-sol',
    description: 'Un sous-sol tres humide degrade les fondations et remonte dans les murs. En Bretagne, les caves en pierre sur terrain granitique sont souvent confrontees a des infiltrations d\'eau souterraine. Solutions : drainage, pompe de relevage, ventilation forcee, et cuvelage des murs enterres si necessaire.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 10 000 EUR',
    relatedType: 'humidite',
  },
  isolation_froid: {
    title: 'Isolation des murs et combles',
    description: 'La sensation de froid indique des deperditions thermiques importantes.',
    priority: 'haute',
    estimatedBudget: '8 000 - 25 000 EUR',
    relatedType: 'isolation',
  },
  isolation_facture: {
    title: 'Audit energetique complet',
    description: 'Des factures elevees sont souvent le signe d\'une isolation insuffisante.',
    priority: 'haute',
    estimatedBudget: '500 - 1 000 EUR',
    relatedType: 'isolation',
  },
  isolation_courants: {
    title: 'Etancheite a l\'air',
    description: 'Les courants d\'air indiquent des defauts d\'etancheite. Un test d\'infiltrometrie est recommande.',
    priority: 'moyenne',
    estimatedBudget: '1 000 - 5 000 EUR',
    relatedType: 'isolation',
  },
  isolation_murs_froids: {
    title: 'Isolation thermique des murs',
    description: 'Des murs froids signalent une mauvaise isolation. L\'ITE ou l\'ITI peut resoudre ce probleme.',
    priority: 'haute',
    estimatedBudget: '5 000 - 20 000 EUR',
    relatedType: 'isolation',
  },
  isolation_plancher: {
    title: 'Isolation du plancher bas',
    description: 'Un plancher froid au-dessus d\'un vide sanitaire necessite une isolation par le dessous.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 6 000 EUR',
    relatedType: 'isolation',
  },
  isolation_combles: {
    title: 'Isolation des combles prioritaire',
    description: 'Les combles representent 25-30% des deperditions. C\'est le premier poste a traiter.',
    priority: 'haute',
    estimatedBudget: '2 000 - 8 000 EUR',
    relatedType: 'isolation',
  },
  isolation_chaleur: {
    title: 'Protection solaire et isolation estivale',
    description: 'L\'isolation des combles et les protections solaires ameliorent le confort d\'ete.',
    priority: 'basse',
    estimatedBudget: '1 000 - 5 000 EUR',
    relatedType: 'isolation',
  },
  isolation_dpe: {
    title: 'Renovation energetique globale',
    description: 'Un DPE F ou G impose des travaux. Une renovation globale est la solution la plus efficace.',
    priority: 'haute',
    estimatedBudget: '15 000 - 40 000 EUR',
    relatedType: 'isolation',
  },
  // --- Isolation Bretagne ---
  isolation_murs_granit: {
    title: 'Isolation des murs en granit ou pierre',
    description: 'Les murs en granit bretons (50 a 80 cm d\'epaisseur) ont une tres faible resistance thermique. L\'isolation par l\'interieur (ITI) avec un materiau perspirant (fibre de bois, laine de chanvre) est recommandee pour preserver la respiration du mur. Attention : ne JAMAIS utiliser de polystyrene sur un mur en pierre, cela piege l\'humidite.',
    priority: 'haute',
    estimatedBudget: '6 000 - 20 000 EUR',
    relatedType: 'isolation',
  },
  isolation_laine_tassee: {
    title: 'Remplacement de l\'isolation des combles',
    description: 'Une ancienne laine de verre tassee ou mouillee perd jusqu\'a 80% de son pouvoir isolant. En climat breton humide, c\'est un probleme frequent. Le remplacement par de la ouate de cellulose soufflee ou de la laine de bois redonne une isolation performante et durable.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 6 000 EUR',
    relatedType: 'isolation',
  },
  ventilation_odeurs: {
    title: 'Verification et nettoyage du systeme',
    description: 'Des odeurs persistantes peuvent indiquer une VMC encrassee ou un defaut d\'extraction.',
    priority: 'moyenne',
    estimatedBudget: '200 - 1 000 EUR',
    relatedType: 'ventilation',
  },
  'ventilation_air_vicié': {
    title: 'Installation VMC double flux',
    description: 'Un air vicie en permanence indique un renouvellement insuffisant.',
    priority: 'haute',
    estimatedBudget: '3 000 - 6 000 EUR',
    relatedType: 'ventilation',
  },
  ventilation_vmc_bruit: {
    title: 'Reparation ou remplacement VMC',
    description: 'Une VMC bruyante est en fin de vie, une VMC silencieuse peut etre en panne.',
    priority: 'moyenne',
    estimatedBudget: '1 500 - 4 000 EUR',
    relatedType: 'ventilation',
  },
  ventilation_bouches: {
    title: 'Nettoyage des bouches d\'aeration',
    description: 'Des bouches encrassees reduisent l\'efficacite de la ventilation.',
    priority: 'moyenne',
    estimatedBudget: '100 - 300 EUR',
    relatedType: 'ventilation',
  },
  ventilation_condensation_sdb: {
    title: 'VMC hygroreglable',
    description: 'Une VMC hygroreglable ajuste le debit selon l\'humidite ambiante.',
    priority: 'basse',
    estimatedBudget: '2 000 - 4 000 EUR',
    relatedType: 'ventilation',
  },
  ventilation_moisissures_sdb: {
    title: 'VMC + traitement anti-moisissures',
    description: 'Les moisissures dans les pieces humides necessitent une ventilation adequate et un traitement.',
    priority: 'haute',
    estimatedBudget: '2 000 - 5 000 EUR',
    relatedType: 'ventilation',
  },
  ventilation_absence: {
    title: 'Installation VMC urgente',
    description: 'L\'absence de ventilation est un risque sanitaire. L\'installation d\'une VMC est prioritaire.',
    priority: 'haute',
    estimatedBudget: '3 000 - 7 000 EUR',
    relatedType: 'ventilation',
  },
  // --- Ventilation Bretagne ---
  ventilation_buee_permanente: {
    title: 'Amelioration de la ventilation — climat humide',
    description: 'En Bretagne, l\'humidite exterieure elevee (souvent >80%) rend la ventilation naturelle insuffisante. La buee permanente, meme fenetre ouverte, indique qu\'une VMC hygroreglable est necessaire pour adapter le debit a l\'humidite interieure.',
    priority: 'moyenne',
    estimatedBudget: '2 000 - 5 000 EUR',
    relatedType: 'ventilation',
  },
  ventilation_maison_ancienne: {
    title: 'Ventilation d\'une maison ancienne bretonne',
    description: 'Les maisons anciennes en pierre avec murs epais et peu d\'ouvertures ont ete concues pour respirer a travers les murs. Si vous les avez isolees ou si les fenetres ont ete changees, l\'equilibre naturel est rompu et une VMC devient indispensable. Une VMC simple flux hygroreglable B est le meilleur compromis cout/efficacite.',
    priority: 'moyenne',
    estimatedBudget: '2 500 - 5 000 EUR',
    relatedType: 'ventilation',
  },
  menuiseries_courants: {
    title: 'Joints et calfeutrage',
    description: 'Les courants d\'air peuvent etre resolus par le remplacement des joints.',
    priority: 'moyenne',
    estimatedBudget: '200 - 1 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_condensation: {
    title: 'Remplacement du vitrage',
    description: 'La condensation entre les vitres indique une rupture du joint d\'etancheite.',
    priority: 'moyenne',
    estimatedBudget: '500 - 3 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_fermeture: {
    title: 'Remplacement des menuiseries',
    description: 'Des fenetres qui ferment mal compromettent l\'etancheite et la securite.',
    priority: 'haute',
    estimatedBudget: '4 000 - 12 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_joints: {
    title: 'Remplacement des joints',
    description: 'Des joints neufs peuvent suffire a retrouver l\'etancheite.',
    priority: 'basse',
    estimatedBudget: '50 - 300 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_simple_vitrage: {
    title: 'Remplacement par double vitrage',
    description: 'Le simple vitrage est une source majeure de deperdition. Le double vitrage est prioritaire.',
    priority: 'haute',
    estimatedBudget: '3 000 - 15 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_volets: {
    title: 'Installation de volets',
    description: 'Les volets ameliorent l\'isolation et la securite.',
    priority: 'basse',
    estimatedBudget: '1 000 - 5 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_infiltration: {
    title: 'Remplacement urgent des menuiseries',
    description: 'Les infiltrations d\'eau par les menuiseries causent des degats importants.',
    priority: 'haute',
    estimatedBudget: '3 000 - 12 000 EUR',
    relatedType: 'menuiseries',
  },
  menuiseries_bois_pourri: {
    title: 'Remplacement des menuiseries bois',
    description: 'Des menuiseries bois pourries ne sont plus reparables. Un remplacement s\'impose.',
    priority: 'haute',
    estimatedBudget: '4 000 - 15 000 EUR',
    relatedType: 'menuiseries',
  },
  electricite_disjoncteur: {
    title: 'Diagnostic electrique complet',
    description: 'Un disjoncteur qui saute indique une surcharge ou un defaut d\'isolement.',
    priority: 'haute',
    estimatedBudget: '300 - 1 000 EUR',
    relatedType: 'electricite',
  },
  electricite_prises: {
    title: 'Securisation des prises',
    description: 'Les prises defectueuses representent un danger. Remplacement urgent.',
    priority: 'haute',
    estimatedBudget: '500 - 2 000 EUR',
    relatedType: 'electricite',
  },
  electricite_tableau_ancien: {
    title: 'Mise aux normes du tableau electrique',
    description: 'Un tableau ancien est un risque d\'incendie. La mise aux normes NF C 15-100 est urgente.',
    priority: 'haute',
    estimatedBudget: '1 500 - 4 000 EUR',
    relatedType: 'electricite',
  },
  electricite_pas_terre: {
    title: 'Installation mise a la terre',
    description: 'L\'absence de terre est un risque d\'electrocution. Installation prioritaire.',
    priority: 'haute',
    estimatedBudget: '1 000 - 3 000 EUR',
    relatedType: 'electricite',
  },
  electricite_ampoules: {
    title: 'Verification du circuit electrique',
    description: 'Des ampoules qui grillent souvent peuvent indiquer des surtensions.',
    priority: 'basse',
    estimatedBudget: '200 - 500 EUR',
    relatedType: 'electricite',
  },
  electricite_rallonges: {
    title: 'Ajout de prises electriques',
    description: 'L\'utilisation excessive de rallonges indique un manque de prises. Risque de surcharge.',
    priority: 'moyenne',
    estimatedBudget: '500 - 2 000 EUR',
    relatedType: 'electricite',
  },
  electricite_odeur_brule: {
    title: 'Intervention electrique urgente',
    description: 'Une odeur de brule est un signe de danger imminent. Couper le courant et appeler un electricien.',
    priority: 'haute',
    estimatedBudget: '500 - 3 000 EUR',
    relatedType: 'electricite',
  },
  electricite_non_conforme: {
    title: 'Remise en conformite complete',
    description: 'Une installation non conforme est dangereuse. Une remise aux normes complete est necessaire.',
    priority: 'haute',
    estimatedBudget: '3 000 - 10 000 EUR',
    relatedType: 'electricite',
  },
  toiture_tuiles: {
    title: 'Remplacement des tuiles endommagees',
    description: 'En climat breton, les tuiles cassees exposent la charpente aux intemperies.',
    priority: 'haute',
    estimatedBudget: '500 - 3 000 EUR',
    relatedType: 'toiture',
  },
  toiture_infiltration: {
    title: 'Reparation d\'etancheite toiture',
    description: 'Les fuites causent des degats structurels rapides. Reparation prioritaire.',
    priority: 'haute',
    estimatedBudget: '1 000 - 8 000 EUR',
    relatedType: 'toiture',
  },
  toiture_mousse: {
    title: 'Demoussage et traitement hydrofuge',
    description: 'La mousse retient l\'humidite et accelere la degradation.',
    priority: 'basse',
    estimatedBudget: '1 000 - 3 000 EUR',
    relatedType: 'toiture',
  },
  'toiture_gouttières': {
    title: 'Renovation des gouttieres',
    description: 'Des gouttieres defaillantes causent des infiltrations en facade.',
    priority: 'moyenne',
    estimatedBudget: '500 - 2 000 EUR',
    relatedType: 'toiture',
  },
  toiture_charpente: {
    title: 'Reparation de charpente urgente',
    description: 'Une charpente endommagee compromet la solidite de la toiture. Intervention urgente.',
    priority: 'haute',
    estimatedBudget: '5 000 - 20 000 EUR',
    relatedType: 'toiture',
  },
  toiture_solin: {
    title: 'Refection des solins',
    description: 'Les solins defaillants sont une source courante de fuites.',
    priority: 'moyenne',
    estimatedBudget: '500 - 2 000 EUR',
    relatedType: 'toiture',
  },
  toiture_age: {
    title: 'Evaluation de la toiture',
    description: 'Une toiture de plus de 25 ans merite un diagnostic pour anticiper les travaux.',
    priority: 'moyenne',
    estimatedBudget: '200 - 500 EUR',
    relatedType: 'toiture',
  },
  toiture_velux: {
    title: 'Remplacement des fenetres de toit',
    description: 'Des velux qui fuient doivent etre remplaces pour eviter les degats d\'eau.',
    priority: 'haute',
    estimatedBudget: '1 000 - 4 000 EUR',
    relatedType: 'toiture',
  },
  // --- Ardoise Bretagne ---
  toiture_ardoise_blanchie: {
    title: 'Diagnostic et remplacement des ardoises blanchies',
    description: 'L\'ardoise blanchie est un signe de delitage : l\'eau s\'infiltre dans les couches de la pierre, gele en hiver et fait eclater l\'ardoise de l\'interieur. Cela arrive souvent quand un produit inadapte (peinture, resine, hydrofuge silicone) a ete applique, empechant l\'ardoise de respirer. Les ardoises blanchies ne protegent plus votre toiture et doivent etre remplacees.',
    priority: 'haute',
    estimatedBudget: '5 000 - 15 000 EUR',
    relatedType: 'toiture',
  },
  toiture_ardoise_delitage: {
    title: 'Remplacement urgent des ardoises delitees',
    description: 'Quand l\'ardoise s\'effrite et se detache en feuillets, elle est en fin de vie. C\'est irreversible. Le gel, l\'humidite bretonne et parfois l\'utilisation de mauvais produits d\'entretien accelerent ce processus. Les ardoises delitees laissent passer l\'eau et mettent votre charpente en danger.',
    priority: 'haute',
    estimatedBudget: '8 000 - 25 000 EUR',
    relatedType: 'toiture',
  },
  toiture_ardoise_traitement: {
    title: 'Evaluation des degats apres traitement inadapte',
    description: 'L\'application de peinture, resine ou hydrofuge non adapte a l\'ardoise est une erreur courante. Ces produits bouchent les pores de la pierre, empechent l\'evacuation naturelle de l\'humidite, et provoquent un vieillissement accelere (blanchiment, delitage, gel). Un diagnostic est necessaire pour evaluer les ardoises a remplacer.',
    priority: 'haute',
    estimatedBudget: '3 000 - 20 000 EUR',
    relatedType: 'toiture',
  },
  toiture_ardoise_glissee: {
    title: 'Refixation ou remplacement des ardoises glissees',
    description: 'Des ardoises qui glissent sont souvent causees par des crochets en acier oxydes ou un lattage fatigue. En Bretagne, le vent et l\'humidite accelerent la corrosion des fixations. Intervention rapide necessaire avant que l\'eau ne s\'infiltre.',
    priority: 'moyenne',
    estimatedBudget: '500 - 3 000 EUR',
    relatedType: 'toiture',
  },
  toiture_faitage_fissure: {
    title: 'Refection du faitage',
    description: 'Un faitage en mortier fissure ou descelle laisse entrer l\'eau au sommet de votre toit, la ou elle fait le plus de degats. En climat breton, les variations de temperature et le vent mettent le mortier a rude epreuve. Un faitage a sec (clips mecaniques) est plus durable.',
    priority: 'moyenne',
    estimatedBudget: '1 500 - 5 000 EUR',
    relatedType: 'toiture',
  },
  plomberie_fuite: {
    title: 'Reparation de fuite urgente',
    description: 'Une fuite visible gaspille de l\'eau et peut causer des degats.',
    priority: 'haute',
    estimatedBudget: '150 - 800 EUR',
    relatedType: 'plomberie',
  },
  plomberie_pression: {
    title: 'Diagnostic du reseau',
    description: 'Une pression faible peut indiquer un entartrage ou une fuite cachee.',
    priority: 'moyenne',
    estimatedBudget: '200 - 1 500 EUR',
    relatedType: 'plomberie',
  },
  plomberie_evacuation: {
    title: 'Debouchage et diagnostic',
    description: 'Des evacuations lentes peuvent indiquer un probleme de canalisation.',
    priority: 'moyenne',
    estimatedBudget: '150 - 800 EUR',
    relatedType: 'plomberie',
  },
  plomberie_bruit: {
    title: 'Diagnostic canalisations',
    description: 'Des bruits dans les canalisations peuvent indiquer un coup de belier ou un defaut.',
    priority: 'basse',
    estimatedBudget: '200 - 500 EUR',
    relatedType: 'plomberie',
  },
  plomberie_rouille: {
    title: 'Remplacement des canalisations',
    description: 'Une eau rouille indique la corrosion. Remplacement par du PER ou multicouche recommande.',
    priority: 'haute',
    estimatedBudget: '2 000 - 8 000 EUR',
    relatedType: 'plomberie',
  },
  plomberie_plomb: {
    title: 'Remplacement urgent des canalisations plomb',
    description: 'Les canalisations en plomb doivent etre remplacees pour des raisons sanitaires.',
    priority: 'haute',
    estimatedBudget: '3 000 - 10 000 EUR',
    relatedType: 'plomberie',
  },
  plomberie_chauffe_eau: {
    title: 'Remplacement du chauffe-eau',
    description: 'Envisagez un chauffe-eau thermodynamique pour les economies d\'energie.',
    priority: 'moyenne',
    estimatedBudget: '1 000 - 4 000 EUR',
    relatedType: 'plomberie',
  },
  plomberie_humidite_sous_evier: {
    title: 'Reparation de fuite sous evier',
    description: 'L\'humidite sous l\'evier indique une fuite. Reparation avant degradation du meuble.',
    priority: 'haute',
    estimatedBudget: '100 - 500 EUR',
    relatedType: 'plomberie',
  },
}

// ---------------------------------------------------------------------------
// Equipment-based recommendations
// ---------------------------------------------------------------------------

const EQUIPMENT_RECOMMENDATIONS: Record<string, Recommendation> = {
  fioul_changement: {
    title: 'Remplacement de la chaudiere fioul',
    description: 'Le fioul est une energie fossile couteuse et polluante. Le remplacement par une pompe a chaleur air/eau ou une chaudiere a granules est fortement recommande. Des aides MaPrimeRenov\' sont disponibles.',
    priority: 'haute',
    estimatedBudget: '8 000 - 18 000 EUR',
    relatedType: 'isolation',
  },
  vmc_installation: {
    title: 'Installation d\'une VMC',
    description: 'L\'absence de ventilation mecanique controlee entraine une accumulation d\'humidite et de polluants interieurs. Une VMC simple flux est la solution minimale recommandee.',
    priority: 'haute',
    estimatedBudget: '3 000 - 7 000 EUR',
    relatedType: 'ventilation',
  },
  simple_vitrage_remplacement: {
    title: 'Remplacement du simple vitrage',
    description: 'Le simple vitrage est responsable de 10 a 15% des deperditions thermiques. Le passage au double vitrage argon ameliore significativement le confort et reduit les factures de chauffage.',
    priority: 'haute',
    estimatedBudget: '4 000 - 15 000 EUR',
    relatedType: 'menuiseries',
  },
  dpe_fg_renovation: {
    title: 'Renovation energetique globale prioritaire',
    description: 'Un logement classe F ou G est une passoire thermique. La reglementation impose des travaux de renovation avant toute mise en location. Un audit energetique est la premiere etape.',
    priority: 'haute',
    estimatedBudget: '20 000 - 50 000 EUR',
    relatedType: 'isolation',
  },
  dpe_e_renovation: {
    title: 'Travaux d\'amelioration energetique',
    description: 'Un DPE E indique des performances insuffisantes. Des travaux cibles (combles, fenetres, chauffage) permettent de passer en classe C ou D et de reduire les charges.',
    priority: 'moyenne',
    estimatedBudget: '10 000 - 30 000 EUR',
    relatedType: 'isolation',
  },
  renovation_ancienne: {
    title: 'Audit global recommande',
    description: 'Un logement sans renovation depuis plus de 20 ans peut presenter des degradations non visibles (isolation vieillissante, installations electriques et plomberie obsoletes). Un audit complet est conseille.',
    priority: 'moyenne',
    estimatedBudget: '500 - 1 500 EUR',
    relatedType: 'isolation',
  },
}

/**
 * Mapping score → urgence.
 *
 * IMPORTANT (retour Philippe 12/05) : le score est désormais inversé à la
 * sortie du moteur (`100 - urgency_score`) pour matcher l'interprétation
 * utilisateur naturelle : « 24/100 c'est mauvais ». Donc score = santé
 * (haut = bon, bas = critique).
 */
function getUrgencyLevel(healthScore: number): 'faible' | 'modere' | 'eleve' | 'critique' {
  if (healthScore < 25) return 'critique' // 0-24  : intervention urgente
  if (healthScore < 50) return 'eleve'    // 25-49 : préoccupant
  if (healthScore < 75) return 'modere'   // 50-74 : à améliorer
  return 'faible'                         // 75-100: bon état
}

// ---------------------------------------------------------------------------
// Equipment bonus scoring
// ---------------------------------------------------------------------------

interface EquipmentBonuses {
  global: number
  byType: Partial<Record<DiagnosticType, number>>
  extraRecommendations: Recommendation[]
}

function computeEquipmentBonuses(equipment: DiagnosticEquipment): EquipmentBonuses {
  let globalBonus = 0
  const byType: Partial<Record<DiagnosticType, number>> = {}
  const extraRecommendations: Recommendation[] = []

  // Ventilation : aucun systeme → bonus humidite + ventilation
  if (equipment.ventilationType === 'Aucun systeme de ventilation') {
    byType['humidite'] = (byType['humidite'] ?? 0) + 12
    byType['ventilation'] = (byType['ventilation'] ?? 0) + 20
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['vmc_installation'])
  }

  // Fenetres : simple vitrage → bonus isolation + menuiseries
  if (equipment.windowType === 'Simple vitrage (ancien)') {
    byType['isolation'] = (byType['isolation'] ?? 0) + 10
    byType['menuiseries'] = (byType['menuiseries'] ?? 0) + 18
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['simple_vitrage_remplacement'])
  }

  // DPE F ou G → bonus global + recommandation renovation
  if (equipment.dpeRating === 'F ou G (tres mauvais)') {
    globalBonus += 15
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['dpe_fg_renovation'])
  }

  // DPE E → bonus global + recommandation amelioration
  if (equipment.dpeRating === 'E (passoire)') {
    globalBonus += 10
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['dpe_e_renovation'])
  }

  // Derniere renovation > 20 ans → bonus global
  if (equipment.lastRenovation === 'Il y a plus de 20 ans') {
    globalBonus += 10
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['renovation_ancienne'])
  }

  // Chauffage fioul → recommandation remplacement
  if (equipment.heatingType === 'Fioul (chaudiere fioul)') {
    extraRecommendations.push(EQUIPMENT_RECOMMENDATIONS['fioul_changement'])
  }

  return { global: globalBonus, byType, extraRecommendations }
}

export function analyzeDiagnostic(
  selectedTypes: DiagnosticType[],
  selectedSymptoms: Record<string, string[]>,
  propertyYear?: number,
  equipment: DiagnosticEquipment = {},
): DiagnosticResult {
  const typeResults: TypeResult[] = []
  let totalBudgetMin = 0
  let totalBudgetMax = 0
  const allRecommendations: Recommendation[] = []

  const equipmentBonuses = computeEquipmentBonuses(equipment)

  for (const type of selectedTypes) {
    const typeSymptoms = symptomsByType[type] || []
    const selected = selectedSymptoms[type] || []

    let weightedSum = 0
    let maxWeight = 0
    const recs: Recommendation[] = []

    for (const symptom of typeSymptoms) {
      const urgencyMultiplier = symptom.urgency === 'high' ? 3 : symptom.urgency === 'medium' ? 2 : 1
      maxWeight += symptom.weight * 3

      if (selected.includes(symptom.id)) {
        weightedSum += symptom.weight * urgencyMultiplier
        const rec = RECOMMENDATION_MAP[symptom.id]
        if (rec) recs.push(rec)
      }
    }

    let ageBonus = 0
    if (propertyYear) {
      const age = new Date().getFullYear() - propertyYear
      if (age > 50) ageBonus = 15
      else if (age > 30) ageBonus = 10
      else if (age > 15) ageBonus = 5
    }

    const equipmentTypeBonus = equipmentBonuses.byType[type] ?? 0

    const rawScore = maxWeight > 0 ? (weightedSum / maxWeight) * 100 : 0
    const score = Math.min(100, Math.round(rawScore + ageBonus + equipmentTypeBonus + equipmentBonuses.global))

    const budgetRange = BUDGET_RANGES[type]
    const budgetFactor = score / 100
    const budgetMin = Math.round(budgetRange.min * (0.5 + budgetFactor * 0.5))
    const budgetMax = Math.round(budgetRange.max * (0.5 + budgetFactor * 0.5))

    totalBudgetMin += budgetMin
    totalBudgetMax += budgetMax

    const sortedRecs = recs.sort((a, b) => {
      const order = { haute: 0, moyenne: 1, basse: 2 }
      return order[a.priority] - order[b.priority]
    })

    // INVERSION : on transforme l'urgency_score (haut = urgent) en healthScore
    // (haut = bon). Plus intuitif pour l'utilisateur. Cf retour Philippe 12/05.
    const healthScore = Math.max(0, 100 - score)
    typeResults.push({
      type,
      score: healthScore,
      urgencyLevel: getUrgencyLevel(healthScore),
      selectedSymptoms: selected,
      budgetMin,
      budgetMax,
      recommendations: sortedRecs,
    })

    allRecommendations.push(...sortedRecs)
  }

  // Ajouter les recommandations issues des equipements (sans doublons)
  const existingTitles = new Set(allRecommendations.map((r) => r.title))
  for (const rec of equipmentBonuses.extraRecommendations) {
    if (!existingTitles.has(rec.title)) {
      allRecommendations.push(rec)
      existingTitles.add(rec.title)
    }
  }

  // Score global = moyenne des healthScores des types (déjà inversés).
  const overallScore = typeResults.length > 0
    ? Math.round(typeResults.reduce((sum, tr) => sum + tr.score, 0) / typeResults.length)
    : 100 // pas de problème détecté = état parfait

  return {
    overallScore,
    urgencyLevel: getUrgencyLevel(overallScore),
    // Tri par santé croissante : les plus problématiques en premier
    typeResults: typeResults.sort((a, b) => a.score - b.score),
    totalBudgetMin,
    totalBudgetMax,
    recommendations: allRecommendations.sort((a, b) => {
      const order = { haute: 0, moyenne: 1, basse: 2 }
      return order[a.priority] - order[b.priority]
    }),
  }
}

// ---------------------------------------------------------------------------
// Estimation du gain DPE apres travaux
// ---------------------------------------------------------------------------

export interface DpeEstimate {
  currentClass: DpeClass | null
  estimatedClassAfter: DpeClass | null
  gainClasses: number
  savingsPerYear: number
}

// Mapping des libelles DPE du wizard vers DpeClass
const DPE_LABEL_MAP: Record<string, DpeClass> = {
  'A (excellent)': 'A',
  'B (tres bon)': 'B',
  'C (bon)': 'C',
  'D (moyen)': 'D',
  'E (passoire)': 'E',
  'F ou G (tres mauvais)': 'G',
}

export function estimateDpeGain(
  selectedTypes: DiagnosticType[],
  currentDpe: string | undefined,
  result: DiagnosticResult,
): DpeEstimate {
  // Mapper le label DPE vers une DpeClass
  const currentClass: DpeClass | null = currentDpe
    ? (DPE_LABEL_MAP[currentDpe] ?? null)
    : null

  // Trouver la meilleure combinaison dans DPE_GAIN_ESTIMATES
  // "Meilleure" = combinaison dont les types sont tous dans selectedTypes ET la plus large en taille
  let bestMatch = DPE_GAIN_ESTIMATES.find((e) => e.workCombination.length === 0) ?? null
  let bestMatchSize = 0

  for (const estimate of DPE_GAIN_ESTIMATES) {
    const allIncluded = estimate.workCombination.every((t) =>
      selectedTypes.includes(t as DiagnosticType),
    )
    if (allIncluded && estimate.workCombination.length > bestMatchSize) {
      bestMatch = estimate
      bestMatchSize = estimate.workCombination.length
    }
  }

  if (!bestMatch) {
    return {
      currentClass,
      estimatedClassAfter: null,
      gainClasses: 0,
      savingsPerYear: 0,
    }
  }

  // Score moyen >= 50 → gainMax, sinon gainMin
  const averageScore = result.overallScore
  const gainRaw = averageScore >= 50 ? bestMatch.gainMax : bestMatch.gainMin
  const gainClasses = Math.round(gainRaw)

  // Calculer la classe apres travaux
  let estimatedClassAfter: DpeClass | null = null
  if (currentClass !== null) {
    const currentIndex = DPE_CLASSES.indexOf(currentClass)
    const targetIndex = Math.max(0, currentIndex - gainClasses)
    estimatedClassAfter = DPE_CLASSES[targetIndex]
  }

  // Economies annuelles : gain_classes * 300 EUR/an
  const savingsPerYear = gainClasses * 300

  return {
    currentClass,
    estimatedClassAfter,
    gainClasses,
    savingsPerYear,
  }
}
