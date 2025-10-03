/**
 * Redis Client Factory
 * Creates and configures Redis connection based on environment
 */

import { Redis } from 'ioredis';
import { env } from '../config/env.js';

/**
 * Create Redis client with proper configuration
 */
export function createRedisClient(): Redis {
  // Debug: Environment variables'ı logla
  console.log('🔍 Redis Environment Variables:');
  console.log('  REDIS_URL:', env.REDIS_URL ? '***' : 'undefined');
  console.log('  REDISHOST:', env.REDISHOST);
  console.log('  REDISPORT:', env.REDISPORT);
  console.log('  REDISPASSWORD:', env.REDISPASSWORD ? '***' : 'undefined');
  console.log('  REDIS_DB:', env.REDIS_DB);
  console.log('  REDIS_KEY_PREFIX:', env.REDIS_KEY_PREFIX);

  // REDIS_URL varsa onu kullan, yoksa ayrı ayrı değerleri kullan
  if (env.REDIS_URL) {
    console.log('🔗 Using REDIS_URL for connection');
    const redis = new Redis(env.REDIS_URL, {
      keyPrefix: env.REDIS_KEY_PREFIX,
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
    });

    // Handle connection events
    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redis;
  }

  // Fallback: Ayrı ayrı değerleri kullan
  console.log('🔗 Using individual Redis config values');
  const config: any = {
    host: env.REDISHOST,
    port: env.REDISPORT,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    retryDelayOnFailover: 1000,
    maxRetriesPerRequest: 3,
    lazyConnect: false, // Bağlantıyı hemen kur
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryDelayOnClusterDown: 300,
    enableReadyCheck: true,
  };

  // Sadece password varsa ekle
  if (env.REDISPASSWORD) {
    config.password = env.REDISPASSWORD;
  }

  const redis = new Redis(config);

  // Handle connection events
  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  return redis;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisClient(redis: Redis): Promise<void> {
  try {
    await redis.quit();
    console.log('✅ Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
}
