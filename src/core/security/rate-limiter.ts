/**
 * Rate Limiting Service
 * Redis-based rate limiting with IP and site-based keys
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';

import { RedisKeyBuilder } from '../cache/redis-keys.js';
import { env } from '../config/env.js';
import type { SiteId } from '../types/public.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (ip: string, siteId?: SiteId) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(redis: Redis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Get rate limit configuration
   */
  getConfig(): RateLimitConfig {
    return this.config;
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(ip: string, siteId?: SiteId): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(ip, siteId);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));

    const results = await pipeline.exec();
    
    if (!results || results.some(result => result[0] !== null)) {
      throw new Error('Rate limit check failed');
    }

    // Ensure we have the expected results structure
    if (!results[1] || typeof results[1][1] !== 'number') {
      throw new Error('Rate limit check failed - invalid result structure');
    }

    const currentCount = results[1][1] as number;
    const allowed = currentCount <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = now + this.config.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount,
    };
  }

  /**
   * Reset rate limit for specific key
   */
  async resetLimit(ip: string, siteId?: SiteId): Promise<void> {
    const key = this.config.keyGenerator(ip, siteId);
    await this.redis.del(key);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(ip: string, siteId?: SiteId): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(ip, siteId);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove expired entries
    await this.redis.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests
    const currentCount = await this.redis.zcard(key);
    const allowed = currentCount <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = now + this.config.windowMs;

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount,
    };
  }
}

/**
 * Rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // General API rate limiting
  API: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: (ip: string, siteId?: SiteId) => 
      siteId ? RedisKeyBuilder.rateLimit(siteId, ip) : `rate_limit:ip:${ip}`,
  },

  // Tracking API (more permissive)
  TRACKING: {
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    keyGenerator: (ip: string, siteId?: SiteId) => 
      siteId ? `rate_limit:tracking:${siteId}:${ip}` : `rate_limit:tracking:${ip}`,
  },

  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (ip: string) => `rate_limit:auth:${ip}`,
  },

  // Webhook endpoints
  WEBHOOK: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 webhooks per minute
    keyGenerator: (ip: string, siteId?: SiteId) => 
      siteId ? `rate_limit:webhook:${siteId}:${ip}` : `rate_limit:webhook:${ip}`,
  },
} as const;

/**
 * Rate limiter factory
 */
export class RateLimiterFactory {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Create rate limiter for specific config
   */
  create(config: RateLimitConfig): RateLimiter {
    return new RateLimiter(this.redis, config);
  }

  /**
   * Create API rate limiter
   */
  createApiLimiter(): RateLimiter {
    return this.create(RATE_LIMIT_CONFIGS.API);
  }

  /**
   * Create tracking rate limiter
   */
  createTrackingLimiter(): RateLimiter {
    return this.create(RATE_LIMIT_CONFIGS.TRACKING);
  }

  /**
   * Create auth rate limiter
   */
  createAuthLimiter(): RateLimiter {
    return this.create(RATE_LIMIT_CONFIGS.AUTH);
  }

  /**
   * Create webhook rate limiter
   */
  createWebhookLimiter(): RateLimiter {
    return this.create(RATE_LIMIT_CONFIGS.WEBHOOK);
  }
}

/**
 * Rate limit middleware for Fastify
 */
export function createRateLimitMiddleware(rateLimiter: RateLimiter) {
  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const ip = request.ip;
      const siteId = (request as any).site_id || (request as any).user?.site_id;

      const result = await rateLimiter.checkLimit(ip, siteId);

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', rateLimiter.getConfig().maxRequests);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        return reply.status(429).send({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
      }
    } catch (error) {
      request.log.error({ error }, 'Rate limit check failed');
      
      // On error, allow request but log the issue
      request.log.warn('Rate limit check failed, allowing request');
    }
  };
}
