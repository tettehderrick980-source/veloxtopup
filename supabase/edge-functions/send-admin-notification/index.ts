import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email configuration - uses Resend API
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@veloxtopup.shop'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'VeloxTopUp <notifications@veloxtopup.shop>'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()
    if (!type || !data) {
      throw new Error('Missing required fields: type, data')
    }

    let emailSubject = ''
    let emailHtml = ''

    switch (type) {
      case 'low_balance':
        emailSubject = `⚠️ LOW WALLET BALANCE ALERT - GH₵${data.balance}`
        emailHtml = generateLowBalanceEmail(data)
        break
      case 'order_queued':
        emailSubject = `📋 Order Queued - ${data.transactionId}`
        emailHtml = generateQueuedOrderEmail(data)
        break
      case 'order_expired':
        emailSubject = `❌ Order Expired - ${data.transactionId}`
        emailHtml = generateExpiredOrderEmail(data)
        break
      case 'fulfillment_failed':
        emailSubject = `🚨 Fulfillment Failed - ${data.transactionId}`
        emailHtml = generateFulfillmentFailedEmail(data)
        break
      case 'refund_initiated':
        emailSubject = `💸 Refund Initiated - ${data.transactionId}`
        emailHtml = generateRefundEmail(data)
        break
      default:
        throw new Error(`Unknown notification type: ${type}`)
    }

    // Send email via Resend API if configured
    if (RESEND_API_KEY) {
      await sendEmail(emailSubject, emailHtml)
    }

    // Store notification in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    await supabaseClient
      .from('admin_notifications')
      .insert({
        type,
        subject: emailSubject,
        message: stripHtml(emailHtml),
        data,
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Notification error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function sendEmail(subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject, html }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send email: ${error}`)
  }
  return await response.json()
}

function generateLowBalanceEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">⚠️ Low Balance Alert</h1>
      </div>
      <div style="padding: 20px; background: #1f2937;">
        <p style="color: #f3f4f6;">Dear Admin,</p>
        <p style="color: #f3f4f6;">Your GhDataConnect wallet balance is critically low:</p>
        <div style="background: #374151; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="color: #ef4444; margin: 0; font-size: 36px;">GH₵${data.balance?.toFixed(2) || '0.00'}</h2>
          <p style="color: #9ca3af; margin: 5px 0 0 0;">Current Balance</p>
        </div>
        <p style="color: #fbbf24;"><strong>⚡ Action Required:</strong></p>
        <ul style="color: #f3f4f6;">
          <li>Top up your GhDataConnect wallet immediately</li>
          <li>Orders are being queued and will expire after 1 hour</li>
          <li>Users will be refunded if orders expire without fulfillment</li>
        </ul>
        <a href="https://ghdataconnect.com/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px;">Top Up Wallet Now →</a>
      </div>
      <div style="padding: 15px; background: #111827; text-align: center; color: #6b7280; font-size: 12px;">VeloxTopUp Auto-Alert System</div>
    </div>
  `
}

function generateQueuedOrderEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">📋 Order Queued</h1>
      </div>
      <div style="padding: 20px; background: #1f2937;">
        <p style="color: #f3f4f6;">Dear Admin,</p>
        <p style="color: #f3f4f6;">A new order has been received but is queued due to insufficient wallet balance:</p>
        <div style="background: #374151; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; color: #f3f4f6;">
            <tr><td><strong>Transaction ID:</strong></td><td style="text-align: right;">${data.transactionId}</td></tr>
            <tr><td><strong>Network:</strong></td><td style="text-align: right; text-transform: capitalize;">${data.network}</td></tr>
            <tr><td><strong>Phone:</strong></td><td style="text-align: right;">${data.phone}</td></tr>
            <tr><td><strong>Bundle:</strong></td><td style="text-align: right;">${data.capacity}GB</td></tr>
            <tr><td><strong>Amount:</strong></td><td style="text-align: right; color: #10b981;">GH₵${data.selling_price?.toFixed(2)}</td></tr>
            <tr><td><strong>Cost Price:</strong></td><td style="text-align: right; color: #ef4444;">GH₵${data.cost_price?.toFixed(2)}</td></tr>
            <tr><td><strong>Current Balance:</strong></td><td style="text-align: right; color: #fbbf24;">GH₵${data.currentBalance?.toFixed(2)}</td></tr>
          </table>
        </div>
        <p style="color: #fbbf24;"><strong>⏰ This order will expire in 1 hour.</strong></p>
        <a href="https://ghdataconnect.com/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px;">Top Up Wallet Now →</a>
      </div>
      <div style="padding: 15px; background: #111827; text-align: center; color: #6b7280; font-size: 12px;">VeloxTopUp Auto-Alert System</div>
    </div>
  `
}

function generateExpiredOrderEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">❌ Order Expired</h1>
      </div>
      <div style="padding: 20px; background: #1f2937;">
        <p style="color: #f3f4f6;">Dear Admin,</p>
        <p style="color: #f3f4f6;">An order has expired due to wallet balance not being topped up in time:</p>
        <div style="background: #374151; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; color: #f3f4f6;">
            <tr><td><strong>Transaction ID:</strong></td><td style="text-align: right;">${data.transactionId}</td></tr>
            <tr><td><strong>Network:</strong></td><td style="text-align: right;">${data.network}</td></tr>
            <tr><td><strong>Bundle:</strong></td><td style="text-align: right;">${data.capacity}GB</td></tr>
            <tr><td><strong>Amount:</strong></td><td style="text-align: right;">GH₵${data.selling_price?.toFixed(2)}</td></tr>
            <tr><td><strong>Expired At:</strong></td><td style="text-align: right;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>
        ${data.paymentReceived ? '<p style="color: #fbbf24;"><strong>💸 Refund Required:</strong></p><p style="color: #f3f4f6;">Payment was received. A refund has been initiated.</p>' : ''}
      </div>
      <div style="padding: 15px; background: #111827; text-align: center; color: #6b7280; font-size: 12px;">VeloxTopUp Auto-Alert System</div>
    </div>
  `
}

function generateFulfillmentFailedEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🚨 Fulfillment Failed</h1>
      </div>
      <div style="padding: 20px; background: #1f2937;">
        <p style="color: #f3f4f6;">Dear Admin,</p>
        <p style="color: #f3f4f6;">An order failed to fulfill:</p>
        <div style="background: #374151; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; color: #f3f4f6;">
            <tr><td><strong>Transaction ID:</strong></td><td style="text-align: right;">${data.transactionId}</td></tr>
            <tr><td><strong>Error:</strong></td><td style="text-align: right; color: #ef4444;">${data.error}</td></tr>
            <tr><td><strong>Attempts:</strong></td><td style="text-align: right;">${data.attempts || 0}</td></tr>
          </table>
        </div>
        <p style="color: #fbbf24;"><strong>⚡ Action Required:</strong></p>
        <ul style="color: #f3f4f6;">
          <li>Check the GhDataConnect API status</li>
          <li>Investigate the error</li>
          <li>A refund has been initiated for the customer</li>
        </ul>
      </div>
      <div style="padding: 15px; background: #111827; text-align: center; color: #6b7280; font-size: 12px;">VeloxTopUp Auto-Alert System</div>
    </div>
  `
}

function generateRefundEmail(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">💸 Refund ${data.status === 'success' ? 'Completed' : 'Initiated'}</h1>
      </div>
      <div style="padding: 20px; background: #1f2937;">
        <p style="color: #f3f4f6;">Dear Admin,</p>
        <p style="color: #f3f4f6;">A refund has been ${data.status === 'success' ? 'completed' : 'initiated'}:</p>
        <div style="background: #374151; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; color: #f3f4f6;">
            <tr><td><strong>Transaction ID:</strong></td><td style="text-align: right;">${data.transactionId}</td></tr>
            <tr><td><strong>Refund Amount:</strong></td><td style="text-align: right; color: #10b981;">GH₵${data.amount?.toFixed(2)}</td></tr>
            <tr><td><strong>Reason:</strong></td><td style="text-align: right;">${data.reason}</td></tr>
            <tr><td><strong>Paystack Reference:</strong></td><td style="text-align: right;">${data.paystackReference}</td></tr>
          </table>
        </div>
      </div>
      <div style="padding: 15px; background: #111827; text-align: center; color: #6b7280; font-size: 12px;">VeloxTopUp Auto-Alert System</div>
    </div>
  `
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
