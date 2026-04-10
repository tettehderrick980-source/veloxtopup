import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { fetchWithRetry, getApiCredentials, createAuthHeaders } from '../shared/ghDataConnect.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { network, recipient, capacity } = await req.json()

    if (!network || !recipient || !capacity) {
      throw new Error('Missing required fields: network, recipient, capacity')
    }

    const { apiBaseUrl, apiKey } = getApiCredentials()
    
    if (!apiKey) {
      throw new Error('GhDataConnect API key not configured')
    }

    const data = await fetchWithRetry(
      `${apiBaseUrl}/v1/placeOrder`,
      {
        method: 'POST',
        headers: createAuthHeaders(apiKey),
        body: JSON.stringify({ network, recipient, capacity })
      }
    )

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in ghdataconnect-order:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
