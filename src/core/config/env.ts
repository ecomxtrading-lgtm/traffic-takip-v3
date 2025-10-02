import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Security
  SITE_SALT: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  HMAC_SECRET: z.string().min(32),

  // Database - PostgreSQL
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().min(1).max(65535).default(5432),
  PG_DATABASE: z.string().default('universal_tracking'),
  PG_USERNAME: z.string().default('postgres'),
  PG_PASSWORD: z.string().default('password'),
  PG_SSL: z.coerce.boolean().default(false),
  PG_POOL_MIN: z.coerce.number().min(1).default(2),
  PG_POOL_MAX: z.coerce.number().min(1).max(100).default(10),

  // Cache - Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: z.string().default('ut:'),

  // Analytics - ClickHouse
  CLICKHOUSE_HOST: z.string().default('localhost'),
  CLICKHOUSE_PORT: z.coerce.number().min(1).max(65535).default(8123),
  CLICKHOUSE_DATABASE: z.string().default('analytics'),
  CLICKHOUSE_USERNAME: z.string().default('default'),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_SSL: z.coerce.boolean().default(false),

  // External Services
  GEOIP_API_KEY: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(100),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(true),

  // Health Check
  HEALTH_CHECK_TIMEOUT: z.coerce.number().min(1000).default(5000),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

// Export validated environment
export const env = parseEnv();

// Type for environment
export type Env = z.infer<typeof envSchema>;

// Helper functions
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isTest = (): boolean => env.NODE_ENV === 'test';
