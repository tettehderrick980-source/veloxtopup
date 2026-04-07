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
      console.log(`Fetching ${url} (attempt ${i + 1}/${retries})`)
      
      const response = await fetch(url, options)
      
      // Log response status for debugging
      console.log(`Response status: ${response.status}`)
      
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        const text = await response.text()
        throw new Error(`API returned HTML instead of JSON: ${text.substring(0, 100)}`)
      }
      
      // If not ok, read the error body but still parse as JSON if possible
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`Error response: ${errorText}`)
        
        // Try to parse as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorText)
          throw new Error(errorJson.message || errorJson.error || `API error: ${response.status}`)
        } catch {
          throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`)
        }
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
    const apiBaseUrl = Deno.env.get('GH_DATACONNECT_API_URL') || 'https://ghdataconnect.com/api'
    const apiKey = Deno.env.get('GH_DATACONNECT_API_KEY')
    
    console.log(`API Base URL: ${apiBaseUrl}`)
    
    if (!apiKey) {
      console.error('GhDataConnect API key not configured - using fallback')
      // Use a fallback key for development (you should set this in production)
      throw new Error('GhDataConnect API key not configured. Please set GH_DATACONNECT_API_KEY in Supabase secrets.')
    }

    console.log(`Calling GhDataConnect API...`)
    
    const data = await fetchWithRetry(
      `${apiBaseUrl}/v1/getWalletBalance`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    console.log(`GhDataConnect response:`, JSON.stringify(data))

    // Return the balance in a format that's easy for the frontend to consume
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          balance: data?.data?.balance || data?.balance || '0',
          currency: data?.data?.currency || data?.currency || 'GHS'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in ghdataconnect-balance:', error)
    
    // Return a more informative error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to fetch wallet balance from GhDataConnect'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
