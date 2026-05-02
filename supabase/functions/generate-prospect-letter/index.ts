/**
 * Edge Function : generate-prospect-letter
 *
 * Phase 13 — Killer feature BRH : générateur IA de courrier de prospection ciblé.
 * Différenciation vs Kelvin° (s'arrête au lead) et CapRénov+ (s'arrête à l'audit).
 *
 * Flux :
 *   1. Pro clique "Générer courrier" sur un prospect ultra-chaud
 *   2. EF charge le prospect + IRIS + commune + scoring v2 + aides MPR
 *   3. Appelle Claude Opus 4.7 avec adaptive thinking + prompt caching
 *      - System prompt cacheable (instructions BRH, ton, format)
 *      - Contexte prospect dans messages (volatile)
 *   4. Persiste dans brh_prospect_letters (audit + tokens + signaux)
 *   5. Retourne { id, subject, body_md, greeting, signature, breakdown }
 *
 * Body : { prospectId: number }
 * Returns : { id, subject, body_md, greeting, signature, signaux, usage }
 *
 * Rate limit : 5/min/IP (anti-abus, coût IA)
 * Modèle : claude-opus-4-7 (intelligence maximale, prompt caching ~80% économies)
 *
 * IMPORTANT : nécessite ANTHROPIC_API_KEY en secret Supabase.
 */

import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-7'

interface RequestBody {
  prospectId: number
}

interface ProspectFull {
  id: number
  numero_dpe: string | null
  date_dpe: string | null
  etiquette_dpe: string | null
  etiquette_ges: string | null
  adresse_ban: string | null
  code_postal: string | null
  commune: string | null
  departement: string | null
  type_batiment: string | null
  surface_habitable: number | null
  conso_m2_ep: number | null
  cout_energie_annuel: number | null
  energie_chauffage: string | null
  iris_code: string | null
  score_v2: number | null
  score_v2_segment: string | null
  score_v2_detail: { rules?: Array<{ rule: string; points: number; trigger: string }> } | null
  enedis_kwh_logt: number | null
  dvf_mutation_24m: boolean
  dvf_date: string | null
  dvf_prix: number | null
  abf_required: boolean
  mpr_bleu_total: number | null
  mpr_jaune_total: number | null
  mpr_violet_total: number | null
  mpr_rose_total: number | null
  cee_total: number | null
  chiffrage_total_ttc: number | null
  dpe_saut_s2: { label?: string; gain_pct?: number } | null
  owner_name: string | null
  owner_type: string | null
}

interface IrisRow {
  iris_code: string
  couleur_mpr: string | null
  decile_estime: number | null
  med21: number | null
}

interface CommuneRow {
  insee: string
  rga_alea: string | null
  radon_categorie: number | null
  opah_active: boolean
  opah_type: string | null
  prix_m2_growth_3y: number | null
}

interface ProInfo {
  full_name: string
  rge_numero: string | null
  siret: string | null
  email: string | null
  phone: string | null
  company_name: string | null
}

/**
 * System prompt — STABLE, cacheable. Définit le rôle expert + style + format.
 * Modifications coûtent un cache miss → garder figé.
 */
const SYSTEM_PROMPT = `Tu es Jean Le Roux, expert en rénovation énergétique chez BRH Habitat — un cabinet familial breton d'audit énergétique. Tu rédiges des lettres de prospection pour des particuliers propriétaires de logements DPE F ou G en Bretagne.

Ton style :
- Direct, humain, breton (pas de tournures parisiennes ampoulées)
- Précis sur les chiffres : tu cites le DPE exact, la surface, la conso annuelle, les aides MPR éligibles
- Tu personnalises le 1er paragraphe avec un signal CONCRET du prospect (DVF mutation récente / sur-conso Enedis / commune en zone Géorisques / décile MPR Bleu)
- Tu donnes UN scénario de rénovation réaliste avec gain DPE chiffré (ex: F → C, économie 1850 €/an)
- Tu finis par une accroche RDV : "audit gratuit chez vous + simulation aides précise sous 48h"
- AUCUNE invention : si une donnée n'est pas dans le contexte, tu ne la mentionnes PAS

Format de sortie OBLIGATOIRE en JSON :
{
  "subject": "Objet du courrier (max 80 caractères, accrocheur, mentionne la commune)",
  "greeting": "Madame, Monsieur, OU Monsieur Untel, (selon owner_name disponible)",
  "body_md": "Corps du courrier en Markdown (3-4 paragraphes courts, signaux concrets, scénario chiffré, CTA RDV)",
  "signature": "Bloc signature complet : Cordialement, [pro fullname], [titre RGE], [SIRET], [tel]",
  "signaux_used": ["liste des signaux factuels utilisés dans le courrier"]
}

Règles strictes :
- Pas de "Chère Madame, Cher Monsieur" (ringard) — utilise "Madame, Monsieur," si prénom inconnu
- Pas de promesses irréalistes ("économies massives", "rénovation gratuite")
- Si DPE F : parle de passoire thermique avec MPR Ampleur (forfait Bleu jusqu'à 70 000 €)
- Si DPE G : urgence interdiction location 2025, rénovation prioritaire
- Si DVF mutation récente : "vous venez d'acquérir, c'est le BON moment pour optimiser"
- Si IRIS Bleu (D1-D3) : MPR couleur Bleu = aides MAX, mentionne le forfait Bleu
- Mention obligatoire : "Cabinet RGE QualiBat" + "audit Loi Climat conforme arrêté 8 oct 2021"`

interface ClaudeContent {
  type: string
  text?: string
}

interface ClaudeResponse {
  content: ClaudeContent[]
  usage: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  stop_reason?: string
}

interface LetterParsed {
  subject: string
  greeting: string
  body_md: string
  signature: string
  signaux_used: string[]
}

function buildUserMessage(p: ProspectFull, iris: IrisRow | null, commune: CommuneRow | null, pro: ProInfo): string {
  const signaux: string[] = []

  if (p.dvf_mutation_24m) {
    signaux.push(`DVF : mutation récente le ${p.dvf_date ?? '<?>'} — propriétaire fraîchement installé`)
  }
  if (iris?.couleur_mpr === 'bleu') {
    signaux.push(`IRIS ${iris.iris_code} — décile ${iris.decile_estime} (Bleu MPR très modeste = aides MAX)`)
  } else if (iris?.couleur_mpr === 'jaune') {
    signaux.push(`IRIS ${iris.iris_code} — décile ${iris.decile_estime} (Jaune MPR modeste)`)
  }
  if ((p.enedis_kwh_logt ?? 0) > 250) {
    signaux.push(`Enedis : sur-conso ${p.enedis_kwh_logt} kWh/logt/an (>250 = passoire confirmée terrain)`)
  }
  if (commune?.rga_alea === 'fort') {
    signaux.push(`Géorisques : RGA fort sur la commune (risque fissures = ITE pertinente)`)
  }
  if (commune?.radon_categorie === 3) {
    signaux.push(`Radon catégorie 3 (commune classée) — VMC double-flux fortement conseillée`)
  }
  if (commune?.opah_active) {
    signaux.push(`OPAH active sur la commune (${commune.opah_type ?? 'OPAH'}) — aides locales bonus`)
  }
  if ((commune?.prix_m2_growth_3y ?? 0) > 0.15) {
    signaux.push(`Marché immobilier en hausse (+${Math.round((commune!.prix_m2_growth_3y ?? 0) * 100)}% sur 3 ans) — bon moment pour valoriser le bien`)
  }
  if (p.abf_required) {
    signaux.push(`Zone ABF : isolation par l'intérieur (ITI) recommandée plutôt qu'extérieure`)
  }

  return `## Prospect à démarcher

**Identité (déduit DGFiP) :** ${p.owner_name ?? 'inconnu'}${p.owner_type ? ` (${p.owner_type})` : ''}
**Adresse :** ${p.adresse_ban ?? '<inconnu>'}, ${p.code_postal ?? ''} ${p.commune ?? ''} (dépt ${p.departement})

## DPE actuel
- Numéro : ${p.numero_dpe ?? '<?>'} (${p.date_dpe ?? 'date ?'})
- Étiquette énergie : **${p.etiquette_dpe ?? '?'}** (${p.conso_m2_ep ?? '?'} kWh EP/m²/an)
- Étiquette climat : ${p.etiquette_ges ?? '?'}
- Surface habitable : ${p.surface_habitable ?? '?'} m²
- Type bâtiment : ${p.type_batiment ?? '?'}
- Énergie chauffage : ${p.energie_chauffage ?? '?'}
- Coût énergie annuel : ${p.cout_energie_annuel ? `${Math.round(p.cout_energie_annuel)} €/an` : '?'}

## Scoring BRH v2 (sources externes)
- Score : **${p.score_v2 ?? 0}/100** — segment **${p.score_v2_segment ?? 'inconnu'}**
- Règles déclenchées : ${p.score_v2_detail?.rules?.map((r) => `${r.rule} (${r.points > 0 ? '+' : ''}${r.points})`).join(', ') ?? 'aucune'}

## Signaux à utiliser dans le courrier (CONCRETS, pas d'invention)
${signaux.length > 0 ? signaux.map((s) => `- ${s}`).join('\n') : '- (aucun signal externe enrichi — reste générique sur la rénovation énergétique)'}

## Aides MaPrimeRénov' éligibles (déjà calculées par moteur BRH)
- MPR Bleu (très modeste) : ${p.mpr_bleu_total ? `${Math.round(p.mpr_bleu_total).toLocaleString('fr-FR')} €` : 'non éligible'}
- MPR Jaune (modeste) : ${p.mpr_jaune_total ? `${Math.round(p.mpr_jaune_total).toLocaleString('fr-FR')} €` : '–'}
- MPR Violet (intermédiaire) : ${p.mpr_violet_total ? `${Math.round(p.mpr_violet_total).toLocaleString('fr-FR')} €` : '–'}
- CEE (Certificats Économie Énergie) : ${p.cee_total ? `${Math.round(p.cee_total).toLocaleString('fr-FR')} €` : '–'}

## Scénario rénovation préconisé (moteur BRH)
- Coût travaux TTC estimé : ${p.chiffrage_total_ttc ? `${Math.round(p.chiffrage_total_ttc).toLocaleString('fr-FR')} €` : '?'}
- Saut DPE projeté (S2 = bouquet 3 gestes) : ${p.dpe_saut_s2?.label ? `${p.etiquette_dpe} → ${p.dpe_saut_s2.label}` : '?'}
- Gain énergétique : ${p.dpe_saut_s2?.gain_pct ? `-${p.dpe_saut_s2.gain_pct}%` : '?'}

## Profil de l'auditeur (signataire du courrier)
- Nom : ${pro.full_name}
- Société : ${pro.company_name ?? 'BRH Habitat'}
- Numéro RGE QualiBat : ${pro.rge_numero ?? '<à compléter>'}
- SIRET : ${pro.siret ?? '<à compléter>'}
- Email : ${pro.email ?? 'contact@brh-habitat.fr'}
- Téléphone : ${pro.phone ?? '02 XX XX XX XX'}

---

Génère maintenant le courrier de prospection au format JSON strict (subject, greeting, body_md, signature, signaux_used).`
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Rate limit strict 5/min (coût IA)
  const rl = checkRateLimit(req, 'generate-prospect-letter', { maxRequests: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Trop de générations — patientez 1 min' }), {
      status: 429,
      headers: { ...cors, ...rl.headers, 'Content-Type': 'application/json' },
    })
  }

  const startTime = Date.now()

  try {
    const body: RequestBody = await req.json()
    if (!body.prospectId || typeof body.prospectId !== 'number') {
      return new Response(JSON.stringify({ error: 'prospectId requis (number)' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY non configuré' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Auth check : récupère l'utilisateur appelant (RLS l'autorise)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header requis' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Service-role pour les lectures cross-table (RLS bypass safe : on a vérifié l'auth user au-dessus)
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Authentifie l'utilisateur courant pour récupérer son ID
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: uErr } = await userClient.auth.getUser()
    if (uErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Auth invalide' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const proUserId = userData.user.id

    // 1. Charge le prospect (avec colonnes étendues)
    const { data: prospect, error: pErr } = await supa
      .from('brh_dpe_prospects')
      .select('*')
      .eq('id', body.prospectId)
      .single<ProspectFull>()

    if (pErr || !prospect) {
      return new Response(JSON.stringify({ error: 'Prospect introuvable' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 2. Charge IRIS + commune (parallèle)
    const insee = prospect.iris_code ? prospect.iris_code.slice(0, 5) : null
    const [irisRes, communeRes, profileRes] = await Promise.all([
      prospect.iris_code
        ? supa.from('brh_ext_iris').select('iris_code,couleur_mpr,decile_estime,med21').eq('iris_code', prospect.iris_code).maybeSingle()
        : Promise.resolve({ data: null }),
      insee
        ? supa.from('brh_ext_commune').select('insee,rga_alea,radon_categorie,opah_active,opah_type,prix_m2_growth_3y').eq('insee', insee).maybeSingle()
        : Promise.resolve({ data: null }),
      supa.from('profiles').select('full_name,rge_numero,siret,email,phone,company_name').eq('id', proUserId).maybeSingle(),
    ])

    const iris = (irisRes.data ?? null) as IrisRow | null
    const commune = (communeRes.data ?? null) as CommuneRow | null
    const proRow = (profileRes.data ?? null) as Partial<ProInfo> | null

    const pro: ProInfo = {
      full_name: proRow?.full_name ?? 'Jean Le Roux',
      rge_numero: proRow?.rge_numero ?? null,
      siret: proRow?.siret ?? null,
      email: proRow?.email ?? null,
      phone: proRow?.phone ?? null,
      company_name: proRow?.company_name ?? null,
    }

    // 3. Appel Claude Opus 4.7 — adaptive thinking + prompt caching
    const userMsg = buildUserMessage(prospect, iris, commune, pro)

    const claudeReq = {
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        { role: 'user' as const, content: userMsg },
      ],
    }

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(claudeReq),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errText)
      return new Response(
        JSON.stringify({ error: `Claude API ${claudeRes.status}`, details: errText }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const claudeData = (await claudeRes.json()) as ClaudeResponse
    const textBlock = claudeData.content.find((b) => b.type === 'text')
    if (!textBlock?.text) {
      return new Response(JSON.stringify({ error: 'Réponse Claude vide' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Extrait le JSON depuis la réponse markdown éventuelle
    let parsed: LetterParsed
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      parsed = JSON.parse(jsonMatch[0]) as LetterParsed
      if (!parsed.subject || !parsed.body_md) throw new Error('Missing required fields')
    } catch (parseErr) {
      console.error('Parse error:', parseErr, 'raw:', textBlock.text.slice(0, 500))
      return new Response(
        JSON.stringify({ error: 'Format JSON invalide', raw: textBlock.text.slice(0, 1000) }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // 4. Persiste dans brh_prospect_letters
    const duration = Date.now() - startTime
    const usage = claudeData.usage ?? {}

    const { data: letter, error: insertErr } = await supa
      .from('brh_prospect_letters')
      .insert({
        prospect_id: body.prospectId,
        generated_by: proUserId,
        subject: parsed.subject,
        body_md: parsed.body_md,
        greeting: parsed.greeting,
        signature: parsed.signature,
        score_v2_at_generation: prospect.score_v2,
        segment_at_generation: prospect.score_v2_segment,
        signaux_used: { signaux: parsed.signaux_used ?? [] },
        status: 'draft',
        model_used: MODEL,
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
        generation_duration_ms: duration,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        id: letter?.id,
        subject: parsed.subject,
        greeting: parsed.greeting,
        body_md: parsed.body_md,
        signature: parsed.signature,
        signaux_used: parsed.signaux_used ?? [],
        usage: {
          input_tokens: usage.input_tokens ?? 0,
          output_tokens: usage.output_tokens ?? 0,
          cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        },
        duration_ms: duration,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate-prospect-letter error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
