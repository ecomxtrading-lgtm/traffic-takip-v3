/**
 * API Routes
 * Main API endpoints for tracking and management
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware, apiKeyMiddleware, createSiteAccessMiddleware } from '../../auth/middleware.js';
import { createHMACMiddleware } from '../../security/hmac.js';
import { createRateLimitMiddleware } from '../../security/rate-limiter.js';
import type { SiteId } from '../../types/public.js';

/**
 * Register API routes
 */
export async function registerApiRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate limiting middleware
  const rateLimitMiddleware = createRateLimitMiddleware(
    // TODO: Get rate limiter from DI container
    {} as any
  );

  // HMAC middleware
  const hmacMiddleware = createHMACMiddleware();

  // Site access middleware
  const siteAccessMiddleware = createSiteAccessMiddleware();

  // Health check endpoints (no auth required)
  fastify.get('/health', async () => {
    return { status: 'healthy', timestamp: Date.now() };
  });

  fastify.get('/api/v1/health', async () => {
    return { status: 'healthy', timestamp: Date.now() };
  });

  fastify.get('/ready', async () => {
    return { status: 'ready' };
  });

  // API routes with authentication
  fastify.register(async function (fastify) {
    // Apply rate limiting to all API routes
    fastify.addHook('preHandler', rateLimitMiddleware);

    // Site management routes (JWT auth required)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', authMiddleware);

      // Get current site info
      fastify.get('/sites/current', async (request) => {
        const user = (request as any).user;
        return {
          site_id: user.site_id,
          tenant_id: user.tenant_id,
          user_id: user.user_id,
          permissions: user.permissions,
        };
      });

      // Get site events (with site access validation)
      fastify.get('/sites/:site_id/events', {
        preHandler: [siteAccessMiddleware],
      }, async (request) => {
        const { site_id } = request.params as { site_id: SiteId };
        
        // TODO: Implement actual event retrieval from ClickHouse
        return {
          site_id,
          events: [
            {
              event_id: 'test_event_1',
              event_name: 'page_view',
              timestamp: Date.now(),
              site_id,
            },
          ],
          total: 1,
        };
      });
    });

    // Tracking routes (API key auth)
    fastify.register(async function (fastify) {
      fastify.addHook('preHandler', apiKeyMiddleware);

      // Track event
      fastify.post('/sites/:site_id/events', {
        preHandler: [hmacMiddleware],
      }, async (request) => {
        const { site_id } = request.params as { site_id: SiteId };
        // const _eventData = request.body as unknown;

        // TODO: Implement actual event storage to ClickHouse
        const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
          success: true,
          event_id: eventId,
          site_id,
          timestamp: Date.now(),
        };
      });

      // Get site events is handled by JWT auth route above
    });
  }, { prefix: '/api' });
}
