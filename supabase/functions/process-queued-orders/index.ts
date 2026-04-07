import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOW_BALANCE_THRESHOLD = 10 // GHS
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const apiBaseUrl = Deno.env.get('GH_DATACONNECT_API_URL') || 'https://ghdataconnect.com/api'
    const apiKey = Deno.env.get('GH_DATACONNECT_API_KEY')
    
    if (!apiKey) {
      throw new Error('GhDataConnect API key not configured')
    }

    // Step 1: Process expired queued orders
    const expiredOrders = await processExpiredOrders(supabaseClient)

    // Step 2: Check wallet balance
    const walletData = await fetchWithRetry(
      `${apiBaseUrl}/v1/getWalletBalance`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
      }
    )
    const balance = parseFloat(walletData?.data?.balance || '0')

    // Step 3: Notify admin if low balance
    if (balance < LOW_BALANCE_THRESHOLD) {
      await sendAdminNotification(supabaseClient, 'low_balance', { balance, threshold: LOW_BALANCE_THRESHOLD })
    }

    // Step 4: Process queued orders if balance is sufficient
    let processedOrders = 0
    if (balance >= LOW_BALANCE_THRESHOLD) {
      processedOrders = await processQueuedOrders(supabaseClient, apiBaseUrl, apiKey, balance)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order processing completed',
        data: { expiredOrders, processedOrders, walletBalance: balance }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Order processing error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function processExpiredOrders(supabaseClient: any) {
  const now = new Date().toISOString()
  
  const { data: expiredOrders } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('fulfillment_status', 'queued')
    .lt('fulfillment_expires_at', now)

  let processedCount = 0

  for (const order of expiredOrders || []) {
    try {
      await supabaseClient
        .from('transactions')
        .update({
          fulfillment_status: 'expired',
          status: order.payment_reference ? 'failed' : 'cancelled',
          updated_at: now
        })
        .eq('id', order.id)

      if (order.payment_reference) {
        await supabaseClient
          .from('transactions')
          .update({
            needs_refund: true,
            refund_status: 'pending'
          })
          .eq('id', order.id)

        await sendAdminNotification(supabaseClient, 'order_expired', {
          transactionId: order.id,
          network: order.network,
          phone: order.phone,
          capacity: order.capacity,
          selling_price: order.selling_price,
          paymentReceived: true
        })

        await initiateRefund(supabaseClient, order)
      } else {
        await sendAdminNotification(supabaseClient, 'order_expired', {
          transactionId: order.id,
          network: order.network,
          phone: order.phone,
          capacity: order.capacity,
          selling_price: order.selling_price,
          paymentReceived: false
        })
      }
      processedCount++
    } catch (error) {
      console.error(`Error processing expired order ${order.id}:`, error)
    }
  }
  return processedCount
}

async function processQueuedOrders(supabaseClient: any, apiBaseUrl: string, apiKey: string, currentBalance: number) {
  const { data: queuedOrders } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('fulfillment_status', 'queued')
    .eq('status', 'processing')
    .order('created_at', { ascending: true })
    .limit(10)

  let processedCount = 0

  for (const order of queuedOrders || []) {
    if (currentBalance < order.cost_price) break

    try {
      await supabaseClient
        .from('transactions')
        .update({
          fulfillment_status: 'processing',
          fulfillment_attempts: order.fulfillment_attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      const orderResult = await fetchWithRetry(
        `${apiBaseUrl}/v1/placeOrder`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ network: order.network, recipient: order.phone, capacity: order.capacity })
        }
      )
      const vendorReference = orderResult?.data?.reference || orderResult?.data?.order_id

      await supabaseClient
        .from('transactions')
        .update({
          fulfillment_status: 'fulfilled',
          status: 'delivered',
          vendor_reference: vendorReference?.toString(),
          api_response: orderResult,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      currentBalance -= order.cost_price
      processedCount++
    } catch (error) {
      console.error(`Error fulfilling order ${order.id}:`, error)

      if (order.fulfillment_attempts + 1 >= MAX_RETRIES) {
        await supabaseClient
          .from('transactions')
          .update({
            fulfillment_status: 'failed',
            status: 'failed',
            needs_refund: true,
            refund_status: 'pending',
            api_response: { error: (error as Error).message },
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)

        await initiateRefund(supabaseClient, order)
        await sendAdminNotification(supabaseClient, 'fulfillment_failed', {
          transactionId: order.id,
          network: order.network,
          phone: order.phone,
          error: (error as Error).message,
          attempts: order.fulfillment_attempts + 1
        })
      }
    }
  }
  return processedCount
}

async function initiateRefund(supabaseClient: any, order: any) {
  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
  
  if (!PAYSTACK_SECRET_KEY || !order.payment_reference) return

  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: order.payment_reference,
        amount: Math.round(order.selling_price * 100),
      }),
    })

    const result = await response.json()

    await supabaseClient
      .from('transactions')
      .update({
        refund_status: result.status ? 'completed' : 'failed',
        refund_reference: result.data?.reference
      })
      .eq('id', order.id)

    await sendAdminNotification(supabaseClient, 'refund_initiated', {
      transactionId: order.id,
      amount: order.selling_price,
      reason: 'Order expired/fulfilled failed',
      paystackReference: order.payment_reference,
      status: result.status ? 'success' : 'failed'
    })
  } catch (error) {
    console.error('Error initiating refund:', error)
    await supabaseClient.from('transactions').update({ refund_status: 'failed' }).eq('id', order.id)
  }
}

async function sendAdminNotification(supabaseClient: any, type: string, data: any) {
  try {
    await supabaseClient.functions.invoke('send-admin-notification', { body: { type, data } })
  } catch (error) {
    console.error('Error sending admin notification:', error)
  }
}
