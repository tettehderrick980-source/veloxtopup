import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookToken = Deno.env.get('GHDATACONNECT_WEBHOOK_TOKEN')

    // Verify webhook token if configured
    if (webhookToken) {
      const receivedToken = req.headers.get('x-webhook-token') || ''
      if (receivedToken !== webhookToken) {
        return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        })
      }
    }

    const event = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log webhook event
    await supabase.from('webhook_events').insert({
      source: 'ghdataconnect',
      event_type: event.event || event.status || 'unknown',
      payload: event,
      processed: false
    })

    const reference = event.reference || event.order_reference || event.data?.reference
    const status = event.status || event.data?.status

    if (!reference) {
      console.log('No reference in webhook payload')
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Find transaction by vendor_reference or reference
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .or(`vendor_reference.eq.${reference},reference.eq.${reference}`)
      .single()

    if (!transaction) {
      console.log(`No transaction found for reference: ${reference}`)
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Handle order delivered/success
    if (['delivered', 'success', 'completed'].includes(status?.toLowerCase())) {
      await supabase.from('transactions').update({
        status: 'delivered',
        fulfillment_status: 'fulfilled',
        vendor_reference: reference,
        api_response: event,
        updated_at: new Date().toISOString()
      }).eq('id', transaction.id)

      // Mark webhook as processed
      await supabase.from('webhook_events')
        .update({ processed: true })
        .eq('source', 'ghdataconnect')
        .contains('payload', { reference })
    }

    // Handle order failed
    if (['failed', 'error'].includes(status?.toLowerCase())) {
      await supabase.from('transactions').update({
        status: 'failed',
        fulfillment_status: 'failed',
        needs_refund: true,
        refund_status: 'pending',
        api_response: event,
        updated_at: new Date().toISOString()
      }).eq('id', transaction.id)

      // Notify admin
      await supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'fulfillment_failed',
          data: {
            transactionId: transaction.id,
            network: transaction.network,
            phone: transaction.phone,
            error: event.message || 'Order failed via webhook',
            attempts: transaction.fulfillment_attempts
          }
        }
      })

      // Mark webhook as processed
      await supabase.from('webhook_events')
        .update({ processed: true })
        .eq('source', 'ghdataconnect')
        .contains('payload', { reference })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('GhDataConnect webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
