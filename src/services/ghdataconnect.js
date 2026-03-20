// GhDataConnect API service - Note: This should only be called from backend/Edge Functions
// This file is for reference only

export const GhDataConnectAPI = {
  BASE_URL: 'https://api.ghdataconnect.com/v1',
  
  // Network mappings
  NETWORKS: {
    mtn: 'mtn',
    airteltigo: 'airteltigo', 
    vodafone: 'vodafone'
  },

  // Data plans for each network
  DATA_PLANS: {
    mtn: [
      { id: 'mtn_1gb', name: '1GB', amount: 5.00, validity: '24h' },
      { id: 'mtn_2gb', name: '2GB', amount: 10.00, validity: '24h' },
      { id: 'mtn_5gb', name: '5GB', amount: 20.00, validity: '24h' },
      { id: 'mtn_10gb', name: '10GB', amount: 35.00, validity: '30d' },
      { id: 'mtn_20gb', name: '20GB', amount: 60.00, validity: '30d' }
    ],
    airteltigo: [
      { id: 'at_1gb', name: '1GB', amount: 4.50, validity: '24h' },
      { id: 'at_2gb', name: '2GB', amount: 9.00, validity: '24h' },
      { id: 'at_5gb', name: '5GB', amount: 18.00, validity: '24h' },
      { id: 'at_10gb', name: '10GB', amount: 32.00, validity: '30d' },
      { id: 'at_20gb', name: '20GB', amount: 55.00, validity: '30d' }
    ],
    vodafone: [
      { id: 'vf_1gb', name: '1GB', amount: 4.00, validity: '24h' },
      { id: 'vf_2gb', name: '2GB', amount: 8.00, validity: '24h' },
      { id: 'vf_5gb', name: '5GB', amount: 17.00, validity: '24h' },
      { id: 'vf_10gb', name: '10GB', amount: 30.00, validity: '30d' },
      { id: 'vf_20gb', name: '20GB', amount: 50.00, validity: '30d' }
    ]
  },

  // API methods - These should only be called from backend
  async purchaseAirtime(network, phoneNumber, amount, reference) {
    // This method should only be called from Edge Functions
    throw new Error('This method should only be called from backend Edge Functions')
  },

  async purchaseData(network, phoneNumber, planId, reference) {
    // This method should only be called from Edge Functions
    throw new Error('This method should only be called from backend Edge Functions')
  },

  // Helper methods for frontend
  getPlansForNetwork(network) {
    return this.DATA_PLANS[network] || []
  },

  validatePhoneNumber(phoneNumber, network) {
    // Basic phone number validation for Ghana
    const phoneRegex = /^0[2-9]\d{8}$/
    if (!phoneRegex.test(phoneNumber)) {
      return false
    }
    return true
  },

  formatPhoneNumber(phoneNumber) {
    // Format phone number to ensure it starts with 0
    let formatted = phoneNumber.replace(/\s+/g, '')
    if (formatted.startsWith('+233')) {
      formatted = '0' + formatted.substring(4)
    } else if (formatted.startsWith('233') && formatted.length === 12) {
      formatted = '0' + formatted.substring(3)
    }
    return formatted
  }
}
