import type { HealthDomain } from '@/types/database'

export interface HealthImpact {
  symptomId: string
  healthRisks: string[]
  consequences: string[]
  advice: string
  actionRequired: string
}

export interface DomainSummary {
  domain: HealthDomain
  title: string
  description: string
  /** Texte affiche quand le score est faible (bon etat) */
  goodStateMessage: string
  /** Texte affiche quand le score est modere */
  moderateMessage: string
  /** Texte affiche quand le score est eleve/critique */
  criticalMessage: string
}

// ---------------------------------------------------------------------------
// Impacts sante par symptome
// ---------------------------------------------------------------------------

export const healthImpacts: Record<string, HealthImpact> = {
  // === HUMIDITE ===
  humidite_moisissures: {
    symptomId: 'humidite_moisissures',
    healthRisks: [
      'Allergies respiratoires (rhinite, sinusite chronique)',
      'Crises d\'asthme, surtout chez les enfants et personnes agees',
      'Infections pulmonaires (aspergilloses) en cas d\'exposition prolongee',
    ],
    consequences: [
      'Degradation des murs, plafonds et peintures',
      'Odeur persistante de moisi difficile a eliminer',
      'Devaluation du bien immobilier',
    ],
    advice: 'Les moisissures liberent des spores toxiques dans l\'air que vous respirez 24h/24. C\'est un probleme de sante publique reconnu par l\'OMS. Ne vous contentez pas de nettoyer en surface — il faut traiter la cause (ventilation, etancheite).',
    actionRequired: 'Faire intervenir un professionnel pour identifier la source d\'humidite. En attendant, aerez 15 min matin et soir et ne sechez pas de linge a l\'interieur.',
  },
  humidite_taches: {
    symptomId: 'humidite_taches',
    healthRisks: [
      'Risque de developpement de moisissures si non traite',
      'Irritation des voies respiratoires',
    ],
    consequences: [
      'Degradation progressive des revetements muraux',
      'Risque d\'infiltration plus importante avec le temps',
    ],
    advice: 'Les taches d\'humidite sont un signal d\'alerte. Elles indiquent un probleme d\'etancheite ou de condensation qui va s\'aggraver.',
    actionRequired: 'Identifier l\'origine : condensation (ventilation insuffisante) ou infiltration (toiture, facade). Traiter dans les 3 mois.',
  },
  humidite_condensation: {
    symptomId: 'humidite_condensation',
    healthRisks: [
      'Favorise le developpement d\'acariens',
      'Inconfort thermique',
    ],
    consequences: [
      'Moisissures autour des fenetres a terme',
      'Degradation des joints de fenetre',
    ],
    advice: 'La condensation sur les vitres indique un taux d\'humidite interieur trop eleve (superieur a 60%). C\'est souvent un probleme de ventilation.',
    actionRequired: 'Verifier le bon fonctionnement de votre VMC. Si vous n\'en avez pas, aerez chaque piece 10 minutes par jour minimum.',
  },
  humidite_infiltrations: {
    symptomId: 'humidite_infiltrations',
    healthRisks: [
      'Risque electrique si l\'eau atteint les installations',
      'Moisissures profondes dans les murs',
      'Problemes respiratoires chroniques',
    ],
    consequences: [
      'Degradation structurelle du batiment',
      'Dommages aux biens (meubles, electronique)',
      'Cout de reparation qui augmente avec le temps',
    ],
    advice: 'Une infiltration d\'eau est une urgence. Plus vous attendez, plus les degats seront importants et couteux. L\'eau fragilise la structure et peut creer des courts-circuits.',
    actionRequired: 'Intervention urgente d\'un professionnel. Protegez les installations electriques a proximite. Documentez les degats (photos) pour votre assurance.',
  },
  humidite_remontees: {
    symptomId: 'humidite_remontees',
    healthRisks: [
      'Humidite permanente favorisant les moisissures et acariens',
      'Allergies et problemes respiratoires chroniques',
    ],
    consequences: [
      'Efflorescence et degradation des enduits',
      'Deterioration du bas des murs sur toute la longueur',
      'Probleme structurel a long terme',
    ],
    advice: 'Les remontees capillaires sont tres courantes dans les maisons bretonnes en pierre/granit. Le sol humide de Bretagne aggrave le phenomene. Il existe des solutions : injection de resine, drainage peripherique, membrane etanche.',
    actionRequired: 'Diagnostic par un specialiste humidite. Solutions : injection de resine hydrophobe, drainage peripherique, ou cuvelage pour les cas severes.',
  },
  humidite_odeur: {
    symptomId: 'humidite_odeur',
    healthRisks: [
      'Maux de tete et fatigue chronique',
      'Irritation des muqueuses (yeux, nez, gorge)',
      'Nausees chez les personnes sensibles',
    ],
    consequences: [
      'Presence probable de moisissures cachees (derriere meubles, sous planchers)',
      'Inconfort de vie au quotidien',
    ],
    advice: 'Une odeur de moisi persistante signifie que des moisissures se developpent quelque part, meme si vous ne les voyez pas. Elles peuvent etre derriere un meuble, sous un plancher, dans un faux-plafond.',
    actionRequired: 'Inspecter les zones cachees. Un professionnel peut utiliser une camera thermique pour localiser les zones humides invisibles.',
  },
  humidite_peinture: {
    symptomId: 'humidite_peinture',
    healthRisks: [
      'Particules de peinture dans l\'air si ecaillage',
      'Risque de plomb si peinture ancienne (avant 1949)',
    ],
    consequences: [
      'Necessite de refaire completement les revetements',
      'Signal d\'un probleme d\'humidite sous-jacent',
    ],
    advice: 'La peinture qui cloque est un symptome, pas le probleme. Repeindre par-dessus ne sert a rien — il faut traiter l\'humidite d\'abord.',
    actionRequired: 'Identifier et traiter la source d\'humidite avant de refaire les peintures.',
  },
  humidite_parquet: {
    symptomId: 'humidite_parquet',
    healthRisks: [
      'Risque de chute si le sol est deforme',
      'Developpement de champignons sous le plancher',
    ],
    consequences: [
      'Remplacement complet du parquet necessaire',
      'Possible atteinte au sol et a la structure',
    ],
    advice: 'Un parquet qui gondole indique une humidite importante venant du sol (remontees capillaires) ou d\'un degat des eaux non traite.',
    actionRequired: 'Verifier l\'origine de l\'humidite. Si remontees capillaires, envisager un vide sanitaire ventile ou une barriere etanche.',
  },
  humidite_granit: {
    symptomId: 'humidite_granit',
    healthRisks: [
      'Humidite ambiante permanente favorisant tous les problemes respiratoires',
      'Environnement propice aux acariens et moisissures',
    ],
    consequences: [
      'Inconfort thermique majeur',
      'Degradation des enduits interieurs',
      'Surconsommation de chauffage',
    ],
    advice: 'Les murs en granit breton sont poreux et absorbent l\'eau du sol comme une eponge. C\'est le probleme n°1 des maisons anciennes en Bretagne. La solution n\'est PAS d\'enduire les murs — il faut les laisser respirer tout en traitant la source.',
    actionRequired: 'Drainage peripherique + ventilation mecanique + traitement des joints de pierre. Ne jamais appliquer d\'enduit etanche sur mur en granit (aggrave le probleme).',
  },
  humidite_salpetre: {
    symptomId: 'humidite_salpetre',
    healthRisks: [
      'Le salp\u00eatre est un sel mineral qui irrite les voies respiratoires',
      'Indicateur d\'un taux d\'humidite tres eleve dans les murs',
    ],
    consequences: [
      'Degradation des enduits et joints',
      'Aggravation progressive du phenomene',
    ],
    advice: 'Le salpetre (efflorescence blanche) sur les murs en pierre est le signe que l\'eau remonte dans vos murs et s\'evapore en surface, deposant les sels mineraux.',
    actionRequired: 'Traitement des remontees capillaires necessaire. Brossage du salpetre + traitement anti-salpetre en surface comme solution temporaire.',
  },
  humidite_cave_voutee: {
    symptomId: 'humidite_cave_voutee',
    healthRisks: [
      'L\'humidite de la cave remonte dans les etages',
      'Champignons lignivores (merule) si bois present',
    ],
    consequences: [
      'Merule possible (champignon destructeur du bois) — tres couteux a traiter',
      'Degradation de tout ce qui est stocke en cave',
    ],
    advice: 'Une cave tres humide en Bretagne est frequente mais pas anodine. La merule, champignon destructeur du bois, se developpe exactement dans ces conditions (humidite > 80%, temperature 20-25°C, obscurite).',
    actionRequired: 'Ventiler la cave (grilles de ventilation haute et basse). Si presence de bois, faire verifier l\'absence de merule par un diagnostic specialise.',
  },

  // === ISOLATION ===
  isolation_froid: {
    symptomId: 'isolation_froid',
    healthRisks: [
      'Inconfort thermique permanent entrainant stress et fatigue',
      'Risque accru d\'infections respiratoires en hiver',
      'Aggravation des rhumatismes et douleurs articulaires',
    ],
    consequences: [
      'Surconsommation de chauffage (+20 a 40%)',
      'Factures energetiques elevees',
    ],
    advice: 'Avoir froid chez soi malgre le chauffage signifie que votre maison perd plus de chaleur qu\'elle n\'en produit. C\'est comme chauffer avec les fenetres ouvertes.',
    actionRequired: 'Audit energetique pour identifier les deperditions principales (combles 30%, murs 25%, fenetres 15%, sol 10%).',
  },
  isolation_facture: {
    symptomId: 'isolation_facture',
    healthRisks: [
      'Precarite energetique : certaines familles reduisent le chauffage au detriment de leur sante',
    ],
    consequences: [
      'Budget chauffage qui augmente chaque annee',
      'Bien immobilier qui perd de la valeur (DPE defavorable)',
    ],
    advice: 'En Bretagne, une maison bien isolee ne devrait pas depasser 100 EUR/mois de chauffage pour 100m². Si vous etes au-dessus, votre isolation est probablement insuffisante.',
    actionRequired: 'Faire realiser un DPE ou un audit energetique. Les aides MaPrimeRenov\' couvrent jusqu\'a 90% du cout pour les revenus modestes.',
  },
  isolation_combles: {
    symptomId: 'isolation_combles',
    healthRisks: [
      'Froid en hiver, surchauffe en ete (inconfort permanent)',
      'Risque de condensation dans les combles non isoles',
    ],
    consequences: [
      '30% des deperditions thermiques passent par la toiture',
      'C\'est le poste n°1 de perte de chaleur',
    ],
    advice: 'Isoler les combles est le geste le PLUS rentable en renovation energetique. Retour sur investissement en 3 a 5 ans. C\'est la premiere chose a faire, avant de changer les fenetres ou le chauffage.',
    actionRequired: 'Isolation des combles perdus (soufflage laine minerale, ~20 EUR/m²) ou des combles amenages (panneaux sous rampants). Eligible MaPrimeRenov\'.',
  },
  isolation_dpe: {
    symptomId: 'isolation_dpe',
    healthRisks: [
      'Logement classe passoire thermique : conditions de vie degradees',
      'Risque de precarite energetique',
    ],
    consequences: [
      'Depuis 2025, les logements G sont interdits a la location',
      'Les F seront interdits en 2028',
      'Forte devaluation du bien a la revente',
    ],
    advice: 'Un DPE F ou G signifie que votre logement consomme plus de 330 kWh/m²/an. Une renovation globale (isolation + ventilation + chauffage) peut vous faire gagner 2 a 3 classes DPE.',
    actionRequired: 'Renovation energetique globale recommandee. Les aides sont maximales pour les passoires thermiques (MaPrimeRenov\' Parcours accompagne jusqu\'a 63 000 EUR d\'aides).',
  },
  isolation_murs_granit: {
    symptomId: 'isolation_murs_granit',
    healthRisks: [
      'Murs froids favorisant la condensation et les moisissures',
      'Temperature de surface basse = inconfort meme si l\'air est chaud',
    ],
    consequences: [
      'Deperditions thermiques majeures par les murs',
      'Humidite migrant a travers la pierre',
    ],
    advice: 'Les murs en granit breton ont une tres faible resistance thermique (R = 0.5 environ). L\'isolation par l\'interieur avec un isolant perspirant (fibre de bois, chaux-chanvre) est la solution adaptee aux murs en pierre.',
    actionRequired: 'Isolation thermique par l\'interieur (ITE impossible sur pierre). Utiliser des materiaux perspirants (PAS de polystyrene sur mur en pierre, ca emprisonne l\'humidite).',
  },

  // === VENTILATION ===
  ventilation_odeurs: {
    symptomId: 'ventilation_odeurs',
    healthRisks: [
      'Maux de tete frequents',
      'Fatigue chronique et difficulte de concentration',
      'Irritation des voies respiratoires',
    ],
    consequences: [
      'Air interieur jusqu\'a 8 fois plus pollue qu\'a l\'exterieur',
      'Accumulation de CO2, COV et polluants',
    ],
    advice: 'Des odeurs persistantes signifient que l\'air ne se renouvelle pas suffisamment. L\'air interieur d\'une maison mal ventilee contient des polluants (formaldehyde des meubles, CO2 de la respiration, humidite de la cuisine/douche) qui s\'accumulent.',
    actionRequired: 'Verifier le fonctionnement de la VMC (bouche aspirante avec papier : il doit coller). Si pas de VMC, installer au minimum des grilles de ventilation.',
  },
  ventilation_air_vicie: {
    symptomId: 'ventilation_air_vicie',
    healthRisks: [
      'Somnolence et baisse de concentration (exces de CO2)',
      'Maux de tete au reveil',
      'Allergies aggravees (acariens, poils d\'animaux)',
    ],
    consequences: [
      'Qualite de vie degradee',
      'Problemes de sommeil',
    ],
    advice: 'Un air vicie signifie un taux de CO2 superieur a 1000 ppm. A ce niveau, vos capacites cognitives diminuent de 15%. A 2500 ppm, c\'est une baisse de 50%. C\'est comme travailler avec un leger mal de tete permanent.',
    actionRequired: 'VMC simple flux au minimum. Idealement VMC double flux qui renouvelle l\'air sans perdre la chaleur (tres pertinent en climat breton).',
  },
  ventilation_absence: {
    symptomId: 'ventilation_absence',
    healthRisks: [
      'DANGER : accumulation possible de monoxyde de carbone si chauffage a combustion',
      'Humidite excessive entrainant moisissures et problemes respiratoires',
      'Risque severe pour la sante des enfants et personnes agees',
    ],
    consequences: [
      'Degradation acceleree du batiment (moisissures, condensation)',
      'Risque sanitaire reconnu par l\'ARS',
    ],
    advice: 'L\'absence de ventilation mecanique dans un logement est un danger sanitaire serieux. C\'est obligatoire depuis 1982 dans les logements neufs. En Bretagne, avec l\'humidite ambiante, c\'est absolument critique.',
    actionRequired: 'Installation d\'une VMC prioritaire. En attendant : aerez OBLIGATOIREMENT chaque piece 15 minutes matin et soir. Si vous avez un chauffage au gaz ou bois, faites verifier le tirage.',
  },
  ventilation_moisissures_sdb: {
    symptomId: 'ventilation_moisissures_sdb',
    healthRisks: [
      'Spores de moisissures inhalees quotidiennement',
      'Infections respiratoires recurrentes',
      'Allergies chroniques',
    ],
    consequences: [
      'Degradation des joints, peintures et revetements',
      'Probleme qui s\'etend aux pieces adjacentes',
    ],
    advice: 'Les moisissures dans la salle de bain ne sont PAS normales. Elles indiquent que l\'humidite produite par les douches n\'est pas correctement evacuee.',
    actionRequired: 'Verifier l\'extraction d\'air de la salle de bain (VMC ou extracteur). La bouche d\'extraction doit etre propre et fonctionnelle.',
  },

  // === ELECTRICITE ===
  electricite_disjoncteur: {
    symptomId: 'electricite_disjoncteur',
    healthRisks: [
      'DANGER : risque d\'incendie d\'origine electrique',
      'Risque d\'electrocution',
    ],
    consequences: [
      'Installation surchargee ou defaillante',
      'Dommages potentiels aux appareils electroniques',
    ],
    advice: 'Des disjoncteurs qui sautent regulierement signifient que votre installation est soit surchargee (trop d\'appareils), soit defaillante (court-circuit). Les incendies d\'origine electrique representent 25% des incendies domestiques en France.',
    actionRequired: 'Diagnostic electrique par un electricien agree. Ne pas bricoler soi-meme. Eviter les multiprises en cascade en attendant.',
  },
  electricite_prises: {
    symptomId: 'electricite_prises',
    healthRisks: [
      'DANGER IMMEDIAT : risque d\'electrocution',
      'DANGER IMMEDIAT : risque d\'incendie',
    ],
    consequences: [
      'Degradation irreversible de l\'installation',
      'Mise en danger des occupants',
    ],
    advice: 'Des prises brulee ou noircies sont un signe de surchauffe. C\'est un danger d\'incendie immediat. N\'utilisez plus ces prises.',
    actionRequired: 'CESSEZ d\'utiliser les prises concernees. Faites intervenir un electricien en urgence. Si odeur de brule persistante, coupez le disjoncteur du circuit.',
  },
  electricite_tableau_ancien: {
    symptomId: 'electricite_tableau_ancien',
    healthRisks: [
      'Protection insuffisante contre les electrocutions',
      'Pas de differentiel 30mA = danger mortel',
    ],
    consequences: [
      'Non-conformite aux normes actuelles (NF C 15-100)',
      'Probleme a la revente (diagnostic electrique obligatoire)',
    ],
    advice: 'Un tableau a fusibles porcelaine n\'a aucune protection differentielle. En cas de defaut d\'isolement, rien ne vous protege de l\'electrocution. Un differentiel 30mA peut sauver une vie.',
    actionRequired: 'Remplacement du tableau electrique par un tableau aux normes avec disjoncteurs differentiels. Budget : 1500 a 3000 EUR.',
  },
  electricite_pas_terre: {
    symptomId: 'electricite_pas_terre',
    healthRisks: [
      'DANGER MORTEL en cas de defaut d\'isolement d\'un appareil',
      'Risque d\'electrocution au toucher d\'un appareil metallique defaillant',
    ],
    consequences: [
      'Aucune protection en cas de fuite de courant',
      'Non-conformite grave aux normes',
    ],
    advice: 'La mise a la terre est vitale : elle evacue le courant de fuite vers le sol au lieu de le faire passer par votre corps. Sans elle, toucher un appareil en defaut peut etre mortel.',
    actionRequired: 'Installation d\'une mise a la terre et de differentiels 30mA. Intervention prioritaire.',
  },
  electricite_odeur_brule: {
    symptomId: 'electricite_odeur_brule',
    healthRisks: [
      'URGENCE : risque d\'incendie imminent',
      'Inhalation de fumees toxiques',
    ],
    consequences: [
      'Incendie possible si non traite',
    ],
    advice: 'Une odeur de brule autour des prises ou interrupteurs est une URGENCE. Cela signifie qu\'un echauffement anormal est en cours, pouvant mener a un depart de feu.',
    actionRequired: 'Coupez IMMEDIATEMENT le disjoncteur du circuit concerne. Ne rebranchez pas. Appelez un electricien en urgence.',
  },
  electricite_non_conforme: {
    symptomId: 'electricite_non_conforme',
    healthRisks: [
      'Risque d\'electrocution et d\'incendie',
      'Aucune garantie de securite pour les occupants',
    ],
    consequences: [
      'Obligation de mise aux normes a la vente',
      'Assurance peut refuser de couvrir un sinistre',
    ],
    advice: 'Une installation electrique non conforme est un risque pour toute la famille. Votre assurance habitation peut refuser d\'indemniser un sinistre si l\'installation n\'est pas aux normes.',
    actionRequired: 'Faire realiser un diagnostic electrique complet et une mise en conformite. Eligible aux aides si renovation globale.',
  },

  electricite_tableau_vieux: {
    symptomId: 'electricite_tableau_vieux',
    healthRisks: [
      'DANGER : un tableau electrique ancien peut contenir des fusibles en plomb ou en porcelaine qui ne declenchent pas en cas de surcharge, ce qui provoque une surchauffe des cables pouvant mener directement a un incendie',
      'Les anciens disjoncteurs divisionnaires s\'usent mecaniquement avec le temps et peuvent ne plus couper le courant en cas de court-circuit, laissant passer un arc electrique qui peut enflammer les materiaux autour du tableau',
      'Sans differentiel 30 mA (absent sur les tableaux d\'avant 2000), il n\'y a aucune protection contre les fuites de courant : toucher un appareil defaillant peut provoquer une electrocution mortelle',
      'Les connexions a vis des anciens tableaux se desserrent avec les annees, les vibrations et les variations de temperature, creant des points chauds invisibles qui sont une des causes principales d\'incendie electrique en France',
    ],
    consequences: [
      'Les incendies d\'origine electrique representent 25% des incendies domestiques en France, soit environ 80 000 incendies par an, et les tableaux vetustes en sont la premiere cause',
      'Votre assurance habitation peut refuser d\'indemniser un sinistre electrique si votre installation n\'est pas aux normes, vous laissant seul face aux degats',
      'Lors de la vente du bien, le diagnostic electrique revelera la non-conformite, ce qui fera baisser le prix ou bloquera la vente',
      'Un tableau ancien ne supporte pas la charge des equipements modernes (plaque induction, climatisation, voiture electrique, pompe a chaleur), ce qui aggrave les risques de surchauffe',
    ],
    advice: 'Un tableau electrique de plus de 10 ans est un probleme serieux que beaucoup de proprietaires ignorent parce que ca ne se voit pas. Contrairement a une fuite d\'eau ou une tuile cassee, un tableau defaillant ne donne aucun signe visible avant qu\'il ne soit trop tard. Les fusibles en plomb, les porte-fusibles en porcelaine, les disjoncteurs a vis, les fils en tissu ou en aluminium sont autant de signes d\'une installation dangereuse. Meme si votre tableau "fonctionne" au quotidien, cela ne signifie pas qu\'il vous protege correctement. Un disjoncteur qui n\'a pas declenche depuis 15 ans peut tres bien etre bloque mecaniquement et ne jamais declencher le jour ou vous en aurez besoin. C\'est exactement comme une ceinture de securite qui n\'a jamais ete testee : vous ne saurez qu\'elle ne marche pas qu\'au moment de l\'accident.',
    actionRequired: 'Faites realiser un diagnostic electrique complet par un electricien agree Consuel. Le remplacement d\'un tableau electrique coute entre 1500 et 3000 EUR selon la taille de l\'installation, ce qui est derisoire compare au cout d\'un incendie (en moyenne 45 000 EUR de degats). Si votre tableau a des fusibles a broche ou en porcelaine, des fils en tissu ou aluminium, ou si vous n\'avez pas de disjoncteur differentiel 30 mA, le remplacement est prioritaire. Cette intervention est eligible aux aides dans le cadre d\'une renovation energetique globale.',
  },

  // === TOITURE ===
  toiture_tuiles: {
    symptomId: 'toiture_tuiles',
    healthRisks: [
      'Infiltrations d\'eau entrainant humidite et moisissures',
    ],
    consequences: [
      'Infiltrations progressives dans la charpente et les combles',
      'Degradation de l\'isolation',
      'Risque structurel si charpente atteinte',
    ],
    advice: 'Des tuiles ou ardoises manquantes exposent directement votre charpente aux intemperies. En Bretagne, avec les pluies frequentes et le vent, ca se degrade tres vite.',
    actionRequired: 'Remplacement des elements manquants dans les plus brefs delais. Verification de l\'etat de la charpente et de l\'isolation sous toiture.',
  },
  toiture_infiltration: {
    symptomId: 'toiture_infiltration',
    healthRisks: [
      'Humidite dans les combles favorisant les moisissures',
      'Degradation de l\'isolation (perte d\'efficacite)',
      'Risque electrique si l\'eau atteint les cables',
    ],
    consequences: [
      'Pourrissement de la charpente',
      'Risque de merule (champignon destructeur)',
      'Cout de reparation qui explose si non traite',
    ],
    advice: 'Une infiltration par la toiture est comme une blessure ouverte sur votre maison. Chaque pluie aggrave la situation. Le bois de charpente humide est une cible ideale pour la merule.',
    actionRequired: 'Intervention urgente d\'un couvreur. Proteger temporairement avec une bache si necessaire. Verifier l\'absence de merule sur les bois humides.',
  },
  toiture_charpente: {
    symptomId: 'toiture_charpente',
    healthRisks: [
      'DANGER : risque d\'effondrement si la charpente est tres degradee',
    ],
    consequences: [
      'Reparation tres couteuse',
      'Logement potentiellement inhabitable',
    ],
    advice: 'Une charpente endommagee peut ceder sous le poids des intemperies ou de la neige. C\'est un probleme structurel serieux.',
    actionRequired: 'Diagnostic par un charpentier. Ne pas stocker d\'objets lourds dans les combles. Verifier la presence d\'insectes xylophages (vrillettes, capricornes).',
  },
  toiture_ardoise_blanchie: {
    symptomId: 'toiture_ardoise_blanchie',
    healthRisks: [
      'Perte d\'etancheite progressive de la toiture',
    ],
    consequences: [
      'L\'ardoise blanchie a perdu ses proprietes impermeables',
      'Risque d\'infiltrations a moyen terme',
    ],
    advice: 'L\'ardoise naturelle bretonne blanchit quand elle vieillit et commence a se desagreger. C\'est un signe que la fin de vie de la couverture approche. Un traitement hydrofuge adapte peut prolonger sa duree de quelques annees.',
    actionRequired: 'Evaluation par un couvreur specialise ardoise. Traitement hydrofuge si l\'ardoise est encore saine, remplacement si elle se delite.',
  },
  toiture_ardoise_traitement: {
    symptomId: 'toiture_ardoise_traitement',
    healthRisks: [
      'Risque d\'infiltrations si le produit est inadapte et empeche l\'ardoise de respirer',
    ],
    consequences: [
      'Un mauvais produit peut pieger l\'humidite sous la surface et accelerer le delitage',
      'La peinture non prevue pour l\'ardoise s\'ecaille et laisse des zones exposees',
    ],
    advice: 'Tous les traitements ne se valent pas. Un hydrofuge professionnel applique correctement protege l\'ardoise. En revanche, une peinture ou une resine bon marche peut faire plus de mal que de bien en empechant l\'ardoise de respirer.',
    actionRequired: 'Faire verifier par un professionnel si le produit applique est adapte. Si la toiture presente des cloques ou des zones qui s\'ecaillent, un decapage et un traitement correct sont necessaires.',
  },
  toiture_mauvais_produit: {
    symptomId: 'toiture_mauvais_produit',
    healthRisks: [
      'Degradation acceleree de la couverture entrainant des infiltrations',
    ],
    consequences: [
      'Le nettoyeur haute pression casse les ardoises et ouvre des micro-fissures',
      'La javel decolore et fragilise les materiaux',
      'Le traitement chimique inadapte peut rendre la toiture poreuse',
      'Duree de vie de la toiture reduite de moitie',
    ],
    advice: 'Les ardoises bretonnes ne doivent JAMAIS etre nettoyees au nettoyeur haute pression. Ca detruit la surface protectrice de l\'ardoise et accelere le delitage. Seul un brossage doux ou un traitement basse pression avec produit adapte est recommande.',
    actionRequired: 'Faire evaluer les degats par un couvreur. Si les ardoises sont poreuses suite au mauvais traitement, un hydrofuge adapte peut limiter les degats. Dans les cas severes, remplacement partiel necessaire.',
  },
  toiture_ardoise_delitage: {
    symptomId: 'toiture_ardoise_delitage',
    healthRisks: [
      'Infiltrations d\'eau certaines',
      'Chutes d\'ardoises potentiellement dangereuses',
    ],
    consequences: [
      'Remplacement complet de la couverture necessaire a court terme',
    ],
    advice: 'L\'ardoise qui se delite (feuilletage) est en fin de vie. Elle ne protege plus votre maison. C\'est courant sur les ardoises de plus de 80-100 ans en Bretagne.',
    actionRequired: 'Remplacement de la couverture. L\'ardoise naturelle d\'Espagne ou d\'Angers est recommandee pour la Bretagne.',
  },

  // === MENUISERIES ===
  menuiseries_simple_vitrage: {
    symptomId: 'menuiseries_simple_vitrage',
    healthRisks: [
      'Inconfort thermique : sensation de paroi froide',
      'Condensation favorisant les moisissures sur les fenetres',
    ],
    consequences: [
      'Deperditions thermiques de 15 a 20% par les vitres',
      'Surconsommation de chauffage importante',
    ],
    advice: 'Le simple vitrage a une resistance thermique quasi nulle. En Bretagne avec les temperatures hivernales de 2 a 8°C, c\'est comme avoir un trou dans le mur. Le double vitrage divise les pertes par 3.',
    actionRequired: 'Remplacement par du double vitrage (Ug ≤ 1.1). Eligible MaPrimeRenov\'. Retour sur investissement 5-8 ans.',
  },
  menuiseries_infiltration: {
    symptomId: 'menuiseries_infiltration',
    healthRisks: [
      'Humidite autour des fenetres favorisant les moisissures',
      'Degradation du mur sous l\'appui de fenetre',
    ],
    consequences: [
      'Degradation du bati autour de la fenetre',
      'Isolation compromise',
    ],
    advice: 'L\'eau qui entre par les menuiseries n\'est jamais normale. C\'est soit un defaut de pose, soit un joint defaillant, soit une menuiserie deformee.',
    actionRequired: 'Verifier les joints, les rejets d\'eau et l\'etancheite peripherique. Remplacement si la menuiserie est deformee.',
  },
  menuiseries_bois_pourri: {
    symptomId: 'menuiseries_bois_pourri',
    healthRisks: [
      'Perte d\'etancheite complete',
      'Risque d\'intrusion (securite)',
    ],
    consequences: [
      'Remplacement obligatoire (non reparable)',
      'Risque d\'infiltration d\'eau et d\'air',
    ],
    advice: 'Des menuiseries en bois pourries ne se reparent pas, il faut les remplacer. Le bois pourri est aussi une porte d\'entree pour les insectes xylophages.',
    actionRequired: 'Remplacement des menuiseries. Profitez-en pour passer en double vitrage. Budget : 500 a 1500 EUR par fenetre selon taille et materiau.',
  },

  // === PLOMBERIE ===
  plomberie_fuite: {
    symptomId: 'plomberie_fuite',
    healthRisks: [
      'Humidite favorisant moisissures et champignons',
      'Risque electrique si l\'eau atteint une prise',
    ],
    consequences: [
      'Gaspillage d\'eau (une fuite goutte a goutte = 5m³/an)',
      'Degradation des murs, sols et plafonds',
    ],
    advice: 'Meme une petite fuite est un probleme serieux. En plus du gaspillage d\'eau, l\'humidite constante degrade tout ce qu\'elle touche et cree un environnement propice aux moisissures.',
    actionRequired: 'Reparation dans les plus brefs delais. Si la fuite est importante, coupez l\'arrivee d\'eau et appelez un plombier.',
  },
  plomberie_rouille: {
    symptomId: 'plomberie_rouille',
    healthRisks: [
      'Eau potentiellement impropre a la consommation',
      'Risque d\'ingestion de particules metalliques',
    ],
    consequences: [
      'Canalisations qui se perforent progressivement',
      'Colmatage des appareils (chauffe-eau, lave-linge)',
    ],
    advice: 'De l\'eau rouille signifie que vos canalisations en acier ou en fer se corrodent de l\'interieur. A terme, elles vont fuir.',
    actionRequired: 'Remplacement des canalisations en acier par du cuivre ou du PER. Ne pas boire l\'eau tant qu\'elle est coloree.',
  },
  plomberie_plomb: {
    symptomId: 'plomberie_plomb',
    healthRisks: [
      'DANGER SANITAIRE : le plomb est un poison cumulatif',
      'Saturnisme chez les enfants (troubles du developpement, retard mental)',
      'Problemes renaux et neurologiques chez l\'adulte',
    ],
    consequences: [
      'Obligation de remplacement',
      'Diagnostic plomb obligatoire a la vente',
    ],
    advice: 'Les canalisations en plomb (reconnaissables a leur couleur grise et leur souplesse) empoisonnent l\'eau que vous buvez. Le plomb s\'accumule dans l\'organisme et est particulierement dangereux pour les enfants et les femmes enceintes.',
    actionRequired: 'REMPLACEMENT URGENT de toutes les canalisations en plomb. En attendant, laissez couler l\'eau 2 minutes avant de boire et ne consommez JAMAIS l\'eau chaude du robinet pour cuisiner.',
  },
}

// ---------------------------------------------------------------------------
// Résumés par domaine
// ---------------------------------------------------------------------------

export const domainSummaries: Record<HealthDomain, DomainSummary> = {
  humidite: {
    domain: 'humidite',
    title: 'Humidite',
    description: 'L\'humidite est le probleme n°1 des maisons bretonnes. Le climat oceanique, les murs en pierre et le sol humide creent des conditions ideales pour l\'humidite excessive.',
    goodStateMessage: 'Votre logement ne presente pas de signe d\'humidite problematique. Continuez a bien ventiler pour maintenir cet etat.',
    moderateMessage: 'Des signes d\'humidite sont presents. Sans intervention, les moisissures et la degradation du bati vont s\'aggraver. C\'est le moment d\'agir.',
    criticalMessage: 'Votre logement presente un probleme d\'humidite serieux qui impacte votre sante et degrade votre bien. Une intervention rapide est necessaire.',
  },
  isolation: {
    domain: 'isolation',
    title: 'Isolation',
    description: 'Une bonne isolation divise vos factures de chauffage par 2 et ameliore considerablement votre confort. C\'est l\'investissement le plus rentable en renovation.',
    goodStateMessage: 'Votre isolation semble correcte. Verifiez regulierement l\'etat de l\'isolation des combles (tassement avec le temps).',
    moderateMessage: 'Votre isolation est insuffisante. Vous perdez de la chaleur et de l\'argent inutilement. Des aides financieres peuvent couvrir jusqu\'a 90% des travaux.',
    criticalMessage: 'Votre logement est tres mal isole, ce qui entraine un inconfort permanent et des factures excessives. Une renovation energetique est urgente.',
  },
  ventilation: {
    domain: 'ventilation',
    title: 'Ventilation',
    description: 'La ventilation est essentielle pour evacuer l\'humidite, le CO2 et les polluants interieurs. Un adulte produit 10 litres de vapeur d\'eau par jour rien qu\'en respirant.',
    goodStateMessage: 'Votre ventilation fonctionne correctement. Pensez a nettoyer les bouches d\'extraction et les filtres une fois par an.',
    moderateMessage: 'Votre ventilation est insuffisante. L\'air interieur est probablement plus pollue que l\'air exterieur. Cela impacte votre sante au quotidien.',
    criticalMessage: 'ATTENTION : votre logement manque cruellement de ventilation. Cela represente un risque sanitaire pour les occupants. L\'air que vous respirez est charge en polluants, CO2 et humidite.',
  },
  menuiseries: {
    domain: 'menuiseries',
    title: 'Menuiseries',
    description: 'Les fenetres et portes sont le lien entre interieur et exterieur. Des menuiseries defaillantes causent des pertes de chaleur, de l\'inconfort et des infiltrations.',
    goodStateMessage: 'Vos menuiseries sont en bon etat. Verifiez les joints tous les 5 ans et graissez les mecanismes d\'ouverture.',
    moderateMessage: 'Vos menuiseries montrent des signes d\'usure. Le remplacement par du double vitrage ameliorerait significativement votre confort et vos factures.',
    criticalMessage: 'Vos menuiseries sont en mauvais etat et compromettent l\'isolation et l\'etancheite de votre logement. Un remplacement est necessaire.',
  },
  electricite: {
    domain: 'electricite',
    title: 'Electricite',
    description: 'L\'installation electrique est un enjeu de securite majeur. Les incendies d\'origine electrique representent 25% des incendies domestiques en France.',
    goodStateMessage: 'Votre installation electrique ne presente pas de signe d\'alerte. Faites realiser un diagnostic electrique si elle a plus de 15 ans.',
    moderateMessage: 'Votre installation electrique presente des anomalies. Faites-la verifier par un electricien agree pour eviter tout risque.',
    criticalMessage: 'DANGER : votre installation electrique presente des risques serieux d\'electrocution ou d\'incendie. Une mise aux normes est urgente.',
  },
  toiture: {
    domain: 'toiture',
    title: 'Toiture',
    description: 'La toiture protege l\'ensemble du batiment. En Bretagne, elle subit les assauts du vent, de la pluie et du sel marin. Un entretien regulier est indispensable.',
    goodStateMessage: 'Votre toiture semble en bon etat. Prevoyez un controle tous les 5 ans et un demoussage si necessaire (sans nettoyeur haute pression sur ardoise).',
    moderateMessage: 'Votre toiture montre des signes d\'usure. Un entretien preventif maintenant coutera beaucoup moins qu\'une reparation d\'urgence plus tard.',
    criticalMessage: 'Votre toiture est en mauvais etat et ne protege plus correctement votre maison. Des infiltrations et des degats sur la charpente sont probables.',
  },
  plomberie: {
    domain: 'plomberie',
    title: 'Plomberie',
    description: 'La plomberie impacte directement la qualite de votre eau et le risque de degats des eaux. Des canalisations vetustes sont une bombe a retardement.',
    goodStateMessage: 'Votre plomberie ne montre pas de signe d\'alerte. Faites verifier la pression et l\'etat du chauffe-eau tous les 2 ans.',
    moderateMessage: 'Votre plomberie presente des signes d\'usure. Mieux vaut intervenir maintenant que subir un degat des eaux.',
    criticalMessage: 'Votre plomberie presente des problemes serieux qui peuvent impacter votre sante (plomb, eau impropre) ou causer des degats importants (fuites).',
  },
}
