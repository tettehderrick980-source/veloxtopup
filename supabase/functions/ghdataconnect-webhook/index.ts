import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sanitizeLog } from '../_shared/utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const event = JSON.parse(body)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log webhook event
    await supabase
      .from('webhook_events')
      .insert({
        source: 'ghdataconnect',
        event_type: event.event_type || 'unknown',
        payload: event,
        processed: false,
        created_at: new Date().toISOString()
      })

    // Handle transaction events
    if (event.event_type === 'transaction.success') {
      await handleTransactionSuccess(supabase, event)
    } else if (event.event_type === 'transaction.failed') {
      await handleTransactionFailure(supabase, event)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('GhDataConnect webhook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function handleTransactionSuccess(supabase: any, event: any) {
  try {
    const { reference, status } = event.data
    
    if (!reference) {
      console.error('Missing reference in transaction success event')
      return
    }

    // Update transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'success',
        api_response: event,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference)

    console.log(`Transaction ${sanitizeLog(reference)} marked as successful`)

  } catch (error) {
    console.error('Error handling transaction success:', error)
  }
}

async function handleTransactionFailure(supabase: any, event: any) {
  try {
    const { reference, status, error_message } = event.data
    
    if (!reference) {
      console.error('Missing reference in transaction failure event')
      return
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .single()

    if (!transaction) {
      console.error('Transaction not found:', sanitizeLog(reference))
      return
    }

    // Update transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        api_response: event,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference)

    // Refund wallet
    await refundWallet(supabase, transaction.user_id, transaction.amount, reference)

    console.log(`Transaction ${sanitizeLog(reference)} failed and wallet refunded`)

  } catch (error) {
    console.error('Error handling transaction failure:', error)
  }
}

async function refundWallet(supabase: any, userId: string, amount: number, originalReference: string) {
  try {
    // Get current wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (wallet) {
      const newBalance = wallet.balance + amount
      
      // Update wallet balance
      await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      // Create refund transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'refund',
          network: 'system',
          phone: '',
          plan: `Refund for ${originalReference}`,
          amount,
          status: 'success',
          reference: `REFUND${Date.now()}`,
          api_response: { original_reference: originalReference, reason: 'Failed transaction' },
          created_at: new Date().toISOString()
        })

      console.log(`Refunded GH₵${sanitizeLog(amount)} to user ${sanitizeLog(userId)}`)
    }
  } catch (error) {
    console.error('Error refunding wallet:', error)
  }
}
