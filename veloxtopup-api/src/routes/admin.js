import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { logger, logUserAction } from '../utils/logger.js';

const router = express.Router();

// GET /api/v1/admin/dashboard - Get dashboard statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    
    // Get additional statistics
    const { data: transactions } = await db.getAllTransactions();
    const { data: users } = await db.getAllUsers();
    
    // Calculate recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = transactions?.filter(t => 
      new Date(t.created_at) > yesterday
    ) || [];
    
    const recentUsers = users?.filter(u => 
      new Date(u.created_at) > yesterday
    ) || [];

    // Calculate monthly revenue
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyTransactions = transactions?.filter(t => 
      new Date(t.created_at) >= thisMonth
    ) || [];
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => 
      sum + (t.amount || 0), 0
    );

    // Transaction status breakdown
    const statusBreakdown = transactions?.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Network breakdown
    const networkBreakdown = transactions?.reduce((acc, t) => {
      if (t.network) {
        acc[t.network] = (acc[t.network] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const dashboardData = {
      ...stats,
      recentActivity: {
        transactions24h: recentTransactions.length,
        users24h: recentUsers.length,
        revenue24h: recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      },
      monthlyStats: {
        revenue: monthlyRevenue,
        transactions: monthlyTransactions.length
      },
      statusBreakdown,
      networkBreakdown,
      topUsers: users?.slice(0, 10).map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        created_at: u.created_at
      })) || []
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
}));

// GET /api/v1/admin/users - Get all users (admin management)
router.get('/users', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role, search } = req.query;
    
    const { data: users, error } = await db.getAllUsers();
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    let filteredUsers = users || [];

    // Apply filters
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }

    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        u.phone?.includes(search)
      );
    }

    // Get wallet information for each user
    const usersWithWallets = await Promise.all(
      filteredUsers.map(async (user) => {
        const { data: wallet } = await db.getWallet(user.id);
        return {
          ...user,
          wallet: wallet || { balance: 0 }
        };
      })
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = usersWithWallets.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredUsers.length,
        pages: Math.ceil(filteredUsers.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching admin users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
}));

// PUT /api/v1/admin/users/:userId - Update user (admin only)
router.put('/users/:userId', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Remove sensitive fields
    delete updates.id;
    delete updates.created_at;

    const { data: user, error } = await db.updateUserProfile(userId, updates);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logUserAction(userId, 'admin_updated_user', updates);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
}));

// POST /api/v1/admin/users/:userId/suspend - Suspend user
router.post('/users/:userId/suspend', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { data: user, error } = await db.updateUserProfile(userId, {
      status: 'suspended'
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logUserAction(userId, 'user_suspended', { reason });

    res.status(200).json({
      success: true,
      data: user,
      message: 'User suspended successfully'
    });
  } catch (error) {
    logger.error(`Error suspending user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend user'
    });
  }
}));

// POST /api/v1/admin/users/:userId/activate - Activate user
router.post('/users/:userId/activate', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await db.updateUserProfile(userId, {
      status: 'active'
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logUserAction(userId, 'user_activated');

    res.status(200).json({
      success: true,
      data: user,
      message: 'User activated successfully'
    });
  } catch (error) {
    logger.error(`Error activating user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate user'
    });
  }
}));

// GET /api/v1/admin/transactions - Get all transactions (admin view)
router.get('/transactions', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, network, user_id } = req.query;
    
    const { data: transactions, error } = await db.getAllTransactions();
    
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

    if (network) {
      filteredTransactions = filteredTransactions.filter(t => t.network === network);
    }

    if (user_id) {
      filteredTransactions = filteredTransactions.filter(t => t.user_id === user_id);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTransactions.length,
        pages: Math.ceil(filteredTransactions.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching admin transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
}));

// GET /api/v1/admin/wallets - Get all wallets
router.get('/wallets', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, min_balance, max_balance } = req.query;
    
    const { data: wallets, error } = await db.getAllWallets();
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    let filteredWallets = wallets || [];

    // Apply balance filters
    if (min_balance !== undefined) {
      filteredWallets = filteredWallets.filter(w => w.balance >= parseFloat(min_balance));
    }

    if (max_balance !== undefined) {
      filteredWallets = filteredWallets.filter(w => w.balance <= parseFloat(max_balance));
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedWallets = filteredWallets.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedWallets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredWallets.length,
        pages: Math.ceil(filteredWallets.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching admin wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallets'
    });
  }
}));

// POST /api/v1/admin/wallets/:userId/fund - Fund user wallet (admin only)
router.post('/wallets/:userId/fund', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Get current wallet
    const { data: wallet } = await db.getWallet(userId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // Update wallet balance
    const newBalance = wallet.balance + parseFloat(amount);
    const { data: updatedWallet, error } = await db.updateWalletBalance(userId, newBalance);
    
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update wallet balance'
      });
    }

    // Create transaction record
    const transactionData = {
      user_id: userId,
      type: 'wallet_funding',
      amount: parseFloat(amount),
      status: 'success',
      reference: `ADMIN_FUND_${Date.now()}`,
      payment_reference: null,
      api_response: { admin_fund: true, reason },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.createTransaction(transactionData);

    logUserAction(userId, 'wallet_funded_by_admin', {
      amount,
      reason,
      newBalance
    });

    res.status(200).json({
      success: true,
      data: updatedWallet,
      message: 'Wallet funded successfully'
    });
  } catch (error) {
    logger.error(`Error funding wallet for user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fund wallet'
    });
  }
}));

// GET /api/v1/admin/referrals - Get all referrals
router.get('/referrals', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    // Get all users and their referrals
    const { data: users } = await db.getAllUsers();
    const referralsData = [];

    for (const user of users) {
      const { data: userReferrals } = await db.getReferrals(user.id);
      if (userReferrals && userReferrals.length > 0) {
        referralsData.push({
          referrer: user,
          referrals: userReferrals,
          totalBonus: userReferrals.reduce((sum, r) => sum + (r.bonus || 0), 0)
        });
      }
    }

    // Apply filters
    if (status) {
      // Filter by referral status if needed
    }

    res.status(200).json({
      success: true,
      data: referralsData,
      count: referralsData.length
    });
  } catch (error) {
    logger.error('Error fetching admin referrals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referrals'
    });
  }
}));

// GET /api/v1/admin/system/health - System health check
router.get('/system/health', asyncHandler(async (req, res) => {
  try {
    const healthData = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version,
        environment: process.env.NODE_ENV
      },
      database: {
        status: 'connected', // We'll assume connected if we reach here
        timestamp: new Date().toISOString()
      },
      api: {
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          auth: '/api/v1/auth',
          purchases: '/api/v1/purchases',
          transactions: '/api/v1/transactions',
          webhooks: '/api/v1/webhooks',
          admin: '/api/v1/admin'
        }
      }
    };

    res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    logger.error('Error checking system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health'
    });
  }
}));

export default router;
