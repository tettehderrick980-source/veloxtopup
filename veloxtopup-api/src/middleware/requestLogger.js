import { v4 as uuidv4 } from 'uuid';
import { logger, logApiCall } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  // Add unique request ID
  req.requestId = uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Record start time
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Log API call
    logApiCall(
      req.method,
      req.url,
      req.user?.id || null,
      duration,
      res.statusCode
    );
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export default requestLogger;
