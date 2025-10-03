import { Pool } from 'pg';
import { env } from '../config/env.js';

let pool: Pool | null = null;

export function createPgClient(): Pool {
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

  if (!env.PGHOST || !env.PG_DATABASE || !env.PGUSER || !env.PGPASSWORD) {
    console.log('❌ Required PostgreSQL environment variables missing');
    throw new Error('PostgreSQL environment variables are required');
  }

  console.log('🔗 Creating PostgreSQL connection...');
  
  pool = new Pool({
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PG_DATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
    min: env.PG_POOL_MIN || 2,
    max: env.PG_POOL_MAX || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('connect', () => {
    console.log('✅ PostgreSQL client connected');
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
  });

  pool.on('remove', () => {
    console.log('🔌 PostgreSQL client removed from pool');
  });

  console.log('✅ PostgreSQL pool created successfully');
  return pool;
}

export async function testPgConnection(): Promise<boolean> {
  try {
    const client = createPgClient();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error);
    return false;
  }
}

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
