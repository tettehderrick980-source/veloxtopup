/**
 * Shared GhDataConnect API utilities
 * This module provides consistent API calls with retry logic across all edge functions
 */

// Retry configuration
const MAX_RETRIES = 3
const BASE_RETRY_DELAY = 1000

/**
 * Fetch with exponential backoff retry logic
 */
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<any> {
  let lastError: Error | null = null
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      // Check content type to detect HTML errors
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
        const delay = BASE_RETRY_DELAY * Math.pow(2, i) // Exponential backoff: 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * Get GhDataConnect API credentials from environment
 */
export function getApiCredentials() {
  return {
    apiBaseUrl: Deno.env.get('GH_DATACONNECT_API_URL') || 'https://ghdataconnect.com/api',
    apiKey: Deno.env.get('GH_DATACONNECT_API_KEY')
  }
}

/**
 * Create authorization headers for GhDataConnect API
 */
export function createAuthHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

/**
 * Place an order with GhDataConnect API
 */
export async function placeOrder(
  apiBaseUrl: string,
  apiKey: string,
  network: string,
  recipient: string,
  capacity: number
): Promise<any> {
  return fetchWithRetry(
    `${apiBaseUrl}/v1/placeOrder`,
    {
      method: 'POST',
      headers: createAuthHeaders(apiKey),
      body: JSON.stringify({
        network,
        recipient,
        capacity
      })
    }
  )
}

/**
 * Place an iShare order with GhDataConnect API
 */
export async function placeIshareOrder(
  apiBaseUrl: string,
  apiKey: string,
  network: string,
  recipient: string,
  capacity: number
): Promise<any> {
  return fetchWithRetry(
    `${apiBaseUrl}/v1/placeIshareOrder`,
    {
      method: 'POST',
      headers: createAuthHeaders(apiKey),
      body: JSON.stringify({
        network,
        recipient,
        capacity
      })
    }
  )
}

/**
 * Check order status with GhDataConnect API
 */
export async function checkOrderStatus(
  apiBaseUrl: string,
  apiKey: string,
  reference: string
): Promise<any> {
  return fetchWithRetry(
    `${apiBaseUrl}/v1/checkOrderStatus/${reference}`,
    {
      method: 'GET',
      headers: createAuthHeaders(apiKey)
    }
  )
}

/**
 * Get wallet balance from GhDataConnect API
 */
export async function getWalletBalance(
  apiBaseUrl: string,
  apiKey: string
): Promise<any> {
  return fetchWithRetry(
    `${apiBaseUrl}/v1/getWalletBalance`,
    {
      method: 'GET',
      headers: createAuthHeaders(apiKey)
    }
  )
}

/**
 * Get all networks from GhDataConnect API
 */
export async function getAllNetworks(
  apiBaseUrl: string,
  apiKey: string
): Promise<any> {
  return fetchWithRetry(
    `${apiBaseUrl}/v1/getAllNetworks`,
    {
      method: 'GET',
      headers: createAuthHeaders(apiKey)
    }
  )
}
