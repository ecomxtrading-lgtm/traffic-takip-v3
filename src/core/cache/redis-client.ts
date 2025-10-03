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
    
    try {
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
        
        // Upstash Redis için doğru URL formatı: rediss://username:password@host:port
        const url = new URL(env.REDIS_URL);
        const password = env.REDISPASSWORD || '';
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
        console.log('⚠️ Redis will be disabled, app will continue without caching');
      });

      redis.on('close', () => {
        console.log('🔌 Redis connection closed');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      return redis;
    } catch (error) {
      console.error('❌ Failed to create Redis client:', error);
      console.log('⚠️ Falling back to mock Redis client');
      
      // Mock Redis client döndür
      const mockRedis = {
        on: () => {},
        quit: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        set: () => Promise.resolve('OK'),
        del: () => Promise.resolve(1),
        exists: () => Promise.resolve(0),
        expire: () => Promise.resolve(1),
        ttl: () => Promise.resolve(-1),
        keys: () => Promise.resolve([]),
        flushdb: () => Promise.resolve('OK'),
      } as any;
      
      return mockRedis;
    }
  }

  // Fallback: Ayrı ayrı değerleri kullan
  console.log('🔗 Using individual Redis config values');
  const config: any = {
    host: env.REDISHOST,
    port: env.REDISPORT,
    db: env.REDIS_DB,
    keyPrefix: env.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 3,
    lazyConnect: false, // Bağlantıyı hemen kur
    connectTimeout: 10000,
    commandTimeout: 5000,
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
