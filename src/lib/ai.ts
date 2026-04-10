/**
 * Client IA Batiment — passe par le proxy Supabase Edge Function (HTTPS)
 * pour eviter le Mixed Content (HTTP API sur page HTTPS)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const AI_PROXY_URL = `${SUPABASE_URL}/functions/v1/ai-proxy`

export type AIMode = 'visiteur' | 'pro' | 'chiffrage'

export async function sendToAI(messages: { role: string; content: string }[], mode: AIMode = 'visiteur'): Promise<string> {
  // Filtrer les system prompts — le serveur gere le system prompt selon l'endpoint
  const filteredMessages = messages.filter((m) => m.role !== 'system')

  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ mode, messages: filteredMessages }),
  })

  if (!response.ok) {
    throw new Error(`Erreur IA (${response.status})`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content ?? data.response ?? 'Reponse indisponible.'

  // Nettoyer les blocs "Sources : ..." ajoutes par le RAG
  return raw
    .replace(/\n---\n\*Sources?\s*:.*$/s, '')
    .replace(/\n\*Sources?\s*:.*$/s, '')
    .trim()
}
