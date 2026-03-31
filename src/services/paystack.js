import PaystackPop from '@paystack/inline-js'

export class PaystackService {
  constructor() {
    this.publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
  }

  async initializePayment({ email, amount, metadata = {}, onSuccess, onClose }) {
    try {
      const paystack = new PaystackPop()
      
      const options = {
        key: this.publicKey,
        email,
        amount: amount * 100, // Convert to kobo
        currency: 'GHS',
        metadata: {
          ...metadata,
          custom_fields: [
            {
              display_name: 'Service',
              variable_name: 'service',
              value: 'VeloxTopUp Wallet Funding'
            }
          ]
        },
        callback: (response) => {
          if (onSuccess) onSuccess(response)
        },
        onClose: () => {
          if (onClose) onClose()
        }
      }

      paystack.newTransaction(options)
    } catch (error) {
      console.error('Paystack payment error:', error)
      throw error
    }
  }

  async verifyPayment(reference) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(`${supabaseUrl}/functions/v1/verify-paystack-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reference })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Payment verification failed')
      }

      return data
    } catch (error) {
      console.error('Payment verification error:', error)
      throw error
    }
  }
}

export const paystackService = new PaystackService()
