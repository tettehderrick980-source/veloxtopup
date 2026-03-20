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
    const { transactionId, type, network, phoneNumber, plan, amount } = await req.json()

    // Validate required fields
    if (!transactionId || !type || !network || !phoneNumber || !amount) {
      throw new Error('Missing required fields')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (transactionError || !transaction) {
      throw new Error('Transaction not found')
    }

    // Update transaction status to processing
    await supabase
      .from('transactions')
      .update({ status: 'processing' })
      .eq('id', transactionId)

    // Call GhDataConnect API
    const apiResponse = await callGhDataConnectAPI({
      type,
      network,
      phoneNumber,
      plan,
      amount,
      reference: transaction.reference
    })

    // Update transaction with API response
    const updateData = {
      status: apiResponse.success ? 'success' : 'failed',
      api_response: apiResponse,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)

    if (updateError) {
      console.error('Error updating transaction:', sanitizeLog(updateError))
    }

    // If API call failed, refund wallet
    if (!apiResponse.success) {
      await refundWallet(supabase, transaction.user_id, amount)
    }

    return new Response(
      JSON.stringify({
        success: apiResponse.success,
        message: apiResponse.success ? 'Purchase completed successfully' : 'Purchase failed',
        data: apiResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: apiResponse.success ? 200 : 400
      }
    )

  } catch (error) {
    console.error('Error in purchase-data function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function callGhDataConnectAPI({ type, network, phoneNumber, plan, amount, reference }) {
  const apiKey = Deno.env.get('GH_DATACONNECT_API_KEY')
  const apiUrl = 'https://api.ghdataconnect.com/v1/purchase'

  try {
    const requestBody = {
      type,
      network,
      phone_number: phoneNumber,
      plan,
      amount,
      reference,
      callback_url: `${Deno.env.get('VITE_APP_URL')}/api/ghdataconnect-webhook`
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'API call failed')
    }

    return {
      success: true,
      data,
      reference: data.reference || reference
    }

  } catch (error) {
    console.error('GhDataConnect API error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      reference
    }
  }
}

async function refundWallet(supabase, userId, amount) {
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
        .update({ balance: newBalance })
        .eq('user_id', userId)

      // Create refund transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'refund',
          network: 'system',
          phone: '',
          plan: 'Refund',
          amount,
          status: 'success',
          reference: `REFUND${Date.now()}`,
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error refunding wallet:', error)
  }
}
