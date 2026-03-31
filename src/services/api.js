// API Client for VeloxTopUp
// Replaces Supabase Edge Functions with Node.js backend API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // Set auth token
  setAuthToken(token) {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  // Set user ID for requests
  setUserId(userId) {
    if (userId) {
      this.headers['X-User-Id'] = userId;
    } else {
      delete this.headers['X-User-Id'];
    }
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT request
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// API Services
export const purchaseAPI = {
  // Create a new purchase
  createPurchase: (data) => apiClient.post('/purchases', data),
  
  // Get available networks
  getNetworks: () => apiClient.get('/purchases/networks'),
  
  // Get bundles for a network
  getBundles: (network) => apiClient.get(`/purchases/bundles/${network}`),
  
  // Get iShare bundles
  getIShareBundles: () => apiClient.get('/purchases/ishare-bundles'),
  
  // Check wallet balance
  getBalance: () => apiClient.get('/purchases/balance'),
  
  // Check API health
  checkHealth: () => apiClient.get('/purchases/health'),
};

export const transactionAPI = {
  // Get all transactions
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/transactions?${queryString}`);
  },
  
  // Get specific transaction
  getTransaction: (id) => apiClient.get(`/transactions/${id}`),
  
  // Update transaction status
  updateStatus: (id, status, apiResponse) => 
    apiClient.put(`/transactions/${id}/status`, { status, api_response: apiResponse }),
  
  // Get transaction statistics
  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/transactions/stats?${queryString}`);
  },
  
  // Process refund
  processRefund: (id, data) => apiClient.post(`/transactions/${id}/refund`, data),
  
  // Get user transactions
  getUserTransactions: (userId, limit = 50) => 
    apiClient.get(`/transactions/user/${userId}?limit=${limit}`),
};

export const userAPI = {
  // Get user profile
  getProfile: () => apiClient.get('/users/profile'),
  
  // Update user profile
  updateProfile: (data) => apiClient.put('/users/profile', data),
  
  // Get user wallet
  getWallet: () => apiClient.get('/users/wallet'),
  
  // Get user transactions
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/users/transactions?${queryString}`);
  },
  
  // Get user referrals
  getReferrals: () => apiClient.get('/users/referrals'),
  
  // Get user stats
  getStats: () => apiClient.get('/users/stats'),
  
  // Fund wallet
  fundWallet: (amount) => apiClient.post('/users/wallet/fund', { amount }),
};

export const adminAPI = {
  // Get dashboard data
  getDashboard: () => apiClient.get('/admin/dashboard'),
  
  // Get all users
  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/users?${queryString}`);
  },
  
  // Update user
  updateUser: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  
  // Suspend user
  suspendUser: (userId, reason) => apiClient.post(`/admin/users/${userId}/suspend`, { reason }),
  
  // Activate user
  activateUser: (userId) => apiClient.post(`/admin/users/${userId}/activate`),
  
  // Get all transactions
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/transactions?${queryString}`);
  },
  
  // Get all wallets
  getWallets: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/wallets?${queryString}`);
  },
  
  // Fund user wallet
  fundWallet: (userId, amount, reason) => 
    apiClient.post(`/admin/wallets/${userId}/fund`, { amount, reason }),
  
  // Get all referrals
  getReferrals: () => apiClient.get('/admin/referrals'),
  
  // Get system health
  getSystemHealth: () => apiClient.get('/admin/system/health'),
};

export const webhookAPI = {
  // Get webhook events
  getEvents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/webhooks/events?${queryString}`);
  },
  
  // Process webhook event
  processEvent: (id) => apiClient.post(`/webhooks/events/${id}/process`),
};

export default {
  client: apiClient,
  purchases: purchaseAPI,
  transactions: transactionAPI,
  users: userAPI,
  admin: adminAPI,
  webhooks: webhookAPI,
};
