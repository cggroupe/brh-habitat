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

  // ===========================================================================
  // BATCH 2 — 15 nouveaux articles SEO Bretagne (Phase G+ 2026-05-08)
  // Cibles : long-tail Bretagne, climat océanique, patrimoine breton, aides 2026
  // ===========================================================================

  {
    slug: "pompe-a-chaleur-air-eau-bretagne",
    coverImage: "https://images.unsplash.com/photo-1605346576608-3eee31f5f55a?w=800&q=80",
    keyword: "pompe à chaleur Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: ["PAC air eau Bretagne", "PAC Finistère", "installer pompe à chaleur Brest", "COP pompe à chaleur climat océanique", "aide PAC MaPrimeRénov 2026"],
    seoTitle: "Pompe à chaleur air/eau en Bretagne : pourquoi le climat est idéal",
    metaDescription: "Le climat océanique breton offre un COP exceptionnel pour les PAC air/eau. Guide complet, aides 2026, retours d'expérience Brest, Rennes, Vannes.",
    headings: [
      { h2: "Le climat breton : un atout pour la PAC", h3: ["Températures rarement extrêmes", "COP moyen annuel 3,5 à 4,2 en Bretagne", "Comparaison vs PAC en climat continental"] },
      { h2: "Choisir sa PAC : monobloc vs split, basse vs haute température", h3: ["Pour neuf RT2012/RE2020", "Pour rénovation maison ancienne (radiateurs existants)"] },
      { h2: "Coûts et aides 2026 en Bretagne", h3: ["Prix moyen pose : 12 à 18 k€", "MaPrimeRénov + CEE + éco-PTZ"] },
      { h2: "Installateurs RGE QualiPAC en Bretagne" },
    ],
    cta: "Demander un devis PAC personnalisé en Bretagne",
    internalLinks: ["renovation-energetique-guide", "aides-renovation-2026", "dpe-diagnostic-performance"],
    readTime: 9, category: "chauffage", priority: "haute", publishOrder: 11,
    targetPersona: "Propriétaire breton remplaçant une chaudière fioul/gaz",
    featuredSnippetOpportunity: true,
    localKeywords: ["pompe à chaleur Brest", "PAC Rennes", "installation PAC Vannes", "pompe à chaleur Lorient", "PAC Quimper", "PAC air-eau Saint-Brieuc"],
  },
  {
    slug: "photovoltaique-autoconsommation-bretagne",
    coverImage: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
    keyword: "panneaux solaires Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: ["photovoltaïque Bretagne rentabilité", "autoconsommation Finistère", "panneaux solaires Brest", "prime à l'autoconsommation 2026"],
    seoTitle: "Photovoltaïque en Bretagne : la rentabilité malgré la météo",
    metaDescription: "Idée reçue : la Bretagne ne serait pas faite pour le solaire. Faux. Découvrez les vrais chiffres de production, rentabilité et aides 2026.",
    headings: [
      { h2: "Mythe vs réalité : la Bretagne et le soleil", h3: ["Production réelle : 950 à 1100 kWh/kWc/an", "Comparaison PACA vs Bretagne", "L'avantage de la diffusion lumineuse"] },
      { h2: "Autoconsommation vs revente totale", h3: ["Le calcul ROI 2026", "Stockage batterie : pertinent ou pas ?"] },
      { h2: "Aides 2026 : prime à l'autoconsommation, TVA réduite, exo IR" },
      { h2: "Installateurs RGE QualiPV en Bretagne" },
    ],
    cta: "Étude photovoltaïque gratuite pour votre toiture bretonne",
    internalLinks: ["aides-renovation-2026", "toiture-renovation-bretagne", "renovation-energetique-guide"],
    readTime: 8, category: "energie", priority: "haute", publishOrder: 12,
    targetPersona: "Propriétaire avec toiture exposée sud, sud-est ou sud-ouest",
    featuredSnippetOpportunity: false,
    localKeywords: ["panneaux solaires Brest", "photovoltaïque Rennes", "solaire Vannes", "autoconsommation Quimper", "installateur photovoltaïque Lorient"],
  },
  {
    slug: "chauffe-eau-thermodynamique-bretagne",
    coverImage: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&q=80",
    keyword: "chauffe-eau thermodynamique",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["CET Bretagne", "ballon thermodynamique aides", "remplacer chauffe-eau électrique Bretagne"],
    seoTitle: "Chauffe-eau thermodynamique : économies réelles en Bretagne",
    metaDescription: "Diviser sa facture d'eau chaude par 3 grâce au chauffe-eau thermodynamique. Guide installation, aides MaPrimeRénov 2026, retours Bretagne.",
    headings: [
      { h2: "Comment fonctionne un CET ?", h3: ["Principe pompe à chaleur sur ballon", "COP 2,5 à 3,5 selon configuration"] },
      { h2: "Quel emplacement choisir en Bretagne ?", h3: ["Volume minimum 20 m³ + ventilation", "Garage, buanderie, cellier"] },
      { h2: "Aides 2026 et ROI moyen Bretagne" },
      { h2: "Marques recommandées et installateurs RGE" },
    ],
    cta: "Devis chauffe-eau thermodynamique en Bretagne",
    internalLinks: ["aides-renovation-2026", "pompe-a-chaleur-air-eau-bretagne", "renovation-energetique-guide"],
    readTime: 6, category: "chauffage", priority: "moyenne", publishOrder: 13,
    targetPersona: "Propriétaire avec ballon électrique vétuste",
    featuredSnippetOpportunity: false,
    localKeywords: ["chauffe-eau thermodynamique Brest", "CET Rennes", "ballon thermodynamique Vannes", "chauffe-eau économique Quimper"],
  },
  {
    slug: "isolation-combles-perdus-ouate-cellulose",
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    keyword: "isolation combles perdus Bretagne",
    keywordVolume: "fort",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: ["ouate de cellulose Bretagne", "isolation soufflée combles", "MaPrimeRénov isolation", "isolation 1 euro fin"],
    seoTitle: "Isolation des combles perdus en Bretagne : ouate de cellulose ou laine de verre ?",
    metaDescription: "30% des déperditions par la toiture. Comparatif ouate de cellulose vs laine de verre vs laine de bois. Aides 2026 et entreprises certifiées Bretagne.",
    headings: [
      { h2: "Pourquoi isoler en priorité les combles", h3: ["Déperdition de 25 à 30% par la toiture", "ROI moyen 4 à 7 ans"] },
      { h2: "Comparatif des matériaux isolants", h3: ["Ouate de cellulose (recyclée, R=7)", "Laine de verre (R=7, économique)", "Laine de bois (biosourcée, R=6)"] },
      { h2: "Technique de pose : soufflage, déroulé, projeté", h3: ["Le soufflage : le plus utilisé", "Épaisseur minimale 30 cm pour atteindre R=7"] },
      { h2: "Aides 2026 et coûts moyens Bretagne" },
    ],
    cta: "Diagnostic isolation combles gratuit en Bretagne",
    internalLinks: ["isolation-thermique-guide", "aides-renovation-2026", "ponts-thermiques-solutions"],
    readTime: 7, category: "isolation", priority: "haute", publishOrder: 14,
    targetPersona: "Propriétaire avec combles non aménagés et facture chauffage élevée",
    featuredSnippetOpportunity: true,
    localKeywords: ["isolation combles Brest", "ouate cellulose Rennes", "isolation toiture Vannes", "combles perdus Quimper", "isolant biosourcé Bretagne"],
  },
  {
    slug: "ite-granit-bretagne",
    coverImage: "https://images.unsplash.com/photo-1556909114-44f86dabd5e2?w=800&q=80",
    keyword: "ITE Bretagne granit",
    keywordVolume: "faible",
    keywordDifficulty: "faible",
    keywordIntent: "informationnelle",
    secondaryKeywords: ["isolation extérieure maison granit", "ITE Bretagne ABF", "rénovation façade granit", "ITE bardage Bretagne"],
    seoTitle: "ITE en Bretagne : peut-on isoler par l'extérieur une maison en granit ?",
    metaDescription: "Maison en granit ou pierre apparente : faut-il faire une ITE ? Solutions techniques (bardage ventilé, enduit), avis ABF, alternatives ITI.",
    headings: [
      { h2: "Spécificités du bâti breton en granit", h3: ["Murs épais (40-60 cm), inertie thermique forte", "Pourquoi l'ITE classique est délicate"] },
      { h2: "Solutions techniques compatibles", h3: ["Bardage ventilé bois ou ardoise", "Enduit chaux + isolant biosourcé", "ITI (intérieur) si patrimoine sensible"] },
      { h2: "Architecte des Bâtiments de France (ABF) : quand l'avis est obligatoire" },
      { h2: "Coûts comparatifs et aides 2026" },
    ],
    cta: "Étude ITE/ITI personnalisée pour votre maison bretonne",
    internalLinks: ["isolation-thermique-guide", "renovation-energetique-guide", "ponts-thermiques-solutions"],
    readTime: 8, category: "isolation", priority: "moyenne", publishOrder: 15,
    targetPersona: "Propriétaire d'une maison ancienne en pierre apparente",
    featuredSnippetOpportunity: false,
    localKeywords: ["ITE granit Quimper", "isolation extérieure Vannes", "façade granit Saint-Brieuc", "rénovation pierre Lorient", "ITE Brest"],
  },
  {
    slug: "test-etancheite-air-infiltrometrie",
    coverImage: "https://images.unsplash.com/photo-1632935190508-bc4abd7b25b9?w=800&q=80",
    keyword: "test étanchéité à l'air maison",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "informationnelle",
    secondaryKeywords: ["test infiltrométrie", "Q4Pa-surf", "test blower door Bretagne", "fuites d'air maison ancienne"],
    seoTitle: "Test d'étanchéité à l'air : pourquoi le faire en Bretagne",
    metaDescription: "Le test infiltrométrie (blower door) repère les fuites d'air invisibles. Indispensable en Bretagne (vent + humidité). Tarif et obligations RT2012/RE2020.",
    headings: [
      { h2: "Qu'est-ce que l'étanchéité à l'air ?", h3: ["Le coefficient Q4Pa-surf", "Seuils RT2012 et RE2020"] },
      { h2: "Pourquoi c'est crucial en Bretagne", h3: ["Vent dominant 50 à 80 km/h en hiver", "Humidité extérieure infiltrée"] },
      { h2: "Déroulé du test : porte soufflante, fumigène, thermographie" },
      { h2: "Réparer les fuites : étanchéité menuiseries, ferme, traversées" },
    ],
    cta: "Demander un test étanchéité à l'air en Bretagne",
    internalLinks: ["ponts-thermiques-solutions", "menuiseries-fenetres-guide", "isolation-thermique-guide"],
    readTime: 6, category: "diagnostic", priority: "moyenne", publishOrder: 16,
    targetPersona: "Auto-constructeur ou propriétaire en rénovation BBC",
    featuredSnippetOpportunity: false,
    localKeywords: ["test étanchéité Brest", "infiltrométrie Rennes", "blower door Vannes", "test air maison Quimper"],
  },
  {
    slug: "renovation-longere-bretonne",
    coverImage: "https://images.unsplash.com/photo-1587502536263-1a3fd9b95e8c?w=800&q=80",
    keyword: "rénovation longère Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["rénover longère bretonne", "patrimoine bâti ancien Bretagne", "rénovation maison de pays", "longère granit toit ardoise"],
    seoTitle: "Rénover une longère bretonne : guide complet patrimoine et performance",
    metaDescription: "Longère typique : granit, ardoise, charpente bois. Comment rénover sans dénaturer ? Aides patrimoine + énergie 2026, retours d'expérience Bretagne.",
    headings: [
      { h2: "Caractéristiques techniques d'une longère bretonne", h3: ["Murs en granit (40-60 cm), peu de ponts thermiques massiques", "Charpente chêne ou châtaignier", "Couverture ardoise"] },
      { h2: "Diagnostic préalable : ce qu'il faut vérifier", h3: ["Humidité ascensionnelle", "État de la charpente (vrillette, capricorne)", "Mortier de chaux d'origine ?"] },
      { h2: "Stratégie de rénovation respectueuse du bâti", h3: ["Enduit chaux + isolant biosourcé", "Menuiseries bois sur mesure", "VMC double flux discrète"] },
      { h2: "Aides patrimoine + énergie 2026 cumulables" },
    ],
    cta: "Audit énergétique patrimoine pour votre longère bretonne",
    internalLinks: ["isolation-thermique-guide", "ite-granit-bretagne", "vmc-ventilation-bretagne"],
    readTime: 10, category: "renovation", priority: "haute", publishOrder: 17,
    targetPersona: "Propriétaire d'une longère ancienne en cours de rénovation",
    featuredSnippetOpportunity: false,
    localKeywords: ["rénovation longère Quimper", "longère Vannes", "patrimoine breton Brest", "maison de pays Lorient", "longère Saint-Brieuc"],
  },
  {
    slug: "dpe-fg-loi-climat-2026",
    coverImage: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
    keyword: "DPE F G interdiction location",
    keywordVolume: "fort",
    keywordDifficulty: "haute",
    keywordIntent: "informationnelle",
    secondaryKeywords: ["loi Climat passoires thermiques", "interdiction location G 2025", "DPE F 2028", "rénover passoire énergétique"],
    seoTitle: "DPE F et G : interdiction de location et obligation de rénover en 2026",
    metaDescription: "Loi Climat & Résilience : G interdits depuis 2025, F en 2028, E en 2034. Comment savoir si vous êtes concerné et quelles aides pour rénover.",
    headings: [
      { h2: "Le calendrier de la loi Climat & Résilience", h3: ["G+ : 2023", "G : 2025", "F : 2028", "E : 2034"] },
      { h2: "Comment savoir si votre bien est concerné" },
      { h2: "Combien coûte une rénovation F→D ou G→D ?", h3: ["Audit énergétique obligatoire", "Bouquet de travaux type", "Aides MaPrimeRénov Sérénité 2026"] },
      { h2: "Stratégies pour propriétaires bailleurs en Bretagne" },
    ],
    cta: "DPE gratuit + plan de rénovation pour sortir de F/G",
    internalLinks: ["dpe-diagnostic-performance", "renovation-energetique-guide", "aides-renovation-2026"],
    readTime: 9, category: "reglementation", priority: "haute", publishOrder: 18,
    targetPersona: "Bailleur ou vendeur d'un bien classé F ou G",
    featuredSnippetOpportunity: true,
    localKeywords: ["DPE F G Brest", "passoire thermique Rennes", "rénovation passoire Vannes", "loi Climat Bretagne", "DPE obligatoire Quimper"],
  },
  {
    slug: "audit-energetique-gratuit-bretagne",
    coverImage: "https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&q=80",
    keyword: "audit énergétique gratuit Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "transactionnelle",
    secondaryKeywords: ["audit énergétique obligatoire vente", "audit thermique Bretagne", "audit MaPrimeRénov 2026", "bilan énergie maison"],
    seoTitle: "Audit énergétique gratuit en Bretagne : comment ça marche ?",
    metaDescription: "L'audit énergétique BRH Habitat est gratuit, sans engagement et complet. Voici à quoi vous attendre, les aides 2026 et comment prendre rendez-vous.",
    headings: [
      { h2: "Audit énergétique vs DPE : quelle différence", h3: ["Le DPE est une photo", "L'audit propose des scénarios chiffrés"] },
      { h2: "Le déroulé d'un audit BRH en Bretagne", h3: ["Visite sur site (1h-2h)", "Modélisation thermique 3CL", "Restitution sous 7 jours"] },
      { h2: "Les scénarios proposés", h3: ["Bouquet 'budget maîtrisé'", "Bouquet 'BBC rénovation'", "Plan d'aides personnalisé"] },
      { h2: "Pourquoi BRH le propose gratuitement" },
    ],
    cta: "Réserver mon audit énergétique gratuit en Bretagne",
    internalLinks: ["dpe-diagnostic-performance", "dpe-fg-loi-climat-2026", "renovation-energetique-guide"],
    readTime: 5, category: "diagnostic", priority: "haute", publishOrder: 19,
    targetPersona: "Propriétaire en pré-projet de rénovation",
    featuredSnippetOpportunity: true,
    localKeywords: ["audit énergétique Brest", "audit thermique Rennes", "audit Vannes", "bilan énergie Quimper", "audit Saint-Brieuc", "audit Lorient"],
  },
  {
    slug: "couverture-ardoise-bretagne-entretien",
    coverImage: "https://images.unsplash.com/photo-1580687774429-74ee01ec5cda?w=800&q=80",
    keyword: "couverture ardoise Bretagne entretien",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["nettoyer toit ardoise", "ardoise espagnole vs ardoise Trélazé", "réparer ardoise cassée", "démoussage toit Bretagne"],
    seoTitle: "Couverture ardoise en Bretagne : entretien, démoussage et rénovation",
    metaDescription: "L'ardoise est l'identité du toit breton. Entretien, démoussage, remplacement, isolation par l'extérieur (sarking). Tarifs 2026 et couvreurs RGE.",
    headings: [
      { h2: "Pourquoi l'ardoise reste la référence en Bretagne", h3: ["Durée de vie 80-100 ans", "Résistance vent + sel marin", "Ardoise française vs espagnole"] },
      { h2: "Démoussage et entretien : tous les 5-10 ans", h3: ["Le risque de l'hydrofuge agressif", "Nettoyage manuel doux"] },
      { h2: "Réparer une fuite : ardoise cassée, solin, faîtage" },
      { h2: "Sarking : isoler la toiture par l'extérieur en gardant l'ardoise" },
    ],
    cta: "Diagnostic gratuit de votre toiture ardoise en Bretagne",
    internalLinks: ["toiture-renovation-bretagne", "isolation-combles-perdus-ouate-cellulose", "isolation-thermique-guide"],
    readTime: 7, category: "toiture", priority: "moyenne", publishOrder: 20,
    targetPersona: "Propriétaire d'une maison à toiture ardoise vieillissante",
    featuredSnippetOpportunity: false,
    localKeywords: ["ardoise Brest", "couvreur ardoise Rennes", "démoussage toit Vannes", "ardoise Quimper", "couverture Saint-Brieuc", "toit ardoise Lorient"],
  },
  {
    slug: "chauffage-bois-bretagne-granules-buches",
    coverImage: "https://images.unsplash.com/photo-1545158539-08c1ad4ed8b3?w=800&q=80",
    keyword: "chauffage bois Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["poêle granulés Bretagne", "chaudière bois Finistère", "pellets prix 2026", "chauffage écologique"],
    seoTitle: "Chauffage bois en Bretagne : poêle à granulés ou bûches ?",
    metaDescription: "La Bretagne dispose d'un fort gisement bois local. Poêle à granulés, à bûches, chaudière biomasse : guide complet, aides 2026, ROI réel.",
    headings: [
      { h2: "Le bois en Bretagne : circuit court", h3: ["Forêts bretonnes en expansion", "Marché du granulé local"] },
      { h2: "Poêle à granulés : étanche ou non, autonomie, rendement", h3: ["Modèle 6-8 kW pour maison 80-120 m²"] },
      { h2: "Poêle à bûches : tradition et autonomie d'achat" },
      { h2: "Chaudière biomasse : pour remplacer le fioul" },
      { h2: "Aides 2026 : MaPrimeRénov + CEE pour chauffage bois" },
    ],
    cta: "Devis poêle ou chaudière bois en Bretagne",
    internalLinks: ["aides-renovation-2026", "renovation-energetique-guide", "pompe-a-chaleur-air-eau-bretagne"],
    readTime: 8, category: "chauffage", priority: "moyenne", publishOrder: 21,
    targetPersona: "Propriétaire remplaçant le fioul ou cherchant l'appoint",
    featuredSnippetOpportunity: false,
    localKeywords: ["poêle granulés Brest", "chauffage bois Rennes", "poêle Vannes", "chaudière bois Quimper", "granulés Lorient"],
  },
  {
    slug: "combles-perdus-vs-amenageables",
    coverImage: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80",
    keyword: "combles perdus combles aménageables",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "informationnelle",
    secondaryKeywords: ["aménager combles Bretagne", "transformer grenier", "isolation rampants", "création surface habitable"],
    seoTitle: "Combles perdus ou aménageables : que choisir et comment isoler ?",
    metaDescription: "Vos combles peuvent gagner ou non en surface habitable. Guide pour décider, isoler les rampants, déclarer les travaux, en Bretagne.",
    headings: [
      { h2: "Combles perdus vs aménageables : critères de décision", h3: ["Hauteur sous faîtage > 1,80 m", "Pente toit > 30°", "Plancher porteur"] },
      { h2: "Isoler des combles perdus", h3: ["Soufflage ouate cellulose ou laine"] },
      { h2: "Isoler des combles aménageables", h3: ["Sarking par l'extérieur", "Entre chevrons + sous-rampants"] },
      { h2: "Déclaration de travaux et permis si > 20 m²" },
    ],
    cta: "Étude faisabilité combles aménageables en Bretagne",
    internalLinks: ["isolation-combles-perdus-ouate-cellulose", "couverture-ardoise-bretagne-entretien", "isolation-thermique-guide"],
    readTime: 6, category: "renovation", priority: "moyenne", publishOrder: 22,
    targetPersona: "Famille cherchant à agrandir sans construire",
    featuredSnippetOpportunity: false,
    localKeywords: ["aménagement combles Brest", "combles Rennes", "grenier aménagé Vannes", "combles habitables Quimper"],
  },
  {
    slug: "volets-roulants-solaires-bretagne",
    coverImage: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80",
    keyword: "volets roulants solaires",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["volet roulant photovoltaïque", "volet électrique sans fil", "volet solaire Bretagne", "remplacer volets battants"],
    seoTitle: "Volets roulants solaires en Bretagne : économies et confort",
    metaDescription: "Pas de tranchée, pas d'électricien, mise en place rapide. Les volets roulants solaires sont parfaits pour la rénovation. Guide et tarifs 2026.",
    headings: [
      { h2: "Comment fonctionne un volet roulant solaire", h3: ["Panneau intégré coffre", "Batterie 18-24 mois autonomie hivers bretons"] },
      { h2: "Installation : aucun raccordement réseau" },
      { h2: "Économies d'énergie : isolation thermique du coffre" },
      { h2: "Tarifs 2026 et marques recommandées" },
    ],
    cta: "Devis volets roulants solaires en Bretagne",
    internalLinks: ["menuiseries-fenetres-guide", "isolation-thermique-guide", "photovoltaique-autoconsommation-bretagne"],
    readTime: 5, category: "menuiserie", priority: "faible", publishOrder: 23,
    targetPersona: "Propriétaire en rénovation cherchant solution simple",
    featuredSnippetOpportunity: false,
    localKeywords: ["volet roulant Brest", "volet solaire Rennes", "volet électrique Vannes", "volets Quimper"],
  },
  {
    slug: "recuperation-eau-pluie-bretagne",
    coverImage: "https://images.unsplash.com/photo-1586981084886-bd17b8ce26db?w=800&q=80",
    keyword: "récupération eau de pluie Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "faible",
    keywordIntent: "mixte",
    secondaryKeywords: ["cuve eau de pluie", "récupérateur eau pluviale Bretagne", "économie eau jardin", "aide eau de pluie"],
    seoTitle: "Récupération d'eau de pluie en Bretagne : un climat idéal",
    metaDescription: "950 mm de pluie/an en moyenne en Bretagne : c'est 1 m³ par 1 m² de toit. Cuve enterrée ou hors-sol, usages, autorisations, ROI 5-7 ans.",
    headings: [
      { h2: "Le potentiel breton : 950 mm/an en moyenne", h3: ["Calcul : surface toit × pluviométrie × 0,9"] },
      { h2: "Cuve enterrée vs hors-sol : que choisir", h3: ["Béton, polyéthylène, acier"] },
      { h2: "Usages autorisés : arrosage, WC, lave-linge", h3: ["Réglementation arrêté 21 août 2008"] },
      { h2: "Coût d'installation et ROI Bretagne" },
    ],
    cta: "Demander un devis cuve eau de pluie en Bretagne",
    internalLinks: ["renovation-energetique-guide", "aides-renovation-2026"],
    readTime: 6, category: "ecologie", priority: "faible", publishOrder: 24,
    targetPersona: "Propriétaire avec jardin et conscience écologique",
    featuredSnippetOpportunity: false,
    localKeywords: ["récupérateur eau Brest", "cuve eau pluie Rennes", "eau pluviale Vannes", "récupération eau Quimper"],
  },
  {
    slug: "vmc-double-flux-vs-simple-flux",
    coverImage: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800&q=80",
    keyword: "VMC double flux ou simple flux",
    keywordVolume: "fort",
    keywordDifficulty: "moyenne",
    keywordIntent: "informationnelle",
    secondaryKeywords: ["VMC double flux thermodynamique", "VMC hygroréglable B", "comparatif VMC", "VMC silencieuse"],
    seoTitle: "VMC double flux vs simple flux : comment choisir en Bretagne ?",
    metaDescription: "Double flux 75-90% de récupération de chaleur, simple flux moins cher mais moins performant. Guide comparatif technique et coûts pour la Bretagne.",
    headings: [
      { h2: "Rappel : VMC simple flux autoréglable, hygro A/B" },
      { h2: "VMC double flux : principe et performance", h3: ["Échangeur 75-90%", "Filtration F7 anti-pollens", "Bypass été"] },
      { h2: "Coûts pose et entretien comparés" },
      { h2: "Pour quel logement breton recommander quoi ?" },
    ],
    cta: "Étude VMC personnalisée pour votre maison bretonne",
    internalLinks: ["vmc-ventilation-bretagne", "renovation-energetique-guide", "isolation-thermique-guide"],
    readTime: 7, category: "ventilation", priority: "moyenne", publishOrder: 25,
    targetPersona: "Propriétaire en rénovation avec ITE/ITI déjà prévue",
    featuredSnippetOpportunity: true,
    localKeywords: ["VMC double flux Brest", "VMC Rennes", "VMC Vannes", "VMC double flux Quimper", "ventilation Lorient"],
  },
  {
    slug: "renover-maison-1900-1948-bretagne",
    coverImage: "https://images.unsplash.com/photo-1564540583246-934409427776?w=800&q=80",
    keyword: "rénover maison ancienne Bretagne",
    keywordVolume: "moyen",
    keywordDifficulty: "moyenne",
    keywordIntent: "mixte",
    secondaryKeywords: ["rénovation maison 1930", "maison brique rouge Bretagne", "maison de bourg ancienne", "rénover sans dénaturer"],
    seoTitle: "Rénover une maison 1900-1948 en Bretagne sans la dénaturer",
    metaDescription: "Maison de ville en brique, parpaing creux ou pierre : guide complet de rénovation respectueuse pour les maisons bretonnes 1900-1948.",
    headings: [
      { h2: "Caractéristiques techniques des maisons 1900-1948", h3: ["Brique pleine ou parpaing creux non isolant", "Plancher bois sur solives", "Toiture ardoise simple"] },
      { h2: "Diagnostic préalable obligatoire", h3: ["Plomb (avant 1949)", "Amiante (avant 1997)", "Termites Finistère"] },
      { h2: "Stratégie thermique adaptée", h3: ["ITE bardage si possible", "Sinon ITI laine de bois", "VMC double flux compacte"] },
      { h2: "Aides et financement 2026" },
    ],
    cta: "Audit gratuit pour votre maison bretonne 1900-1948",
    internalLinks: ["isolation-thermique-guide", "renovation-longere-bretonne", "ite-granit-bretagne"],
    readTime: 10, category: "renovation", priority: "moyenne", publishOrder: 26,
    targetPersona: "Acquéreur récent d'une maison bourgeoise ou de ville",
    featuredSnippetOpportunity: false,
    localKeywords: ["rénovation maison ancienne Brest", "maison 1930 Rennes", "maison brique Vannes", "maison ancienne Quimper", "rénovation Saint-Brieuc"],
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
