import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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

// Transaction limits
const MAX_TRANSACTION_AMOUNT = 500 // GHS
const LOW_BALANCE_THRESHOLD = 10 // GHS
const ORDER_EXPIRY_HOURS = 1 // Orders expire after 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionId, network, phone, capacity, cost_price, selling_price, reference, payment_reference } = await req.json()

    if (!transactionId || !network || !phone || !capacity) {
      throw new Error('Missing required fields: transactionId, network, phone, capacity')
    }

    if (selling_price > MAX_TRANSACTION_AMOUNT) {
      throw new Error(`Transaction amount exceeds maximum limit of GH₵${MAX_TRANSACTION_AMOUNT}`)
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const apiBaseUrl = Deno.env.get('GH_DATACONNECT_API_URL') || 'https://ghdataconnect.com/api'
    const apiKey = Deno.env.get('GH_DATACONNECT_API_KEY')
    
    if (!apiKey) {
      throw new Error('GhDataConnect API key not configured')
    }

    // Check wallet balance with retry
    const walletData = await fetchWithRetry(
      `${apiBaseUrl}/v1/getWalletBalance`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
      }
    )
    const balance = parseFloat(walletData?.data?.balance || '0')

    // Update transaction with balance info
    await supabaseClient
      .from('transactions')
      .update({ 
        api_response: { wallet_balance: balance },
        payment_verified_at: payment_reference ? new Date().toISOString() : null
      })
      .eq('id', transactionId)

    // Check for low balance - notify admin but don't block
    if (balance < LOW_BALANCE_THRESHOLD) {
      console.log(`⚠️ LOW BALANCE ALERT: Wallet balance is GH₵${balance.toFixed(2)}`)
      await sendAdminNotification(supabaseClient, 'low_balance', { balance, threshold: LOW_BALANCE_THRESHOLD })
    }

    // Check if we have sufficient balance
    if (balance < cost_price) {
      // Queue the order
      console.log(`⚠️ Insufficient balance. Queuing order ${transactionId}`)
      
      const expiresAt = new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
      
      await supabaseClient
        .from('transactions')
        .update({
          fulfillment_status: 'queued',
          fulfillment_expires_at: expiresAt,
          payment_verified_at: payment_reference ? new Date().toISOString() : null,
          api_response: { 
            wallet_balance: balance,
            queued_reason: 'insufficient_balance',
            queue_message: 'Order queued. Admin has been notified.'
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      await sendAdminNotification(supabaseClient, 'order_queued', {
        transactionId, network, phone, capacity, cost_price, selling_price, currentBalance: balance
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactionId,
            status: 'queued',
            message: 'Order received and queued. Admin has been notified. You will be updated once processed.',
            wallet_balance: balance,
            expires_at: expiresAt
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // We have sufficient balance - proceed with order
    console.log(`✅ Sufficient balance. Processing order ${transactionId}`)

    await supabaseClient
      .from('transactions')
      .update({
        status: 'processing',
        fulfillment_status: 'processing',
        payment_verified_at: payment_reference ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    // Place order with retry
    const orderData = await fetchWithRetry(
      `${apiBaseUrl}/v1/placeOrder`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ network, recipient: phone, capacity })
      }
    )
    const vendorReference = orderData?.data?.reference || orderData?.data?.order_id

    await supabaseClient
      .from('transactions')
      .update({
        status: 'delivered',
        fulfillment_status: 'fulfilled',
        vendor_reference: vendorReference?.toString(),
        api_response: orderData,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)

    return new Response(
      JSON.stringify({
        success: true,
        data: { transactionId, vendor_reference: vendorReference, order: orderData?.data, wallet_balance: balance }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Purchase error:', error)
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
      if (transactionId) {
        await supabaseClient
          .from('transactions')
          .update({
            status: 'failed',
            fulfillment_status: 'failed',
            needs_refund: true,
            api_response: { error: (error as Error).message },
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId)
      }
    } catch (updateError) {
      console.error('Error updating failed transaction:', updateError)
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function sendAdminNotification(supabaseClient: any, type: string, data: any) {
  try {
    await supabaseClient.functions.invoke('send-admin-notification', {
      body: { type, data }
    })
  } catch (error) {
    console.error('Error sending admin notification:', error)
  }
}
