/**
 * Universal Tracking - Main Entry Point
 * Fastify bootstrap with DI container and basic health endpoints
 */

import { Redis } from 'ioredis';
import { env } from './core/config/env.js';
import { container, TOKENS } from './core/di/container.js';
import { eventBus } from './core/events/event-bus.js';
import { startServer } from './core/http/fastify.js';
import { createRedisClient, closeRedisClient } from './core/cache/redis-client.js';
import { createPgClient, testPgConnection, closePgClient } from './core/database/postgres-client.js';
// import { registerApiRoutes } from './core/http/routes/api.js'; // Used in fastify.ts

/**
 * Application bootstrap
 */
async function bootstrap(): Promise<void> {
  try {
    console.log('🚀 Starting Universal Tracking Server...');
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Port: ${env.PORT}`);
    console.log(`Host: ${env.HOST}`);

    // Register core services in DI container
    registerCoreServices();

    // Resolve all singleton services (startup optimization)
    container.resolveAll();

    // Test database connections
    await testDatabaseConnections();

    // Start the server
    await startServer();

    // Setup graceful shutdown
    setupGracefulShutdown();

    console.log('✅ Server started successfully');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Register core services in DI container
 */
function registerCoreServices(): void {
  // Register logger
  container.singleton(TOKENS.LOGGER, () => {
    // Simple console logger for now
    return {
      info: (obj: unknown, msg?: string) => console.log(msg || obj, obj),
      error: (obj: unknown, msg?: string) => console.error(msg || obj, obj),
      warn: (obj: unknown, msg?: string) => console.warn(msg || obj, obj),
      debug: (obj: unknown, msg?: string) => console.debug(msg || obj, obj),
    };
  });

  // Register event bus
  container.singleton(TOKENS.EVENT_BUS, () => eventBus);

  // Register database clients
  container.singleton(TOKENS.PG_CLIENT, () => createPgClient());
  container.singleton(TOKENS.REDIS_CLIENT, () => createRedisClient());
  // container.singleton(TOKENS.CLICKHOUSE_CLIENT, () => createClickHouseClient());

  console.log('📦 Core services registered');
}

/**
 * Test database connections
 */
async function testDatabaseConnections(): Promise<void> {
  console.log('🔍 Testing database connections...');
  
  // Test PostgreSQL connection (non-blocking for Railway)
  try {
    const pgConnected = await testPgConnection();
    if (pgConnected) {
      console.log('✅ PostgreSQL connection successful');
    } else {
      console.warn('⚠️  PostgreSQL connection failed, but continuing without database...');
      console.log('💡 App will run in limited mode without database features');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️  PostgreSQL connection error, but continuing:', errorMessage);
    console.log('💡 App will run in limited mode without database features');
  }

  // Test Redis connection (non-blocking)
  try {
    const redis = container.resolve<Redis>(TOKENS.REDIS_CLIENT);
    
    // Test with timeout to avoid hanging
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    console.log('✅ Redis connection successful');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️  Redis connection failed, but continuing without Redis:', errorMessage);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Emit shutdown event
      eventBus.emit('server.shutdown', { signal });
      
      // Close database connections
      const redis = container.resolve<Redis>(TOKENS.REDIS_CLIENT);
      await closeRedisClient(redis);
      
      // Close PostgreSQL connection
      await closePgClient();
      
      // TODO: Stop background jobs
      // await stopBackgroundJobs();
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    eventBus.emit('server.error', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    eventBus.emit('server.error', { error: 'Unhandled rejection', reason });
    process.exit(1);
  });
}

// Export buildApp for testing
export async function buildApp() {
  // This is a simplified version for testing
  // In production, this would be handled by the bootstrap function
  const { createServer } = await import('./core/http/fastify.js');
  return createServer({
    host: env.HOST,
    port: env.PORT,
    logger: {
      level: env.LOG_LEVEL,
      ...(env.LOG_PRETTY && { transport: { target: 'pino-pretty' } }),
    },
  });
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
