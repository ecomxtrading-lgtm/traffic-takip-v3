/**
 * Database Migration Script
 * Creates database and runs migrations
 */

import { Pool } from 'pg';
import { env } from '../config/env.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create database if it doesn't exist
 */
async function createDatabase(): Promise<void> {
  // Connect to default 'postgres' database first
  const adminPool = new Pool({
    host: env.PGHOST,
    port: env.PGPORT,
    database: 'postgres', // Connect to default database
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log(`🔍 Checking if database '${env.PG_DATABASE}' exists...`);
    
    // Check if database exists
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.PG_DATABASE]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database '${env.PG_DATABASE}'...`);
      await adminPool.query(`CREATE DATABASE "${env.PG_DATABASE}"`);
      console.log(`✅ Database '${env.PG_DATABASE}' created successfully`);
    } else {
      console.log(`✅ Database '${env.PG_DATABASE}' already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  const pool = new Pool({
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PG_DATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: env.PG_SSL ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Running database migrations...');

    // Read and execute initial schema
    const schemaPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Executing 001_initial_schema.sql...');
    await pool.query(schema);
    console.log('✅ Initial schema migration completed');

    // Read and execute RLS policies
    const rlsPath = join(__dirname, 'migrations', '002_rls_policies.sql');
    const rls = readFileSync(rlsPath, 'utf8');
    
    console.log('📄 Executing 002_rls_policies.sql...');
    await pool.query(rls);
    console.log('✅ RLS policies migration completed');

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Main migration function
 */
export async function migrate(): Promise<void> {
  try {
    console.log('🚀 Starting database migration...');
    
    await createDatabase();
    await runMigrations();
    
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}
