import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<any> {
  let lastError: Error | null = null
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text()
        throw new Error(`API returned HTML instead of JSON: ${text.substring(0, 100)}`)
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }
      
      return await response.json()
      
    } catch (error) {
      console.error(`Attempt ${i + 1}/${retries} failed:`, (error as Error).message)
      lastError = error as Error
      
      if (i < retries - 1) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, i)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
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

    const apiBaseUrl = Deno.env.get('GH_DATACONNECT_API_URL') || 'https://ghdataconnect.com/api'
    const apiKey = Deno.env.get('GH_DATACONNECT_API_KEY')
    
    if (!apiKey) {
      throw new Error('GhDataConnect API key not configured')
    }

    const data = await fetchWithRetry(
      `${apiBaseUrl}/v1/placeOrder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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
