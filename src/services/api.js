import { supabase } from '../lib/supabase';

/**
 * Centralized API service for interacting with Supabase Edge Functions.
 * Replaces the defunct Node.js backend.
 */
export const apiService = {
  /**
   * Invokes a Supabase Edge Function with error handling
   */
  async invoke(functionName, options = {}) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      method: options.method || 'POST',
      body: options.body || {},
      headers: options.headers || {}
    });

    if (error) {
      console.error(`Edge Function [${functionName}] Error:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Process a new data/airtime purchase
   */
  async purchaseData(purchaseData) {
    return this.invoke('purchase-data', { body: purchaseData });
  },

  /**
   * Verify a Paystack payment reference
   */
  async verifyPayment(reference) {
    return this.invoke('verify-paystack-payment', { body: { reference } });
  }
};

export default apiService;
