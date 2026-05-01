/**
 * Client IA Batiment — passe par le proxy Supabase Edge Function (HTTPS)
 * pour eviter le Mixed Content (HTTP API sur page HTTPS)
 */

import { SUPABASE_ANON_KEY, edgeFunctionUrl } from './config'

const AI_PROXY_URL = edgeFunctionUrl('ai-proxy')

export type AIMode = 'visiteur' | 'pro' | 'chiffrage'

export async function sendToAI(messages: { role: string; content: string }[], mode: AIMode = 'visiteur'): Promise<string> {
  // Filtrer les system prompts — le serveur gere le system prompt selon l'endpoint
  const filteredMessages = messages.filter((m) => m.role !== 'system')
  if (filteredMessages.length === 0) {
    throw new Error('Aucun message a envoyer')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let response: Response
  try {
    response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ mode, messages: filteredMessages }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Delai depasse (30s). Veuillez reessayer.')
    }
    throw new Error('Erreur reseau. Verifiez votre connexion.')
  }

  clearTimeout(timeout)

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
