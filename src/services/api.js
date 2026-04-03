const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  setAuthToken(token) {
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.headers['Authorization'];
    }
  }

  setUserId(userId) {
    if (userId) {
      this.headers['X-User-Id'] = userId;
    } else {
      delete this.headers['X-User-Id'];
    }
  }

  async request(endpoint, options = {}) {
    if (!this.baseURL) {
      throw new Error('API_BASE_URL is not configured. Please set VITE_API_BASE_URL in your environment.');
    }
    
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
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

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();

export const purchaseAPI = {
  createPurchase: (data) => apiClient.post('/purchases', data),
  getNetworks: () => apiClient.get('/purchases/networks'),
  getBundles: (network) => apiClient.get(`/purchases/bundles/${network}`),
  getIShareBundles: () => apiClient.get('/purchases/ishare-bundles'),
  getBalance: () => apiClient.get('/purchases/balance'),
  checkHealth: () => apiClient.get('/purchases/health'),
};

export const transactionAPI = {
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/transactions?${queryString}`);
  },
  getTransaction: (id) => apiClient.get(`/transactions/${id}`),
  updateStatus: (id, status, apiResponse) => 
    apiClient.put(`/transactions/${id}/status`, { status, api_response: apiResponse }),
  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/transactions/stats?${queryString}`);
  },
  processRefund: (id, data) => apiClient.post(`/transactions/${id}/refund`, data),
  getUserTransactions: (userId, limit = 50) => 
    apiClient.get(`/transactions/user/${userId}?limit=${limit}`),
};

export const userAPI = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  getWallet: () => apiClient.get('/users/wallet'),
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/users/transactions?${queryString}`);
  },
  getReferrals: () => apiClient.get('/users/referrals'),
  getStats: () => apiClient.get('/users/stats'),
  fundWallet: (amount) => apiClient.post('/users/wallet/fund', { amount }),
};

export const adminAPI = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/users?${queryString}`);
  },
  updateUser: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  suspendUser: (userId, reason) => apiClient.post(`/admin/users/${userId}/suspend`, { reason }),
  activateUser: (userId) => apiClient.post(`/admin/users/${userId}/activate`),
  getTransactions: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/transactions?${queryString}`);
  },
  getWallets: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/admin/wallets?${queryString}`);
  },
  fundWallet: (userId, amount, reason) => 
    apiClient.post(`/admin/wallets/${userId}/fund`, { amount, reason }),
  getReferrals: () => apiClient.get('/admin/referrals'),
  getSystemHealth: () => apiClient.get('/admin/system/health'),
};

export const webhookAPI = {
  getEvents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient.get(`/webhooks/events?${queryString}`);
  },
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
