/**
 * GhDataConnect API Service - Enhanced with caching, retry logic, and transaction history
 * Uses direct API calls with CORS proxy fallback
 */

// GhDataConnect API Configuration
const GH_DATACONNECT_API_URL = 'https://ghdataconnect.com/api';

// Cache configuration - reduced to 1 minute for faster updates
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
const cache = new Map();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Transaction history for tracking orders
const transactionHistory = [];

// Network mapping for Ghana
const NETWORK_MAP = {
  mtn: 'mtn',
  airteltigo: 'airteltigo',
  telecel: 'telecel',
  atbigtime: 'atbigtime',
  atishare: 'atishare'
};

/**
 * Direct API call helper with CORS support and authentication
 */
async function directApiCall(endpoint, options = {}) {
  const url = `${GH_DATACONNECT_API_URL}${endpoint}`;
  
  // Get API key from environment - try VITE_ prefix first for Vite
  const apiKey = import.meta.env?.VITE_GH_DATACONNECT_API_KEY || 
                 import.meta.env?.GH_DATACONNECT_API_KEY || 
                 '150|Be1FtGzsHkEW5J6pLGSuqFD3FlyhPWJSPSHBkKJN0acac98b';
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  const config = {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...options.headers },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Check content type
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      throw new Error(`API returned HTML instead of JSON: ${text.substring(0, 100)}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      // If 401, try the old API key as fallback
      if (response.status === 401 && apiKey === '150|Be1FtGzsHkEW5J6pLGSuqFD3FlyhPWJSPSHBkKJN0acac98b') {
        const oldApiKey = '149|y58B7GnyczxIZGuUQIeegaElQU6UyyVBs3bnlwcS8d2fa872';
        console.log('Trying fallback API key...');
        
        const fallbackConfig = {
          ...config,
          headers: {
            ...defaultHeaders,
            'Authorization': `Bearer ${oldApiKey}`
          }
        };
        
        const fallbackResponse = await fetch(url, fallbackConfig);
        if (fallbackResponse.ok) {
          return await fallbackResponse.json();
        }
      }
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

export class GhDataConnectService {
  /**
   * Fetch all networks with caching - uses direct API
   */
  static async fetchAllNetworks(forceRefresh = false) {
    const cacheKey = 'networks_all';
    
    // Check cache first
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Returning cached networks data');
        return cached.data;
      }
    }

    try {
      const response = await directApiCall('/v1/getAllNetworks', { method: 'GET' });
      const networks = response?.data || [];
      
      // Cache the result
      cache.set(cacheKey, {
        data: networks,
        timestamp: Date.now()
      });

      return networks;
    } catch (error) {
      console.error('Error fetching networks from GhDataConnect:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance with caching - uses direct API
   */
  static async getWalletBalance(forceRefresh = false) {
    const cacheKey = 'wallet_balance';
    
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Returning cached balance data');
        return cached.data;
      }
    }

    try {
      const response = await directApiCall('/v1/getWalletBalance', { method: 'GET' });
      const balance = response?.data?.balance || '0';
      
      // Cache the result
      cache.set(cacheKey, {
        data: balance,
        timestamp: Date.now()
      });

      return balance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  /**
   * Check order status with retry logic
   */
  static async checkOrderStatus(reference, retries = MAX_RETRIES) {
    try {
      const response = await directApiCall(`/v1/checkOrderStatus/${reference}`, { method: 'GET' });
      return response?.data;
    } catch (error) {
      console.error(`Error checking order status (${retries} retries left):`, error);
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.checkOrderStatus(reference, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Place order with transaction tracking
   */
  static async placeOrder(orderData) {
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const response = await directApiCall('/v1/placeOrder', {
        method: 'POST',
        body: orderData
      });
      
      const result = response?.data;
      
      // Track transaction
      this.trackTransaction({
        id: transactionId,
        type: 'order',
        network: orderData.network,
        recipient: orderData.recipient,
        capacity: orderData.capacity,
        reference: result?.reference,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error placing order with GhDataConnect:', error);
      
      // Track failed transaction
      this.trackTransaction({
        id: transactionId,
        type: 'order',
        network: orderData.network,
        recipient: orderData.recipient,
        capacity: orderData.capacity,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Place iShare order with transaction tracking
   */
  static async placeIshareOrder(orderData) {
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const response = await directApiCall('/v1/placeIshareOrder', {
        method: 'POST',
        body: orderData
      });
      
      const result = response?.data;
      
      // Track transaction
      this.trackTransaction({
        id: transactionId,
        type: 'ishare',
        network: orderData.network,
        recipient: orderData.recipient,
        capacity: orderData.capacity,
        reference: result?.reference,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error placing ishare order with GhDataConnect:', error);
      
      // Track failed transaction
      this.trackTransaction({
        id: transactionId,
        type: 'ishare',
        network: orderData.network,
        recipient: orderData.recipient,
        capacity: orderData.capacity,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Track transaction for history
   */
  static trackTransaction(transaction) {
    transactionHistory.unshift(transaction);
    
    // Keep only last 100 transactions in memory
    if (transactionHistory.length > 100) {
      transactionHistory.pop();
    }
    
    console.log(`📝 Transaction tracked: ${transaction.id} - ${transaction.status}`);
  }

  /**
   * Get transaction history
   */
  static getTransactionHistory(limit = 10) {
    return transactionHistory.slice(0, limit);
  }

  /**
   * Clear cache
   */
  static clearCache() {
    cache.clear();
    console.log('🗑️ Cache cleared');
  }
}

// Pricing utility functions with enhanced features
export class PricingService {
  static calculateSellingPrice(costPrice, marginPercentage = 20) {
    const margin = costPrice * (marginPercentage / 100);
    return Number((costPrice + margin).toFixed(2));
  }

  static calculateProfit(costPrice, sellingPrice) {
    return Number((sellingPrice - costPrice).toFixed(2));
  }

  static applyMarginToBundles(bundles, marginPercentage = 20) {
    return bundles.map(bundle => {
      const costPrice = Number(bundle.price);
      const sellingPrice = this.calculateSellingPrice(costPrice, marginPercentage);
      
      return {
        ...bundle,
        id: bundle.id?.toString() || `${bundle.capacity}_${Date.now()}`,
        name: `${bundle.capacity}GB`,
        price: sellingPrice,
        cost_price: costPrice,
        selling_price: sellingPrice,
        margin_percentage: marginPercentage,
        profit: this.calculateProfit(costPrice, sellingPrice),
        validity: 'Unlimited',
        capacity: bundle.capacity
      };
    });
  }

  /**
   * Calculate bulk discount
   */
  static calculateBulkDiscount(totalAmount, discountThreshold = 100, discountPercentage = 5) {
    if (totalAmount >= discountThreshold) {
      return Number((totalAmount * discountPercentage / 100).toFixed(2));
    }
    return 0;
  }
}

// Enhanced API export with additional features
export const GhDataConnectAPI = {
  BASE_URL: GH_DATACONNECT_API_URL,
  
  NETWORKS: NETWORK_MAP,

  /**
   * Get plans for a specific network with enhanced error handling
   */
  async getPlansForNetwork(network) {
    try {
      const networks = await GhDataConnectService.fetchAllNetworks();
      const networkData = networks.find(n => n.key === network.toLowerCase());
      
      if (!networkData || !networkData.bundles) {
        throw new Error(`No bundles found for network: ${network}`);
      }

      return PricingService.applyMarginToBundles(networkData.bundles);
    } catch (error) {
      console.error('Error getting plans for network:', error);
      throw error;
    }
  },

  /**
   * Get all available networks with metadata
   */
  async getAvailableNetworks() {
    try {
      const networks = await GhDataConnectService.fetchAllNetworks();
      return networks.map(n => ({
        key: n.key,
        name: n.name || n.key,
        bundlesCount: n.bundles?.length || 0,
        hasBundles: (n.bundles?.length || 0) > 0
      }));
    } catch (error) {
      console.error('Error getting available networks:', error);
      throw error;
    }
  },

  /**
   * Validate phone number for Ghana networks
   */
  validatePhoneNumber(phoneNumber, network = null) {
    // Remove spaces and special characters
    let cleaned = phoneNumber.replace(/\s+/g, '');
    
    // Ghana phone number patterns
    const patterns = {
      mtn: /^0[3]\d{8}$/,
      airteltigo: /^0[2][67]\d{8}$/,
      vodafone: /^0[5]\d{8}$/,
      glo: /^0[5]\d{8}$/,
      '9mobile': /^0[8]\d{8}$/
    };

    // General Ghana number validation
    const generalRegex = /^0[2-9]\d{8}$/;
    
    if (network && patterns[network.toLowerCase()]) {
      return patterns[network.toLowerCase()].test(cleaned);
    }
    
    return generalRegex.test(cleaned);
  },

  /**
   * Format phone number for Ghana format
   */
  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.replace(/\s+/g, '');
    
    // Convert +233 to 0
    if (formatted.startsWith('+233')) {
      formatted = '0' + formatted.substring(4);
    }
    // Convert 233 to 0
    else if (formatted.startsWith('233') && formatted.length === 12) {
      formatted = '0' + formatted.substring(3);
    }
    
    return formatted;
  },

  /**
   * Get transaction history
   */
  getTransactionHistory(limit = 10) {
    return GhDataConnectService.getTransactionHistory(limit);
  },

  /**
   * Clear cached data
   */
  clearCache() {
    GhDataConnectService.clearCache();
  },

  /**
   * Check if service is available (health check)
   */
  async healthCheck() {
    try {
      const balance = await GhDataConnectService.getWalletBalance(true);
      return {
        available: true,
        balance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};

export default GhDataConnectService;
