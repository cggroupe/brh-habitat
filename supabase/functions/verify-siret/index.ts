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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function validSiretFormat(siret: string): boolean {
  // Verifie juste que c'est 14 chiffres. L'API INSEE decide de la validite reelle.
  // (le Luhn echoue sur des cas legitimes : La Poste, certains SIRET etrangers,
  // etablissements recents non encore syncs...)
  return /^\d{14}$/.test(siret)
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

  if (!validSiretFormat(siret)) {
    return new Response(JSON.stringify({ ok: false, error: 'Le SIRET doit contenir exactement 14 chiffres' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Retry avec backoff expo sur 429 (rate limit public de l'API gouv)
  async function fetchWithRetry(): Promise<Response> {
    const MAX = 3
    const delays = [0, 600, 1800] // ms
    let lastResp: Response | null = null
    for (let attempt = 0; attempt < MAX; attempt++) {
      if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]))
      lastResp = await fetch(`${API_BASE}?q=${siret}&per_page=1`, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'BRH-Habitat/1.0 (+https://brh-habitat.vercel.app)' },
      })
      if (lastResp.status !== 429) return lastResp
    }
    return lastResp!
  }

  try {
    const resp = await fetchWithRetry()
    if (resp.status === 429) {
      return new Response(JSON.stringify({ ok: false, error: 'L\'annuaire des entreprises est temporairement sature. Reessayez dans 30 secondes.' }), {
        status: 429, headers: { ...cors, 'Retry-After': '30', 'Content-Type': 'application/json' },
      })
    }
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, error: `L'annuaire a renvoye HTTP ${resp.status}. Reessayez.` }), {
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

    // Check si deja enregistree dans BRH (pour UX : eviter un signup qui va echouer sur le duplicate)
    let alreadyRegistered = false
    let existingOwnerEmail: string | null = null
    if (SERVICE_KEY && SUPABASE_URL) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: existing } = await admin
        .from('brh_companies')
        .select('id, name, owner_id')
        .eq('siret', siege.siret ?? siret)
        .maybeSingle()
      if (existing) {
        alreadyRegistered = true
        // On ne revele pas l'email complet pour privacy, juste un hint
        const { data: ownerProfile } = await admin.from('profiles').select('email').eq('id', existing.owner_id).maybeSingle()
        if (ownerProfile?.email) {
          const [local, domain] = ownerProfile.email.split('@')
          existingOwnerEmail = local.slice(0, 2) + '***@' + domain
        }
      }
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
      already_registered: alreadyRegistered,
      existing_owner_hint: existingOwnerEmail,
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error && err.name === 'TimeoutError' ? 'API SIRENE : timeout' : 'Erreur lors de la verification'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 504, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
