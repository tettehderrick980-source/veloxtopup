import webpush from 'web-push';
import logger from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Professional Push Notification Service for VeloxTopUp
 * Handles browser push notifications for order updates
 */
class PushNotificationService {
  constructor() {
    this.isConfigured = false;
    this.supabase = null;
    this.init();
  }

  init() {
    // Check if VAPID keys are configured
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('Push notifications not configured - VAPID keys missing');
      logger.info('Generate VAPID keys with: npx web-push generate-vapid-keys');
      return;
    }

    // Initialize web-push
    webpush.setVapidDetails(
      `mailto:${process.env.SMTP_FROM || 'admin@veloxtopup.com'}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.isConfigured = true;
    logger.info('Push notification service initialized successfully');
  }

  /**
   * Save push subscription to database
   */
  async saveSubscription(userId, subscription) {
    if (!this.isConfigured) {
      logger.warn('Cannot save subscription - push service not configured');
      return false;
    }

    try {
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      logger.info('Push subscription saved', { userId, endpoint: subscription.endpoint });
      return true;
    } catch (error) {
      logger.error('Failed to save push subscription', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Remove push subscription
   */
  async removeSubscription(endpoint) {
    if (!this.isConfigured) return false;

    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      if (error) throw error;

      logger.info('Push subscription removed', { endpoint });
      return true;
    } catch (error) {
      logger.error('Failed to remove push subscription', { error: error.message, endpoint });
      return false;
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(userId, notification) {
    if (!this.isConfigured) return false;

    try {
      // Get user's subscriptions
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) {
        logger.debug('No push subscriptions found for user', { userId });
        return false;
      }

      // Send to all user's devices
      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendNotification(sub, notification))
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      logger.info('Push notifications sent', { userId, total: subscriptions.length, success: successCount });
      
      return successCount > 0;
    } catch (error) {
      logger.error('Failed to send push to user', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Send notification to all subscribers (admin broadcasts)
   */
  async broadcast(notification, filter = {}) {
    if (!this.isConfigured) return false;

    try {
      let query = this.supabase.from('push_subscriptions').select('*');
      
      // Apply filters if provided
      if (filter.userIds) {
        query = query.in('user_id', filter.userIds);
      }

      const { data: subscriptions, error } = await query;

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) return false;

      // Send in batches to avoid overwhelming the server
      const batchSize = 100;
      let successCount = 0;

      for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(sub => this.sendNotification(sub, notification))
        );
        successCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        // Small delay between batches
        if (i + batchSize < subscriptions.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Broadcast push notifications sent', { 
        total: subscriptions.length, 
        success: successCount 
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Failed to broadcast push notifications', { error: error.message });
      return false;
    }
  }

  /**
   * Send order status update notification
   */
  async sendOrderUpdate(userId, { orderRef, status, phone, plan, message }) {
    const notification = {
      title: this.getStatusTitle(status),
      body: message || this.getStatusMessage(status, orderRef, plan),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `order-${orderRef}`,
      requireInteraction: status === 'failed',
      data: {
        orderRef,
        status,
        phone,
        plan,
        url: `/track-order?ref=${orderRef}`
      },
      actions: this.getNotificationActions(status, orderRef)
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send low wallet balance notification
   */
  async sendLowBalanceAlert(userId, balance) {
    const notification = {
      title: 'Low Wallet Balance',
      body: `Your wallet balance is GH₵${balance.toFixed(2)}. Top up now to continue purchasing.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'low-balance',
      data: {
        url: '/wallet'
      },
      actions: [
        { action: 'topup', title: 'Top Up' }
      ]
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send promotional notification
   */
  async sendPromoNotification(userId, { title, body, actionUrl, image }) {
    const notification = {
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      image: image || null,
      tag: 'promo',
      data: {
        url: actionUrl || '/'
      },
      actions: [
        { action: 'view', title: 'View Offer' }
      ]
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Core method to send a single notification
   */
  async sendNotification(subscription, notification) {
    try {
      const payload = JSON.stringify(notification);
      
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      await webpush.sendNotification(pushSubscription, payload);
      return true;
    } catch (error) {
      // If subscription is no longer valid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        logger.info('Removing invalid subscription', { endpoint: subscription.endpoint });
        await this.removeSubscription(subscription.endpoint);
      } else {
        logger.error('Failed to send push notification', { 
          error: error.message, 
          endpoint: subscription.endpoint 
        });
      }
      return false;
    }
  }

  // Helper methods
  getStatusTitle(status) {
    const titles = {
      'pending': '⏳ Order Received',
      'processing': '🔄 Processing Order',
      'queued': '⏳ Order Queued',
      'delivered': '✅ Data Delivered!',
      'failed': '❌ Delivery Failed',
      'cancelled': '🚫 Order Cancelled',
      'refunded': '💰 Order Refunded'
    };
    return titles[status] || 'Order Update';
  }

  getStatusMessage(status, orderRef, plan) {
    const messages = {
      'pending': `Order ${orderRef} is being processed.`,
      'processing': `We're working on your ${plan} order ${orderRef}.`,
      'queued': `Order ${orderRef} is in queue. You'll receive it shortly.`,
      'delivered': `Your ${plan} has been delivered!`,
      'failed': `Order ${orderRef} failed. Tap to contact support.`,
      'cancelled': `Order ${orderRef} has been cancelled.`,
      'refunded': `GH₵${plan} has been refunded for order ${orderRef}.`
    };
    return messages[status] || `Update for order ${orderRef}`;
  }

  getNotificationActions(status, orderRef) {
    const actions = {
      'pending': [
        { action: 'track', title: 'Track Order' }
      ],
      'processing': [
        { action: 'track', title: 'Track Order' }
      ],
      'delivered': [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      'failed': [
        { action: 'support', title: 'Contact Support' },
        { action: 'retry', title: 'Try Again' }
      ],
      'cancelled': [
        { action: 'support', title: 'Contact Support' }
      ]
    };
    return actions[status] || [{ action: 'view', title: 'View' }];
  }

  /**
   * Get VAPID public key for client subscription
   */
  getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
