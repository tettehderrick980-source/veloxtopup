import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Database connection test
export const connectDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    logger.info('✅ Database connection successful');
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Database helper functions - migrated from frontend
export const db = {
  // Users
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return { data: null, error };
    }
  },

  async createUserProfile(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating user profile:', error);
      return { data: null, error };
    }
  },

  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating user profile:', error);
      return { data: null, error };
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching all users:', error);
      return { data: null, error };
    }
  },

  async deleteUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error deleting user:', error);
      return { data: null, error };
    }
  },

  // Wallets
  async getWallet(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching wallet:', error);
      return { data: null, error };
    }
  },

  async createWallet(userId, initialBalance = 0) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .insert({ 
          user_id: userId, 
          balance: initialBalance,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating wallet:', error);
      return { data: null, error };
    }
  },

  async updateWalletBalance(userId, balance) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ 
          balance, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating wallet balance:', error);
      return { data: null, error };
    }
  },

  async getAllWallets() {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*, users(email, phone)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching all wallets:', error);
      return { data: null, error };
    }
  },

  // Transactions
  async createTransaction(transactionData) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating transaction:', error);
      return { data: null, error };
    }
  },

  async getTransaction(transactionId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, users(email, phone)')
        .eq('id', transactionId)
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      return { data: null, error };
    }
  },

  async getTransactions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      return { data: null, error };
    }
  },

  async getAllTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, users(email, phone)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching all transactions:', error);
      return { data: null, error };
    }
  },

  async updateTransaction(transactionId, updates) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating transaction:', error);
      return { data: null, error };
    }
  },

  async updateTransactionStatus(transactionId, status, apiResponse = null) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          status, 
          api_response: apiResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      return { data: null, error };
    }
  },

  // Referrals
  async createReferral(referrerId, referredUserId, bonus) {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_user_id: referredUserId,
          bonus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating referral:', error);
      return { data: null, error };
    }
  },

  async getReferrals(userId) {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*, users!referrals_referred_user_id_fkey(email)')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      logger.error('Error fetching referrals:', error);
      return { data: null, error };
    }
  },

  // Dashboard stats
  async getDashboardStats() {
    try {
      const [usersResult, transactionsResult, walletsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('transactions').select('amount', { count: 'exact' }),
        supabase.from('wallets').select('balance')
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        totalRevenue: transactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        totalWalletBalance: walletsResult.data?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        totalWalletBalance: 0
      };
    }
  }
};

export default db;
