import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { GhDataConnectService } from '../services/ghDataConnectService.js';
import { logger, logTransaction, logUserAction } from '../utils/logger.js';

const router = express.Router();

// Validation rules
const purchaseValidation = [
  body('network')
    .isIn(['mtn', 'telecel', 'atbigtime', 'atishare'])
    .withMessage('Invalid network provider'),
  body('phone')
    .matches(/^(0[234]\d{8}|233[234]\d{8})$/)
    .withMessage('Invalid Ghanaian phone number'),
  body('capacity')
    .isString()
    .notEmpty()
    .withMessage('Capacity is required'),
  body('cost_price')
    .isFloat({ min: 0.01 })
    .withMessage('Cost price must be a positive number'),
  body('selling_price')
    .isFloat({ min: 0.01 })
    .withMessage('Selling price must be a positive number'),
  body('reference')
    .isString()
    .notEmpty()
    .withMessage('Reference is required'),
  body('payment_reference')
    .optional()
    .isString()
];

// Constants
const MAX_TRANSACTION_AMOUNT = 500; // GHS
const LOW_BALANCE_THRESHOLD = 10; // GHS
const ORDER_EXPIRY_HOURS = 1;

// POST /api/v1/purchases - Create a new purchase
router.post('/', purchaseValidation, asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const {
    network,
    phone,
    capacity,
    cost_price,
    selling_price,
    reference,
    payment_reference,
    user_id
  } = req.body;

  // Validate transaction amount
  if (selling_price > MAX_TRANSACTION_AMOUNT) {
    return res.status(400).json({
      success: false,
      error: `Transaction amount exceeds maximum limit of GH₵${MAX_TRANSACTION_AMOUNT}`
    });
  }

  // Log purchase attempt
  logUserAction(user_id || 'anonymous', 'purchase_attempt', {
    network,
    phone: phone.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2'), // Mask phone number
    capacity,
    amount: selling_price
  });

  try {
    // Create transaction record
    const transactionData = {
      user_id: user_id || null,
      type: 'data',
      network,
      phone,
      plan: capacity,
      amount: selling_price,
      status: 'pending',
      reference,
      payment_reference,
      fulfillment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: transaction, error: transactionError } = await db.createTransaction(transactionData);
    if (transactionError) {
      throw new Error(`Failed to create transaction: ${transactionError.message}`);
    }

    logger.info(`Transaction created: ${transaction.id}`);

    // Check wallet balance
    const balanceResult = await GhDataConnectService.getWalletBalance();
    if (!balanceResult.success) {
      throw new Error(`Failed to check wallet balance: ${balanceResult.error}`);
    }

    const currentBalance = balanceResult.balance;

    // Update transaction with balance info
    await db.updateTransaction(transaction.id, {
      api_response: { wallet_balance: currentBalance },
      payment_verified_at: payment_reference ? new Date().toISOString() : null
    });

    // Check for low balance
    if (currentBalance < LOW_BALANCE_THRESHOLD) {
      logger.warn(`⚠️ LOW BALANCE ALERT: Wallet balance is GH₵${currentBalance.toFixed(2)}`);
      // TODO: Send admin notification
    }

    // Check if we have sufficient balance
    if (currentBalance < cost_price) {
      // Queue the order
      logger.warn(`⚠️ Insufficient balance. Queuing order ${transaction.id}`);
      
      const expiresAt = new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
      
      await db.updateTransaction(transaction.id, {
        fulfillment_status: 'queued',
        fulfillment_expires_at: expiresAt,
        api_response: { 
          wallet_balance: currentBalance,
          queued_reason: 'insufficient_balance',
          queue_message: 'Order queued. Admin has been notified.'
        }
      });

      logTransaction(transaction.id, 'queued', {
        reason: 'insufficient_balance',
        currentBalance,
        requiredBalance: cost_price,
        expiresAt
      });

      return res.status(200).json({
        success: true,
        data: {
          transactionId: transaction.id,
          status: 'queued',
          message: 'Order received and queued. Admin has been notified. You will be updated once processed.',
          wallet_balance: currentBalance,
          expires_at: expiresAt
        }
      });
    }

    // We have sufficient balance - proceed with order
    logger.info(`✅ Sufficient balance. Processing order ${transaction.id}`);

    // Update transaction to processing
    await db.updateTransaction(transaction.id, {
      status: 'processing',
      fulfillment_status: 'processing',
      payment_verified_at: payment_reference ? new Date().toISOString() : null
    });

    logTransaction(transaction.id, 'processing', {
      network,
      phone,
      capacity,
      amount: selling_price
    });

    // Place order with GhDataConnect
    const orderResult = await GhDataConnectService.placeOrder(network, phone, capacity);
    
    if (!orderResult.success) {
      throw new Error(`Failed to place order: ${orderResult.error}`);
    }

    // Update transaction with success
    await db.updateTransaction(transaction.id, {
      status: 'delivered',
      fulfillment_status: 'fulfilled',
      vendor_reference: orderResult.vendorReference,
      api_response: orderResult.raw
    });

    logTransaction(transaction.id, 'delivered', {
      vendorReference: orderResult.vendorReference,
      orderData: orderResult.order
    });

    logUserAction(user_id || 'anonymous', 'purchase_completed', {
      transactionId: transaction.id,
      network,
      capacity,
      amount: selling_price,
      vendorReference: orderResult.vendorReference
    });

    res.status(200).json({
      success: true,
      data: {
        transactionId: transaction.id,
        vendorReference: orderResult.vendorReference,
        order: orderResult.order,
        status: 'delivered',
        message: 'Data bundle delivered successfully!',
        wallet_balance: currentBalance
      }
    });

  } catch (error) {
    logger.error('Purchase processing error:', error);
    
    // If we have a transaction ID, update it to failed
    if (req.body.reference) {
      try {
        // Find transaction by reference
        const transactions = await db.getAllTransactions();
        const failedTransaction = transactions.data?.find(t => t.reference === req.body.reference);
        
        if (failedTransaction) {
          await db.updateTransaction(failedTransaction.id, {
            status: 'failed',
            fulfillment_status: 'failed',
            needs_refund: true,
            api_response: { error: error.message }
          });

          logTransaction(failedTransaction.id, 'failed', {
            error: error.message,
            needsRefund: true
          });
        }
      } catch (updateError) {
        logger.error('Error updating failed transaction:', updateError);
      }
    }

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

// GET /api/v1/purchases/networks - Get available networks
router.get('/networks', asyncHandler(async (req, res) => {
  try {
    const result = await GhDataConnectService.getNetworks();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: result.networks
    });
  } catch (error) {
    logger.error('Error fetching networks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch networks'
    });
  }
}));

// GET /api/v1/purchases/bundles/:network - Get bundles for a network
router.get('/bundles/:network', asyncHandler(async (req, res) => {
  try {
    const { network } = req.params;
    
    if (!['mtn', 'telecel', 'atbigtime', 'atishare'].includes(network)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid network provider'
      });
    }

    const result = await GhDataConnectService.getBundles(network);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: result.bundles
    });
  } catch (error) {
    logger.error(`Error fetching bundles for ${req.params.network}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bundles'
    });
  }
}));

// GET /api/v1/purchases/ishare-bundles - Get iShare bundles
router.get('/ishare-bundles', asyncHandler(async (req, res) => {
  try {
    const result = await GhDataConnectService.getIShareBundles();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: result.bundles
    });
  } catch (error) {
    logger.error('Error fetching iShare bundles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch iShare bundles'
    });
  }
}));

// GET /api/v1/purchases/balance - Check wallet balance
router.get('/balance', asyncHandler(async (req, res) => {
  try {
    const result = await GhDataConnectService.getWalletBalance();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        balance: result.balance,
        currency: 'GHS',
        low_balance_threshold: LOW_BALANCE_THRESHOLD,
        is_low: result.balance < LOW_BALANCE_THRESHOLD
      }
    });
  } catch (error) {
    logger.error('Error checking wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check wallet balance'
    });
  }
}));

// GET /api/v1/purchases/health - Check API health
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const result = await GhDataConnectService.checkApiHealth();
    
    res.status(200).json({
      success: result.success,
      data: {
        healthy: result.healthy,
        response_time: result.responseTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error checking API health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check API health'
    });
  }
}));

export default router;
