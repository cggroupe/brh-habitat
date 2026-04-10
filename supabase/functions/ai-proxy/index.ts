import { corsHeaders } from '../_shared/cors.ts'

const AI_BASE = 'http://147.93.52.70:8895/api/chat'

const ENDPOINTS: Record<string, string> = {
  visiteur: `${AI_BASE}/visiteur`,
  pro: `${AI_BASE}/pro`,
  chiffrage: `${AI_BASE}/chiffrage`,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const mode = (body.mode as string) ?? 'visiteur'
    const url = ENDPOINTS[mode] ?? ENDPOINTS.visiteur

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: body.messages }),
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
