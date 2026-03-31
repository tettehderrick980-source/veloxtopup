/**
 * Ghana Phone Number Validation Utility
 * Validates phone numbers based on Ghana network provider prefixes
 */

// Ghana network prefixes
const NETWORK_PREFIXES = {
  mtn: [
    '024', '025', '053', '054', '055', '059', // MTN
    '23324', '23325', '23353', '23354', '23355', '23359' // International format
  ],
  telecel: [
    '020', '050', // Vodafone/Telecel
    '23320', '23350' // International format
  ],
  atbigtime: [
    '027', '057', '026', '056', // AirtelTigo
    '23327', '23357', '23326', '23356' // International format
  ],
  atishare: [
    '027', '057', '026', '056', // AirtelTigo (same as AT Big Time)
    '23327', '23357', '23326', '23356' // International format
  ]
};

/**
 * Validate and format Ghana phone number
 * @param {string} phoneNumber - The phone number to validate
 * @param {string} network - The selected network (mtn, telecel, atbigtime, atishare)
 * @returns {Object} Validation result { isValid: boolean, formattedNumber: string, error: string|null }
 */
export function validateGhanaPhoneNumber(phoneNumber, network) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      formattedNumber: null,
      error: 'Please enter a phone number'
    };
  }

  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Handle international format (starting with 233)
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    // Convert to local format for validation
    cleaned = '0' + cleaned.substring(3);
  }

  // Check if it's a valid Ghana mobile number format
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      formattedNumber: null,
      error: 'Phone number must be 10 digits (e.g., 0241234567)'
    };
  }

  // Must start with 0
  if (!cleaned.startsWith('0')) {
    return {
      isValid: false,
      formattedNumber: null,
      error: 'Phone number must start with 0 (e.g., 0241234567)'
    };
  }

  // Get the prefix (first 3 digits)
  const prefix = cleaned.substring(0, 3);

  // Check if prefix is a valid Ghana mobile prefix
  const validPrefixes = ['020', '024', '025', '026', '027', '050', '053', '054', '055', '056', '057', '059'];
  if (!validPrefixes.includes(prefix)) {
    return {
      isValid: false,
      formattedNumber: null,
      error: `Invalid phone number prefix "${prefix}". Please use a valid Ghana mobile number.`
    };
  }

  // Validate against selected network
  if (network && NETWORK_PREFIXES[network]) {
    const validNetworkPrefixes = NETWORK_PREFIXES[network];
    const isValidForNetwork = validNetworkPrefixes.some(np => 
      cleaned.startsWith(np) || cleaned.startsWith('233' + np.substring(1))
    );

    if (!isValidForNetwork) {
      const networkNames = {
        mtn: 'MTN',
        telecel: 'Telecel',
        atbigtime: 'AT Big Time',
        atishare: 'AT iShare'
      };

      // Provide helpful error message with valid prefixes
      const expectedPrefixes = getNetworkPrefixes(network);
      return {
        isValid: false,
        formattedNumber: null,
        error: `This number doesn't appear to be a valid ${networkNames[network]} number. ${expectedPrefixes}`
      };
    }
  }

  // Format the number (always return in local 10-digit format)
  return {
    isValid: true,
    formattedNumber: cleaned,
    error: null
  };
}

/**
 * Get the network provider from phone number
 * @param {string} phoneNumber - The phone number
 * @returns {string|null} Network ID or null if unknown
 */
export function detectNetworkFromPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;

  // Clean the number
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Handle international format
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(3);
  }

  if (cleaned.length !== 10) return null;

  const prefix = cleaned.substring(0, 3);

  // Check each network
  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix) || prefixes.includes('233' + prefix.substring(1))) {
      return network;
    }
  }

  return null;
}

/**
 * Get human-readable network prefix information
 * @param {string} network - Network ID
 * @returns {string} Formatted prefix information
 */
function getNetworkPrefixes(network) {
  const prefixInfo = {
    mtn: 'MTN numbers start with: 024, 025, 053, 054, 055, 059',
    telecel: 'Telecel numbers start with: 020, 050',
    atbigtime: 'AT Big Time numbers start with: 027, 057, 026, 056',
    atishare: 'AT iShare numbers start with: 027, 057, 026, 056'
  };

  return prefixInfo[network] || 'Please select the correct network for your phone number.';
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted number (e.g., 024 123 4567)
 */
export function formatPhoneNumberForDisplay(phoneNumber) {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phoneNumber;
}

/**
 * Real-time phone number validation helper
 * @param {string} value - Input value
 * @param {string} network - Selected network
 * @returns {Object} { isValid: boolean, error: string|null, formatted: string }
 */
export function validatePhoneInput(value, network) {
  // Allow empty input during typing
  if (!value || value.length < 3) {
    return { isValid: true, error: null, formatted: value };
  }

  // Remove non-numeric characters
  const cleaned = value.replace(/\D/g, '');

  // Don't allow more than 10 digits (local) or 12 (international with 233)
  if (cleaned.length > 12) {
    return {
      isValid: false,
      error: 'Phone number is too long',
      formatted: cleaned.slice(0, 12)
    };
  }

  // Format as user types
  let formatted = cleaned;
  if (cleaned.length <= 10) {
    // Local format - add spaces for readability
    if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else if (cleaned.length > 3) {
      formatted = `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
  }

  // Only validate fully when we have 10 digits
  if (cleaned.length === 10) {
    const result = validateGhanaPhoneNumber(cleaned, network);
    return {
      isValid: result.isValid,
      error: result.error,
      formatted: formatted.trim()
    };
  }

  return { isValid: true, error: null, formatted: formatted.trim() };
}

export default {
  validateGhanaPhoneNumber,
  detectNetworkFromPhoneNumber,
  formatPhoneNumberForDisplay,
  validatePhoneInput
};
