import ghDataConnectService from './ghDataConnectService.js';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Purchase Service - Handles data bundle fulfillment
 */
class PurchaseService {
  /**
   * Fulfill a data purchase order
   */
  async fulfillOrder({ transactionId, network, phone, capacity, reference, cost_price, selling_price }) {
    try {
      logger.info(`Fulfilling order ${reference}`, { transactionId, network, phone, capacity });

      // Check if transaction is already fulfilled (prevent double-delivery)
      const { data: existingTx } = await db.getTransaction(transactionId);
      if (existingTx?.fulfillment_status === 'fulfilled' || existingTx?.status === 'delivered') {
        logger.warn(`Order ${reference} already fulfilled, skipping`);
        return { success: true, alreadyFulfilled: true, vendorReference: existingTx.vendor_reference };
      }

      // Call GhDataConnect API to purchase bundle
      const purchaseResult = await ghDataConnectService.purchaseBundle({
        phone,
        bundleId: capacity,
        network,
        reference,
        cost_price,
        selling_price
      });

      if (purchaseResult.success) {
        logger.info(`Order ${reference} fulfilled successfully`, {
          vendorReference: purchaseResult.reference,
          transactionId
        });

        return {
          success: true,
          vendorReference: purchaseResult.reference,
          apiResponse: purchaseResult,
          deliveredAt: new Date().toISOString()
        };
      } else {
        throw new Error(purchaseResult.error || 'Purchase API returned failure');
      }
    } catch (error) {
      logger.error(`Failed to fulfill order ${reference}`, {
        error: error.message,
        transactionId,
        network,
        phone
      });

      return {
        success: false,
        error: error.message,
        retryable: this.isRetryableError(error)
      };
    }
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'timeout',
      'network error',
      'connection refused',
      'insufficient balance',
      'api rate limit',
      'temporarily unavailable',
      'service unavailable',
      '502',
      '503',
      '504'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  /**
   * Get order status from vendor
   */
  async getOrderStatus(vendorReference, network) {
    try {
      return await ghDataConnectService.checkTransactionStatus(vendorReference, network);
    } catch (error) {
      logger.error('Failed to get order status', { vendorReference, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Retry a failed order
   */
  async retryOrder(transactionId, attempt = 1) {
    try {
      // Get transaction details
      const { data: transaction } = await db.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Check if already fulfilled
      if (transaction.fulfillment_status === 'fulfilled') {
        return { success: true, alreadyFulfilled: true };
      }

      // Check max retries
      const maxRetries = 3;
      if (attempt > maxRetries) {
        await db.updateTransaction(transactionId, {
          status: 'failed',
          fulfillment_status: 'failed',
          error_message: 'Max retry attempts exceeded',
          updated_at: new Date().toISOString()
        });
        return { success: false, error: 'Max retry attempts exceeded' };
      }

      logger.info(`Retrying order ${transaction.reference}`, { attempt, transactionId });

      // Attempt fulfillment again
      const result = await this.fulfillOrder({
        transactionId,
        network: transaction.network,
        phone: transaction.phone,
        capacity: transaction.capacity,
        reference: transaction.reference,
        cost_price: transaction.cost_price,
        selling_price: transaction.selling_price
      });

      if (result.success) {
        await db.updateTransaction(transactionId, {
          status: 'delivered',
          fulfillment_status: 'fulfilled',
          vendor_reference: result.vendorReference,
          retry_count: attempt,
          delivered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else {
        await db.updateTransaction(transactionId, {
          retry_count: attempt,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      logger.error(`Retry failed for transaction ${transactionId}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

const purchaseService = new PurchaseService();
export default purchaseService;
