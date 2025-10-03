/**
 * PostgreSQL Client Factory
 * Creates and configures PostgreSQL connection pool
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { env } from '../config/env.js';
import { lookup } from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(lookup);

let pool: Pool | null = null;

/**
 * Resolve hostname to IPv4 address
 */
async function resolveIPv4(hostname: string): Promise<string> {
  try {
    console.log(`🔍 Resolving IPv4 for: ${hostname}`);
    const result = await dnsLookup(hostname, { family: 4 });
    console.log(`✅ IPv4 resolved: ${result.address}`);
    return result.address;
  } catch (error) {
    console.error(`❌ IPv4 resolution failed for ${hostname}:`, error);
    throw error;
  }
}

/**
 * Create PostgreSQL connection pool
 */
export async function createPgClient(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  console.log('🔍 PostgreSQL Environment Variables:');
  console.log('  PGHOST:', env.PGHOST);
  console.log('  PGPORT:', env.PGPORT);
  console.log('  PG_DATABASE:', env.PG_DATABASE);
  console.log('  PGUSER:', env.PGUSER);
  console.log('  PGPASSWORD:', env.PGPASSWORD ? '***' : 'undefined');
  console.log('  PG_SSL:', env.PG_SSL);
  console.log('  PG_POOL_MIN:', env.PG_POOL_MIN);
  console.log('  PG_POOL_MAX:', env.PG_POOL_MAX);

  try {
    // Supavisor hostname'ini kullan (IPv4 destekli)
    const hostname = env.PGHOST.replace('db.', 'pooler.').replace('.supabase.co', '.supabase.co');
    console.log(`🔗 Using Supavisor hostname: ${hostname}`);
    
    const config: PoolConfig = {
      host: hostname, // Supavisor hostname'i kullan
      port: env.PGPORT,
      database: env.PG_DATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
      min: env.PG_POOL_MIN,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    pool = new Pool(config);

    // Handle pool events
    pool.on('connect', (client: PoolClient) => {
      console.log('✅ PostgreSQL client connected');
    });

    pool.on('error', (err: Error) => {
      console.error('❌ PostgreSQL pool error:', err);
    });

    pool.on('remove', () => {
      console.log('🔌 PostgreSQL client removed from pool');
    });

    console.log('✅ PostgreSQL pool created successfully');
    return pool;
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL pool:', error);
    console.log('⚠️ PostgreSQL will be disabled, app will continue without database');
    
    // Return a mock pool for graceful degradation
    return {
      query: () => Promise.reject(new Error('PostgreSQL not available')),
      connect: () => Promise.reject(new Error('PostgreSQL not available')),
      end: () => Promise.resolve(),
      on: () => {},
    } as any;
  }
}

/**
 * Test PostgreSQL connection
 */
export async function testPgConnection(): Promise<boolean> {
  try {
    const client = await createPgClient();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error);
    return false;
  }
}

/**
 * Close PostgreSQL pool gracefully
 */
export async function closePgClient(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      console.log('✅ PostgreSQL pool closed gracefully');
      pool = null;
    } catch (error) {
      console.error('❌ Error closing PostgreSQL pool:', error);
    }
  }
}

/**
 * Get raw pool instance (for advanced usage)
 */
export function getPgPool(): Pool | null {
  return pool;
}
