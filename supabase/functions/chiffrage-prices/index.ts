import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.96.0'
import { getCorsHeaders } from '../_shared/cors.ts'

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

  try {
    const { categories, search } = await req.json() as {
      categories?: string[]
      search?: string
    }

    if (!BRHCRM_SERVICE_KEY) {
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
