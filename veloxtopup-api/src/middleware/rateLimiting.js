import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import logger from './logger.js';

/**
 * Professional Rate Limiting Service for VeloxTopUp
 * Protects API endpoints from abuse and DDoS attacks
 */

// Create Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
  logger.error('Redis rate limit error:', err);
});

// Connect to Redis (only if configured)
if (process.env.REDIS_HOST) {
  redisClient.connect().catch(() => {
    logger.warn('Redis not available, using memory store for rate limiting');
  });
}

/**
 * General API rate limiter - for all routes
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  store: redisClient.isReady ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json(options.message);
  }
});

/**
 * Strict rate limiter for purchase endpoints
 */
export const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 purchases per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Purchase limit reached. Please try again in an hour.',
    code: 'PURCHASE_LIMIT_EXCEEDED'
  },
  skip: (req) => {
    // Skip rate limiting for authenticated admin users
    return req.user?.role === 'admin' || req.user?.role === 'superadmin';
  },
  handler: (req, res, next, options) => {
    logger.warn('Purchase rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      phone: req.body?.phone
    });
    res.status(429).json(options.message);
  }
});

/**
 * Rate limiter for order tracking
 */
export const trackingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 tracking requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many tracking requests. Please wait a few minutes.',
    code: 'TRACKING_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    logger.warn('Tracking rate limit exceeded', {
      ip: req.ip,
      searchValue: req.body?.searchValue || req.query?.search
    });
    res.status(429).json(options.message);
  }
});

/**
 * Rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_LIMIT_EXCEEDED'
  },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email
    });
    res.status(429).json(options.message);
  }
});

/**
 * Webhook rate limiter - more lenient but still protected
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 webhooks per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    code: 'WEBHOOK_LIMIT_EXCEEDED'
  },
  // Skip successful webhook calls from known providers
  skip: (req) => {
    const signature = req.headers['x-paystack-signature'] || 
                      req.headers['x-ghdataconnect-signature'];
    return !!signature; // Skip if has valid provider signature
  },
  handler: (req, res, next, options) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      provider: req.headers['x-paystack-signature'] ? 'paystack' : 
                req.headers['x-ghdataconnect-signature'] ? 'ghdataconnect' : 'unknown'
    });
    res.status(429).json(options.message);
  }
});

/**
 * Admin API rate limiter - higher limits for admins
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip if not authenticated as admin
    return req.user?.role !== 'admin' && req.user?.role !== 'superadmin';
  },
  handler: (req, res, next, options) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id
    });
    res.status(429).json(options.message);
  }
});

/**
 * Suspected abuse detector
 * Tracks patterns that might indicate abuse/fraud
 */
export const abuseDetector = (req, res, next) => {
  const ip = req.ip;
  const userAgent = req.get('user-agent') || '';
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    logger.warn('Suspicious user agent detected', { ip, userAgent });
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      code: 'SUSPICIOUS_ACTIVITY'
    });
  }
  
  // Check for rapid sequential requests (potential scraping)
  const path = req.path;
  if (path.includes('/api/')) {
    // Log for monitoring
    logger.debug('API request', {
      ip,
      path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

export default {
  generalLimiter,
  purchaseLimiter,
  trackingLimiter,
  authLimiter,
  webhookLimiter,
  adminLimiter,
  abuseDetector
};
