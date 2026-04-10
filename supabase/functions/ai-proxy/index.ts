import { corsHeaders } from '../_shared/cors.ts'

const AI_BACKEND_URL = 'http://147.93.52.70:8895/api/chat'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const response = await fetch(AI_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'AI proxy error', details: String(err) }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
