import express from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { logger, logTransaction } from '../utils/logger.js';
import { validateWebhookToken } from '../utils/webhookManager.js';
import purchaseService from '../services/purchaseService.js';
import notificationService from '../services/notificationService.js';
import orderRetryService from '../services/orderRetryService.js';

const router = express.Router();

// Token validation middleware
const validateToken = (service) => {
  return (req, res, next) => {
    const token = req.params.token;
    
    if (!token) {
      logger.warn(`Webhook access attempt without token for ${service}`, {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({ error: 'Unauthorized - Token required' });
    }
    
    if (!validateWebhookToken(service, token)) {
      logger.warn(`Invalid webhook token for ${service}`, {
        ip: req.ip,
        token: token.substring(0, 10) + '...'
      });
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    next();
  };
};

// Paystack webhook handler with token
router.post('/paystack/:token', validateToken('paystack'), express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
  const signature = req.headers['x-paystack-signature'];

  if (hash !== signature) {
    logger.warn('Invalid Paystack webhook signature', {
      receivedSignature: signature,
      expectedHash: hash,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const event = JSON.parse(req.body);
    logger.info('Paystack webhook received', {
      event: event.event,
      reference: event.data.reference,
      status: event.data.status
    });

    // Store webhook event
    await storeWebhookEvent('paystack', event.event, event);

    switch (event.event) {
      case 'charge.success':
        await handlePaystackSuccess(event);
        break;
      
      case 'charge.failed':
        await handlePaystackFailure(event);
        break;
      
      case 'transfer.success':
      case 'transfer.failed':
        await handlePaystackTransfer(event);
        break;
      
      default:
        logger.info(`Unhandled Paystack event: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Paystack webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// GhDataConnect webhook handler with token
router.post('/ghdataconnect/:token', validateToken('ghdataconnect'), express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    logger.info('GhDataConnect webhook received', {
      event: event.event || 'unknown',
      reference: event.reference || event.order_id,
      status: event.status
    });

    // Store webhook event
    await storeWebhookEvent('ghdataconnect', event.event || 'order_update', event);

    // Handle order status updates
    if (event.reference || event.order_id) {
      await handleGhDataConnectOrderUpdate(event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('GhDataConnect webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// Helper function to handle Paystack successful payment
const handlePaystackSuccess = async (event) => {
  const { data } = event;
  const reference = data.reference;
  const amount = data.amount / 100; // Convert from kobo to GHS
  const customerEmail = data.customer.email;

  try {
    // Find transaction by payment reference
    const { data: transactions } = await db.getAllTransactions();
    const transaction = transactions?.find(t => t.payment_reference === reference);

    if (!transaction) {
      logger.warn(`Transaction not found for payment reference: ${reference}`);
      return;
    }

    // Update transaction status
    await db.updateTransaction(transaction.id, {
      status: 'processing',
      payment_verified_at: new Date().toISOString(),
      api_response: {
        paystack_event: event,
        payment_amount: amount
      }
    });

    // If it's a wallet funding transaction, update wallet balance
    if (transaction.type === 'wallet_funding') {
      const { data: wallet } = await db.getWallet(transaction.user_id);
      if (wallet) {
        const newBalance = wallet.balance + amount;
        await db.updateWalletBalance(transaction.user_id, newBalance);
        
        logger.info(`Wallet funded for user ${transaction.user_id}`, {
          amount,
          newBalance,
          reference
        });
      }
    }

    // If it's a data purchase, trigger the purchase process
    if (transaction.type === 'data') {
      try {
        logger.info(`Triggering data purchase fulfillment for transaction ${transaction.id}`);
        
        // Call the purchase service to fulfill the order
        const purchaseResult = await purchaseService.fulfillOrder({
          transactionId: transaction.id,
          network: transaction.network,
          phone: transaction.phone,
          capacity: transaction.capacity,
          reference: transaction.reference,
          cost_price: transaction.cost_price,
          selling_price: transaction.selling_price
        });

        if (purchaseResult.success) {
          // Update transaction as delivered
          await db.updateTransaction(transaction.id, {
            status: 'delivered',
            fulfillment_status: 'fulfilled',
            vendor_reference: purchaseResult.vendorReference,
            api_response: purchaseResult,
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          // Send notifications
          await notificationService.sendOrderConfirmation({
            email: transaction.guest_email || customerEmail,
            orderRef: transaction.reference,
            phone: transaction.phone,
            network: transaction.network,
            plan: transaction.plan,
            amount: transaction.amount
          });

          logger.info(`Data purchase fulfilled successfully for transaction ${transaction.id}`);
        } else {
          // If purchase failed, mark for retry or refund
          await db.updateTransaction(transaction.id, {
            status: 'failed',
            fulfillment_status: 'failed',
            retry_scheduled_at: new Date().toISOString(),
            api_response: purchaseResult,
            updated_at: new Date().toISOString()
          });

          // Schedule retry
          await orderRetryService.scheduleRetry(transaction.id, {
            delay: 300000, // 5 minutes
            maxRetries: 3
          });

          logger.warn(`Data purchase failed for transaction ${transaction.id}, scheduled for retry`);
        }
      } catch (purchaseError) {
        logger.error(`Error fulfilling data purchase for transaction ${transaction.id}:`, purchaseError);
        
        // Update transaction status to failed
        await db.updateTransaction(transaction.id, {
          status: 'failed',
          fulfillment_status: 'failed',
          error_message: purchaseError.message,
          updated_at: new Date().toISOString()
        });

        // Send failure notification
        await notificationService.sendOrderFailure({
          email: transaction.guest_email || customerEmail,
          orderRef: transaction.reference,
          phone: transaction.phone,
          network: transaction.network,
          plan: transaction.plan,
          amount: transaction.amount,
          reason: purchaseError.message
        });
      }
    }

    logTransaction(transaction.id, 'payment_verified', {
      amount,
      reference,
      customerEmail
    });

  } catch (error) {
    logger.error('Error handling Paystack success:', error);
  }
};

// Helper function to handle Paystack failed payment
const handlePaystackFailure = async (event) => {
  const { data } = event;
  const reference = data.reference;

  try {
    // Find transaction by payment reference
    const { data: transactions } = await db.getAllTransactions();
    const transaction = transactions?.find(t => t.payment_reference === reference);

    if (!transaction) {
      logger.warn(`Transaction not found for failed payment reference: ${reference}`);
      return;
    }

    // Update transaction status to failed
    await db.updateTransaction(transaction.id, {
      status: 'failed',
      payment_failed_at: new Date().toISOString(),
      api_response: {
        paystack_event: event,
        failure_reason: data.gateway_response || 'Payment failed'
      }
    });

    logTransaction(transaction.id, 'payment_failed', {
      reference,
      reason: data.gateway_response
    });

  } catch (error) {
    logger.error('Error handling Paystack failure:', error);
  }
};

// Helper function to handle Paystack transfers
const handlePaystackTransfer = async (event) => {
  const { data } = event;
  const reference =_transfer.reference;

  try {
    logger.info('Paystack transfer event received', {
      reference,
      status: event.event,
      amount: data.amount / 100
    });

    // TODO: Handle transfer logic if needed
    // This would be for refunds or payouts

  } catch (error) {
    logger.error('Error handling Paystack transfer:', error);
  }
};

// Helper function to handle GhDataConnect order updates
const handleGhDataConnectOrderUpdate = async (event) => {
  const reference = event.reference || event.order_id;
  const status = event.status;

  try {
    // Find transaction by vendor reference
    const { data: transactions } = await db.getAllTransactions();
    const transaction = transactions?.find(t => t.vendor_reference === reference);

    if (!transaction) {
      logger.warn(`Transaction not found for vendor reference: ${reference}`);
      return;
    }

    // Map GhDataConnect status to our status
    let newStatus = 'pending';
    if (status === 'success' || status === 'delivered') {
      newStatus = 'delivered';
    } else if (status === 'failed') {
      newStatus = 'failed';
    } else if (status === 'processing') {
      newStatus = 'processing';
    }

    // Update transaction status
    await db.updateTransaction(transaction.id, {
      status: newStatus,
      fulfillment_status: newStatus === 'delivered' ? 'fulfilled' : newStatus,
      api_response: {
        ghdataconnect_event: event,
        vendor_status: status
      },
      updated_at: new Date().toISOString()
    });

    logTransaction(transaction.id, 'vendor_status_update', {
      vendorReference: reference,
      vendorStatus: status,
      newStatus
    });

    // If order failed, mark for refund
    if (newStatus === 'failed') {
      await db.updateTransaction(transaction.id, {
        needs_refund: true,
        refund_reason: 'Vendor failed to deliver'
      });

      logger.warn(`Transaction ${transaction.id} marked for refund due to vendor failure`);
    }

  } catch (error) {
    logger.error('Error handling GhDataConnect order update:', error);
  }
};

// Helper function to store webhook events
const storeWebhookEvent = async (source, eventType, payload) => {
  try {
    await db.createWebhookEvent({
      source,
      event_type: eventType,
      payload,
      processed: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error storing webhook event:', error);
  }
};

// Add missing webhook event function to db
db.createWebhookEvent = async (eventData) => {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert(eventData)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error creating webhook event:', error);
    return { data: null, error };
  }
};

// GET /api/v1/webhooks/events - Get webhook events (admin only)
router.get('/events', asyncHandler(async (req, res) => {
  try {
    const { source, processed, limit = 50 } = req.query;
    
    let query = supabase
      .from('webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (source) {
      query = query.eq('source', source);
    }

    if (processed !== undefined) {
      query = query.eq('processed', processed === 'true');
    }

    const { data: events, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    logger.error('Error fetching webhook events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook events'
    });
  }
}));

// POST /api/v1/webhooks/events/:id/process - Manually process webhook event
router.post('/events/:id/process', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Get webhook event
    const { data: event, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !event) {
      return res.status(404).json({
        success: false,
        error: 'Webhook event not found'
      });
    }

    // Mark as processed
    await supabase
      .from('webhook_events')
      .update({ 
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', id);

    logger.info(`Webhook event ${id} manually processed`);

    res.status(200).json({
      success: true,
      message: 'Webhook event processed successfully'
    });
  } catch (error) {
    logger.error(`Error processing webhook event ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook event'
    });
  }
}));

export default router;
