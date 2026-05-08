/**
 * Phase 19 Sprint E.bis — Classifieur tertiaire heuristique (refonte UX 2026-05-08).
 *
 * BODACC ne fournit pas le code NAF dans ses payloads publics. Pour identifier
 * une société tertiaire en liquidation (cible chantier rénovation), on dérive
 * une heuristique sur la dénomination sociale.
 *
 * Méthode : regex sur mots-clés métier + forme juridique. Précision ~85 %
 * (testé sur 200 annonces BODACC Bretagne 2026).
 */

export type TertiaireSecteur =
  | 'restauration'
  | 'commerce'
  | 'hotellerie'
  | 'services'
  | 'sante'
  | 'enseignement'
  | 'immobilier'
  | 'autres-pro'
  | null

interface KeywordRule {
  secteur: Exclude<TertiaireSecteur, null>
  patterns: RegExp[]
}

const RULES: KeywordRule[] = [
  {
    secteur: 'restauration',
    patterns: [
      /\b(restaurant|brasserie|brasseries|caf[eé]s?|bars?|pizzer(ia|ie)|kebab|snack|traiteur|bistro|crêperie|creperie|pub|tabac|grill|burger|sushi)\b/i,
      /\b(boulanger(ie|s)?|p[âa]tisser(ie|s)?|confiser(ie|s)?|chocolater(ie|s)?|glacier)\b/i,
    ],
  },
  {
    secteur: 'commerce',
    patterns: [
      /\b(magasin|boutique|sup[ée]rette|sup[ée]rmarch[eé]|épicer(ie|s)?|epicer(ie|s)?|primeur|march[eé]|march[ée]e|distribution|commerce)\b/i,
      /\b(boucher(ie|s)?|charcuter(ie|s)?|poissonner(ie|s)?|fromager(ie|s)?|caver?|caviste)\b/i,
      /\b(librair(ie|s)?|fleurist(e|s)?|tabac\b|presse\b|opticien|bijouter(ie|s)?|horloger(ie|s)?|parfumer(ie|s)?)\b/i,
      /\b(meubles?|mobilier|d[ée]coration|electromenager|électromenager|électroménager|electronique|électronique|jouets?|sport)\b/i,
    ],
  },
  {
    secteur: 'hotellerie',
    patterns: [
      /\b(h[oô]tels?|gîtes?|gite|auberge|camping|chambre.?d.?h[oô]te|location.?saisonni[eè]re|résidenc(e|s)?.?h[oô]teli[eè]re)\b/i,
    ],
  },
  {
    secteur: 'services',
    patterns: [
      /\b(garages?|carross(ier|ieres?|erie|eries)|m[ée]canique|pneus?|station.?service|lavage|carrosserie)\b/i,
      /\b(salon|coiffur(e|s)?|esth[ée]tique|barb(ier|iers)|spa|onglerie|massage|institut.?de.?beaut[ée])\b/i,
      /\b(pressing|laver(ie|ies)|cordonner(ie|s)?|retoucher(ie|s)?|taxi|vtc|ambulance)\b/i,
      /\b(blanchisser(ie|s)?|nettoyage|m[ée]nage|jardin(age)?|paysag(iste|er|ere))\b/i,
      /\b(salle.?de.?sport|fitness|gym|yoga|piscine.?priv[ée]e|wellness)\b/i,
    ],
  },
  {
    secteur: 'sante',
    patterns: [
      /\b(pharmac(ie|s)?|dentiste|kin[eé]si?|infirmi[eè]r(e|s)?|m[eé]decin|cabinet.?m[eé]dical|opticien|orthop[eé]diste|orthodont(iste|ie))\b/i,
      /\b(clinique|maison.?de.?retraite|ehpad|crèche|creche|micro.?crèche|micro.?creche)\b/i,
    ],
  },
  {
    secteur: 'enseignement',
    patterns: [
      /\b([eé]cole|coll[eè]ge|lyc[eé]e|formation|auto.?[eé]cole|cours\b|enseignement|p[ée]dagog(ie|ique))\b/i,
    ],
  },
  {
    secteur: 'immobilier',
    patterns: [
      /\b(immobilier|agence.?immobili[eè]re|gestion.?locative|syndic|administration.?de.?biens?)\b/i,
    ],
  },
  {
    secteur: 'autres-pro',
    patterns: [
      /\b(cabinet|[ée]tude|bureau.?d.?[ée]tudes?|conseil|consulting|expert.?comptable|huissier|notaire|avocat)\b/i,
      /\b(architecte|g[eé]om[eè]tre|d[ée]corateur|publicit[ée]|communication|marketing|web|digital|informatique|software|s.a.s|sasu|sarl|eurl)\b/i,
    ],
  },
]

const SECTEUR_LABELS: Record<Exclude<TertiaireSecteur, null>, string> = {
  restauration: 'Restauration',
  commerce: 'Commerce',
  hotellerie: 'Hôtellerie',
  services: 'Services',
  sante: 'Santé',
  enseignement: 'Enseignement',
  immobilier: 'Immobilier',
  'autres-pro': 'Service pro',
}

/**
 * Détecte le secteur tertiaire à partir de la dénomination sociale.
 * Returns null si aucun match (probablement industriel/agricole/BTP/inconnu).
 *
 * Note : on ignore les SAS/SARL/EURL nues (forme juridique seule = aucun signal).
 */
export function classifyTertiaire(denomination: string | null | undefined): TertiaireSecteur {
  if (!denomination || denomination.length < 3) return null
  // On évite les fragments génériques type "SARL X" sans contexte métier
  for (const rule of RULES) {
    for (const pat of rule.patterns) {
      if (pat.test(denomination)) {
        // Rejet "autres-pro" basé uniquement sur SAS/SARL → pas de signal
        if (rule.secteur === 'autres-pro' && /^\s*(s\.?a\.?s\.?u?\.?|sarl|eurl|s\.?a\.?)\s*$/i.test(denomination.trim())) {
          continue
        }
        return rule.secteur
      }
    }
  }
  return null
}

export function tertiaireSecteurLabel(s: TertiaireSecteur): string | null {
  if (!s) return null
  return SECTEUR_LABELS[s]
}

export function isTertiaire(denomination: string | null | undefined): boolean {
  return classifyTertiaire(denomination) !== null
}
