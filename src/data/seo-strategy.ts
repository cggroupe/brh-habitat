// =============================================================================
// BRH - Bretagne Renovation Habitat | Strategie SEO Blog 2026
// Site : renovation-brh.fr | Zone : Finistere / Bretagne
// Expert SEO : Strategie complete pour 10 articles de blog
//
// Methodologie de recherche de mots-cles :
// - Analyse des SERPs pour chaque thematique dans la zone Finistere/Bretagne
// - Ciblage local prioritaire (Brest, Guipavas, Quimper, Morlaix, Landerneau)
// - Intention de recherche : transactionnelle + informationnelle
// - Specificites climat breton integrees (humidite, vent, sel marin)
// - Aides financieres 2026 actualisees (MaPrimeRenov reformee, CEE, eco-PTZ)
//
// Volumes estimes (sources : Google Keyword Planner, Semrush, Ahrefs tendances)
// Categories de volume : Fort (>1000/mois national), Moyen (200-1000), Faible (<200)
// Note : volumes regionaux Bretagne = 5-8% des volumes nationaux
// =============================================================================

export interface ArticleSEO {
  slug: string
  keyword: string
  keywordVolume: "fort" | "moyen" | "faible"
  keywordDifficulty: "haute" | "moyenne" | "faible"
  keywordIntent: "informationnelle" | "transactionnelle" | "mixte"
  secondaryKeywords: string[]
  seoTitle: string
  metaDescription: string
  headings: {
    h2: string
    h3?: string[]
  }[]
  cta: string
  internalLinks: string[] // slugs des articles lies
  readTime: number // minutes estimees
  category: string
  priority: "haute" | "moyenne" | "faible" // priorite de redaction
  publishOrder: number // ordre recommande de publication
  targetPersona: string // persona cible prioritaire
  featuredSnippetOpportunity: boolean // potentiel position 0
  localKeywords: string[] // mots-cles ultra-locaux Finistere
  coverImage?: string // URL de l'image de couverture Unsplash
}

export const articlesSEO: ArticleSEO[] = [
  // ===========================================================================
  // ARTICLE 1 - VMC et ventilation en Bretagne
  // Priorite HAUTE : probleme specifique au climat breton, fort differenciateur
  // Concurrence locale faible sur la lonque traine "Bretagne" / "Finistere"
  // Volume national "VMC maison" : ~8 000/mois | KD : moyenne
  // ===========================================================================
  {
    slug: "vmc-ventilation-bretagne",
    coverImage: "https://plus.unsplash.com/premium_photo-1666726664307-707a74015ca4?w=800&q=80",
    keyword: "VMC Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: [
      "ventilation maison humide Bretagne",
      "VMC double flux Finistere",
      "probleme humidite maison ancienne Brest",
      "installer VMC maison bretonne",
      "renouvellement air maison Bretagne",
      "VMC hygrorégulable Finistere",
      "aides VMC MaPrimeRenov 2026",
      "devis VMC Guipavas Brest",
    ],
    seoTitle: "VMC en Bretagne : guide complet pour votre maison",
    metaDescription:
      "Climat breton = humidite = moisissures. Decouvrez quelle VMC choisir pour votre maison en Bretagne, les aides disponibles et les tarifs 2026.",
    headings: [
      {
        h2: "Pourquoi la ventilation est cruciale en Bretagne",
        h3: [
          "Un climat parmi les plus humides de France",
          "Les consequences de l'humidite sur la sante et le bati",
          "Maisons bretonnes : des constructions particulierement exposees",
        ],
      },
      {
        h2: "Les differents types de VMC adaptes au climat breton",
        h3: [
          "VMC simple flux autoreglable : le choix economique",
          "VMC simple flux hygroregulable : ideale pour la Bretagne",
          "VMC double flux : la solution haut de gamme",
          "Quelle VMC choisir selon votre maison ?",
        ],
      },
      {
        h2: "Cout et installation d'une VMC en Bretagne",
        h3: [
          "Prix d'une VMC selon le type en 2026",
          "Duree et deroulement des travaux",
          "Entretien annuel : ce qu'il faut prevoir",
        ],
      },
      {
        h2: "Aides financieres pour votre VMC en 2026",
        h3: [
          "MaPrimeRenov : conditions et montants",
          "CEE (Certificats d'Economies d'Energie)",
          "TVA reduite a 5,5 % pour les travaux",
          "Cumuler les aides : exemple chiffre",
        ],
      },
      {
        h2: "FAQ : vos questions sur la VMC en Bretagne",
      },
    ],
    cta: "Obtenez un diagnostic gratuit de la ventilation de votre maison par nos experts BRH en Finistere. Devis sous 48h.",
    internalLinks: [
      "problemes-humidite-bretagne",
      "isolation-thermique-guide",
      "aides-renovation-2026",
      "renovation-energetique-guide",
    ],
    readTime: 9,
    category: "Ventilation & Humidite",
    priority: "haute",
    publishOrder: 4,
    targetPersona: "Proprietaire d'une maison ancienne bretonne avec problemes de condensation ou moisissures",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "VMC Brest",
      "ventilation Guipavas",
      "VMC Landerneau",
      "installation VMC Finistere",
      "VMC Quimper",
    ],
  },

  // ===========================================================================
  // ARTICLE 2 - Isolation thermique (murs, combles, planchers)
  // Priorite HAUTE : pilier de la renovation energetique, volume tres fort
  // Volume national "isolation thermique" : ~18 000/mois | KD : haute
  // La lonque traine locale reduit la concurrence de facon significative
  // ===========================================================================
  {
    slug: "isolation-thermique-guide",
    coverImage: "https://plus.unsplash.com/premium_photo-1661957645816-099827ce621f?w=800&q=80",
    keyword: "isolation thermique Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: [
      "isolation combles perdus Finistere",
      "isolation murs exterieurs Brest",
      "prix isolation maison Bretagne 2026",
      "isolation plancher bas Finistere",
      "meilleur isolant pour maison bretonne",
      "isolation exterieure ITE Brest",
      "aide isolation 1 euro 2026 Bretagne",
      "R thermique isolation Finistere",
    ],
    seoTitle: "Isolation thermique en Bretagne : murs, combles, planchers",
    metaDescription:
      "Isolez efficacement votre maison bretonne : combles, murs, planchers. Materiaux, prix 2026 et aides disponibles en Finistere. Devis gratuit BRH.",
    headings: [
      {
        h2: "Pourquoi isoler sa maison en Bretagne est une priorite",
        h3: [
          "Le grand ouest : un hiver long et humide",
          "Gains en confort et economies de chauffage",
          "Impact sur la valeur immobiliere et le DPE",
        ],
      },
      {
        h2: "Isolation des combles : la priorite numero 1",
        h3: [
          "Combles perdus : solution rapide et economique",
          "Combles amenages : soufflage ou rouleaux ?",
          "Epaisseur minimale recommandee (R = 7 en Bretagne)",
          "Prix isolation combles au m2 en 2026",
        ],
      },
      {
        h2: "Isolation des murs : interieure ou exterieure ?",
        h3: [
          "ITE (Isolation Thermique par l'Exterieur) : avantages en Bretagne",
          "ITI (Isolation Thermique par l'Interieur) : quand la choisir",
          "Cas particulier des maisons en pierre bretonne",
          "Prix isolation murs au m2 en 2026",
        ],
      },
      {
        h2: "Isolation du plancher bas et des vides sanitaires",
        h3: [
          "Detecter un plancher mal isole",
          "Techniques d'isolation du plancher",
          "Prix et rentabilite de l'operation",
        ],
      },
      {
        h2: "Quels materiaux isolants pour le climat breton ?",
        h3: [
          "La laine de roche : robuste face a l'humidite",
          "La ouate de cellulose : ecologique et performante",
          "Le liege : l'isolant naturel breton par excellence",
          "Les panneaux rigides PIR/PUR pour les espaces contraints",
        ],
      },
      {
        h2: "Aides financieres pour l'isolation en 2026",
        h3: [
          "MaPrimeRenov et les plafonds de travaux",
          "CEE : les primes des fournisseurs d'energie",
          "Eco-PTZ : financer sans interets",
        ],
      },
    ],
    cta: "Demandez votre audit d'isolation gratuit. Nos experts BRH interviennent dans tout le Finistere et vous remettent un rapport detaille sous 48h.",
    internalLinks: [
      "ponts-thermiques-solutions",
      "problemes-humidite-bretagne",
      "dpe-diagnostic-performance",
      "aides-renovation-2026",
      "renovation-energetique-guide",
    ],
    readTime: 12,
    category: "Isolation",
    priority: "haute",
    publishOrder: 2,
    targetPersona: "Proprietaire d'une maison des annees 70-90 avec factures de chauffage elevees, classe DPE D ou E",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "isolation Brest",
      "isolation Guipavas",
      "isolation Quimper",
      "isolation Morlaix",
      "isolation Landerneau",
      "artisan isolation Finistere",
    ],
  },

  // ===========================================================================
  // ARTICLE 3 - Ponts thermiques
  // Priorite MOYENNE : sujet technique, fort potentiel featured snippet
  // Volume national "pont thermique" : ~3 000/mois | KD : faible
  // Tres peu de contenu local de qualite = opportunite de dominer la SERP locale
  // ===========================================================================
  {
    slug: "ponts-thermiques-solutions",
    coverImage: "https://plus.unsplash.com/premium_photo-1663133718068-c240d64c4400?w=800&q=80",
    keyword: "pont thermique maison",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "informationnelle",
    secondaryKeywords: [
      "traitement pont thermique renovation",
      "detecter pont thermique thermographie",
      "pont thermique mur dalle beton",
      "pont thermique fenetres Bretagne",
      "deperditions thermiques maison ancienne",
      "correction pont thermique isolation",
      "camera thermique pont thermique Finistere",
      "pont thermique DPE impact",
    ],
    seoTitle: "Ponts thermiques : detection et traitement en Bretagne",
    metaDescription:
      "Un pont thermique peut couter jusqu'a 20% d'energie en plus. Decouvrez comment les detecter et les traiter dans votre maison en Finistere.",
    headings: [
      {
        h2: "Qu'est-ce qu'un pont thermique ?",
        h3: [
          "Definition simple et exemples concrets",
          "Ponts thermiques de structure vs de liaison",
          "Impact sur la facture energetique : chiffres cles",
        ],
      },
      {
        h2: "Comment detecter les ponts thermiques dans votre maison ?",
        h3: [
          "La thermographie infrarouge : l'outil de reference",
          "Les signes visibles : taches, moisissures, condensation",
          "Les zones les plus a risque dans une maison bretonne",
        ],
      },
      {
        h2: "Les ponts thermiques les plus frequents en Bretagne",
        h3: [
          "Jonctions mur / plancher / toiture",
          "Pourtour des fenetres et portes",
          "Poutres et linteaux metalliques ou beton",
          "Balcons et loggias",
        ],
      },
      {
        h2: "Comment traiter et eliminer les ponts thermiques ?",
        h3: [
          "Rupture de pont thermique a la conception",
          "Solutions de correction en renovation",
          "Isolation par l'exterieur : la solution globale",
          "Cout du traitement selon le type de pont thermique",
        ],
      },
      {
        h2: "Ponts thermiques et DPE : ce que vous devez savoir",
      },
      {
        h2: "FAQ : vos questions sur les ponts thermiques",
      },
    ],
    cta: "Nos techniciens BRH realisent un audit thermographique de votre maison en Finistere. Identifiez tous vos ponts thermiques avant de choisir vos travaux.",
    internalLinks: [
      "isolation-thermique-guide",
      "dpe-diagnostic-performance",
      "problemes-humidite-bretagne",
      "menuiseries-fenetres-guide",
    ],
    readTime: 8,
    category: "Isolation",
    priority: "moyenne",
    publishOrder: 3,
    targetPersona: "Proprietaire ayant deja isole une partie de la maison mais cherchant a optimiser ses performances thermiques",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "thermographie Brest",
      "audit thermique Finistere",
      "pont thermique maison ancienne Bretagne",
      "deperditions thermiques Quimper",
    ],
  },

  // ===========================================================================
  // ARTICLE 4 - Problemes d'humidite en Bretagne
  // Priorite HAUTE : sujet emblematique du marche breton, tres forte resonance locale
  // Volume national "humidite maison" : ~12 000/mois | KD : haute
  // Avec le ciblage breton la concurrence chute fortement
  // ===========================================================================
  {
    slug: "problemes-humidite-bretagne",
    coverImage: "https://images.unsplash.com/photo-1738502602922-ffa5c16bba79?w=800&q=80",
    keyword: "humidite maison Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: [
      "moisissures maison bretonne traitement",
      "condensation murs interieur Finistere",
      "remontees capillaires maison pierre Bretagne",
      "infiltrations eau toiture Brest",
      "taux humidite ideal maison bretonne",
      "causes humidite maison ancienne Finistere",
      "traitement anti-humidite murs Bretagne",
      "devis traitement humidite Guipavas",
    ],
    seoTitle: "Humidite dans votre maison bretonne : causes et solutions",
    metaDescription:
      "Moisissures, condensation, remontees capillaires... L'humidite est le fleau des maisons bretonnes. Causes, solutions et artisans en Finistere.",
    headings: [
      {
        h2: "Pourquoi les maisons bretonnes souffrent-elles tant de l'humidite ?",
        h3: [
          "Pluviometrie record : la Bretagne en chiffres",
          "Les constructions traditionnelles en pierre : permeables par nature",
          "Le vent marin : un facteur aggravant souvent negle",
        ],
      },
      {
        h2: "Les 5 types d'humidite et comment les identifier",
        h3: [
          "La condensation : le probleme le plus frequent",
          "Les remontees capillaires : identifier les signes",
          "Les infiltrations par la toiture ou les facades",
          "L'humidite de construction ou de travaux",
          "L'humidite ascensionnelle par les fondations",
        ],
      },
      {
        h2: "Les consequences de l'humidite sur votre sante et votre logement",
        h3: [
          "Impact sur la sante : allergies, asthme, pathologies respiratoires",
          "Degradation du bati : moisissures, efflorescence, pourrissement",
          "Consequences sur la valeur de votre bien immobilier",
        ],
      },
      {
        h2: "Solutions efficaces contre l'humidite en Bretagne",
        h3: [
          "La ventilation : la solution de base incontournable",
          "L'isolation thermique pour eviter la condensation",
          "Traitement des remontees capillaires par injection",
          "Etancheite de facade et ravalement",
          "Renovation de toiture et traitement des infiltrations",
        ],
      },
      {
        h2: "Combien coute le traitement de l'humidite en 2026 ?",
      },
      {
        h2: "FAQ : humidite en maison bretonne",
      },
    ],
    cta: "Vous constatez de l'humidite dans votre maison en Finistere ? Demandez un diagnostic gratuit a BRH. Nos experts identifient la source du probleme et vous proposent la solution adaptee.",
    internalLinks: [
      "vmc-ventilation-bretagne",
      "isolation-thermique-guide",
      "toiture-renovation-bretagne",
      "renovation-energetique-guide",
    ],
    readTime: 10,
    category: "Ventilation & Humidite",
    priority: "haute",
    publishOrder: 1,
    targetPersona: "Proprietaire d'une maison en pierre ou en parpaing avec problemes visibles de condensation, moisissures ou salpetrures",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "traitement humidite Brest",
      "moisissures maison Guipavas",
      "humidite murs Quimper",
      "anti-humidite Finistere",
      "assechement murs Landerneau",
    ],
  },

  // ===========================================================================
  // ARTICLE 5 - Renovation energetique guide debutant
  // Priorite HAUTE : article pilier / pillar page de tout le cluster thematique
  // Volume national "renovation energetique" : ~40 000/mois | KD : tres haute
  // Cible les debutants = intention informationnelle, fort potentiel SEO a long terme
  // ===========================================================================
  {
    slug: "renovation-energetique-guide",
    coverImage: "https://plus.unsplash.com/premium_photo-1681566677108-c1800dfa8ae3?w=800&q=80",
    keyword: "renovation energetique maison Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "informationnelle",
    secondaryKeywords: [
      "comment commencer renovation energetique",
      "etapes renovation energetique maison",
      "audit energetique avant travaux Finistere",
      "renovation globale habitat Bretagne",
      "order des travaux renovation energetique",
      "renovation energetique maison ancienne Bretagne",
      "economies energie renovation maison",
      "accompagnement renovation energetique Finistere",
    ],
    seoTitle: "Guide renovation energetique 2026 en Bretagne : par ou commencer ?",
    metaDescription:
      "Vous voulez renover votre maison en Bretagne mais ne savez pas par ou commencer ? Notre guide complet vous aide etape par etape en Finistere.",
    headings: [
      {
        h2: "Pourquoi renover energetiquement sa maison en Bretagne en 2026 ?",
        h3: [
          "Des economies sur vos factures : chiffres reels en Bretagne",
          "Valoriser votre patrimoine immobilier",
          "Contribuer a la transition ecologique du territoire breton",
          "Les obligations reglementaires a connaitre (DPE, passoires thermiques)",
        ],
      },
      {
        h2: "Etape 1 : Realiser un audit energetique de votre maison",
        h3: [
          "Audit energetique vs DPE : quelle difference ?",
          "Quelles entreprises pour l'audit en Finistere ?",
          "Cout de l'audit et aides disponibles",
        ],
      },
      {
        h2: "Etape 2 : Prioriser les travaux selon votre situation",
        h3: [
          "L'enveloppe d'abord : isolation et etancheite",
          "La ventilation : indispensable avant d'isoler",
          "Le systeme de chauffage : apres l'isolation",
          "La methode du bouquet de travaux",
        ],
      },
      {
        h2: "Etape 3 : Choisir les bons artisans RGE en Bretagne",
        h3: [
          "Qu'est-ce que la certification RGE ?",
          "Comment trouver un artisan RGE dans le Finistere ?",
          "Les questions a poser avant de signer",
        ],
      },
      {
        h2: "Etape 4 : Monter votre dossier d'aides financieres",
        h3: [
          "MaPrimeRenov 2026 : les nouvelles regles",
          "CEE, eco-PTZ, aides locales bretonnes",
          "Faire appel a un conseiller France Renov",
        ],
      },
      {
        h2: "Etape 5 : Suivre et verifier les travaux",
        h3: [
          "Garanties et assurances obligatoires",
          "Verification de la performance apres travaux",
          "Entretien pour preserver les performances",
        ],
      },
      {
        h2: "Tableau de bord : budget type pour une renovation en Bretagne",
      },
    ],
    cta: "BRH vous accompagne de A a Z dans votre renovation energetique en Finistere : audit, conseil, travaux, aides. Contactez-nous pour un premier rendez-vous gratuit.",
    internalLinks: [
      "isolation-thermique-guide",
      "vmc-ventilation-bretagne",
      "aides-renovation-2026",
      "dpe-diagnostic-performance",
      "problemes-humidite-bretagne",
      "toiture-renovation-bretagne",
      "menuiseries-fenetres-guide",
    ],
    readTime: 14,
    category: "Renovation Energetique",
    priority: "haute",
    publishOrder: 5,
    targetPersona: "Proprietaire novice, venant d'acquerir une maison ancienne bretonne ou ayant recu un mauvais DPE, qui ne sait pas par ou commencer",
    featuredSnippetOpportunity: false,
    localKeywords: [
      "renovation energetique Brest",
      "renovation maison Finistere",
      "artisan RGE Guipavas",
      "renovation energetique Quimper",
      "accompagnement travaux Finistere 29",
    ],
  },

  // ===========================================================================
  // ARTICLE 6 - Aides financieres 2026 (MaPrimeRenov, CEE, eco-PTZ)
  // Priorite HAUTE : sujet a fort volume, mis a jour 2026 = avantage concurrentiel
  // Volume national "MaPrimeRenov 2026" : ~20 000/mois | KD : haute
  // L'angle local Bretagne + annee 2026 = forte opportunite de classement
  // ===========================================================================
  {
    slug: "aides-renovation-2026",
    coverImage: "https://images.unsplash.com/photo-1736319861065-d2ee8bb62c16?w=800&q=80",
    keyword: "aides renovation energetique 2026 Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "transactionnelle",
    secondaryKeywords: [
      "MaPrimeRenov 2026 montants conditions",
      "CEE prime renovation Finistere",
      "eco-PTZ 2026 conditions",
      "aides region Bretagne renovation",
      "subvention isolation combles 2026",
      "aide chauffage renouvelable Bretagne",
      "plafond ressources MaPrimeRenov 2026",
      "cumuler aides renovation 2026",
    ],
    seoTitle: "Aides renovation 2026 en Bretagne : MaPrimeRenov, CEE, eco-PTZ",
    metaDescription:
      "Toutes les aides disponibles en 2026 pour renover votre maison en Bretagne : MaPrimeRenov, CEE, eco-PTZ, aides regionales. Simulez vos droits.",
    headings: [
      {
        h2: "Panorama des aides a la renovation en 2026",
        h3: [
          "Qu'est-ce qui a change par rapport a 2025 ?",
          "Tableau recapitulatif des aides cumulables",
          "Qui peut beneficier des aides en Bretagne ?",
        ],
      },
      {
        h2: "MaPrimeRenov 2026 : le dispositif principal",
        h3: [
          "Les deux parcours : parcours par gestes et renovation d'ampleur",
          "Plafonds de revenus et montants 2026",
          "Travaux eligibles en Bretagne",
          "Comment faire sa demande sur maprimerenov.gouv.fr",
        ],
      },
      {
        h2: "Les CEE (Certificats d'Economies d'Energie)",
        h3: [
          "Comment fonctionnent les CEE ?",
          "Monter son dossier CEE avec un artisan RGE",
          "Cumuler CEE et MaPrimeRenov",
        ],
      },
      {
        h2: "L'eco-PTZ : financer sans apport",
        h3: [
          "Conditions d'eligibilite en 2026",
          "Montants et durees de remboursement",
          "Comment en faire la demande aupres de sa banque",
        ],
      },
      {
        h2: "Aides specifiques a la Bretagne et au Finistere",
        h3: [
          "Les aides du Conseil Regional de Bretagne",
          "Les aides de Brest Metropole et du Departement 29",
          "Aides de l'ANAH dans le Finistere",
        ],
      },
      {
        h2: "Simulation : combien pouvez-vous obtenir pour votre maison ?",
        h3: [
          "Exemple 1 : isolation combles + VMC pour revenus modestes",
          "Exemple 2 : renovation globale pour revenus intermediaires",
          "Exemple 3 : menuiseries + chauffage pour revenus superieurs",
        ],
      },
      {
        h2: "FAQ : aides renovation 2026",
      },
    ],
    cta: "BRH vous aide a maximiser vos aides financieres. Nos conseillers montent votre dossier MaPrimeRenov et CEE. Contactez-nous pour une simulation gratuite en Finistere.",
    internalLinks: [
      "renovation-energetique-guide",
      "isolation-thermique-guide",
      "vmc-ventilation-bretagne",
      "dpe-diagnostic-performance",
      "menuiseries-fenetres-guide",
      "toiture-renovation-bretagne",
    ],
    readTime: 11,
    category: "Aides & Financement",
    priority: "haute",
    publishOrder: 6,
    targetPersona: "Proprietaire ayant deja identifie ses travaux mais bloque par le budget, cherchant a optimiser son financement",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "MaPrimeRenov Brest",
      "aide renovation Finistere",
      "subvention travaux Guipavas",
      "CEE Quimper",
      "eco-PTZ Bretagne",
    ],
  },

  // ===========================================================================
  // ARTICLE 7 - Toiture en climat breton
  // Priorite HAUTE : forte demande locale, sujet core de BRH, concurrence locale moderee
  // Volume national "toiture renovation" : ~15 000/mois | KD : haute
  // Specificite bretonne (ardoise, vent, pluie) = avantage differentiel fort
  // ===========================================================================
  {
    slug: "toiture-renovation-bretagne",
    coverImage: "https://images.unsplash.com/photo-1681049400158-0ff6249ac315?w=800&q=80",
    keyword: "renovation toiture Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "transactionnelle",
    secondaryKeywords: [
      "toiture ardoise Finistere entretien",
      "couvreur Brest devis toiture",
      "fuite toiture maison ancienne Bretagne",
      "isolation toiture sarking Finistere",
      "toiture zinc aluminium Bretagne",
      "traitement mousse toiture Bretagne",
      "prix renovation toiture au m2 2026",
      "toiture tempete assurance Finistere",
    ],
    seoTitle: "Toiture en Bretagne : renovation, entretien et materiaux",
    metaDescription:
      "Vent, pluie, sel marin : votre toiture bretonne subit rude epreuve. Guide complet renovation, materiaux adaptes et prix 2026 en Finistere.",
    headings: [
      {
        h2: "Les contraintes climatiques bretonnes sur votre toiture",
        h3: [
          "Vent et depression : les tempetes de l'Atlantique",
          "Pluviometrie : le bati le plus expose de France",
          "Sel marin : un facteur d'usure accelree sur le littoral",
          "Les mousses et lichens : ennemis de l'etancheite",
        ],
      },
      {
        h2: "Les materiaux de toiture adaptes au climat breton",
        h3: [
          "L'ardoise naturelle : la tradition bretonne",
          "Le zinc et l'aluminium : durabilite face aux vents",
          "La tuile beton ou terre cuite : alternatives modernes",
          "Les bacs acier et couvertures plates : cas particuliers",
        ],
      },
      {
        h2: "Quand faut-il renover ou reparer sa toiture ?",
        h3: [
          "Les signes d'une toiture en fin de vie",
          "Reparation ponctuelle ou renovation complete : comment choisir ?",
          "Duree de vie des materiaux en climat breton",
        ],
      },
      {
        h2: "Renovation de toiture : les etapes des travaux",
        h3: [
          "Diagnostic et devis par un couvreur certifie RGE",
          "Depose de l'ancienne couverture",
          "Traitement de la charpente si necessaire",
          "Isolation en sarking : la double opportunite",
          "Pose de la nouvelle couverture",
        ],
      },
      {
        h2: "Prix d'une renovation de toiture en Bretagne en 2026",
        h3: [
          "Prix au m2 selon le materiau",
          "Facteurs qui font varier le prix en Finistere",
          "Aides disponibles pour la toiture",
        ],
      },
      {
        h2: "Entretien preventif : prolonger la vie de votre toiture",
        h3: [
          "Nettoyage et traitement anti-mousse",
          "Inspection annuelle : points de vigilance",
          "Que faire apres une tempete ?",
        ],
      },
    ],
    cta: "Toiture abimee, fuite ou renovation a prevoir ? BRH intervient dans tout le Finistere. Demandez votre devis toiture gratuit et obtenez une reponse sous 48h.",
    internalLinks: [
      "problemes-humidite-bretagne",
      "isolation-thermique-guide",
      "aides-renovation-2026",
      "renovation-energetique-guide",
    ],
    readTime: 10,
    category: "Toiture",
    priority: "haute",
    publishOrder: 7,
    targetPersona: "Proprietaire dont la toiture date de plus de 20 ans, ayant constate des fuites ou planifiant une renovation energetique globale",
    featuredSnippetOpportunity: false,
    localKeywords: [
      "couvreur Brest",
      "toiture Guipavas",
      "renovation toiture Quimper",
      "toiture ardoise Finistere",
      "couvreur Landerneau",
      "toiture Morlaix",
    ],
  },

  // ===========================================================================
  // ARTICLE 8 - Menuiseries et fenetres
  // Priorite MOYENNE : sujet transactionnel, volume fort, concurrence nationale elevee
  // Volume national "fenetre double vitrage" : ~25 000/mois | KD : tres haute
  // L'angle local + CEE menuiseries 2026 = differentiel actionnable
  // ===========================================================================
  {
    slug: "menuiseries-fenetres-guide",
    coverImage: "https://plus.unsplash.com/premium_photo-1763203048833-884ccb56d7bb?w=800&q=80",
    keyword: "remplacement fenetres Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "transactionnelle",
    secondaryKeywords: [
      "double vitrage triple vitrage Finistere",
      "fenetre PVC bois aluminium Bretagne",
      "prix fenetres double vitrage 2026",
      "aide remplacement fenetres MaPrimeRenov",
      "menuiserie maison ancienne Bretagne",
      "fenetre anti-bruit Brest Quimper",
      "isolation phonique fenetres Finistere",
      "devis menuiserie Brest Guipavas",
    ],
    seoTitle: "Fenetres et menuiseries en Bretagne : guide et prix 2026",
    metaDescription:
      "Remplacer vos fenetres en Bretagne : double ou triple vitrage, PVC ou bois, aides 2026. Economisez sur votre facture et gagnez en confort thermique.",
    headings: [
      {
        h2: "Fenetres et menuiseries : leur role dans la performance energetique",
        h3: [
          "Les pertes de chaleur par les menuiseries : jusqu'a 15 % des deperditions",
          "L'importance de l'etancheite a l'air en Bretagne",
          "Vitrage et chassis : les deux composantes a evaluer",
        ],
      },
      {
        h2: "Double vitrage ou triple vitrage : que choisir en Bretagne ?",
        h3: [
          "Double vitrage : performant pour la majorite des maisons",
          "Triple vitrage : quand est-il rentable ?",
          "Le facteur solaire Uw : explication simple",
          "Uw et valeur Ug : les normes a connaitre",
        ],
      },
      {
        h2: "Les materiaux de chassis adaptes au climat breton",
        h3: [
          "Le PVC : economique et resistant a l'humidite",
          "L'aluminium : design et durable face au sel marin",
          "Le bois : naturel et isolant, mais a entretenir",
          "Le bois-aluminium : le meilleur des deux mondes",
        ],
      },
      {
        h2: "Quel type de menuiserie choisir selon votre maison ?",
        h3: [
          "Maisons en pierre bretonne : contraintes esthetiques et architecturales",
          "Maisons des annees 70-90 en parpaing",
          "Maisons recentes a basse consommation",
        ],
      },
      {
        h2: "Prix du remplacement de fenetres en Bretagne en 2026",
        h3: [
          "Prix par fenetre selon le materiau et le type",
          "Cout d'une pose complete (travail inclus)",
          "Aides disponibles : MaPrimeRenov et CEE menuiseries",
        ],
      },
      {
        h2: "Les autres menuiseries a renover : portes, volets, velux",
      },
      {
        h2: "FAQ : questions frequentes sur les fenetres en Bretagne",
      },
    ],
    cta: "Demandez votre devis menuiseries gratuit a BRH. Nos artisans RGE interviennent dans tout le Finistere et vous accompagnent dans vos dossiers d'aides.",
    internalLinks: [
      "ponts-thermiques-solutions",
      "isolation-thermique-guide",
      "aides-renovation-2026",
      "dpe-diagnostic-performance",
      "renovation-energetique-guide",
    ],
    readTime: 9,
    category: "Menuiseries",
    priority: "moyenne",
    publishOrder: 8,
    targetPersona: "Proprietaire avec des fenetres simple vitrage ou double vitrage ancien, cherchant a reduire sa facture et ameliorer son confort en hiver",
    featuredSnippetOpportunity: false,
    localKeywords: [
      "menuiserie Brest",
      "fenetres Guipavas",
      "double vitrage Quimper",
      "menuiserie Finistere",
      "remplacement fenetres Landerneau",
    ],
  },

  // ===========================================================================
  // ARTICLE 9 - DPE (Diagnostic de Performance Energetique)
  // Priorite HAUTE : sujet reglementaire a forte demande, bascule 2025-2028 passoires
  // Volume national "DPE maison" : ~20 000/mois | KD : haute
  // Angle Bretagne + obligations locataires 2025-2028 = urgence du sujet
  // ===========================================================================
  {
    slug: "dpe-diagnostic-performance",
    coverImage: "https://plus.unsplash.com/premium_photo-1715183752115-ec6c01aaaa3b?w=800&q=80",
    keyword: "DPE maison Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: [
      "comprendre son DPE etiquette energie",
      "ameliorer DPE maison Finistere",
      "passoire thermique interdiction location 2025",
      "DPE G F Bretagne travaux obligatoires",
      "cout DPE maison Brest 2026",
      "diagnostic energetique obligatoire vente",
      "DPE renovation simulation etiquette",
      "plan renovation passoires thermiques Bretagne",
    ],
    seoTitle: "DPE en Bretagne : comprendre et ameliorer votre etiquette",
    metaDescription:
      "Votre DPE est F ou G ? Risque d'interdiction de location des 2025. Comprenez votre etiquette et les travaux a faire en Finistere pour monter en classe.",
    headings: [
      {
        h2: "Qu'est-ce que le DPE et comment le lire ?",
        h3: [
          "Les etiquettes de A a G : ce qu'elles signifient",
          "Les deux indicateurs : consommation energie et emissions CO2",
          "Le DPE collectif vs DPE individuel",
          "Validite et obligatoire : quand refaire son DPE ?",
        ],
      },
      {
        h2: "DPE et marche immobilier breton en 2026",
        h3: [
          "L'impact du DPE sur le prix de vente en Bretagne",
          "L'interdiction progressive des passoires thermiques",
          "Calendrier des obligations pour les proprietaires bailleurs",
        ],
      },
      {
        h2: "Comment est calcule le DPE de votre maison bretonne ?",
        h3: [
          "Les postes pris en compte : chauffage, isolation, ventilation",
          "Specificites des maisons en pierre en Bretagne",
          "Pourquoi votre DPE peut sembler sous-evalue",
        ],
      },
      {
        h2: "Quels travaux pour ameliorer son DPE en Bretagne ?",
        h3: [
          "Les travaux les plus impactants selon votre etiquette actuelle",
          "Passer de G a D : parcours type pour une maison bretonne",
          "Passer de D a B : la renovation globale",
          "Simulation du gain de classes selon les travaux",
        ],
      },
      {
        h2: "Cout du DPE et aides disponibles",
        h3: [
          "Prix d'un DPE en Finistere en 2026",
          "Audit energetique vs DPE : quand aller plus loin ?",
          "Aides pour les travaux post-DPE",
        ],
      },
      {
        h2: "FAQ : vos questions sur le DPE en Bretagne",
      },
    ],
    cta: "Votre DPE est mauvais ? BRH realise l'audit energetique de votre maison et vous propose un plan de travaux chiffre pour monter en classe. Diagnostic gratuit en Finistere.",
    internalLinks: [
      "renovation-energetique-guide",
      "aides-renovation-2026",
      "isolation-thermique-guide",
      "ponts-thermiques-solutions",
      "menuiseries-fenetres-guide",
    ],
    readTime: 10,
    category: "Renovation Energetique",
    priority: "haute",
    publishOrder: 9,
    targetPersona: "Proprietaire bailleur dont le logement est classe F ou G, ou acquereur d'un bien immobilier en Bretagne souhaitant comprendre son DPE",
    featuredSnippetOpportunity: true,
    localKeywords: [
      "DPE Brest",
      "diagnostic energetique Finistere",
      "DPE Quimper",
      "passoire thermique Bretagne",
      "audit energetique Guipavas",
    ],
  },

  // ===========================================================================
  // ARTICLE 10 - Mise aux normes electriques
  // Priorite MOYENNE : sujet core BRH, volume moyen, concurrence locale faible
  // Volume national "mise aux normes electriques" : ~5 000/mois | KD : moyenne
  // Forte intention transactionnelle, souvent lie a une vente ou renovation globale
  // ===========================================================================
  {
    slug: "mise-aux-normes-electriques",
    coverImage: "https://images.unsplash.com/photo-1761251947512-a293e482919f?w=800&q=80",
    keyword: "mise aux normes electriques maison ancienne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "transactionnelle",
    secondaryKeywords: [
      "renovation electrique maison ancienne Bretagne",
      "electricien RGE Finistere devis",
      "tableau electrique mise a niveau Brest",
      "norme NF C 15-100 renovation",
      "prise de terre maison bretonne",
      "diagnostic electrique vente maison",
      "cout remise aux normes electriques 2026",
      "renovation tableau electrique Guipavas",
    ],
    seoTitle: "Mise aux normes electriques en Bretagne : guide 2026",
    metaDescription:
      "Installation electrique ancienne dans votre maison bretonne ? Guide complet sur la mise aux normes NF C 15-100, les etapes et les prix 2026 en Finistere.",
    headings: [
      {
        h2: "Pourquoi mettre son installation electrique aux normes ?",
        h3: [
          "Securite : incendies et risques electriques dans les maisons anciennes",
          "Obligation legale lors d'une vente immobiliere",
          "Compatibilite avec les usages modernes (VMC, borne recharge, domotique)",
        ],
      },
      {
        h2: "Comment savoir si votre installation est conforme ?",
        h3: [
          "Les signes d'une installation vetuste",
          "Le diagnostic electrique obligatoire (CONSUEL)",
          "Quelle norme s'applique : NF C 15-100",
        ],
      },
      {
        h2: "Les travaux de mise aux normes les plus frequents",
        h3: [
          "Remplacement du tableau electrique",
          "Mise a la terre de l'installation",
          "Installation de disjoncteurs differentiels",
          "Remplacement des prises et interrupteurs anciens",
          "Creation de nouveaux circuits : cuisine, salle de bain",
          "Installation d'une borne IRVE pour vehicule electrique",
        ],
      },
      {
        h2: "Mise aux normes electriques et renovation globale en Bretagne",
        h3: [
          "Coordonner les travaux electriques avec l'isolation",
          "Profiter de la renovation pour integrer la domotique",
          "L'eclairage LED et la gestion de l'energie",
        ],
      },
      {
        h2: "Prix d'une mise aux normes electriques en Bretagne en 2026",
        h3: [
          "Cout selon la surface et l'etat de l'installation",
          "Devis type pour une maison de 100 m2 en Finistere",
          "Aides et TVA reduite pour les travaux electriques",
        ],
      },
      {
        h2: "Comment choisir son electricien RGE en Finistere ?",
        h3: [
          "Certifications a verifier : RGE, Qualifelec",
          "Questions a poser avant de signer",
          "Garanties et assurances decennales",
        ],
      },
      {
        h2: "FAQ : electricite et renovation en Bretagne",
      },
    ],
    cta: "Installation electrique ancienne ou non-conforme ? BRH dispose d'electriciens RGE certifies en Finistere. Obtenez votre devis gratuit et une intervention rapide.",
    internalLinks: [
      "renovation-energetique-guide",
      "aides-renovation-2026",
      "isolation-thermique-guide",
      "vmc-ventilation-bretagne",
    ],
    readTime: 9,
    category: "Electricite",
    priority: "moyenne",
    publishOrder: 10,
    targetPersona: "Proprietaire d'une maison construite avant 1990 souhaitant vendre ou entreprendre des travaux, et soumis a l'obligation de diagnostic electrique",
    featuredSnippetOpportunity: false,
    localKeywords: [
      "electricien Brest",
      "electricien Guipavas",
      "tableau electrique Finistere",
      "mise aux normes electrique Quimper",
      "electricien RGE Landerneau",
      "renovation electrique Morlaix",
    ],
  },
]

// =============================================================================
// SYNTHESE STRATEGIQUE - BRH Bretagne Renovation Habitat
// =============================================================================

export interface SEOStrategy {
  siteUrl: string
  company: string
  zone: string
  clusterThematiques: ClusterThematique[]
  calendrierEditorial: CalendrierItem[]
  maillagePrioritaire: MaillageLien[]
  recommandationsTechniques: string[]
}

export interface ClusterThematique {
  nom: string
  pillarPage: string // slug
  articles: string[] // slugs
  objectifSEO: string
}

export interface CalendrierItem {
  ordre: number
  slug: string
  raisonPriorite: string
  moisPublicationRecommande: string
}

export interface MaillageLien {
  source: string
  destination: string
  ancreRecommandee: string
  priorite: "haute" | "moyenne"
}

export const seoStrategy: SEOStrategy = {
  siteUrl: "renovation-brh.fr",
  company: "BRH - Bretagne Renovation Habitat",
  zone: "Finistere (Brest, Guipavas, Quimper, Morlaix, Landerneau)",

  clusterThematiques: [
    {
      nom: "Humidite & Ventilation",
      pillarPage: "problemes-humidite-bretagne",
      articles: ["vmc-ventilation-bretagne", "toiture-renovation-bretagne"],
      objectifSEO:
        "Dominer les SERPs locales sur la thematique humidite maison bretonne - difference concurrentielle forte car specifique au marche breton",
    },
    {
      nom: "Isolation & Performance Thermique",
      pillarPage: "isolation-thermique-guide",
      articles: ["ponts-thermiques-solutions", "menuiseries-fenetres-guide"],
      objectifSEO:
        "Capturer l'intention transactionnelle des proprietaires souhaitant isoler leur maison ancienne en Finistere",
    },
    {
      nom: "Renovation Energetique & Financement",
      pillarPage: "renovation-energetique-guide",
      articles: [
        "aides-renovation-2026",
        "dpe-diagnostic-performance",
        "mise-aux-normes-electriques",
      ],
      objectifSEO:
        "Etre la reference locale sur le parcours complet de renovation : du diagnostic a l'obtention des aides",
    },
  ],

  calendrierEditorial: [
    {
      ordre: 1,
      slug: "problemes-humidite-bretagne",
      raisonPriorite:
        "Article fondateur du cluster humidite - differenciateur breton fort - capte les recherches urgentes (probleme actif)",
      moisPublicationRecommande: "Mars 2026",
    },
    {
      ordre: 2,
      slug: "isolation-thermique-guide",
      raisonPriorite:
        "Pillar page du cluster isolation - volume de recherche maximal - sert de hub pour 4 autres articles",
      moisPublicationRecommande: "Mars 2026",
    },
    {
      ordre: 3,
      slug: "ponts-thermiques-solutions",
      raisonPriorite:
        "Sujet technique a faible concurrence - fort potentiel featured snippet - renforce l'autorite du cluster isolation",
      moisPublicationRecommande: "Avril 2026",
    },
    {
      ordre: 4,
      slug: "vmc-ventilation-bretagne",
      raisonPriorite:
        "Complement naturel de l'humidite - frequentes recherches apres diagnosis d'un probleme de condensation",
      moisPublicationRecommande: "Avril 2026",
    },
    {
      ordre: 5,
      slug: "renovation-energetique-guide",
      raisonPriorite:
        "Pillar page transversale - hub de maillage interne - capture les debutants en haut du funnel",
      moisPublicationRecommande: "Mai 2026",
    },
    {
      ordre: 6,
      slug: "aides-renovation-2026",
      raisonPriorite:
        "Sujet evergreen a mettre a jour annuellement - fort volume - capte les recherches budgetaires avant decision d'achat",
      moisPublicationRecommande: "Mai 2026",
    },
    {
      ordre: 7,
      slug: "toiture-renovation-bretagne",
      raisonPriorite:
        "Metier core BRH - forte intentionnalite transactionnelle - sujet specifique Bretagne peu couvert localement",
      moisPublicationRecommande: "Juin 2026",
    },
    {
      ordre: 8,
      slug: "menuiseries-fenetres-guide",
      raisonPriorite:
        "Forte demande transactionnelle - complement logique isolation - article support des dossiers CEE menuiseries",
      moisPublicationRecommande: "Juin 2026",
    },
    {
      ordre: 9,
      slug: "dpe-diagnostic-performance",
      raisonPriorite:
        "Urgence reglementaire 2025-2028 pour les bailleurs - ciblage proprietaires bailleurs = persona a fort potentiel",
      moisPublicationRecommande: "Juillet 2026",
    },
    {
      ordre: 10,
      slug: "mise-aux-normes-electriques",
      raisonPriorite:
        "Metier core BRH - souvent declencheur d'une renovation globale - faible concurrence locale sur le Finistere",
      moisPublicationRecommande: "Juillet 2026",
    },
  ],

  maillagePrioritaire: [
    {
      source: "problemes-humidite-bretagne",
      destination: "vmc-ventilation-bretagne",
      ancreRecommandee: "installer une VMC adaptee au climat breton",
      priorite: "haute",
    },
    {
      source: "problemes-humidite-bretagne",
      destination: "isolation-thermique-guide",
      ancreRecommandee: "bien isoler pour eviter la condensation",
      priorite: "haute",
    },
    {
      source: "isolation-thermique-guide",
      destination: "ponts-thermiques-solutions",
      ancreRecommandee: "traiter les ponts thermiques de votre maison",
      priorite: "haute",
    },
    {
      source: "isolation-thermique-guide",
      destination: "aides-renovation-2026",
      ancreRecommandee: "financer vos travaux d'isolation avec les aides 2026",
      priorite: "haute",
    },
    {
      source: "renovation-energetique-guide",
      destination: "dpe-diagnostic-performance",
      ancreRecommandee: "comprendre votre DPE avant de planifier vos travaux",
      priorite: "haute",
    },
    {
      source: "dpe-diagnostic-performance",
      destination: "aides-renovation-2026",
      ancreRecommandee: "les aides disponibles apres votre diagnostic",
      priorite: "haute",
    },
    {
      source: "toiture-renovation-bretagne",
      destination: "problemes-humidite-bretagne",
      ancreRecommandee: "les problemes d'humidite dus aux infiltrations de toiture",
      priorite: "moyenne",
    },
    {
      source: "menuiseries-fenetres-guide",
      destination: "ponts-thermiques-solutions",
      ancreRecommandee: "eliminer les ponts thermiques autour de vos fenetres",
      priorite: "moyenne",
    },
    {
      source: "mise-aux-normes-electriques",
      destination: "renovation-energetique-guide",
      ancreRecommandee: "integrer l'electricite dans votre renovation globale",
      priorite: "moyenne",
    },
  ],

  recommandationsTechniques: [
    "Implementer le schema LocalBusiness sur toutes les pages avec NAP coherent : BRH, Guipavas 29490, zone Finistere",
    "Ajouter le schema FAQPage sur tous les articles contenant une section FAQ (articles 1, 2, 4, 6, 8, 9, 10)",
    "Implementer le schema HowTo sur l'article renovation-energetique-guide (structure etapes)",
    "Implementer le schema Article avec datePublished et dateModified sur chaque article de blog",
    "Creer une landing page par ville cible : /renovation-brest, /renovation-quimper, /renovation-morlaix, /renovation-landerneau",
    "Balise canonique sur chaque article pour eviter le contenu duplique avec les pages de categories",
    "Sitemap XML dedie au blog : /blog-sitemap.xml avec priority 0.8 et changefreq monthly",
    "Optimiser les Core Web Vitals : LCP < 2.5s, CLS < 0.1, INP < 200ms - prioritaire sur mobile",
    "Breadcrumb schema sur tous les articles : Accueil > Blog > Categorie > Article",
    "Balise hreflang pas necessaire (site FR uniquement) mais verifier l'absence de contenu en anglais accidentel",
    "Images : nommage semantique obligatoire (ex: isolation-combles-perdus-finistere.webp) + alt text avec mot-cle + localisation",
    "Google Business Profile BRH : publier chaque nouvel article en post GBP avec lien, photo et CTA - augmente la visibilite locale",
    "Maillage footer : liens permanents vers les 4 categories principales (Isolation, Toiture, Ventilation, Electricite)",
    "Mettre en place un suivi SEO mensuel : Search Console + positions sur les 10 mots-cles principaux",
  ],
}
