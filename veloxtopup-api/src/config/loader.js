// Load environment variables before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now safe to import other modules
export { default as express } from 'express';
export { default as cors } from 'cors';
export { default as helmet } from 'helmet';
export { default as rateLimit } from 'express-rate-limit';
export { createServer } from 'http';

export { logger } from './src/utils/logger.js';
export { connectDatabase } from './src/config/database.js';
export { errorHandler } from './src/middleware/errorHandler.js';
export { requestLogger } from './src/middleware/requestLogger.js';
