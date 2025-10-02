/**
 * Dependency Injection Container
 * Hafif DI container - sadece startup'ta resolve eder, runtime'da service location yok
 */

export type ServiceFactory<T> = () => T;
export type ServiceToken = string | symbol;

interface ServiceRegistration<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export class DIContainer {
  private services = new Map<ServiceToken, ServiceRegistration>();
  private isResolved = false;

  /**
   * Register a service in the container
   */
  register<T>(token: ServiceToken, factory: ServiceFactory<T>, singleton = true): void {
    if (this.isResolved) {
      throw new Error('Cannot register services after container is resolved');
    }

    this.services.set(token, {
      factory,
      singleton,
    });
  }

  /**
   * Register a singleton service
   */
  singleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.register(token, factory, true);
  }

  /**
   * Register a transient service
   */
  transient<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.register(token, factory, false);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: ServiceToken): T {
    const registration = this.services.get(token);
    if (!registration) {
      throw new Error(`Service not found: ${String(token)}`);
    }

    // Return cached instance for singletons
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    // Create new instance
    const instance = registration.factory();
    
    // Cache singleton instances
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance as T;
  }

  /**
   * Check if a service is registered
   */
  has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  /**
   * Resolve all services (startup optimization)
   * This should be called once during application bootstrap
   */
  resolveAll(): void {
    if (this.isResolved) {
      return;
    }

    // Resolve all singleton services to cache them
    for (const [token, registration] of this.services) {
      if (registration.singleton) {
        this.resolve(token);
      }
    }

    this.isResolved = true;
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.isResolved = false;
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): ServiceToken[] {
    return Array.from(this.services.keys());
  }
}

// Global container instance
export const container = new DIContainer();

// Service tokens
export const TOKENS = {
  // Core services
  LOGGER: Symbol('logger'),
  EVENT_BUS: Symbol('eventBus'),
  
  // Database clients
  PG_CLIENT: Symbol('pgClient'),
  REDIS_CLIENT: Symbol('redisClient'),
  CLICKHOUSE_CLIENT: Symbol('clickhouseClient'),
  
  // External services
  GEOIP_CLIENT: Symbol('geoipClient'),
  META_CLIENT: Symbol('metaClient'),
} as const;

// Helper function to create typed service getter
export function createServiceGetter<T>(token: ServiceToken) {
  return (): T => container.resolve<T>(token);
}
