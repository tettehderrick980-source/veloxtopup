import Queue from 'bull';
import logger from '../utils/logger.js';
import { emailService } from './emailService.js';
import { pushNotificationService } from './pushNotificationService.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Professional Order Retry Queue Service for VeloxTopUp
 * Automatically retries failed orders with exponential backoff
 */
class OrderRetryService {
  constructor() {
    this.retryQueue = null;
    this.supabase = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    // Check if Redis is configured
    if (!process.env.REDIS_HOST) {
      logger.warn('Order retry service not initialized - Redis not configured');
      return;
    }

    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Initialize Bull queue
    this.retryQueue = new Queue('order-retry', {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.setupQueueProcessors();
    this.isInitialized = true;
    logger.info('Order retry service initialized successfully');
  }

  setupQueueProcessors() {
    // Process retry jobs
    this.retryQueue.process('retry-order', async (job) => {
      const { orderId, attempt, maxRetries } = job.data;
      
      logger.info('Processing retry job', { orderId, attempt, maxRetries });
      
      return this.processRetry(orderId, attempt, maxRetries);
    });

    // Process refund jobs
    this.retryQueue.process('refund-order', async (job) => {
      const { orderId, reason } = job.data;
      
      logger.info('Processing refund job', { orderId, reason });
      
      return this.processRefund(orderId, reason);
    });

    // Handle completed jobs
    this.retryQueue.on('completed', (job, result) => {
      logger.info('Retry job completed', { 
        jobId: job.id, 
        orderId: job.data.orderId,
        result 
      });
    });

    // Handle failed jobs
    this.retryQueue.on('failed', (job, err) => {
      logger.error('Retry job failed', { 
        jobId: job.id, 
        orderId: job.data.orderId,
        error: err.message,
        attempts: job.attemptsMade
      });

      // If max attempts reached, schedule refund
      if (job.attemptsMade >= job.opts.attempts - 1) {
        this.scheduleRefund(job.data.orderId, 'Max retry attempts exceeded');
      }
    });
  }

  /**
   * Add an order to the retry queue
   */
  async scheduleRetry(orderId, options = {}) {
    if (!this.isInitialized) {
      logger.warn('Cannot schedule retry - service not initialized');
      return false;
    }

    const {
      delay = 300000, // Default 5 minutes
      priority = 1,
      maxRetries = 3
    } = options;

    try {
      const job = await this.retryQueue.add('retry-order', {
        orderId,
        attempt: 1,
        maxRetries
      }, {
        delay,
        priority,
        attempts: maxRetries,
        backoff: {
          type: 'exponential',
          delay: 300000, // 5 minutes base
        }
      });

      // Update order status
      await this.supabase
        .from('transactions')
        .update({
          retry_scheduled_at: new Date().toISOString(),
          retry_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      logger.info('Order scheduled for retry', { orderId, jobId: job.id, delay });
      return true;
    } catch (error) {
      logger.error('Failed to schedule retry', { error: error.message, orderId });
      return false;
    }
  }

  /**
   * Schedule a refund for an order
   */
  async scheduleRefund(orderId, reason) {
    if (!this.isInitialized) return false;

    try {
      const job = await this.retryQueue.add('refund-order', {
        orderId,
        reason
      }, {
        delay: 0, // Process immediately
        priority: 10 // High priority
      });

      logger.info('Refund scheduled', { orderId, jobId: job.id, reason });
      return true;
    } catch (error) {
      logger.error('Failed to schedule refund', { error: error.message, orderId });
      return false;
    }
  }

  /**
   * Process a retry attempt
   */
  async processRetry(orderId, attempt, maxRetries) {
    try {
      // Get order details
      const { data: order, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!order) throw new Error('Order not found');

      // Skip if order is no longer in failed state
      if (order.fulfillment_status !== 'failed' && order.status !== 'failed') {
        logger.info('Order no longer failed, skipping retry', { orderId, status: order.status });
        return { success: true, skipped: true, reason: 'Order no longer failed' };
      }

      // Attempt to fulfill the order via GhDataConnect API
      const fulfillmentResult = await this.attemptFulfillment(order);

      if (fulfillmentResult.success) {
        // Update order status
        await this.supabase
          .from('transactions')
          .update({
            fulfillment_status: 'delivered',
            status: 'completed',
            delivered_at: new Date().toISOString(),
            retry_count: attempt,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // Send notifications
        await this.notifySuccess(order);

        logger.info('Order retry successful', { orderId, attempt });
        return { success: true, orderId };
      } else {
        // Update retry count
        await this.supabase
          .from('transactions')
          .update({
            retry_count: attempt,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        // If this was the last attempt, schedule refund
        if (attempt >= maxRetries) {
          await this.scheduleRefund(orderId, fulfillmentResult.error || 'Max retries reached');
        }

        throw new Error(fulfillmentResult.error || 'Fulfillment failed');
      }
    } catch (error) {
      logger.error('Retry processing failed', { error: error.message, orderId, attempt });
      throw error; // Let Bull handle retry logic
    }
  }

  /**
   * Attempt to fulfill an order
   */
  async attemptFulfillment(order) {
    try {
      // Import GhDataConnect service dynamically to avoid circular deps
      const { default: GhDataConnectService } = await import('./ghdataconnect.js');
      
      const result = await GhDataConnectService.purchaseBundle({
        phone: order.phone_number,
        bundleId: order.bundle_id,
        network: order.network,
        reference: order.reference
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(orderId, reason) {
    try {
      const { data: order, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Skip if already refunded
      if (order.fulfillment_status === 'refunded') {
        return { success: true, skipped: true };
      }

      // Update order status
      await this.supabase
        .from('transactions')
        .update({
          fulfillment_status: 'refunded',
          status: 'refunded',
          refund_reason: reason,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      // If user has wallet, credit it back
      if (order.user_id) {
        const { data: wallet } = await this.supabase
          .from('wallets')
          .select('*')
          .eq('user_id', order.user_id)
          .single();

        if (wallet) {
          await this.supabase
            .from('wallets')
            .update({
              balance: wallet.balance + order.amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

          // Record wallet transaction
          await this.supabase
            .from('wallet_transactions')
            .insert({
              wallet_id: wallet.id,
              user_id: order.user_id,
              type: 'refund',
              amount: order.amount,
              description: `Refund for failed order ${order.reference}`,
              reference: order.reference,
              created_at: new Date().toISOString()
            });
        }
      }

      // Send notifications
      await this.notifyRefund(order, reason);

      logger.info('Refund processed', { orderId, reason });
      return { success: true, orderId };
    } catch (error) {
      logger.error('Refund processing failed', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * Send success notification
   */
  async notifySuccess(order) {
    const notificationData = {
      orderRef: order.reference,
      status: 'delivered',
      phone: order.phone_number,
      plan: order.plan,
      message: `Your ${order.plan} has been successfully delivered!`
    };

    // Push notification
    if (order.user_id) {
      await pushNotificationService.sendOrderUpdate(order.user_id, notificationData);
    }

    // Email notification
    if (order.guest_email || order.user_email) {
      await emailService.sendDeliverySuccess({
        email: order.guest_email || order.user_email,
        orderRef: order.reference,
        phone: order.phone_number,
        network: order.network,
        plan: order.plan,
        amount: order.amount,
        deliveredAt: new Date().toISOString()
      });
    }
  }

  /**
   * Send refund notification
   */
  async notifyRefund(order, reason) {
    // Push notification
    if (order.user_id) {
      await pushNotificationService.sendToUser(order.user_id, {
        title: 'Order Refunded',
        body: `GH₵${order.amount.toFixed(2)} has been refunded to your wallet.`,
        icon: '/icons/icon-192x192.png',
        tag: `refund-${order.reference}`,
        data: {
          orderRef: order.reference,
          url: '/transactions'
        }
      });
    }

    // Email notification
    if (order.guest_email || order.user_email) {
      await emailService.sendDeliveryFailure({
        email: order.guest_email || order.user_email,
        orderRef: order.reference,
        phone: order.phone_number,
        network: order.network,
        plan: order.plan,
        amount: order.amount,
        reason: `Order refunded: ${reason}`,
        supportEmail: 'veloxtopupgh@gmail.com',
        supportPhone: '+233 531649960'
      });
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.isInitialized) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.retryQueue.getWaitingCount(),
      this.retryQueue.getActiveCount(),
      this.retryQueue.getCompletedCount(),
      this.retryQueue.getFailedCount(),
      this.retryQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(daysToKeep = 7) {
    if (!this.isInitialized) return;

    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    await this.retryQueue.clean(cutoff, 'completed');
    await this.retryQueue.clean(cutoff, 'failed');
    
    logger.info('Old jobs cleaned up', { daysToKeep, cutoff });
  }
}

export const orderRetryService = new OrderRetryService();
export default orderRetryService;
