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

  if (!env.REDIS_URL) {
    console.log('❌ REDIS_URL not found - Redis connection required');
    throw new Error('REDIS_URL environment variable is required for Redis connection');
  }

  console.log('🔗 Creating Redis connection...');
  
  redis = new Redis(env.REDIS_URL, {
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis connection error:', error);
    throw error;
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
