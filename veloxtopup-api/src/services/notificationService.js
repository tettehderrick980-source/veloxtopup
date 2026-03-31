import { emailService } from './emailService.js';
import { pushNotificationService } from './pushNotificationService.js';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Notification Service - Centralized notification handling
 * Sends email and push notifications for order events
 */
class NotificationService {
  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation({ email, orderRef, phone, network, plan, amount }) {
    try {
      logger.info(`Sending order confirmation for ${orderRef}`, { email });

      const results = {
        email: false,
        push: false
      };

      // Send email if available
      if (email && !email.includes('@veloxtopup.')) {
        results.email = await emailService.sendOrderConfirmation({
          email,
          orderRef,
          phone,
          network,
          plan,
          amount,
          createdAt: new Date().toISOString()
        });
      }

      // Send push notification if user has subscription
      const user = await this.getUserByEmail(email);
      if (user?.id) {
        results.push = await pushNotificationService.sendOrderUpdate(user.id, {
          orderRef,
          status: 'pending',
          phone,
          plan,
          message: `Order ${orderRef} received! We're processing your ${plan}.`
        });
      }

      logger.info(`Order confirmation sent for ${orderRef}`, results);
      return results;
    } catch (error) {
      logger.error(`Failed to send order confirmation for ${orderRef}`, { error: error.message });
      return { email: false, push: false, error: error.message };
    }
  }

  /**
   * Send delivery success notification
   */
  async sendDeliverySuccess({ email, orderRef, phone, network, plan, amount, userId }) {
    try {
      logger.info(`Sending delivery success for ${orderRef}`);

      const results = { email: false, push: false, whatsapp: false };

      // Send email
      if (email && !email.includes('@veloxtopup.')) {
        results.email = await emailService.sendDeliverySuccess({
          email,
          orderRef,
          phone,
          network,
          plan,
          amount,
          deliveredAt: new Date().toISOString()
        });
      }

      // Send push notification
      if (userId) {
        results.push = await pushNotificationService.sendOrderUpdate(userId, {
          orderRef,
          status: 'delivered',
          phone,
          plan,
          message: `Your ${plan} has been delivered to ${phone}!`
        });
      }

      logger.info(`Delivery success sent for ${orderRef}`, results);
      return results;
    } catch (error) {
      logger.error(`Failed to send delivery success for ${orderRef}`, { error: error.message });
      return { email: false, push: false, error: error.message };
    }
  }

  /**
   * Send order failure notification
   */
  async sendOrderFailure({ email, orderRef, phone, network, plan, amount, reason, userId }) {
    try {
      logger.info(`Sending order failure notification for ${orderRef}`);

      const results = { email: false, push: false };

      // Send email
      if (email && !email.includes('@veloxtopup.')) {
        results.email = await emailService.sendDeliveryFailure({
          email,
          orderRef,
          phone,
          network,
          plan,
          amount,
          reason,
          supportEmail: 'veloxtopupgh@gmail.com',
          supportPhone: '+233 531649960'
        });
      }

      // Send push notification
      if (userId) {
        results.push = await pushNotificationService.sendOrderUpdate(userId, {
          orderRef,
          status: 'failed',
          phone,
          plan,
          message: reason || `Order ${orderRef} failed. Contact support for assistance.`
        });
      }

      logger.info(`Order failure notification sent for ${orderRef}`, results);
      return results;
    } catch (error) {
      logger.error(`Failed to send order failure for ${orderRef}`, { error: error.message });
      return { email: false, push: false, error: error.message };
    }
  }

  /**
   * Send payment receipt notification
   */
  async sendPaymentReceipt({ email, orderRef, amount, paymentMethod, transactionId, userId }) {
    try {
      logger.info(`Sending payment receipt for ${orderRef}`);

      const results = { email: false };

      if (email && !email.includes('@veloxtopup.')) {
        results.email = await emailService.sendPaymentReceipt({
          email,
          orderRef,
          amount,
          paymentMethod,
          transactionId,
          paidAt: new Date().toISOString()
        });
      }

      logger.info(`Payment receipt sent for ${orderRef}`, results);
      return results;
    } catch (error) {
      logger.error(`Failed to send payment receipt for ${orderRef}`, { error: error.message });
      return { email: false, error: error.message };
    }
  }

  /**
   * Send low balance alert
   */
  async sendLowBalanceAlert(userId, balance) {
    try {
      logger.info(`Sending low balance alert to user ${userId}`);

      const result = await pushNotificationService.sendLowBalanceAlert(userId, balance);
      
      logger.info(`Low balance alert sent to user ${userId}`, { success: result });
      return { push: result };
    } catch (error) {
      logger.error(`Failed to send low balance alert to user ${userId}`, { error: error.message });
      return { push: false, error: error.message };
    }
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification({ email, orderRef, amount, reason, userId }) {
    try {
      logger.info(`Sending refund notification for ${orderRef}`);

      const results = { email: false, push: false };

      // Send email
      if (email && !email.includes('@veloxtopup.')) {
        results.email = await emailService.sendDeliveryFailure({
          email,
          orderRef,
          phone: 'N/A',
          network: 'N/A',
          plan: 'N/A',
          amount,
          reason: `Refunded: ${reason}`,
          supportEmail: 'veloxtopupgh@gmail.com',
          supportPhone: '+233 531649960'
        });
      }

      // Send push notification
      if (userId) {
        results.push = await pushNotificationService.sendToUser(userId, {
          title: 'Order Refunded',
          body: `GH₵${amount.toFixed(2)} has been refunded to your wallet for order ${orderRef}.`,
          icon: '/icons/icon-192x192.png',
          tag: `refund-${orderRef}`,
          data: {
            orderRef,
            url: '/transactions'
          }
        });
      }

      logger.info(`Refund notification sent for ${orderRef}`, results);
      return results;
    } catch (error) {
      logger.error(`Failed to send refund notification for ${orderRef}`, { error: error.message });
      return { email: false, push: false, error: error.message };
    }
  }

  /**
   * Helper: Get user by email
   */
  async getUserByEmail(email) {
    try {
      if (!email || email.includes('@veloxtopup.')) return null;
      
      const { data } = await db.getUserByEmail(email);
      return data;
    } catch (error) {
      logger.error('Failed to get user by email', { error: error.message, email });
      return null;
    }
  }

  /**
   * Broadcast promotional notification to all users
   */
  async broadcastPromo({ title, body, actionUrl, image, filter = {} }) {
    try {
      logger.info('Broadcasting promotional notification', { title });

      const result = await pushNotificationService.broadcast({
        title,
        body,
        icon: '/icons/icon-192x192.png',
        image,
        tag: 'promo',
        data: {
          url: actionUrl || '/'
        },
        actions: [
          { action: 'view', title: 'View Offer' }
        ]
      }, filter);

      logger.info('Promo broadcast completed', { success: result });
      return { push: result };
    } catch (error) {
      logger.error('Failed to broadcast promo', { error: error.message });
      return { push: false, error: error.message };
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
