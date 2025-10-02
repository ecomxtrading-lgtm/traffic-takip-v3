/**
 * Internal types - Yalnızca içte kullanılan tipler
 * Bu dosya dışa export edilmez, sadece core modülü içinde kullanılır
 */

import type { TenantId, UserId, SessionId, SiteId, Timestamp } from './public.ts';
import type { FastifyRequest } from 'fastify';

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export interface ClickHouseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl: boolean;
}

// Service factory types
export interface ServiceFactory<T> {
  (): T;
}

export interface ServiceRegistration<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

// Event bus internal types
export interface EventHandler<T = unknown> {
  (payload: T): void | Promise<void>;
}

export interface EventRegistration {
  eventName: string;
  handler: EventHandler;
}

// Logger types
export interface LogContext {
  tenantId?: TenantId;
  siteId?: SiteId;
  userId?: UserId;
  sessionId?: SessionId;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  message: string;
  context?: LogContext;
  timestamp: Timestamp;
  error?: Error;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (ip: string, siteId: SiteId) => string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Timestamp;
  retryAfter?: number;
}

// Security types
export interface SecurityConfig {
  hmacSecret: string;
  jwtSecret: string;
  siteSalt: string;
  corsOrigins: string[];
  rateLimit: RateLimitConfig;
}

export interface AuthToken {
  tenantId: TenantId;
  siteId: SiteId;
  userId?: UserId;
  permissions: string[];
  expiresAt: Timestamp;
}

// Module system types
export interface ModuleConfig {
  name: string;
  version: string;
  dependencies: string[];
  enabled: boolean;
}

export interface ModuleContext {
  config: ModuleConfig;
  container: unknown; // DI container reference
  eventBus: unknown; // Event bus reference
  logger: unknown; // Logger reference
}

// Health check internal types
export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Timestamp;
  error?: string;
}

export interface HealthCheckConfig {
  timeout: number;
  services: string[];
  interval: number;
}

// Migration types
export interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  dependencies?: string[];
}

export interface MigrationStatus {
  version: string;
  applied: boolean;
  appliedAt?: Timestamp;
  checksum: string;
}

// Cache types
export interface CacheConfig {
  ttl: number;
  keyPrefix: string;
  maxSize?: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// Queue types
export interface QueueConfig {
  name: string;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  failedAt?: Timestamp;
  error?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type NonEmptyArray<T> = [T, ...T[]];

export type Brand<T, B> = T & { __brand: B };

export type BrandedString<B> = Brand<string, B>;

// Fastify request extensions
export interface AuthenticatedUser {
  id: UserId;
  siteId: SiteId;
  tenantId: TenantId;
  permissions: string[];
}

export interface HMACInfo {
  valid: boolean;
  age?: number;
  nonce: string;
}

// Extended FastifyRequest interface
export interface ExtendedFastifyRequest extends FastifyRequest {
  site_id?: SiteId;
  user?: AuthenticatedUser;
  hmac?: HMACInfo;
}

// Database query types
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, unknown>;
}

export interface QueryResult<T = unknown> {
  rows: T[];
  count: number;
  totalCount?: number;
}
