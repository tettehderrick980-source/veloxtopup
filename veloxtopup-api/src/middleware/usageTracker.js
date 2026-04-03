import { db } from '../config/database.js';

export const usageTracker = async (req, res, next) => {
  // Store start time
  const startTime = Date.now();
  
  // Capture original response end
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Log usage after response
    logUsage(req, res, startTime).catch(err => {
      console.error('Failed to log API usage:', err);
    });
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

async function logUsage(req, res, startTime) {
  try {
    const endpoint = `${req.method} ${req.originalUrl}`;
    const apiKey = req.apiKey?.api_key || req.headers['x-api-key'] || 'unknown';
    const statusCode = res.statusCode;
    const responseTime = Date.now() - startTime;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log to database
    const { error } = await db.supabase
      .from('api_usage')
      .insert({
        endpoint,
        api_key: apiKey,
        status_code: statusCode,
        response_time_ms: responseTime,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log API usage:', error);
    }
  } catch (error) {
    console.error('Usage tracking error:', error);
  }
}
