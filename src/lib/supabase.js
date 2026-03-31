import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uaviwngzmxeczthocphk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdml3bmd6bXhlY3p0aG9jcGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTk5NzcsImV4cCI6MjA4OTU3NTk3N30.6aE4T9ZSidJ5l1_z0qqF7LJIbSwBAXKmagZyo2S4Hv8'

// Log for debugging
console.log('[Supabase] Initializing with URL:', supabaseUrl)
console.log('[Supabase] Initializing with Key:', supabaseAnonKey?.substring(0, 50) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const db = {
  // Super Admin functions
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async getAllTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async getAllWallets() {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
    
    return { data, error }
  },

  async deleteUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    
    return { data, error }
  },

  async updateTransaction(transactionId, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
    
    return { data, error }
  },

  async createSuperAdmin(email, password, phone) {
    try {
      // Generate a referral code
      const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'super_admin'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          phone,
          role: 'super_admin',
          referral_code: generateReferralCode(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) throw profileError;

      await supabase
        .from('wallets')
        .insert({
          user_id: authData.user.id,
          balance: 0
        });

      return { data: profileData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Users
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    return { data, error }
  },

  async createUserProfile(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    return { data, error }
  },

  // Wallets
  async getWallet(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return { data, error }
  },

  async createWallet(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userId, balance: 0 })
      .select()
      .single()
    return { data, error }
  },

  async updateWalletBalance(userId, balance) {
    const { data, error } = await supabase
      .from('wallets')
      .update({ balance })
      .eq('user_id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Transactions
  async createTransaction(transactionData) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single()
    return { data, error }
  },

  async getTransactions(userId, limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async updateTransactionStatus(transactionId, status, apiResponse = null) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        status, 
        api_response: apiResponse,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single()
    return { data, error }
  },

  async getAllTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, users(email, phone)')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Referrals
  async createReferral(referrerId, referredUserId, bonus) {
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        bonus
      })
      .select()
      .single()
    return { data, error }
  },

  async getReferrals(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*, users!referrals_referred_user_id_fkey(email)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getDashboardStats() {
    const [usersResult, transactionsResult, walletsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('transactions').select('amount', { count: 'exact' }),
      supabase.from('wallets').select('balance')
    ])

    return {
      totalUsers: usersResult.count || 0,
      totalTransactions: transactionsResult.count || 0,
      totalRevenue: transactionsResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      totalWalletBalance: walletsResult.data?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0
    }
  }
}
