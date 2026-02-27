// Static articles data for the blog
// In production, these would come from Supabase brh_articles table
// For now, we use static metadata (content loaded from markdown files)

export interface ArticleData {
  slug: string
  title: string
  excerpt: string
  category: string
  readTime: number
  author: string
  date: string
  seoTitle: string
  seoDescription: string
}

export const articles: ArticleData[] = [
  {
    slug: 'problemes-humidite-bretagne',
    title: 'Humidite dans la maison en Bretagne : causes et solutions durables',
    excerpt: 'Condensation, remontees capillaires, infiltrations : identifiez la source de l\'humidite dans votre maison bretonne et decouvrez les solutions adaptees.',
    category: 'humidite',
    readTime: 10,
    author: 'BRH',
    date: '2026-02-01',
    seoTitle: 'Humidite maison Bretagne : causes et solutions | BRH',
    seoDescription: 'Condensation, remontees capillaires, infiltrations : identifiez et traitez les problemes d\'humidite dans votre maison bretonne.',
  },
  {
    slug: 'isolation-thermique-guide',
    title: 'Isolation thermique : le guide complet pour votre maison',
    excerpt: 'Combles, murs, planchers : tout savoir sur l\'isolation thermique, les materiaux, les performances et les aides financieres disponibles.',
    category: 'isolation',
    readTime: 10,
    author: 'BRH',
    date: '2026-02-03',
    seoTitle: 'Guide isolation thermique maison | BRH Bretagne',
    seoDescription: 'Guide complet isolation thermique : combles, murs, planchers. Materiaux, performances R et U, aides MaPrimeRenov.',
  },
  {
    slug: 'ponts-thermiques-solutions',
    title: 'Ponts thermiques : comment les detecter et les traiter',
    excerpt: 'Les ponts thermiques sont responsables de 5 a 25% des deperditions energetiques. Apprenez a les identifier et a les traiter efficacement.',
    category: 'isolation',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-05',
    seoTitle: 'Ponts thermiques : detection et solutions | BRH',
    seoDescription: 'Ponts thermiques : comment les detecter avec la thermographie et les traiter. Guide pratique par BRH Bretagne.',
  },
  {
    slug: 'vmc-ventilation-bretagne',
    title: 'VMC en Bretagne : pourquoi une bonne ventilation est essentielle',
    excerpt: 'Simple flux, double flux, hygroreglable : quel systeme de VMC choisir pour votre habitat breton ? Guide complet avec aides financieres.',
    category: 'ventilation',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-07',
    seoTitle: 'VMC Bretagne : guide ventilation maison | BRH',
    seoDescription: 'VMC simple flux, double flux ou hygroreglable ? Guide pour choisir la bonne ventilation en Bretagne. Aides et entretien.',
  },
  {
    slug: 'renovation-energetique-guide',
    title: 'Renovation energetique : par ou commencer ? Le guide etape par etape',
    excerpt: 'DPE, audit energetique, ordre des travaux, aides 2026 : tout ce qu\'il faut savoir pour reussir sa renovation energetique.',
    category: 'renovation',
    readTime: 11,
    author: 'BRH',
    date: '2026-02-09',
    seoTitle: 'Guide renovation energetique 2026 | BRH Bretagne',
    seoDescription: 'Par ou commencer sa renovation energetique ? Guide complet : audit, ordre des travaux, aides 2026, choix des artisans.',
  },
  {
    slug: 'aides-renovation-2026',
    title: 'Aides a la renovation 2026 : MaPrimeRenov, CEE et eco-PTZ',
    excerpt: 'MaPrimeRenov, CEE, eco-PTZ, TVA 5.5% : toutes les aides financieres pour la renovation energetique en 2026 et comment en beneficier.',
    category: 'aides',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-11',
    seoTitle: 'Aides renovation 2026 : MaPrimeRenov, CEE, eco-PTZ | BRH',
    seoDescription: 'Guide complet des aides renovation 2026 : MaPrimeRenov, CEE, eco-PTZ, TVA 5.5%. Conditions et montants.',
  },
  {
    slug: 'toiture-renovation-bretagne',
    title: 'Entretien et renovation de toiture en climat breton',
    excerpt: 'Ardoises, tuiles, mousse, fuites : comment entretenir et renover votre toiture face aux intemperies bretonnes.',
    category: 'toiture',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-13',
    seoTitle: 'Renovation toiture Bretagne : entretien et reparation | BRH',
    seoDescription: 'Toiture en Bretagne : materiaux adaptes, signes d\'usure, entretien et renovation. Guide par BRH Guipavas.',
  },
  {
    slug: 'menuiseries-fenetres-guide',
    title: 'Changer ses fenetres : performances, materiaux et aides',
    excerpt: 'PVC, aluminium ou bois ? Double ou triple vitrage ? Tout savoir pour bien choisir ses fenetres et beneficier des aides.',
    category: 'menuiseries',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-15',
    seoTitle: 'Changer ses fenetres : guide choix et aides | BRH',
    seoDescription: 'Guide complet pour changer ses fenetres : performances Uw/Sw, PVC vs alu vs bois, double vitrage, aides 2026.',
  },
  {
    slug: 'dpe-diagnostic-performance',
    title: 'Comprendre le DPE et ameliorer la note de votre logement',
    excerpt: 'Classes A a G, obligations de location, travaux les plus efficaces : tout sur le Diagnostic de Performance Energetique.',
    category: 'renovation',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-17',
    seoTitle: 'DPE : comprendre et ameliorer sa note | BRH Bretagne',
    seoDescription: 'Comprendre le DPE : classes energetiques, obligations, et travaux pour ameliorer la note de votre logement.',
  },
  {
    slug: 'mise-aux-normes-electriques',
    title: 'Mise aux normes electriques : quand et pourquoi renover',
    excerpt: 'Tableau ancien, prises sans terre, disjoncteur qui saute : quand faut-il refaire son installation electrique ?',
    category: 'electricite',
    readTime: 9,
    author: 'BRH',
    date: '2026-02-19',
    seoTitle: 'Mise aux normes electriques maison | BRH Bretagne',
    seoDescription: 'Quand et pourquoi renover son installation electrique ? Norme NF C 15-100, signes d\'alerte, budget.',
  },
]

export function getArticleBySlug(slug: string): ArticleData | undefined {
  return articles.find((a) => a.slug === slug)
}

export function getArticlesByCategory(category: string): ArticleData[] {
  return articles.filter((a) => a.category === category)
}

export const categories = [
  { id: 'all', label: 'Tous' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'ventilation', label: 'Ventilation' },
  { id: 'humidite', label: 'Humidite' },
  { id: 'toiture', label: 'Toiture' },
  { id: 'electricite', label: 'Electricite' },
  { id: 'renovation', label: 'Renovation' },
  { id: 'menuiseries', label: 'Menuiseries' },
  { id: 'aides', label: 'Aides' },
]
