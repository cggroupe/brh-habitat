/**
 * Phase 16.0.7 — Template charte partenariat agence immobilière.
 *
 * Template de base v1.0. À faire valider par avocat avant ouverture publique
 * (~1 500 €). Le RAG juridique BRH (port 8893) peut générer une variante
 * personnalisée par agence — branchement futur via EF `generate-agence-charte`.
 *
 * Modèle Hoguet "A" : BRH fournit des fiches d'opportunité scorées,
 * pas de mise en relation transactionnelle directe.
 */

export interface CharteVariables {
  agenceRaisonSociale: string
  agenceSiret?: string | null
  agenceAdresse?: string | null
  signerFullName: string
  signerEmail: string
  signerRole?: string | null
  tier: 'discovery' | 'standard' | 'premium' | 'expert'
  tierLabel: string
  monthlyQuota: number | null
  monthlyPrice: number
  signedAt: Date
}

const TIER_LABELS: Record<CharteVariables['tier'], string> = {
  discovery: 'Discovery (gratuit)',
  standard: 'Standard',
  premium: 'Premium',
  expert: 'Expert',
}

const TIER_PRICES: Record<CharteVariables['tier'], number> = {
  discovery: 0,
  standard: 390,
  premium: 990,
  expert: 2490,
}

const TIER_QUOTAS: Record<CharteVariables['tier'], number | null> = {
  discovery: 5,
  standard: 30,
  premium: 100,
  expert: null,
}

export function buildCharteVariables(
  agence: { raison_sociale: string; siret?: string | null; adresse?: string | null },
  signer: { full_name: string; email: string; role?: string | null },
  tier: CharteVariables['tier'],
): CharteVariables {
  return {
    agenceRaisonSociale: agence.raison_sociale,
    agenceSiret: agence.siret ?? null,
    agenceAdresse: agence.adresse ?? null,
    signerFullName: signer.full_name,
    signerEmail: signer.email,
    signerRole: signer.role ?? null,
    tier,
    tierLabel: TIER_LABELS[tier],
    monthlyQuota: TIER_QUOTAS[tier],
    monthlyPrice: TIER_PRICES[tier],
    signedAt: new Date(),
  }
}

/**
 * Génère le contenu Markdown de la charte. Stockée dans
 * `brh_partner_contracts.contract_content` au moment du signing
 * (snapshot, immutable même si le template évolue).
 */
export function generateCharteContent(v: CharteVariables): string {
  const dateFr = v.signedAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const quotaTxt = v.monthlyQuota === null ? 'illimité' : `${v.monthlyQuota} leads / mois`
  const priceTxt =
    v.monthlyPrice === 0 ? 'Gratuit' : `${v.monthlyPrice} € HT / mois`

  return `# Charte partenariat — Bretagne Rénovation Habitat

**Version du template** : 1.0 · **Date de signature** : ${dateFr}

## Parties

**Le fournisseur** :
- **Bretagne Rénovation Habitat** (BRH Habitat)
- 35 rue de Kervao, 29490 Guipavas
- Marque du groupe CG Groupe
- Email : relationsclients@contact-brh.fr

**Le partenaire agence immobilière** :
- **Raison sociale** : ${v.agenceRaisonSociale}
${v.agenceSiret ? `- **SIRET** : ${v.agenceSiret}` : ''}
${v.agenceAdresse ? `- **Siège** : ${v.agenceAdresse}` : ''}
- **Représentant signataire** : ${v.signerFullName}${v.signerRole ? ` (${v.signerRole})` : ''}
- **Email** : ${v.signerEmail}

## Objet

BRH Habitat exploite une base de données de logements F/G en Bretagne et un
algorithme propriétaire (Score Vente v1) qui estime la probabilité qu'un
propriétaire mette son bien en vente sous 6 mois. Le partenaire souscrit à
un service de mise à disposition de **fiches d'opportunité scorées**.

**IMPORTANT** : conformément au modèle Hoguet "A" (apport d'affaires non
régulé, hors carte T), BRH ne réalise aucune transaction immobilière, ne
met pas en relation directe propriétaire et agence, ne génère pas de
courriers en nom propre de l'agence. Le partenaire reste seul responsable
de la prise de contact et de la conformité de ses pratiques commerciales.

## Engagements du partenaire

1. **Volume mensuel** : ${quotaTxt}
2. **Tarif** : ${priceTxt} (palier ${v.tierLabel})
3. **Exclusivité** : chaque lead claim donne 30 jours d'exclusivité au
   partenaire. Aucune autre agence partenaire n'a accès au même lead durant
   cette période.
4. **Frequency cap** : maximum **2 tentatives de contact** par lead. Le
   partenaire s'engage à déclarer chaque tentative dans BRH (issue + notes).
5. **RGPD** : le partenaire s'engage à respecter le droit d'opposition Art. 21
   du RGPD. Tout propriétaire qui demande à ne plus être contacté doit l'être
   dans les **24 heures** suivant la notification BRH.
6. **Loi Hoguet** : le partenaire confirme détenir une carte professionnelle T
   en cours de validité et s'engage à respecter ses obligations
   (mandat écrit, garantie financière, RC pro).
7. **Audit aléatoire** : 5 % des leads contactés sont audités mensuellement.
   Le propriétaire reçoit un email post-contact pour valider la conformité.
   3 plaintes confirmées entraînent suspension du compte.
8. **Pas de revente** : les leads sont strictement réservés à l'usage interne
   du partenaire. Toute revente, partage ou export en masse est interdit et
   constitue un motif de résiliation immédiate avec dommages.

## Engagements de BRH Habitat

1. Mise à disposition d'une plateforme dédiée \`/agence\`
2. Algorithme de scoring v1 transparent (13 règles documentées, accessibles
   dans l'interface)
3. Anti-doublon automatique inter-agences partenaires
4. Page d'opt-out publique \`/opt-out\` permettant aux propriétaires de
   demander la suppression de leur fiche sous 30 jours (Art. 21 RGPD)
5. Mise à jour mensuelle du scoring sur les nouvelles données ADEME / DVF
6. Support technique : relationsclients@contact-brh.fr

## Tarification et résiliation

- Renouvellement mensuel automatique au tarif en vigueur
- Résiliation : sur simple demande email, prend effet à la fin du mois en cours
- En cas de manquement aux articles 4-7 du présent contrat, BRH peut
  suspendre l'accès sans préavis ni remboursement

## Données personnelles (RGPD)

- **Responsable du traitement** : BRH Habitat
- **Base légale** : intérêt légitime (Art. 6.1.f RGPD) pour le scoring
  et exécution contractuelle pour la mise à disposition au partenaire
- **Destinataires** : partenaires sous contrat de la zone géographique concernée
- **Durée de conservation** : 3 ans après le dernier contact, puis anonymisation
- **Droits** : opposition, accès, rectification, suppression, portabilité.
  Page \`renovation-brh.fr/opt-out\` ou par email à rgpd@contact-brh.fr.
- **DPIA** : étude d'impact en cours de finalisation (consultation DPO)

## Loi applicable

Loi française. Tribunal de commerce de Brest pour tout litige.

---

**Pour signer électroniquement, le partenaire coche les 3 cases ci-dessous,
saisit son email et reçoit un lien de confirmation.**

Référence template : \`v1.0\` · Hash : signature horodatée + IP enregistrée
au moment du signing (preuve eIDAS).
`
}

/**
 * Liste des engagements résumés (UI cases à cocher avant signature).
 */
export const CHARTE_ENGAGEMENTS_RESUME = [
  {
    key: 'consent_terms',
    label: 'J\'accepte la charte partenariat dans son intégralité',
    detail: 'Modèle Hoguet "A", quota mensuel, frequency cap 2 tentatives, audit aléatoire 5 %.',
  },
  {
    key: 'consent_data',
    label: 'Je m\'engage à respecter le RGPD et la loi Hoguet',
    detail: 'Carte T en cours de validité, opt-out propriétaire sous 24h, pas de revente leads.',
  },
  {
    key: 'consent_communications',
    label: 'J\'accepte de recevoir les notifications du service BRH',
    detail: 'Nouveaux leads disponibles, rappels charte, audits, alertes opt-out.',
  },
] as const
