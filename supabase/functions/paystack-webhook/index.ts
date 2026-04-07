import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

async function verifyPaystackSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await globalThis.crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const computedHash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computedHash === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) throw new Error('Paystack secret key not configured')

    const signature = req.headers.get('x-paystack-signature') || ''
    const rawBody = await req.text()

    // Verify webhook signature
    const isValid = await verifyPaystackSignature(rawBody, signature, paystackSecret)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      })
    }

    const event = JSON.parse(rawBody)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log webhook event
    await supabase.from('webhook_events').insert({
      source: 'paystack',
      event_type: event.event,
      payload: event,
      processed: false
    })

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const { reference, metadata, amount, customer } = event.data
      const transactionId = metadata?.transaction_id

      if (!transactionId) {
        console.log('No transaction_id in metadata, skipping')
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Get transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (!transaction) {
        console.error(`Transaction ${transactionId} not found`)
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Skip if already processed
      if (transaction.status !== 'pending') {
        console.log(`Transaction ${transactionId} already processed`)
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        })
      }

      // Update transaction payment status
      await supabase.from('transactions').update({
        status: 'processing',
        payment_reference: reference,
        payment_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', transactionId)

      // Invoke purchase-data edge function to fulfill the order
      await supabase.functions.invoke('purchase-data', {
        body: {
          transactionId,
          network: transaction.network,
          phone: transaction.phone,
          capacity: transaction.capacity,
          cost_price: transaction.cost_price,
          selling_price: transaction.selling_price,
          reference: transaction.reference,
          payment_reference: reference,
          user_id: transaction.user_id
        }
      })

      // Mark webhook as processed
      await supabase.from('webhook_events')
        .update({ processed: true })
        .eq('source', 'paystack')
        .eq('event_type', 'charge.success')
        .contains('payload', { data: { reference } })
    }

    // Handle refund.processed event
    if (event.event === 'refund.processed') {
      const { transaction_reference, status } = event.data

      await supabase.from('transactions')
        .update({
          refund_status: status === 'processed' ? 'completed' : 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('payment_reference', transaction_reference)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Paystack webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
