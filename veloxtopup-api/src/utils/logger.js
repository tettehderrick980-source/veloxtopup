import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'veloxtopup-api' },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan HTTP logging
export const morganStream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logUserAction = (userId, action, details = {}) => {
  logger.info('User action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logTransaction = (transactionId, status, details = {}) => {
  logger.info('Transaction update', {
    transactionId,
    status,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logApiCall = (method, endpoint, userId, duration, statusCode) => {
  logger.info('API call', {
    method,
    endpoint,
    userId,
    duration,
    statusCode,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error, context = {}) => {
  logger.error('Application error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurity = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
