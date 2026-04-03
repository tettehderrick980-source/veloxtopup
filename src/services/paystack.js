import PaystackPop from '@paystack/inline-js'
import { apiClient } from './api'

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
        amount: amount * 100,
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
      const response = await apiClient.post('/payments/verify', { reference })
      return response
    } catch (error) {
      console.error('Payment verification error:', error)
      throw error
    }
  }
}

export const paystackService = new PaystackService()
