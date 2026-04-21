/**
 * Verification SIRET via l'API officielle publique de l'Etat francais.
 * Source : https://recherche-entreprises.api.gouv.fr/
 * Gratuite, pas de cle API, donnees INSEE/SIRENE a jour.
 *
 * POST { siret: "41816609600069" }
 *   200 -> { ok: true, siret, siren, nom, adresse, code_postal, ville,
 *            naf, naf_libelle, categorie, etat, date_creation, dirigeants[] }
 *   400 -> { ok: false, error: "SIRET invalide" }
 *   404 -> { ok: false, error: "Entreprise non trouvee" }
 *   410 -> { ok: false, error: "Entreprise fermee", date_fermeture }
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'

function validSiretLuhn(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false
  // Algorithme de Luhn adapte SIRET (chaque 2eme chiffre double)
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let d = parseInt(siret[i], 10)
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return sum % 10 === 0
}

interface SireneResult {
  siren: string
  nom_complet: string
  nom_raison_sociale?: string
  categorie_entreprise?: string
  date_creation?: string
  date_fermeture?: string | null
  siege?: {
    siret: string
    adresse?: string
    numero_voie?: string
    type_voie?: string
    libelle_voie?: string
    code_postal?: string
    libelle_commune?: string
    activite_principale?: string
    etat_administratif?: string
    tranche_effectif_salarie?: string
  }
  etablissements_siege?: unknown
  dirigeants?: Array<{ nom?: string; prenoms?: string; qualite?: string; denomination?: string }>
}

const NAF_LIBELLES: Record<string, string> = {
  // Quelques libelles BTP courants. Sinon on retourne le code NAF brut.
  '41.20A': 'Construction de maisons individuelles',
  '41.20B': 'Construction d\'autres batiments',
  '43.22A': 'Travaux d\'installation d\'equipements thermiques',
  '43.22B': 'Travaux d\'installation d\'equipements sanitaires',
  '43.21A': 'Travaux d\'installation electrique',
  '43.31Z': 'Travaux de platrerie',
  '43.32A': 'Travaux de menuiserie bois',
  '43.32B': 'Travaux de menuiserie metallique',
  '43.32C': 'Agencement de lieux de vente',
  '43.33Z': 'Travaux de revetement des sols',
  '43.34Z': 'Travaux de peinture et vitrerie',
  '43.39Z': 'Autres travaux de finition',
  '43.91A': 'Travaux de charpente',
  '43.91B': 'Travaux de couverture',
  '43.99A': 'Travaux d\'etancheification',
  '43.99C': 'Travaux de maconnerie generale',
  '43.11Z': 'Travaux de demolition',
  '68.31Z': 'Agences immobilieres',
  '68.20B': 'Location de terrains',
  '71.11Z': 'Architecture',
  '71.12B': 'Ingenierie, etudes techniques',
  '70.22Z': 'Conseil en gestion',
  '66.19A': 'Courtier en operations de banque',
  '66.19B': 'Autres auxiliaires des services financiers',
  '74.90B': 'Apporteur d\'affaires',
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  // Rate limit : 20 verif SIRET / minute / IP (evite bruteforce)
  const rl = checkRateLimit(req, 'verify-siret', { maxRequests: 20, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ ok: false, error: 'Trop de verifications, reessayez dans 1 minute' }), {
      status: 429, headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  let siret: string
  try {
    const body = await req.json()
    siret = String(body.siret ?? '').replace(/\s/g, '')
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Body JSON invalide' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  if (!validSiretLuhn(siret)) {
    return new Response(JSON.stringify({ ok: false, error: 'SIRET invalide (14 chiffres, cle Luhn invalide)' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resp = await fetch(`${API_BASE}?q=${siret}&per_page=1`, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'BRH-Habitat-Verify-SIRET' },
    })
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'API SIRENE indisponible, reessayez' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const data = await resp.json() as { results: SireneResult[] }
    const results = data.results ?? []
    if (results.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Entreprise non trouvee avec ce SIRET' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const ent = results[0]
    const siege = ent.siege ?? {}
    const etat = siege.etat_administratif ?? 'A'

    if (etat === 'F') {
      return new Response(JSON.stringify({
        ok: false, error: 'Cette entreprise est fermee selon les registres officiels',
        date_fermeture: ent.date_fermeture,
      }), { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const naf = siege.activite_principale ?? null
    const dirigeants = (ent.dirigeants ?? []).slice(0, 3).map(d => ({
      nom: [d.prenoms, d.nom].filter(Boolean).join(' ').trim() || d.denomination || '',
      qualite: d.qualite ?? null,
    }))

    return new Response(JSON.stringify({
      ok: true,
      siret: siege.siret ?? siret,
      siren: ent.siren,
      nom: ent.nom_complet ?? ent.nom_raison_sociale ?? '',
      nom_raison_sociale: ent.nom_raison_sociale ?? ent.nom_complet ?? '',
      adresse: siege.adresse ?? '',
      code_postal: siege.code_postal ?? '',
      ville: siege.libelle_commune ?? '',
      naf,
      naf_libelle: naf ? (NAF_LIBELLES[naf] ?? naf) : null,
      categorie: ent.categorie_entreprise ?? null,
      tranche_effectif: siege.tranche_effectif_salarie ?? null,
      date_creation: ent.date_creation ?? null,
      etat: 'actif',
      dirigeants,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error && err.name === 'TimeoutError' ? 'API SIRENE : timeout' : 'Erreur lors de la verification'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 504, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
