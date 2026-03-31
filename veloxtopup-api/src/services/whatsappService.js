import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * WhatsApp Business API Integration for VeloxTopUp
 * Supports WhatsApp Cloud API (Meta) and WhatsApp Business API providers
 */
class WhatsAppService {
  constructor() {
    this.isConfigured = false;
    this.apiUrl = null;
    this.accessToken = null;
    this.phoneNumberId = null;
    this.businessAccountId = null;
    this.provider = 'meta'; // 'meta', 'twilio', 'messagebird', 'other'
    this.init();
  }

  init() {
    // Check for Meta/WhatsApp Cloud API configuration
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      this.provider = 'meta';
      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
      this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}`;
      this.isConfigured = true;
      logger.info('WhatsApp service initialized with Meta Cloud API');
      return;
    }

    // Check for Twilio configuration
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
      this.provider = 'twilio';
      this.accountSid = process.env.TWILIO_ACCOUNT_SID;
      this.authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      this.isConfigured = true;
      logger.info('WhatsApp service initialized with Twilio');
      return;
    }

    // Check for generic provider configuration
    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY) {
      this.provider = 'other';
      this.apiUrl = process.env.WHATSAPP_API_URL;
      this.apiKey = process.env.WHATSAPP_API_KEY;
      this.fromNumber = process.env.WHATSAPP_FROM_NUMBER;
      this.isConfigured = true;
      logger.info('WhatsApp service initialized with generic provider');
      return;
    }

    logger.warn('WhatsApp service not configured - no provider settings found');
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendMessage(to, message) {
    if (!this.isConfigured) {
      logger.warn('Cannot send WhatsApp message - service not configured');
      return { success: false, error: 'Service not configured' };
    }

    try {
      switch (this.provider) {
        case 'meta':
          return await this.sendMetaMessage(to, message);
        case 'twilio':
          return await this.sendTwilioMessage(to, message);
        case 'other':
          return await this.sendGenericMessage(to, message);
        default:
          throw new Error('Unknown provider');
      }
    } catch (error) {
      logger.error('Failed to send WhatsApp message', { 
        error: error.message, 
        to, 
        provider: this.provider 
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(to, orderDetails) {
    const { orderRef, phone, network, plan, amount, trackUrl } = orderDetails;
    
    const message = `Hello! Your data order has been received.

📦 Order: ${orderRef}
📱 Phone: ${phone}
📡 Network: ${network}
📊 Plan: ${plan}
💰 Amount: GH₵${amount.toFixed(2)}

Track your order: ${trackUrl}

Thank you for choosing VeloxTopUp! 🚀`;

    return this.sendMessage(to, message);
  }

  /**
   * Send delivery success notification
   */
  async sendDeliverySuccess(to, orderDetails) {
    const { orderRef, phone, network, plan } = orderDetails;
    
    const message = `Great news! Your data bundle has been delivered! ✅

📦 Order: ${orderRef}
📱 Phone: ${phone}
📡 Network: ${network}
📊 Plan: ${plan}

You should receive a confirmation SMS from ${network} shortly.

Thank you for choosing VeloxTopUp! 🎉`;

    return this.sendMessage(to, message);
  }

  /**
   * Send delivery failure notification
   */
  async sendDeliveryFailure(to, orderDetails, supportContact) {
    const { orderRef, phone, plan, reason } = orderDetails;
    
    const message = `We encountered an issue with your order. ❌

📦 Order: ${orderRef}
📱 Phone: ${phone}
📊 Plan: ${plan}
⚠️ Issue: ${reason || 'Delivery failed'}

Our team will resolve this shortly. For urgent assistance:
📧 ${supportContact.email}
📞 ${supportContact.phone}

We apologize for any inconvenience.`;

    return this.sendMessage(to, message);
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(to, paymentDetails) {
    const { orderRef, amount, paymentMethod, transactionId, paidAt } = paymentDetails;
    
    const message = `Payment Received! ✅

📦 Order: ${orderRef}
💰 Amount: GH₵${amount.toFixed(2)}
💳 Method: ${paymentMethod}
🆔 Transaction ID: ${transactionId}
🕐 Date: ${new Date(paidAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}

Thank you for your payment! Your order is being processed.`;

    return this.sendMessage(to, message);
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(to, balance) {
    const message = `Low Wallet Balance Alert ⚠️

Your current balance is GH₵${balance.toFixed(2)}.

Top up now to continue purchasing data bundles instantly.

Visit: ${process.env.FRONTEND_URL || 'https://veloxtopup.com'}/wallet

-VeloxTopUp Team`;

    return this.sendMessage(to, message);
  }

  /**
   * Send promotional message
   */
  async sendPromo(to, promoDetails) {
    const { title, description, code, discount, expiryDate } = promoDetails;
    
    const message = `${title} 🎉

${description}

🎟️ Code: ${code}
💰 Discount: ${discount}
⏰ Valid until: ${expiryDate}

Shop now: ${process.env.FRONTEND_URL || 'https://veloxtopup.com'}

*Terms and conditions apply.`;

    return this.sendMessage(to, message);
  }

  /**
   * Send interactive message with buttons (Meta API only)
   */
  async sendInteractiveMessage(to, message, buttons) {
    if (this.provider !== 'meta') {
      return this.sendMessage(to, message); // Fallback for non-Meta providers
    }

    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message
          },
          action: {
            buttons: buttons.map((btn, index) => ({
              type: 'reply',
              reply: {
                id: btn.id || `btn_${index}`,
                title: btn.title
              }
            }))
          }
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Interactive WhatsApp message sent', { 
        to, 
        messageId: response.data.messages?.[0]?.id 
      });

      return { success: true, messageId: response.data.messages?.[0]?.id };
    } catch (error) {
      logger.error('Failed to send interactive message', { error: error.message, to });
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify webhook signature (Meta)
   */
  verifyWebhookSignature(payload, signature) {
    if (this.provider !== 'meta' || !this.appSecret) {
      return true; // Skip verification if not Meta or no secret
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Process incoming webhook message
   */
  async processWebhook(body) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return { handled: false };
      }

      const message = messages[0];
      const from = message.from;
      const text = message.text?.body || '';

      logger.info('WhatsApp message received', { from, text: text.substring(0, 50) });

      // Handle commands
      const response = await this.handleCommand(from, text.toLowerCase().trim());
      
      if (response) {
        await this.sendMessage(from, response);
      }

      return { handled: true, from, text };
    } catch (error) {
      logger.error('Error processing WhatsApp webhook', { error: error.message });
      return { handled: false, error: error.message };
    }
  }

  /**
   * Handle bot commands
   */
  async handleCommand(from, text) {
    const commands = {
      'help': `Welcome to VeloxTopUp WhatsApp Bot! 🚀

Available commands:
• BALANCE - Check your wallet balance
• BUY - Start a new purchase
• STATUS <order-ref> - Check order status
• TRACK <phone> - Track by phone number
• SUPPORT - Get help

Or simply type your question!`,

      'balance': 'Please login to the website or app to check your wallet balance: https://veloxtopup.com/wallet',
      
      'buy': 'To buy data bundles, visit: https://veloxtopup.com or use our mobile app for the best experience!',
      
      'support': `Need help? Contact us:

📧 Email: veloxtopupgh@gmail.com
📞 Phone: +233 531649960
🌐 Website: https://veloxtopup.com

Our support team is available 24/7!`,
    };

    // Check for exact matches
    if (commands[text]) {
      return commands[text];
    }

    // Check for status command with order reference
    if (text.startsWith('status ') || text.startsWith('track ')) {
      const ref = text.split(' ')[1];
      if (ref) {
        return `To check order ${ref}, please visit: https://veloxtopup.com/track-order?ref=${ref}`;
      }
    }

    // Default response for unrecognized commands
    if (text.length > 0) {
      return `I didn't understand that. Type HELP to see available commands, or visit https://veloxtopup.com for assistance.`;
    }

    return null;
  }

  // Provider-specific implementations

  async sendMetaMessage(to, message) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };

    const response = await axios.post(
      `${this.apiUrl}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { 
      success: true, 
      messageId: response.data.messages?.[0]?.id 
    };
  }

  async sendTwilioMessage(to, message) {
    const params = new URLSearchParams();
    params.append('From', `whatsapp:${this.fromNumber}`);
    params.append('To', `whatsapp:${this.formatPhoneNumber(to)}`);
    params.append('Body', message);

    const response = await axios.post(
      this.apiUrl,
      params,
      {
        auth: {
          username: this.accountSid,
          password: this.authToken
        }
      }
    );

    return { 
      success: true, 
      messageId: response.data.sid 
    };
  }

  async sendGenericMessage(to, message) {
    const response = await axios.post(
      this.apiUrl,
      {
        to: this.formatPhoneNumber(to),
        from: this.fromNumber,
        message: message,
        type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { 
      success: true, 
      messageId: response.data.id || response.data.messageId 
    };
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with country code (default to Ghana +233 if no country code)
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Check service health
   */
  async healthCheck() {
    if (!this.isConfigured) {
      return { status: 'not_configured', healthy: false };
    }

    try {
      if (this.provider === 'meta') {
        // Check phone number status
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`
            }
          }
        );

        return {
          status: 'healthy',
          healthy: true,
          provider: this.provider,
          phoneNumber: response.data.display_phone_number,
          qualityRating: response.data.quality_rating
        };
      }

      return { status: 'healthy', healthy: true, provider: this.provider };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        provider: this.provider,
        error: error.message
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
