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
    const { reference } = await req.json()

    if (!reference) {
      throw new Error('Reference is required')
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Payment verification failed')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if payment is successful and not already processed
    if (data.status === 'success' && data.data) {
      const { metadata, amount } = data.data
      
      if (metadata && metadata.user_id) {
        const userId = metadata.user_id
        const amountInGHS = amount / 100

        // Get current wallet balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .single()

        if (wallet) {
          const newBalance = wallet.balance + amountInGHS
          
          // Update wallet balance
          await supabase
            .from('wallets')
            .update({ 
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)

          // Create transaction record
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
              api_response: data,
              created_at: new Date().toISOString()
            })

          console.log(`Successfully funded wallet for user ${sanitizeLog(userId)} with GH₵${sanitizeLog(amountInGHS)}`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Payment verified successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
