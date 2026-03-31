import express from 'express';
import { query, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { logger, logTransaction } from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/transactions - Get all transactions (with optional filtering)
router.get('/', [
  query('user_id').optional().isUUID().withMessage('Invalid user ID'),
  query('status').optional().isIn(['pending', 'processing', 'success', 'failed', 'refunded']).withMessage('Invalid status'),
  query('type').optional().isIn(['airtime', 'data', 'wallet_funding', 'refund']).withMessage('Invalid transaction type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer')
], asyncHandler(async (req, res) => {
  try {
    const { user_id, status, type, limit = 50, offset = 0 } = req.query;
    
    let transactions;
    
    if (user_id) {
      // Get transactions for specific user
      const result = await db.getTransactions(user_id, parseInt(limit));
      transactions = result.data;
    } else {
      // Get all transactions (admin access)
      const result = await db.getAllTransactions();
      transactions = result.data;
      
      // Apply filters if provided
      if (status || type) {
        transactions = transactions.filter(transaction => {
          if (status && transaction.status !== status) return false;
          if (type && transaction.type !== type) return false;
          return true;
        });
      }
      
      // Apply pagination
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      transactions = transactions.slice(startIndex, endIndex);
    }
    
    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: transactions.length
      }
    });
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
}));

// GET /api/v1/transactions/:id - Get specific transaction by ID
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid transaction ID')
], asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: transaction, error } = await db.getTransaction(id);
    
    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error(`Error fetching transaction ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
}));

// PUT /api/v1/transactions/:id/status - Update transaction status
router.put('/:id/status', [
  param('id').isUUID().withMessage('Invalid transaction ID'),
], asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status, api_response } = req.body;
    
    if (!status || !['pending', 'processing', 'success', 'failed', 'refunded', 'delivered'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    const { data: transaction, error } = await db.updateTransactionStatus(id, status, api_response);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    logTransaction(id, 'status_updated', {
      newStatus: status,
      apiResponse: api_response
    });
    
    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction status updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating transaction status ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction status'
    });
  }
}));

// PUT /api/v1/transactions/:id - Update transaction (admin only)
router.put('/:id', [
  param('id').isUUID().withMessage('Invalid transaction ID')
], asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    
    const { data: transaction, error } = await db.updateTransaction(id, updates);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    logTransaction(id, 'updated', updates);
    
    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating transaction ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction'
    });
  }
}));

// GET /api/v1/transactions/user/:userId - Get transactions for a specific user
router.get('/user/:userId', [
  param('userId').isUUID().withMessage('Invalid user ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const { data: transactions, error } = await db.getTransactions(userId, parseInt(limit));
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    logger.error(`Error fetching transactions for user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user transactions'
    });
  }
}));

// GET /api/v1/transactions/stats - Get transaction statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.query;
    
    const { data: allTransactions } = await db.getAllTransactions();
    
    let transactions = allTransactions;
    
    // Filter by user if specified
    if (user_id) {
      transactions = transactions.filter(t => t.user_id === user_id);
    }
    
    // Filter by date range if specified
    if (start_date) {
      const startDate = new Date(start_date);
      transactions = transactions.filter(t => new Date(t.created_at) >= startDate);
    }
    
    if (end_date) {
      const endDate = new Date(end_date);
      transactions = transactions.filter(t => new Date(t.created_at) <= endDate);
    }
    
    // Calculate statistics
    const stats = {
      total_transactions: transactions.length,
      total_revenue: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      successful_transactions: transactions.filter(t => t.status === 'success' || t.status === 'delivered').length,
      failed_transactions: transactions.filter(t => t.status === 'failed').length,
      pending_transactions: transactions.filter(t => t.status === 'pending' || t.status === 'processing').length,
      
      // By type
      by_type: {
        data: transactions.filter(t => t.type === 'data').length,
        airtime: transactions.filter(t => t.type === 'airtime').length,
        wallet_funding: transactions.filter(t => t.type === 'wallet_funding').length,
        refund: transactions.filter(t => t.type === 'refund').length,
      },
      
      // By network
      by_network: transactions.reduce((acc, t) => {
        if (t.network) {
          acc[t.network] = (acc[t.network] || 0) + 1;
        }
        return acc;
      }, {}),
      
      // Recent transactions (last 10)
      recent_transactions: transactions
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching transaction statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics'
    });
  }
}));

// POST /api/v1/transactions/:id/refund - Process refund for transaction
router.post('/:id/refund', [
  param('id').isUUID().withMessage('Invalid transaction ID')
], asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;
    
    // Get transaction
    const { data: transaction, error: fetchError } = await db.getTransaction(id);
    
    if (fetchError || !transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Check if transaction is eligible for refund
    if (!['failed', 'delivered'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is not eligible for refund'
      });
    }
    
    // Update transaction status to refunded
    const { data: updatedTransaction, error: updateError } = await db.updateTransaction(id, {
      status: 'refunded',
      refund_reason: reason,
      refund_amount: amount || transaction.amount,
      refunded_at: new Date().toISOString()
    });
    
    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }
    
    // TODO: Process actual refund to wallet
    // This would typically involve updating the user's wallet balance
    
    logTransaction(id, 'refunded', {
      reason,
      amount: amount || transaction.amount
    });
    
    res.status(200).json({
      success: true,
      data: updatedTransaction,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    logger.error(`Error processing refund for transaction ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
}));

export default router;
