import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
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
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      throw new Error('Missing Paystack signature')
    }

    const body = await req.text()
    
    // Verify webhook signature
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    const hash = await createHash('sha512').update(body + secret).toString('hex')
    
    if (hash !== signature) {
      throw new Error('Invalid webhook signature')
    }

    const event = JSON.parse(body)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log webhook event
    await supabase
      .from('webhook_events')
      .insert({
        source: 'paystack',
        event_type: event.event,
        payload: event,
        processed: false,
        created_at: new Date().toISOString()
      })

    // Handle charge.success event
    if (event.event === 'charge.success') {
      await handleSuccessfulPayment(supabase, event.data)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Paystack webhook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})

async function handleSuccessfulPayment(supabase: any, paymentData: any) {
  try {
    const { metadata, amount, reference } = paymentData
    
    if (!metadata || !metadata.user_id) {
      console.error('Missing user metadata in payment')
      return
    }

    const userId = metadata.user_id
    const amountInGHS = amount / 100 // Convert from kobo to GHS

    // Get current wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wallet) {
      console.error('Wallet not found for user:', sanitizeLog(userId))
      return
    }

    // Update wallet balance
    const newBalance = wallet.balance + amountInGHS
    await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // Create wallet funding transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'wallet_funding',
        network: 'paystack',
        phone: '',
        plan: 'Wallet Funding',
        amount: amountInGHS,
        status: 'success',
        reference: reference,
        api_response: paymentData,
        created_at: new Date().toISOString()
      })

    console.log(`Successfully funded wallet for user ${sanitizeLog(userId)} with GH₵${sanitizeLog(amountInGHS)}`)

  } catch (error) {
    console.error('Error handling successful payment:', error)
  }
}
