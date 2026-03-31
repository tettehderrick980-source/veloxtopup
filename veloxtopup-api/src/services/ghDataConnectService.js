import axios from 'axios';
import { logger } from '../utils/logger.js';

const API_BASE_URL = process.env.GH_DATACONNECT_API_URL || 'https://ghdataconnect.com/api';
const API_KEY = process.env.GH_DATACONNECT_API_KEY;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000; // 30 seconds

if (!API_KEY) {
  throw new Error('GH_DATACONNECT_API_KEY environment variable is required');
}

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'VeloxTopUp-API/1.0'
  }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    logger.debug('GhDataConnect API Request', {
      method: config.method,
      url: config.url,
      headers: { ...config.headers, Authorization: '[REDACTED]' }
    });
    return config;
  },
  (error) => {
    logger.error('GhDataConnect API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    logger.debug('GhDataConnect API Response', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    logger.error('GhDataConnect API Response Error', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Retry function with exponential backoff
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await apiClient({
        url,
        ...options
      });
      
      // Check if response is HTML instead of JSON
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('text/html')) {
        throw new Error(`API returned HTML instead of JSON: ${response.data.substring(0, 100)}`);
      }
      
      return response.data;
      
    } catch (error) {
      lastError = error;
      logger.error(`GhDataConnect API attempt ${attempt}/${retries} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        logger.error('Authentication error, not retrying');
        throw error;
      }
      
      if (error.response?.status === 400) {
        logger.error('Bad request error, not retrying');
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
      logger.info(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export class GhDataConnectService {
  
  // Get wallet balance
  static async getWalletBalance() {
    try {
      const response = await fetchWithRetry('/v1/getWalletBalance', {
        method: 'GET'
      });
      
      const balance = parseFloat(response?.data?.balance || '0');
      logger.info(`Wallet balance retrieved: GH₵${balance.toFixed(2)}`);
      
      return {
        success: true,
        balance,
        raw: response
      };
    } catch (error) {
      logger.error('Failed to get wallet balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get available networks
  static async getNetworks() {
    try {
      const response = await fetchWithRetry('/v1/getNetworks', {
        method: 'GET'
      });
      
      return {
        success: true,
        networks: response?.data || [],
        raw: response
      };
    } catch (error) {
      logger.error('Failed to get networks:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get bundles for a specific network
  static async getBundles(network) {
    try {
      const response = await fetchWithRetry('/v1/getBundles', {
        method: 'POST',
        data: { network }
      });
      
      return {
        success: true,
        bundles: response?.data || [],
        raw: response
      };
    } catch (error) {
      logger.error(`Failed to get bundles for ${network}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Place an order
  static async placeOrder(network, recipient, capacity) {
    try {
      const orderData = {
        network,
        recipient,
        capacity
      };
      
      logger.info('Placing order', orderData);
      
      const response = await fetchWithRetry('/v1/placeOrder', {
        method: 'POST',
        data: orderData
      });
      
      const vendorReference = response?.data?.reference || response?.data?.order_id;
      
      logger.info('Order placed successfully', {
        vendorReference,
        network,
        recipient,
        capacity
      });
      
      return {
        success: true,
        order: response?.data,
        vendorReference,
        raw: response
      };
    } catch (error) {
      logger.error('Failed to place order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Check order status
  static async checkOrderStatus(reference) {
    try {
      const response = await fetchWithRetry('/v1/checkOrderStatus', {
        method: 'POST',
        data: { reference }
      });
      
      return {
        success: true,
        status: response?.data,
        raw: response
      };
    } catch (error) {
      logger.error(`Failed to check order status for ${reference}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get iShare bundles
  static async getIShareBundles() {
    try {
      const response = await fetchWithRetry('/v1/getIShareBundles', {
        method: 'GET'
      });
      
      return {
        success: true,
        bundles: response?.data || [],
        raw: response
      };
    } catch (error) {
      logger.error('Failed to get iShare bundles:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Check API health/status
  static async checkApiHealth() {
    try {
      const startTime = Date.now();
      const response = await fetchWithRetry('/v1/health', {
        method: 'GET'
      });
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        healthy: true,
        responseTime,
        data: response,
        raw: response
      };
    } catch (error) {
      logger.error('API health check failed:', error);
      return {
        success: false,
        healthy: false,
        error: error.message
      };
    }
  }
}

export default GhDataConnectService;
