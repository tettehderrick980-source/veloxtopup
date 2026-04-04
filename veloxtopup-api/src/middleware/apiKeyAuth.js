import { db } from '../config/database.js';

export const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required. Include x-api-key header.'
    });
  }

  try {
    // Check environment variable first (for frontend API key)
    const envApiKey = process.env.API_KEY;
    if (envApiKey && apiKey === envApiKey) {
      req.apiKey = { api_key: apiKey, source: 'environment' };
      return next();
    }

    // Fallback to database validation
    const { data: keyData, error } = await db.supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !keyData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key.'
      });
    }

    // Check if key has expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired.'
      });
    }

    // Attach key info to request
    req.apiKey = keyData;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.'
    });
  }
};
