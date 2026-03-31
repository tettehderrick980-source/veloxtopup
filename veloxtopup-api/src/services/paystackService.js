import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
}

// Create axios instance
const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

// Request interceptor
paystackClient.interceptors.request.use(
  (config) => {
    logger.debug('Paystack API Request', {
      method: config.method,
      url: config.url,
      headers: { ...config.headers, Authorization: 'Bearer [REDACTED]' }
    });
    return config;
  },
  (error) => {
    logger.error('Paystack API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor
paystackClient.interceptors.response.use(
  (response) => {
    logger.debug('Paystack API Response', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    logger.error('Paystack API Response Error', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export class PaystackService {
  
  // Initialize payment transaction
  static async initializePayment(email, amount, metadata = {}) {
    try {
      const response = await paystackClient.post('/transaction/initialize', {
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        metadata: {
          ...metadata,
          custom_fields: [
            {
              display_name: "Payment Type",
              variable_name: "payment_type",
              value: metadata.type || 'wallet_funding'
            }
          ]
        },
        callback_url: metadata.callback_url || `${process.env.VITE_APP_URL}/payment/callback`
      });

      logger.info('Paystack payment initialized', {
        reference: response.data.data.reference,
        email,
        amount
      });

      return {
        success: true,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: response.data.data.reference,
        raw: response.data
      };
    } catch (error) {
      logger.error('Paystack payment initialization failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Verify transaction
  static async verifyTransaction(reference) {
    try {
      const response = await paystackClient.get(`/transaction/verify/${reference}`);

      const transactionData = response.data.data;

      logger.info('Paystack transaction verified', {
        reference,
        status: transactionData.status,
        amount: transactionData.amount / 100
      });

      return {
        success: true,
        status: transactionData.status,
        amount: transactionData.amount / 100,
        currency: transactionData.currency,
        transaction_date: transactionData.transaction_date,
        channel: transactionData.channel,
        gateway_response: transactionData.gateway_response,
        customer: transactionData.customer,
        metadata: transactionData.metadata,
        raw: transactionData
      };
    } catch (error) {
      logger.error('Paystack transaction verification failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get all transactions
  static async getTransactions(page = 1, perPage = 50) {
    try {
      const response = await paystackClient.get('/transaction', {
        params: {
          perPage,
          page
        }
      });

      return {
        success: true,
        transactions: response.data.data,
        meta: response.data.meta
      };
    } catch (error) {
      logger.error('Paystack get transactions failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get a single transaction
  static async getTransaction(id) {
    try {
      const response = await paystackClient.get(`/transaction/${id}`);

      return {
        success: true,
        transaction: response.data.data
      };
    } catch (error) {
      logger.error('Paystack get transaction failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Create transfer recipient
  static async createTransferRecipient(name, accountNumber, bankCode, currency = 'GHS') {
    try {
      const response = await paystackClient.post('/transferrecipient', {
        type: 'mobile_money',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency
      });

      return {
        success: true,
        recipient: response.data.data
      };
    } catch (error) {
      logger.error('Paystack create transfer recipient failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Initiate transfer
  static async initiateTransfer(recipient, amount, reason = '') {
    try {
      const response = await paystackClient.post('/transfer', {
        source: 'balance',
        amount: Math.round(amount * 100), // Convert to kobo
        recipient,
        reason
      });

      logger.info('Paystack transfer initiated', {
        recipient,
        amount,
        reference: response.data.data.reference
      });

      return {
        success: true,
        transfer: response.data.data
      };
    } catch (error) {
      logger.error('Paystack transfer initiation failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Verify transfer
  static async verifyTransfer(reference) {
    try {
      const response = await paystackClient.get(`/transfer/verify/${reference}`);

      return {
        success: true,
        transfer: response.data.data
      };
    } catch (error) {
      logger.error('Paystack transfer verification failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get banks
  static async getBanks(country = 'Ghana') {
    try {
      const response = await paystackClient.get('/bank', {
        params: { country }
      });

      return {
        success: true,
        banks: response.data.data
      };
    } catch (error) {
      logger.error('Paystack get banks failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Resolve account number
  static async resolveAccount(accountNumber, bankCode) {
    try {
      const response = await paystackClient.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode
        }
      });

      return {
        success: true,
        account: response.data.data
      };
    } catch (error) {
      logger.error('Paystack resolve account failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get balance
  static async getBalance() {
    try {
      const response = await paystackClient.get('/balance');

      return {
        success: true,
        balance: response.data.data
      };
    } catch (error) {
      logger.error('Paystack get balance failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Verify webhook signature
  static verifyWebhookSignature(body, signature) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('PAYSTACK_WEBHOOK_SECRET not configured');
    }

    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    return hash === signature;
  }

  // Check payment status
  static checkPaymentStatus(status) {
    const statusMap = {
      'success': 'completed',
      'failed': 'failed',
      'pending': 'pending',
      'processing': 'processing',
      'abandoned': 'abandoned'
    };

    return statusMap[status] || 'unknown';
  }
}

export default PaystackService;
