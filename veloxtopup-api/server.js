#!/usr/bin/env node

// Load environment variables FIRST using Node.js built-in loader
import { config } from 'dotenv';
config();

// Log environment status
console.log('🔧 Loading environment variables...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');

// Now dynamically import the rest
const startServer = async () => {
  try {
    const { default: express } = await import('express');
    const { default: cors } = await import('cors');
    const { default: helmet } = await import('helmet');
    const { default: rateLimit } = await import('express-rate-limit');
    const { createServer } = await import('http');

    const { logger } = await import('./src/utils/logger.js');
    const { connectDatabase } = await import('./src/config/database.js');
    const { errorHandler } = await import('./src/middleware/errorHandler.js');
    const { requestLogger } = await import('./src/middleware/requestLogger.js');
    const { apiKeyAuth } = await import('./src/middleware/apiKeyAuth.js');
    const { usageTracker } = await import('./src/middleware/usageTracker.js');

    // Import routes
    const { default: authRoutes } = await import('./src/routes/auth.js');
    const { default: purchaseRoutes } = await import('./src/routes/purchases.js');
    const { default: transactionRoutes } = await import('./src/routes/transactions.js');
    const { default: webhookRoutes } = await import('./src/routes/webhooks.js');
    const { default: adminRoutes } = await import('./src/routes/admin.js');
    const { default: userRoutes } = await import('./src/routes/users.js');

    const app = express();
    const server = createServer(app);
    const PORT = process.env.PORT || 5000;
    const apiVersion = process.env.API_VERSION || 'v1';

    // Trust proxy for Render deployment
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration for Render deployment
    app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'x-api-key'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use('/api/', limiter);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    app.use(requestLogger);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes with authentication and usage tracking
    app.use(`/api/${apiVersion}/auth`, usageTracker, authRoutes);
    app.use(`/api/${apiVersion}/purchases`, apiKeyAuth, usageTracker, purchaseRoutes);
    app.use(`/api/${apiVersion}/transactions`, apiKeyAuth, usageTracker, transactionRoutes);
    app.use(`/api/${apiVersion}/webhooks`, usageTracker, webhookRoutes);
    app.use(`/api/${apiVersion}/admin`, apiKeyAuth, usageTracker, adminRoutes);
    app.use(`/api/${apiVersion}/users`, apiKeyAuth, usageTracker, userRoutes);

    // API documentation endpoint
    app.get('/api', (req, res) => {
      res.json({
        name: 'VeloxTopUp API',
        version: apiVersion,
        description: 'Professional backend API for VeloxTopUp',
        endpoints: {
          auth: `/api/${apiVersion}/auth`,
          purchases: `/api/${apiVersion}/purchases`,
          transactions: `/api/${apiVersion}/transactions`,
          webhooks: `/api/${apiVersion}/webhooks`,
          admin: `/api/${apiVersion}/admin`,
          users: `/api/${apiVersion}/users`,
        },
        health: '/health',
        docs: '/api/docs'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
          '/health',
          `/api/${apiVersion}/auth`,
          `/api/${apiVersion}/purchases`,
          `/api/${apiVersion}/transactions`,
          `/api/${apiVersion}/webhooks`,
          `/api/${apiVersion}/admin`,
          `/api/${apiVersion}/users`
        ]
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    // Start server
    try {
      // Test database connection
      await connectDatabase();
      logger.info('✅ Database connection established');
      
      server.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api`);
        logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default {};
