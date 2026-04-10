import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { fetchWithRetry, getApiCredentials, createAuthHeaders } from '../shared/ghDataConnect.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    console.log('[ghdataconnect-networks] Processing request...')
    
    const { apiBaseUrl, apiKey } = getApiCredentials()
    
    console.log(`[ghdataconnect-networks] API URL: ${apiBaseUrl}`)
    console.log(`[ghdataconnect-networks] API Key configured: ${!!apiKey}`)
    
    if (!apiKey) {
      console.error('[ghdataconnect-networks] API key not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GhDataConnect API key not configured' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[ghdataconnect-networks] Fetching networks from GHDataConnect...')
    const apiResponse = await fetchWithRetry(
      `${apiBaseUrl}/v1/getAllNetworks`,
      {
        method: 'GET',
        headers: createAuthHeaders(apiKey)
      }
    )

    console.log('[ghdataconnect-networks] Successfully fetched networks:', JSON.stringify(apiResponse).substring(0, 200))

    // Return standardized response format
    const response = {
      success: true,
      data: apiResponse?.data || apiResponse || [],
      message: 'Networks fetched successfully'
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[ghdataconnect-networks] Error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to fetch networks from GhDataConnect' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
