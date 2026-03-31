import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Supabase errors
  if (err.code?.startsWith('PGRST')) {
    error = handleSupabaseError(err);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose stack trace in production
  const response = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Add request ID if available
  if (req.requestId) {
    response.requestId = req.requestId;
  }

  res.status(statusCode).json(response);
};

// Handle Supabase specific errors
const handleSupabaseError = (error) => {
  switch (error.code) {
    case 'PGRST116':
      return { message: 'Resource not found', statusCode: 404 };
    case 'PGRST301':
      return { message: 'Unauthorized access', statusCode: 401 };
    case 'PGRST302':
      return { message: 'Forbidden', statusCode: 403 };
    case '23505':
      return { message: 'Duplicate entry', statusCode: 409 };
    case '23503':
      return { message: 'Foreign key violation', statusCode: 400 };
    case '23502':
      return { message: 'Required field missing', statusCode: 400 };
    default:
      return { message: 'Database error', statusCode: 500 };
  }
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export default errorHandler;
