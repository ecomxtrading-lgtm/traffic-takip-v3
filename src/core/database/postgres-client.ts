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
  
  // Enhanced PostgreSQL configuration for Railway/Supabase
  const poolConfig = {
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PG_DATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PG_SSL ? { 
      rejectUnauthorized: false,
      // Additional SSL options for Supabase/Railway
      checkServerIdentity: () => undefined
    } : false,
    min: env.PG_POOL_MIN || 1, // Reduced for Railway
    max: env.PG_POOL_MAX || 5, // Reduced for Railway
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Increased timeout
    // Force IPv4 connection
    family: 4,
    // Additional connection options
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };

  console.log('🔧 PostgreSQL Pool Configuration:');
  console.log('  Host:', poolConfig.host);
  console.log('  Port:', poolConfig.port);
  console.log('  SSL:', poolConfig.ssl ? 'Enabled' : 'Disabled');
  console.log('  IPv4 Force:', poolConfig.family === 4 ? 'Yes' : 'No');
  console.log('  Connection Timeout:', poolConfig.connectionTimeoutMillis + 'ms');

  pool = new Pool(poolConfig);

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
    
    // Test with a simple query and timeout
    const result = await Promise.race([
      client.query('SELECT NOW() as current_time'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 15000)
      )
    ]) as any;
    
    console.log('✅ PostgreSQL connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ PostgreSQL connection test failed:', errorMessage);
    
    // Additional debugging for Railway/Supabase
    if (errorMessage.includes('ENETUNREACH')) {
      console.log('🔧 Network unreachable - possible IPv6/IPv4 issue');
      console.log('💡 Railway might need IPv4-only connection');
    }
    
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
