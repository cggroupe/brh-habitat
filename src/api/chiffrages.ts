import { supabase } from '@/lib/supabase'
import type { ChiffrageData } from '@/lib/chiffrage-pdf'

export interface ChiffrageInsert {
  user_id: string
  company_id?: string | null
  reference: string
  client_name: string
  client_address?: string | null
  client_phone?: string | null
  projet_titre: string
  projet_description?: string | null
  lignes: unknown[]
  total_ht: number
  tva_rate: number
  total_tva: number
  total_ttc: number
  notes?: string | null
}

export async function saveChiffrage(chiffrage: ChiffrageData, userId: string, companyId?: string | null): Promise<void> {
  const { error } = await supabase
    .from('brh_chiffrages')
    .insert({
      user_id: userId,
      company_id: companyId ?? null,
      reference: chiffrage.reference,
      client_name: chiffrage.client_name,
      client_address: chiffrage.client_address ?? null,
      client_phone: chiffrage.client_phone ?? null,
      projet_titre: chiffrage.projet_titre,
      projet_description: chiffrage.projet_description ?? null,
      lignes: chiffrage.lignes,
      total_ht: chiffrage.total_ht,
      tva_rate: chiffrage.tva_rate,
      total_tva: chiffrage.total_tva,
      total_ttc: chiffrage.total_ttc,
      notes: chiffrage.notes ?? null,
    })

  if (error) throw error
}
