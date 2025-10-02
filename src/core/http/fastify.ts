import Fastify from 'fastify';
import { randomUUID } from 'crypto';

import { env } from '../config/env.js';
// import { container, TOKENS } from '../di/container'; // TODO: Will be used when implementing DI integration
import { eventBus } from '../events/event-bus.js';
import type { HealthStatus } from '../types/public.js';

import { registerApiRoutes } from './routes/api.js';

/**
 * Fastify server configuration
 * Minimal setup with health endpoint and basic middleware
 */

export interface ServerConfig {
  host: string;
  port: number;
  logger: boolean | {
    level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    transport?: { target: string };
  };
}

export async function createServer(config: ServerConfig) {
  const server = Fastify({
    logger: config.logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    genReqId: () => randomUUID(),
  });

  // Health check endpoint is registered in API routes

  // Readiness check endpoint is registered in API routes

  // Register metrics endpoint (placeholder)
  server.get('/metrics', async (request, reply) => {
    // TODO: Add Prometheus metrics
    return reply.code(200).send({ message: 'Metrics endpoint - to be implemented' });
  });

  // Global error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error, 'Unhandled error');
    
    // Emit error event
    eventBus.emit('server.error', {
      error: error.message,
      stack: error.stack,
      requestId: request.id,
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  });

  // Global not found handler
  server.setNotFoundHandler((request, _reply) => {
    return _reply.status(404).send({
      success: false,
      error: 'Not found',
      timestamp: Date.now(),
    });
  });

  // CORS configuration
  server.register(import('@fastify/cors'), {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // TODO: Add proper CORS configuration based on environment
      callback(null, true);
    },
    credentials: true,
  });

  // Register API routes
  await server.register(registerApiRoutes);

  // Request logging
  server.addHook('onRequest', async (request) => {
    server.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'Incoming request');
  });

  // Response logging
  server.addHook('onResponse', async (request, reply) => {
    server.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  return server;
}

export async function startServer(): Promise<void> {
  try {
    // Create server
    const server = await createServer({
      host: env.HOST,
      port: env.PORT,
      logger: {
        level: env.LOG_LEVEL,
        ...(env.LOG_PRETTY && { transport: { target: 'pino-pretty' } }),
      },
    });

    // Start server
    await server.listen({ 
      host: env.HOST, 
      port: env.PORT 
    });

    server.log.info({
      host: env.HOST,
      port: env.PORT,
      env: env.NODE_ENV,
    }, 'Server started successfully');

    // Emit server started event
    eventBus.emit('server.started', {
      host: env.HOST,
      port: env.PORT,
      env: env.NODE_ENV,
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export async function stopServer(): Promise<void> {
  try {
    // TODO: Implement server stopping logic
    console.log('Server stopped successfully');
    
    // Emit server stopped event
    eventBus.emit('server.stopped', {});
  } catch (error) {
    console.error('Error stopping server:', error);
  }
}
