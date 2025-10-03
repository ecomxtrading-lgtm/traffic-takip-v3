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
  console.log('  REDISPASSWORD:', env.REDISPASSWORD ? '***' : 'undefined');
  console.log('  REDIS_KEY_PREFIX:', env.REDIS_KEY_PREFIX);

  // REDIS_URL varsa onu kullan, yoksa ayrı ayrı değerleri kullan
  if (env.REDIS_URL) {
    console.log('🔗 Using REDIS_URL for connection');
    
    // Upstash Redis için özel konfigürasyon
    const redisConfig: any = {
      keyPrefix: env.REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableReadyCheck: true,
    };

    // Upstash Redis URL'si ise TLS ayarları ekle
    if (env.REDIS_URL.startsWith('rediss://') || env.REDIS_URL.startsWith('https://')) {
      redisConfig.tls = {
        rejectUnauthorized: false
      };
      console.log('🔒 Using TLS for Upstash Redis connection');
    }

      // Upstash REST API URL'si ise farklı format kullan
      let redis: Redis;
      if (env.REDIS_URL.startsWith('https://') && env.REDIS_URL.includes('upstash.io')) {
        // Upstash için doğru URL formatı
        console.log('🌐 Using Upstash Redis with REST API');
        console.log('🔗 Redis URL:', env.REDIS_URL);
        console.log('🔑 Redis Password:', env.REDISPASSWORD ? '***' : 'undefined');
        
        // Upstash Redis için doğru URL formatı
        const url = new URL(env.REDIS_URL);
        const password = env.REDISPASSWORD || '';
        
        // Upstash Redis için Redis protokolü kullan
        const redisUrl = `rediss://:${password}@${url.hostname}:6380`;
        console.log('🔗 Formatted Redis URL:', redisUrl.replace(password, '***'));
        
        redis = new Redis(redisUrl, redisConfig);
      } else {
        redis = new Redis(env.REDIS_URL, redisConfig);
      }

    // Handle connection events
    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      throw error; // Crash the app instead of graceful fallback
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redis;
  }

  // Fallback: REDIS_URL yoksa hata ver
  console.log('❌ REDIS_URL not found - Redis connection required');
  throw new Error('REDIS_URL environment variable is required for Redis connection');
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
