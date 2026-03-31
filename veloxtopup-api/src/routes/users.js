import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { logger, logUserAction } from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/users/profile - Get current user profile
router.get('/profile', asyncHandler(async (req, res) => {
  try {
    // This would typically use authentication middleware to get user ID
    // For now, we'll assume it's passed in the query or headers
    const userId = req.headers['x-user-id'] || req.query.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { data: user, error } = await db.getUserProfile(userId);
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's wallet
    const { data: wallet } = await db.getWallet(userId);

    // Get user's recent transactions
    const { data: transactions } = await db.getTransactions(userId, 10);

    // Get user's referrals
    const { data: referrals } = await db.getReferrals(userId);

    res.status(200).json({
      success: true,
      data: {
        user,
        wallet: wallet || { balance: 0 },
        transactions: transactions || [],
        referrals: referrals || []
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
}));

// PUT /api/v1/users/profile - Update current user profile
router.put('/profile', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { phone, email } = req.body;

    // Only allow updating specific fields
    const updates = {};
    if (phone) updates.phone = phone;
    if (email) updates.email = email;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.role;
    delete updates.referral_code;
    delete updates.status;

    const { data: user, error } = await db.updateUserProfile(userId, updates);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logUserAction(userId, 'profile_updated', updates);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
}));

// GET /api/v1/users/wallet - Get user wallet
router.get('/wallet', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { data: wallet, error } = await db.getWallet(userId);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: wallet || { balance: 0 }
    });
  } catch (error) {
    logger.error('Error fetching user wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet'
    });
  }
}));

// GET /api/v1/users/transactions - Get user transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    const { limit = 20, status, type } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { data: transactions, error } = await db.getTransactions(userId, parseInt(limit));
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    let filteredTransactions = transactions || [];

    // Apply filters
    if (status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === status);
    }

    if (type) {
      filteredTransactions = filteredTransactions.filter(t => t.type === type);
    }

    res.status(200).json({
      success: true,
      data: filteredTransactions,
      count: filteredTransactions.length
    });
  } catch (error) {
    logger.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
}));

// GET /api/v1/users/referrals - Get user referrals
router.get('/referrals', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const { data: referrals, error } = await db.getReferrals(userId);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    // Calculate total earnings from referrals
    const totalEarnings = referrals?.reduce((sum, r) => sum + (r.bonus || 0), 0) || 0;

    res.status(200).json({
      success: true,
      data: {
        referrals: referrals || [],
        totalEarnings,
        referralCount: referrals?.length || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching user referrals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referrals'
    });
  }
}));

// POST /api/v1/users/wallet/fund - Fund wallet (initiate payment)
router.post('/wallet/fund', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.body.user_id;
    const { amount } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Create wallet funding transaction
    const transactionData = {
      user_id: userId,
      type: 'wallet_funding',
      amount: parseFloat(amount),
      status: 'pending',
      reference: `WALLET_FUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payment_reference: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: transaction, error } = await db.createTransaction(transactionData);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create funding transaction'
      });
    }

    logUserAction(userId, 'wallet_funding_initiated', {
      amount,
      transactionId: transaction.id,
      reference: transaction.reference
    });

    // TODO: Initiate Paystack payment
    // This would typically involve calling Paystack to initialize payment
    
    res.status(201).json({
      success: true,
      data: {
        transaction,
        message: 'Wallet funding initiated. Please complete payment.',
        // TODO: Add Paystack payment URL here
      }
    });
  } catch (error) {
    logger.error('Error initiating wallet funding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate wallet funding'
    });
  }
}));

// GET /api/v1/users/stats - Get user statistics
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.user_id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get user's transactions
    const { data: transactions } = await db.getTransactions(userId, 100);
    
    // Get user's referrals
    const { data: referrals } = await db.getReferrals(userId);
    
    // Get user's wallet
    const { data: wallet } = await db.getWallet(userId);

    // Calculate statistics
    const stats = {
      totalTransactions: transactions?.length || 0,
      totalSpent: transactions?.reduce((sum, t) => {
        if (t.type === 'data' || t.type === 'airtime') {
          return sum + (t.amount || 0);
        }
        return sum;
      }, 0) || 0,
      totalFunded: transactions?.reduce((sum, t) => {
        if (t.type === 'wallet_funding' && t.status === 'success') {
          return sum + (t.amount || 0);
        }
        return sum;
      }, 0) || 0,
      successfulTransactions: transactions?.filter(t => 
        t.status === 'success' || t.status === 'delivered'
      ).length || 0,
      failedTransactions: transactions?.filter(t => t.status === 'failed').length || 0,
      referralCount: referrals?.length || 0,
      referralEarnings: referrals?.reduce((sum, r) => sum + (r.bonus || 0), 0) || 0,
      currentBalance: wallet?.balance || 0,
      
      // Transaction breakdown by type
      transactionsByType: transactions?.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {}) || {},
      
      // Recent activity (last 7 days)
      recentActivity: transactions?.filter(t => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(t.created_at) > weekAgo;
      }).length || 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
}));

export default router;
