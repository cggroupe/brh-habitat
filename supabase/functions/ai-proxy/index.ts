import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const AI_BASE = 'http://147.93.52.70:8895/api/chat'

const ENDPOINTS: Record<string, string> = {
  visiteur: `${AI_BASE}/visiteur`,
  pro: `${AI_BASE}/pro`,
  chiffrage: `${AI_BASE}/chiffrage`,
}

// BRHCRM Supabase pour les prix Batichiffrage
const BRHCRM_URL = 'https://woicuzcxfdknxqdjuamj.supabase.co'
const BRHCRM_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWN1emN4ZmRrbnhxZGp1YW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTQyMTAsImV4cCI6MjA4Nzc5MDIxMH0.T5DGvWeKBZ3ZptILnK7Ap1xq_GyF23bYng39eFMWUys'

const CATEGORY_MAP: Record<string, string[]> = {
  toiture: ['couverture', 'charpente', 'zinguerie'],
  couverture: ['couverture', 'zinguerie'],
  ardoise: ['couverture'],
  tuile: ['couverture'],
  zinc: ['zinguerie', 'couverture'],
  isolation: ['isolation'],
  fenetre: ['menuiseries'],
  fenetres: ['menuiseries'],
  velux: ['menuiseries'],
  menuiserie: ['menuiseries'],
  facade: ['facade'],
  ravalement: ['facade', 'peinture'],
  electricite: ['electricite'],
  plomberie: ['plomberie'],
  ventilation: ['ventilation'],
  vmc: ['ventilation'],
  placo: ['placo'],
  chauffage: ['chauffage'],
  peinture: ['peinture'],
  sol: ['revetement_sol'],
  charpente: ['charpente'],
  faitage: ['couverture', 'zinguerie'],
}

function detectCategories(messages: Array<{ role: string; content: string }>): string[] {
  const allText = messages.map(m => m.content).join(' ').toLowerCase()
  const found: string[] = []
  for (const [keyword, cats] of Object.entries(CATEGORY_MAP)) {
    if (allText.includes(keyword)) {
      found.push(...cats)
    }
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

    // Si on a des termes de recherche specifiques, filtrer
    if (searchTerms.length > 0) {
      const searchFilter = searchTerms.map(t => `libelle.ilike.%${t}%`).join(',')
      query = query.or(searchFilter)
    }

    const { data } = await query

    if (!data || data.length === 0) return ''

    const lines = data.map(o =>
      `- ${o.libelle} | ${o.unite} | ${o.prix_fourni_pose?.toFixed(2) ?? '?'} EUR HT fourni+pose | materiaux: ${o.cout_materiaux?.toFixed(2) ?? '?'} EUR`
    ).join('\n')

    return `\n\nPRIX BATICHIFFRAGE REELS (utilise ces prix pour ton chiffrage, ils sont a jour 2025) :\n${lines}\n`
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const mode = (body.mode as string) ?? 'visiteur'
    const url = ENDPOINTS[mode] ?? ENDPOINTS.visiteur
    const messages = body.messages as Array<{ role: string; content: string }> ?? []

    // En mode chiffrage ou pro, enrichir avec les prix reels BRHCRM
    let enrichedMessages = messages
    if ((mode === 'chiffrage' || mode === 'pro') && messages.length > 0) {
      const categories = detectCategories(messages)
      if (categories.length > 0) {
        // Extraire des mots-cles de recherche depuis le dernier message user
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
        const searchTerms = lastUserMsg
          ? lastUserMsg.content.toLowerCase().split(/\s+/).filter(w => w.length > 3)
          : []

        const priceContext = await fetchPrices(categories, searchTerms.slice(0, 5))

        if (priceContext) {
          // Injecter les prix comme message system supplementaire
          enrichedMessages = [
            { role: 'system', content: priceContext },
            ...messages,
          ]
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'AI proxy error', details: String(err) }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
