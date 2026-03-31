import { format } from 'date-fns'

export const formatCurrency = (amount, currency = 'GHS') => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount)
}

export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  return format(new Date(date), formatString)
}

export const formatDateTime = (date) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm')
}

export const generateReference = (prefix = 'VTU') => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone) => {
  const phoneRegex = /^0[2-9]\d{8}$/
  return phoneRegex.test(phone)
}

export const formatPhoneDisplay = (phone) => {
  if (!phone) return ''
  if (phone.length === 10) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
  }
  return phone
}

export const getStatusColor = (status) => {
  const colors = {
    pending: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
    success: 'text-green-400 bg-green-900/20 border-green-700',
    failed: 'text-red-400 bg-red-900/20 border-red-700',
    processing: 'text-blue-400 bg-blue-900/20 border-blue-700',
    refunded: 'text-purple-400 bg-purple-900/20 border-purple-700'
  }
  return colors[status] || colors.pending
}

export const getNetworkColor = (network) => {
  const colors = {
    mtn: 'bg-yellow-500',
    airteltigo: 'bg-blue-500',
    vodafone: 'bg-red-500'
  }
  return colors[network] || 'bg-gray-500'
}

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export const calculateReferralBonus = (amount, bonusRate = 0.05) => {
  return amount * bonusRate
}

export const generateReferralLink = (referralCode, baseUrl) => {
  return `${baseUrl}/register?ref=${referralCode}`
}

export const parseApiError = (error) => {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  if (error?.error) {
    return error.error
  }
  
  return 'An unexpected error occurred'
}

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
