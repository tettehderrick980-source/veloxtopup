import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * Webhook URL Manager
 * Generates and validates secure webhook URLs with unique tokens
 */

class WebhookURLManager {
  constructor() {
    this.baseURL = process.env.WEBHOOK_BASE_URL || this.inferBaseURL();
  }

  /**
   * Infer base URL from environment
   */
  inferBaseURL() {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    if (process.env.CORS_ORIGIN_PROD) {
      return process.env.CORS_ORIGIN_PROD;
    }
    if (process.env.NODE_ENV === 'production') {
      return 'https://veloxtopup.shop';
    }
    return `http://localhost:${process.env.PORT || 3001}`;
  }

  /**
   * Generate a cryptographically secure webhook token
   * @param {string} prefix - Token prefix (e.g., 'wh_tok_', 'ghd_tok_')
   * @returns {string} Secure token
   */
  generateToken(prefix = 'web_tok_') {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString(36);
    return `${prefix}${randomBytes}${timestamp}`;
  }

  /**
   * Get Paystack webhook URL
   * @returns {string} Full webhook URL with token
   */
  getPaystackWebhookURL() {
    const token = process.env.PAYSTACK_WEBHOOK_TOKEN;
    if (!token) {
      logger.warn('PAYSTACK_WEBHOOK_TOKEN not set, using default path');
      return `${this.baseURL}/api/v1/webhooks/paystack`;
    }
    return `${this.baseURL}/api/v1/webhooks/paystack/${token}`;
  }

  /**
   * Get GhDataConnect webhook URL
   * @returns {string} Full webhook URL with token
   */
  getGhDataConnectWebhookURL() {
    const token = process.env.GH_DATACONNECT_WEBHOOK_TOKEN;
    if (!token) {
      logger.warn('GH_DATACONNECT_WEBHOOK_TOKEN not set, using default path');
      return `${this.baseURL}/api/v1/webhooks/ghdataconnect`;
    }
    return `${this.baseURL}/api/v1/webhooks/ghdataconnect/${token}`;
  }

  /**
   * Validate webhook token
   * @param {string} service - 'paystack' or 'ghdataconnect'
   * @param {string} token - Token to validate
   * @returns {boolean} Valid or not
   */
  validateToken(service, token) {
    const envVar = service === 'paystack' 
      ? 'PAYSTACK_WEBHOOK_TOKEN' 
      : 'GH_DATACONNECT_WEBHOOK_TOKEN';
    
    const expectedToken = process.env[envVar];
    
    if (!expectedToken) {
      logger.warn(`${envVar} not set, skipping token validation for ${service}`);
      return true; // Allow if not configured (backward compatibility)
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(token, 'utf8'),
        Buffer.from(expectedToken, 'utf8')
      );
    } catch (error) {
      // Buffers different length
      return false;
    }
  }

  /**
   * Get all webhook URLs for display/configuration
   * @returns {Object} All webhook URLs
   */
  getAllWebhookURLs() {
    return {
      paystack: {
        url: this.getPaystackWebhookURL(),
        token: process.env.PAYSTACK_WEBHOOK_TOKEN,
        configured: !!process.env.PAYSTACK_WEBHOOK_TOKEN
      },
      ghdataconnect: {
        url: this.getGhDataConnectWebhookURL(),
        token: process.env.GH_DATACONNECT_WEBHOOK_TOKEN,
        configured: !!process.env.GH_DATACONNECT_WEBHOOK_TOKEN
      },
      baseURL: this.baseURL
    };
  }

  /**
   * Generate new tokens and return them
   * Use this to rotate webhook URLs
   * @returns {Object} New tokens
   */
  rotateTokens() {
    return {
      paystack: this.generateToken('wh_tok_'),
      ghdataconnect: this.generateToken('ghd_tok_'),
      generatedAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const webhookManager = new WebhookURLManager();

// Export for use in routes
export const getPaystackWebhookURL = () => webhookManager.getPaystackWebhookURL();
export const getGhDataConnectWebhookURL = () => webhookManager.getGhDataConnectWebhookURL();
export const validateWebhookToken = (service, token) => webhookManager.validateToken(service, token);
export const getAllWebhookURLs = () => webhookManager.getAllWebhookURLs();
export const rotateWebhookTokens = () => webhookManager.rotateTokens();
