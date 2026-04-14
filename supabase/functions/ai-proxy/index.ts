import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'

const AI_BASE = Deno.env.get('AI_VPS_URL') ?? ''

const ENDPOINTS: Record<string, string> = {
  visiteur: `${AI_BASE}/visiteur`,
  pro: `${AI_BASE}/pro`,
  chiffrage: `${AI_BASE}/chiffrage`,
}

const BRHCRM_URL = Deno.env.get('BRHCRM_URL') ?? ''
const BRHCRM_KEY = Deno.env.get('BRHCRM_ANON_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const CATEGORY_MAP: Record<string, string[]> = {
  toiture: ['couverture', 'charpente', 'zinguerie'],
  couverture: ['couverture', 'zinguerie'],
  ardoise: ['couverture'], tuile: ['couverture'],
  zinc: ['zinguerie', 'couverture'],
  isolation: ['isolation'],
  fenetre: ['menuiseries'], fenetres: ['menuiseries'], velux: ['menuiseries'], menuiserie: ['menuiseries'],
  facade: ['facade'], ravalement: ['facade', 'peinture'],
  electricite: ['electricite'], plomberie: ['plomberie'],
  ventilation: ['ventilation'], vmc: ['ventilation'],
  placo: ['placo'], chauffage: ['chauffage'], peinture: ['peinture'],
  sol: ['revetement_sol'], charpente: ['charpente'],
  faitage: ['couverture', 'zinguerie'],
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s-]/g, '')
}

function detectCategories(messages: Array<{ role: string; content: string }>): string[] {
  const allText = messages.map(m => m.content).join(' ').toLowerCase()
  const found: string[] = []
  for (const [keyword, cats] of Object.entries(CATEGORY_MAP)) {
    if (allText.includes(keyword)) found.push(...cats)
  }
  return [...new Set(found)]
}

async function fetchPrices(categories: string[], searchTerms: string[]): Promise<string> {
  if (!BRHCRM_KEY || categories.length === 0) return ''
  try {
    const supabase = createClient(BRHCRM_URL, BRHCRM_KEY)
    let query = supabase
      .from('chiffrage_ouvrages')
      .select('libelle, unite, prix_fourni_pose, cout_materiaux, categorie')
      .in('categorie', categories)
      .order('libelle')
      .limit(40)

    if (searchTerms.length > 0) {
      const safeTerms = searchTerms.map(sanitizeSearchTerm).filter(t => t.length > 2)
      if (safeTerms.length > 0) {
        const searchFilter = safeTerms.map(t => `libelle.ilike.%${t}%`).join(',')
        query = query.or(searchFilter)
      }
    }

    const { data } = await query
    if (!data || data.length === 0) return ''

    const lines = data.map(o =>
      `- ${o.libelle} | ${o.unite} | ${o.prix_fourni_pose?.toFixed(2) ?? '?'} EUR HT | mat: ${o.cout_materiaux?.toFixed(2) ?? '?'} EUR`
    ).join('\n')

    return `\n\nPRIX BATICHIFFRAGE REELS (utilise ces prix, a jour 2025) :\n${lines}\n`
  } catch { return '' }
}

async function verifyAuth(req: Request, mode: string): Promise<boolean> {
  // Mode visiteur = public, pas d'auth requise
  if (mode === 'visiteur') return true

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    return !error && !!user
  } catch { return false }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const body = await req.json()
    const mode = (body.mode as string) ?? 'visiteur'
    const validModes = ['visiteur', 'pro', 'chiffrage']
    const safeMode = validModes.includes(mode) ? mode : 'visiteur'
    const url = ENDPOINTS[safeMode] ?? ENDPOINTS.visiteur
    const messages = body.messages as Array<{ role: string; content: string }> ?? []

    // Auth check : pro et chiffrage requierent un utilisateur connecte
    if (!await verifyAuth(req, safeMode)) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise pour ce mode' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Enrichir avec les prix BRHCRM en mode chiffrage/pro
    let enrichedMessages = messages
    if ((safeMode === 'chiffrage' || safeMode === 'pro') && messages.length > 0) {
      const categories = detectCategories(messages)
      if (categories.length > 0) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
        const searchTerms = lastUserMsg
          ? lastUserMsg.content.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
          : []

        const priceContext = await fetchPrices(categories, searchTerms)
        if (priceContext) {
          enrichedMessages = [{ role: 'system', content: priceContext }, ...messages]
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: enrichedMessages }),
    })

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
