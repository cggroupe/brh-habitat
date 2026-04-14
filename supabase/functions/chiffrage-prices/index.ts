import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

// Se connecte a BRHCRM Supabase pour chercher les prix Batichiffrage
const BRHCRM_URL = Deno.env.get('BRHCRM_URL') ?? ''
const BRHCRM_SERVICE_KEY = Deno.env.get('BRHCRM_SERVICE_KEY') ?? ''

const CATEGORY_MAP: Record<string, string[]> = {
  toiture: ['couverture', 'charpente', 'zinguerie'],
  couverture: ['couverture', 'zinguerie'],
  isolation: ['isolation'],
  fenetres: ['menuiseries'],
  menuiseries: ['menuiseries'],
  facade: ['facade'],
  ravalement: ['facade', 'peinture'],
  electricite: ['electricite'],
  plomberie: ['plomberie'],
  ventilation: ['ventilation'],
  placo: ['placo'],
  chauffage: ['chauffage'],
  peinture: ['peinture'],
  sol: ['revetement_sol'],
  charpente: ['charpente'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Rate limiting : 40 req/min
  const rl = checkRateLimit(req, 'chiffrage-prices', { maxRequests: 40, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: 'Trop de requetes, reessayez dans un instant' }),
      { status: 429, headers: { ...getCorsHeaders(req), ...rl.headers, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // Auth JWT obligatoire
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization requise' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }
    const token = authHeader.slice(7)
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    const { data: { user: caller }, error: authError } = await authSupabase.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const { categories, search: rawSearch } = await req.json() as {
      categories?: string[]
      search?: string
    }

    // Sanitiser search : max 100 chars, echapper les caracteres speciaux SQL LIKE
    const search = rawSearch
      ? rawSearch.slice(0, 100).replace(/[%_\\]/g, '\\$&')
      : undefined

    if (!BRHCRM_URL || !BRHCRM_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: 'BRHCRM non configure' }),
        { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(BRHCRM_URL, BRHCRM_SERVICE_KEY)

    // Mapper les categories demandees vers les categories DB
    const dbCategories: string[] = []
    for (const cat of categories ?? []) {
      const mapped = CATEGORY_MAP[cat.toLowerCase()]
      if (mapped) dbCategories.push(...mapped)
    }

    let query = supabase
      .from('chiffrage_ouvrages')
      .select('reference, libelle, unite, prix_fourni_pose, cout_materiaux, temps_mo_heures, categorie, sous_categorie')
      .order('libelle')
      .limit(50)

    if (dbCategories.length > 0) {
      query = query.in('categorie', [...new Set(dbCategories)])
    }

    if (search) {
      query = query.ilike('libelle', `%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ ouvrages: data ?? [], count: (data ?? []).length }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur recherche prix', details: String(err) }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
