import Redis from 'ioredis';
import { env } from '../config/env.js';

let redis: Redis | null = null;

export function createRedisClient(): Redis {
  if (redis) {
    return redis;
  }

  console.log('🔍 Redis Environment Variables:');
  console.log('  REDIS_URL:', env.REDIS_URL ? '***' : 'undefined');
  console.log('  REDISPASSWORD:', env.REDISPASSWORD ? '***' : 'undefined');

  let redisUrl = env.REDIS_URL;

  if (!redisUrl) {
    console.log('❌ REDIS_URL not found - Redis connection required');
    throw new Error('REDIS_URL environment variable is required for Redis connection');
  }

  // Fix Redis URL format if it starts with https://
  if (redisUrl.startsWith('https://')) {
    console.log('⚠️  Fixing Redis URL format from https:// to redis://');
    redisUrl = redisUrl.replace('https://', 'redis://');
  }

  // Additional Railway-specific fixes
  if (redisUrl.includes('railway.app')) {
    console.log('🔧 Railway Redis URL detected, applying Railway-specific fixes...');
    // Railway sometimes provides Redis URLs with incorrect format
    if (!redisUrl.includes('://')) {
      redisUrl = `redis://${redisUrl}`;
    }
  }

  console.log('🔗 Creating Redis connection...');
  console.log('🔍 REDIS_URL length:', redisUrl.length);
  console.log('🔍 REDIS_URL starts with:', redisUrl.substring(0, 10));
  console.log('🔍 Final Redis URL format:', redisUrl.startsWith('redis://') ? '✅ Correct' : '❌ Invalid');
  
  redis = new Redis(redisUrl);

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
    // Don't throw error immediately, let the app continue
    console.warn('⚠️  Redis connection failed, but continuing without Redis...');
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  return redis;
}

export async function closeRedisClient(client: Redis): Promise<void> {
  if (client) {
    try {
      await client.quit();
      console.log('✅ Redis client closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis client:', error);
    }
  }
}
