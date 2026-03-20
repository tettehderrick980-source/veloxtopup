import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const db = {
  // Users
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
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

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
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
      .single()
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

  // Admin functions
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*, wallets(balance)')
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
